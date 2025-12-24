import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export class MetricsCalculator {
  /**
   * Calculate Normalized Power (NP) from power stream
   * NP = 4th root of average of (30s rolling avg)^4
   */
  calculateNormalizedPower(powerData: number[], sampleRate: number = 1): number {
    if (powerData.length === 0) return 0;

    const windowSize = Math.round(30 / sampleRate); // 30 second window
    if (powerData.length < windowSize) {
      // Not enough data, return average power
      return powerData.reduce((a, b) => a + b, 0) / powerData.length;
    }

    // Calculate 30-second rolling average
    const rollingAvg: number[] = [];
    for (let i = windowSize - 1; i < powerData.length; i++) {
      const window = powerData.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / windowSize;
      rollingAvg.push(avg);
    }

    // Raise to 4th power, average, then take 4th root
    const fourthPowers = rollingAvg.map((p) => Math.pow(p, 4));
    const avgFourthPower = fourthPowers.reduce((a, b) => a + b, 0) / fourthPowers.length;
    const np = Math.pow(avgFourthPower, 0.25);

    return Math.round(np);
  }

  /**
   * Calculate Intensity Factor (IF)
   * IF = NP / FTP
   */
  calculateIntensityFactor(normalizedPower: number, ftp: number): number {
    if (ftp === 0) return 0;
    return normalizedPower / ftp;
  }

  /**
   * Calculate Variability Index (VI)
   * VI = NP / Average Power
   */
  calculateVariabilityIndex(normalizedPower: number, avgPower: number): number {
    if (avgPower === 0) return 0;
    return normalizedPower / avgPower;
  }

  /**
   * Calculate Bike TSS (Training Stress Score)
   * TSS = (duration_seconds × NP × IF) / (FTP × 3600) × 100
   */
  calculateBikeTSS(durationSeconds: number, normalizedPower: number, ftp: number): number {
    if (ftp === 0) return 0;
    const intensityFactor = normalizedPower / ftp;
    const tss = (durationSeconds * normalizedPower * intensityFactor) / (ftp * 3600) * 100;
    return Math.round(tss * 10) / 10;
  }

  /**
   * Calculate Run TSS (rTSS)
   * rTSS = (duration_hours × IF² × 100)
   * IF for running = threshold_pace / actual_pace
   */
  calculateRunTSS(durationSeconds: number, intensityFactor: number): number {
    const durationHours = durationSeconds / 3600;
    const tss = durationHours * Math.pow(intensityFactor, 2) * 100;
    return Math.round(tss * 10) / 10;
  }

  /**
   * Calculate Swim TSS (sTSS)
   * Similar to rTSS but based on CSS
   */
  calculateSwimTSS(durationSeconds: number, intensityFactor: number): number {
    const durationHours = durationSeconds / 3600;
    const tss = durationHours * Math.pow(intensityFactor, 2) * 100;
    return Math.round(tss * 10) / 10;
  }

  /**
   * Calculate HR-based TSS (when power/pace not available)
   * TRIMP-based approximation
   */
  calculateHRBasedTSS(durationSeconds: number, avgHR: number, lthr: number): number {
    if (lthr === 0) return 0;
    
    const durationHours = durationSeconds / 3600;
    const hrRatio = avgHR / lthr;
    
    // Approximate TSS from HR using exponential weighting
    // TSS ≈ duration × k × e^(b×hrRatio)
    const k = 1.67;
    const b = 1.92;
    const hrTss = durationHours * k * Math.exp(b * hrRatio) * 3.33; // Scaled to match power-based TSS

    return Math.round(Math.min(hrTss, durationHours * 150) * 10) / 10; // Cap at 150 TSS/hour
  }

  /**
   * Calculate Efficiency Factor (EF)
   * Bike: NP / avg_HR
   * Run: pace (m/min) / avg_HR or NGP / avg_HR
   */
  calculateEfficiencyFactor(
    output: number, // NP for bike, speed (m/s) for run
    avgHeartRate: number,
    sportType: 'BIKE' | 'RUN'
  ): number {
    if (avgHeartRate === 0) return 0;

    if (sportType === 'BIKE') {
      return output / avgHeartRate;
    } else {
      // Convert m/s to m/min for running EF
      return (output * 60) / avgHeartRate;
    }
  }

  /**
   * Calculate Aerobic Decoupling (Pw:Hr or Pa:Hr)
   * Compares first half EF to second half EF
   * Decoupling % = ((EF_first - EF_second) / EF_first) × 100
   */
  async calculateDecoupling(activityId: string): Promise<number | null> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        orderBy: { timestamp: 'asc' },
        select: {
          heartRate: true,
          power: true,
          speed: true,
        },
      });

      if (records.length < 20) return null;

      const midpoint = Math.floor(records.length / 2);
      const firstHalf = records.slice(0, midpoint);
      const secondHalf = records.slice(midpoint);

      // Calculate EF for each half
      const calculateHalfEF = (data: typeof records): number | null => {
        const validRecords = data.filter((r) => r.heartRate && (r.power || r.speed));
        if (validRecords.length === 0) return null;

        const avgHR = validRecords.reduce((sum, r) => sum + (r.heartRate || 0), 0) / validRecords.length;
        const avgOutput = validRecords.reduce((sum, r) => sum + (r.power || r.speed || 0), 0) / validRecords.length;

        return avgHR > 0 ? avgOutput / avgHR : null;
      };

      const efFirst = calculateHalfEF(firstHalf);
      const efSecond = calculateHalfEF(secondHalf);

      if (!efFirst || !efSecond) return null;

      const decoupling = ((efFirst - efSecond) / efFirst) * 100;
      return Math.round(decoupling * 100) / 100;
    } catch (error) {
      logger.error(`Failed to calculate decoupling for activity ${activityId}:`, error);
      return null;
    }
  }

  /**
   * Calculate peak power/pace for various durations
   */
  async calculatePeaks(
    activityId: string,
    durations: number[] = [5, 30, 60, 300, 1200, 3600] // seconds
  ): Promise<Record<string, number>> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        orderBy: { timestamp: 'asc' },
        select: {
          timestamp: true,
          power: true,
          speed: true,
        },
      });

      if (records.length === 0) return {};

      const peaks: Record<string, number> = {};

      for (const duration of durations) {
        // Find best average power/speed over the duration
        let maxAvg = 0;

        for (let i = 0; i <= records.length - duration; i++) {
          const window = records.slice(i, i + duration);
          const values = window
            .map((r) => r.power || r.speed || 0)
            .filter((v) => v > 0);

          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            maxAvg = Math.max(maxAvg, avg);
          }
        }

        if (maxAvg > 0) {
          peaks[`peak${duration}s`] = Math.round(maxAvg);
        }
      }

      return peaks;
    } catch (error) {
      logger.error(`Failed to calculate peaks for activity ${activityId}:`, error);
      return {};
    }
  }

  /**
   * Calculate time in HR zones
   */
  async calculateHRZoneTime(
    activityId: string,
    zones: { min: number; max: number }[]
  ): Promise<number[]> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        select: { heartRate: true },
      });

      const zoneTimes = zones.map(() => 0);

      for (const record of records) {
        if (record.heartRate) {
          for (let i = 0; i < zones.length; i++) {
            if (record.heartRate >= zones[i].min && record.heartRate < zones[i].max) {
              zoneTimes[i]++;
              break;
            }
          }
        }
      }

      return zoneTimes;
    } catch (error) {
      logger.error(`Failed to calculate HR zone time for activity ${activityId}:`, error);
      return [];
    }
  }

  /**
   * Calculate time in power zones
   */
  async calculatePowerZoneTime(
    activityId: string,
    zones: { min: number; max: number }[]
  ): Promise<number[]> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        select: { power: true },
      });

      const zoneTimes = zones.map(() => 0);

      for (const record of records) {
        if (record.power) {
          for (let i = 0; i < zones.length; i++) {
            if (record.power >= zones[i].min && record.power < zones[i].max) {
              zoneTimes[i]++;
              break;
            }
          }
        }
      }

      return zoneTimes;
    } catch (error) {
      logger.error(`Failed to calculate power zone time for activity ${activityId}:`, error);
      return [];
    }
  }

  /**
   * Calculate running dynamics metrics
   */
  async calculateRunningDynamics(activityId: string): Promise<{
    avgGCT: number | null;
    avgVO: number | null;
    avgStrideLength: number | null;
    gctBalance: number | null;
  }> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        select: {
          groundContactTime: true,
          verticalOscillation: true,
          strideLength: true,
        },
      });

      const validGCT = records.filter((r) => r.groundContactTime).map((r) => r.groundContactTime!);
      const validVO = records.filter((r) => r.verticalOscillation).map((r) => r.verticalOscillation!);
      const validStride = records.filter((r) => r.strideLength).map((r) => r.strideLength!);

      return {
        avgGCT: validGCT.length > 0
          ? Math.round(validGCT.reduce((a, b) => a + b, 0) / validGCT.length)
          : null,
        avgVO: validVO.length > 0
          ? Math.round((validVO.reduce((a, b) => a + b, 0) / validVO.length) * 10) / 10
          : null,
        avgStrideLength: validStride.length > 0
          ? Math.round((validStride.reduce((a, b) => a + b, 0) / validStride.length) * 100) / 100
          : null,
        gctBalance: null, // Would need L/R data
      };
    } catch (error) {
      logger.error(`Failed to calculate running dynamics for activity ${activityId}:`, error);
      return { avgGCT: null, avgVO: null, avgStrideLength: null, gctBalance: null };
    }
  }
}

// Export singleton instance
export const metricsCalculator = new MetricsCalculator();
export default metricsCalculator;
