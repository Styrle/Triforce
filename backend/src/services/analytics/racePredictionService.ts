import { prisma } from '../../config/database';
import { SportType } from '@prisma/client';

interface PredictedTime {
  distance: number;
  distanceLabel: string;
  predictedTime: number;
  formattedTime: string;
  pace: string;
  confidenceRange: { low: number; high: number };
}

interface TriathlonPrediction {
  raceType: string;
  swim: PredictedTime & { adjustedTime?: number };
  t1: { time: number; formatted: string };
  bike: PredictedTime;
  t2: { time: number; formatted: string };
  run: PredictedTime & { adjustedTime: number; brickFactor: number };
  total: { time: number; formatted: string };
}

// Standard race distances in meters
const RACE_DISTANCES = {
  RUN: [
    { distance: 5000, label: '5K' },
    { distance: 10000, label: '10K' },
    { distance: 21097, label: 'Half Marathon' },
    { distance: 42195, label: 'Marathon' },
  ],
  BIKE: [
    { distance: 40000, label: '40K TT' },
    { distance: 90000, label: '90K (70.3)' },
    { distance: 180000, label: '180K (Ironman)' },
  ],
  SWIM: [
    { distance: 750, label: '750m (Sprint)' },
    { distance: 1500, label: '1500m (Olympic)' },
    { distance: 1900, label: '1900m (70.3)' },
    { distance: 3800, label: '3800m (Ironman)' },
  ],
};

// Triathlon distances
const TRIATHLON_DISTANCES = {
  sprint: { swim: 750, bike: 20000, run: 5000 },
  olympic: { swim: 1500, bike: 40000, run: 10000 },
  half: { swim: 1900, bike: 90000, run: 21097 },
  full: { swim: 3800, bike: 180000, run: 42195 },
};

export class RacePredictionService {
  /**
   * Riegel Formula: T2 = T1 × (D2/D1)^exponent
   * Exponent varies by fitness level and sport:
   * - Running: Elite 1.04-1.05, Recreational 1.06-1.08
   * - Swimming: 1.02-1.04
   * - Cycling: 1.04-1.05
   */
  predictRaceTime(
    baseDistance: number,
    baseTime: number,
    targetDistance: number,
    fatigueExponent = 1.06
  ): PredictedTime {
    const ratio = targetDistance / baseDistance;
    const predictedTime = baseTime * Math.pow(ratio, fatigueExponent);

    // Confidence range widens with distance from base
    const distanceRatio = Math.abs(Math.log(ratio));
    const margin = predictedTime * (0.02 + distanceRatio * 0.02);

    // Calculate pace (min/km for run, min/100m for swim)
    const paceSeconds = (predictedTime / targetDistance) * 1000;

    return {
      distance: targetDistance,
      distanceLabel: this.getDistanceLabel(targetDistance),
      predictedTime: Math.round(predictedTime),
      formattedTime: this.formatTime(predictedTime),
      pace: this.formatPace(paceSeconds),
      confidenceRange: {
        low: Math.round(predictedTime - margin),
        high: Math.round(predictedTime + margin),
      },
    };
  }

  /**
   * Adjust prediction based on fitness (CTL)
   * Each CTL point above baseline ≈ 0.7% faster
   */
  adjustForFitness(
    predictedTime: number,
    raceDayCTL: number,
    baseResultCTL: number
  ): number {
    const ctlDelta = raceDayCTL - baseResultCTL;
    const adjustmentFactor = 1 - ctlDelta * 0.007;
    return predictedTime * Math.max(0.8, Math.min(1.2, adjustmentFactor));
  }

  /**
   * Get race predictions for a user based on their best efforts
   */
  async getPredictions(
    userId: string,
    sportType: string
  ): Promise<{ predictions: PredictedTime[]; basedOn: { distance: number; time: number; date: Date } | null }> {
    // Find best recent efforts at various distances
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        sportType: sportType as SportType,
        distance: { gt: 0 },
        movingTime: { gt: 0 },
      },
      orderBy: { startDate: 'desc' },
      take: 100,
    });

    if (activities.length === 0) {
      return { predictions: [], basedOn: null };
    }

    // Find the best effort to use as base
    // Prefer longer efforts for better accuracy
    const validEfforts = activities.filter(
      (a) => a.distance && a.distance >= this.getMinDistanceForSport(sportType)
    );

    if (validEfforts.length === 0) {
      return { predictions: [], basedOn: null };
    }

    // Sort by pace (faster is better)
    const bestEffort = validEfforts.sort((a, b) => {
      const paceA = a.movingTime / (a.distance || 1);
      const paceB = b.movingTime / (b.distance || 1);
      return paceA - paceB;
    })[0];

    if (!bestEffort.distance) {
      return { predictions: [], basedOn: null };
    }

    // Get sport-specific exponent
    const exponent = this.getSportExponent(sportType);

    // Predict for standard distances
    const distances = RACE_DISTANCES[sportType as keyof typeof RACE_DISTANCES] || [];
    const predictions: PredictedTime[] = [];

    for (const { distance, label } of distances) {
      const prediction = this.predictRaceTime(
        bestEffort.distance,
        bestEffort.movingTime,
        distance,
        exponent
      );
      prediction.distanceLabel = label;
      predictions.push(prediction);
    }

    return {
      predictions,
      basedOn: {
        distance: bestEffort.distance,
        time: bestEffort.movingTime,
        date: bestEffort.startDate,
      },
    };
  }

  /**
   * Predict triathlon finish time with brick fatigue
   */
  async predictTriathlon(
    userId: string,
    raceType: 'sprint' | 'olympic' | 'half' | 'full'
  ): Promise<TriathlonPrediction> {
    const distances = TRIATHLON_DISTANCES[raceType];

    // Get best efforts for each sport
    const [swimEffort, bikeEffort, runEffort] = await Promise.all([
      this.getBestEffort(userId, 'SWIM', 400),
      this.getBestEffort(userId, 'BIKE', 20000),
      this.getBestEffort(userId, 'RUN', 5000),
    ]);

    if (!swimEffort || !bikeEffort || !runEffort) {
      throw new Error('Need swim, bike, and run data for triathlon prediction');
    }

    const swimPred = this.predictRaceTime(
      swimEffort.distance!,
      swimEffort.movingTime,
      distances.swim,
      1.03
    );
    const bikePred = this.predictRaceTime(
      bikeEffort.distance!,
      bikeEffort.movingTime,
      distances.bike,
      1.04
    );
    const runPred = this.predictRaceTime(
      runEffort.distance!,
      runEffort.movingTime,
      distances.run,
      1.06
    );

    // Brick fatigue factor for run (running after bike)
    const brickFactor: Record<string, number> = {
      sprint: 1.05,
      olympic: 1.07,
      half: 1.1,
      full: 1.15,
    };
    const runBrickFactor = brickFactor[raceType];

    // Transition times (seconds)
    const transitionTimes: Record<string, { t1: number; t2: number }> = {
      sprint: { t1: 90, t2: 60 },
      olympic: { t1: 120, t2: 90 },
      half: { t1: 180, t2: 150 },
      full: { t1: 300, t2: 240 },
    };
    const { t1, t2 } = transitionTimes[raceType];

    const adjustedRunTime = runPred.predictedTime * runBrickFactor;
    const totalTime =
      swimPred.predictedTime + t1 + bikePred.predictedTime + t2 + adjustedRunTime;

    return {
      raceType,
      swim: {
        ...swimPred,
        distanceLabel: `${distances.swim}m`,
      },
      t1: { time: t1, formatted: this.formatTime(t1) },
      bike: {
        ...bikePred,
        distanceLabel: `${(distances.bike / 1000).toFixed(0)}K`,
      },
      t2: { time: t2, formatted: this.formatTime(t2) },
      run: {
        ...runPred,
        distanceLabel: this.getDistanceLabel(distances.run),
        adjustedTime: Math.round(adjustedRunTime),
        formattedTime: this.formatTime(adjustedRunTime),
        brickFactor: runBrickFactor,
      },
      total: {
        time: Math.round(totalTime),
        formatted: this.formatTime(totalTime),
      },
    };
  }

  /**
   * Calculate race time from custom input
   */
  calculateFromInput(
    baseDistance: number,
    baseTime: number,
    targetDistances: number[]
  ): PredictedTime[] {
    return targetDistances.map((distance) =>
      this.predictRaceTime(baseDistance, baseTime, distance, 1.06)
    );
  }

  private async getBestEffort(userId: string, sportType: string, minDistance: number) {
    return prisma.activity.findFirst({
      where: {
        userId,
        sportType: sportType as SportType,
        distance: { gte: minDistance },
        movingTime: { gt: 0 },
      },
      orderBy: [{ distance: 'desc' }, { movingTime: 'asc' }],
    });
  }

  private getMinDistanceForSport(sportType: string): number {
    switch (sportType) {
      case 'SWIM':
        return 400;
      case 'BIKE':
        return 10000;
      case 'RUN':
        return 3000;
      default:
        return 1000;
    }
  }

  private getSportExponent(sportType: string): number {
    switch (sportType) {
      case 'SWIM':
        return 1.03;
      case 'BIKE':
        return 1.04;
      case 'RUN':
        return 1.06;
      default:
        return 1.06;
    }
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private formatPace(secondsPerKm: number): string {
    const m = Math.floor(secondsPerKm / 60);
    const s = Math.floor(secondsPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
  }

  private getDistanceLabel(meters: number): string {
    if (meters === 21097) return 'Half Marathon';
    if (meters === 42195) return 'Marathon';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1).replace('.0', '')}K`;
    return `${meters}m`;
  }
}

export const racePredictionService = new RacePredictionService();
export default racePredictionService;
