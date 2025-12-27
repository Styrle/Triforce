import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Standard durations for power/pace curves (in seconds)
 */
export const STANDARD_DURATIONS = [
  5, 10, 15, 30, 60, 120, 180, 300, 600, 1200, 1800, 3600, 5400, 7200,
] as const;

/**
 * Duration labels for display
 */
export const DURATION_LABELS: Record<number, string> = {
  5: '5s',
  10: '10s',
  15: '15s',
  30: '30s',
  60: '1min',
  120: '2min',
  180: '3min',
  300: '5min',
  600: '10min',
  1200: '20min',
  1800: '30min',
  3600: '60min',
  5400: '90min',
  7200: '120min',
};

/**
 * Point on a duration curve
 */
export interface CurvePoint {
  duration: number;
  label: string;
  value: number;
  activityId?: string;
  achievedAt?: Date;
}

/**
 * Duration curve result
 */
export interface DurationCurve {
  points: CurvePoint[];
  curveType: 'power' | 'pace';
  periodDays: number;
  activityCount: number;
}

/**
 * Athlete phenotype classification
 */
export type Phenotype = 'sprinter' | 'pursuiter' | 'time_trialist' | 'all_rounder';

export interface PhenotypeAnalysis {
  phenotype: Phenotype;
  description: string;
  strengths: string[];
  weaknesses: string[];
  sprintScore: number;
  sustainedScore: number;
}

/**
 * Duration Curve Service
 * Builds power/pace duration curves and analyzes athlete phenotype
 */
export class DurationCurveService {
  /**
   * Calculate peak average for a given duration from data stream
   */
  calculatePeakForDuration(data: number[], durationSeconds: number): number {
    if (data.length < durationSeconds || durationSeconds <= 0) {
      return 0;
    }

    let maxAvg = 0;

    // Sliding window to find best average
    let windowSum = 0;
    for (let i = 0; i < durationSeconds; i++) {
      windowSum += data[i] || 0;
    }
    maxAvg = windowSum / durationSeconds;

    for (let i = durationSeconds; i < data.length; i++) {
      windowSum = windowSum - (data[i - durationSeconds] || 0) + (data[i] || 0);
      const avg = windowSum / durationSeconds;
      if (avg > maxAvg) {
        maxAvg = avg;
      }
    }

    return maxAvg;
  }

  /**
   * Build power duration curve from user's activities
   */
  async buildPowerCurve(userId: string, days: number = 90): Promise<DurationCurve> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get activities with power data
      const activities = await prisma.activity.findMany({
        where: {
          userId,
          sportType: 'BIKE',
          startDate: { gte: startDate },
          hasStreams: true,
        },
        select: {
          id: true,
          startDate: true,
          metrics: {
            select: {
              peak5s: true,
              peak30s: true,
              peak1min: true,
              peak5min: true,
              peak20min: true,
              peak60min: true,
            },
          },
        },
      });

      const points: CurvePoint[] = [];
      const peaks: Record<number, { value: number; activityId: string; achievedAt: Date }> = {};

      // Initialize peaks from ActivityMetrics first (faster)
      for (const activity of activities) {
        if (activity.metrics) {
          const metricPeaks: [number, number | null][] = [
            [5, activity.metrics.peak5s],
            [30, activity.metrics.peak30s],
            [60, activity.metrics.peak1min],
            [300, activity.metrics.peak5min],
            [1200, activity.metrics.peak20min],
            [3600, activity.metrics.peak60min],
          ];

          for (const [duration, value] of metricPeaks) {
            if (value && (!peaks[duration] || value > peaks[duration].value)) {
              peaks[duration] = {
                value,
                activityId: activity.id,
                achievedAt: activity.startDate,
              };
            }
          }
        }
      }

      // For durations not covered by metrics, calculate from records
      const uncoveredDurations = STANDARD_DURATIONS.filter(
        (d) => !peaks[d] || peaks[d].value === 0
      );

      if (uncoveredDurations.length > 0) {
        for (const activity of activities.slice(0, 20)) {
          // Limit to recent activities
          const records = await prisma.activityRecord.findMany({
            where: { activityId: activity.id },
            orderBy: { timestamp: 'asc' },
            select: { power: true },
          });

          const powerData = records.map((r) => r.power || 0);

          for (const duration of uncoveredDurations) {
            const peak = this.calculatePeakForDuration(powerData, duration);
            if (peak > 0 && (!peaks[duration] || peak > peaks[duration].value)) {
              peaks[duration] = {
                value: peak,
                activityId: activity.id,
                achievedAt: activity.startDate,
              };
            }
          }
        }
      }

      // Convert to points array
      for (const duration of STANDARD_DURATIONS) {
        if (peaks[duration]) {
          points.push({
            duration,
            label: DURATION_LABELS[duration],
            value: Math.round(peaks[duration].value),
            activityId: peaks[duration].activityId,
            achievedAt: peaks[duration].achievedAt,
          });
        }
      }

      return {
        points,
        curveType: 'power',
        periodDays: days,
        activityCount: activities.length,
      };
    } catch (error) {
      logger.error(`Failed to build power curve for user ${userId}:`, error);
      return {
        points: [],
        curveType: 'power',
        periodDays: days,
        activityCount: 0,
      };
    }
  }

  /**
   * Build pace duration curve from user's activities
   */
  async buildPaceCurve(userId: string, days: number = 90): Promise<DurationCurve> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          sportType: 'RUN',
          startDate: { gte: startDate },
          hasStreams: true,
        },
        select: {
          id: true,
          startDate: true,
          metrics: {
            select: {
              pacePeak5s: true,
              pacePeak1min: true,
              pacePeak5min: true,
              pacePeak20min: true,
            },
          },
        },
      });

      const peaks: Record<number, { value: number; activityId: string; achievedAt: Date }> = {};

      // Initialize from metrics
      for (const activity of activities) {
        if (activity.metrics) {
          const metricPeaks: [number, number | null][] = [
            [5, activity.metrics.pacePeak5s],
            [60, activity.metrics.pacePeak1min],
            [300, activity.metrics.pacePeak5min],
            [1200, activity.metrics.pacePeak20min],
          ];

          for (const [duration, value] of metricPeaks) {
            if (value && (!peaks[duration] || value > peaks[duration].value)) {
              peaks[duration] = {
                value,
                activityId: activity.id,
                achievedAt: activity.startDate,
              };
            }
          }
        }
      }

      // Calculate remaining durations from records
      const runDurations = [5, 30, 60, 180, 300, 600, 1200, 1800, 3600];
      const uncoveredDurations = runDurations.filter((d) => !peaks[d]);

      if (uncoveredDurations.length > 0) {
        for (const activity of activities.slice(0, 20)) {
          const records = await prisma.activityRecord.findMany({
            where: { activityId: activity.id },
            orderBy: { timestamp: 'asc' },
            select: { speed: true },
          });

          const speedData = records.map((r) => r.speed || 0);

          for (const duration of uncoveredDurations) {
            const peak = this.calculatePeakForDuration(speedData, duration);
            if (peak > 0 && (!peaks[duration] || peak > peaks[duration].value)) {
              peaks[duration] = {
                value: peak,
                activityId: activity.id,
                achievedAt: activity.startDate,
              };
            }
          }
        }
      }

      const points: CurvePoint[] = [];
      for (const duration of runDurations) {
        if (peaks[duration]) {
          points.push({
            duration,
            label: DURATION_LABELS[duration] || `${duration}s`,
            value: Math.round(peaks[duration].value * 100) / 100,
            activityId: peaks[duration].activityId,
            achievedAt: peaks[duration].achievedAt,
          });
        }
      }

      return {
        points,
        curveType: 'pace',
        periodDays: days,
        activityCount: activities.length,
      };
    } catch (error) {
      logger.error(`Failed to build pace curve for user ${userId}:`, error);
      return {
        points: [],
        curveType: 'pace',
        periodDays: days,
        activityCount: 0,
      };
    }
  }

  /**
   * Determine athlete phenotype from power curve
   *
   * Phenotypes:
   * - Sprinter: Strong in 5s-30s, weaker in 20min+
   * - Pursuiter: Strong in 1-5 min, balanced overall
   * - Time Trialist: Strong in 20min+, weaker in short durations
   * - All-Rounder: Balanced across all durations
   */
  determinePhenotype(points: CurvePoint[]): PhenotypeAnalysis {
    if (points.length < 4) {
      return {
        phenotype: 'all_rounder',
        description: 'Not enough data to determine phenotype',
        strengths: [],
        weaknesses: [],
        sprintScore: 0,
        sustainedScore: 0,
      };
    }

    // Find specific duration values
    const getValue = (duration: number): number => {
      const point = points.find((p) => p.duration === duration);
      return point?.value || 0;
    };

    const peak5s = getValue(5);
    const peak1min = getValue(60);
    const peak5min = getValue(300);
    const peak20min = getValue(1200);

    if (!peak5min || !peak20min || !peak5s) {
      return {
        phenotype: 'all_rounder',
        description: 'Insufficient data for phenotype analysis',
        strengths: [],
        weaknesses: [],
        sprintScore: 0,
        sustainedScore: 0,
      };
    }

    // Calculate ratios
    const sprintRatio = peak5s / peak5min; // High = sprinter
    const sustainedRatio = peak20min / peak5min; // High = time trialist (closer to 1)

    // Normalize to scores (0-100)
    // Typical sprinter: 5s/5min ratio > 2.0
    // Typical time trialist: 20min/5min ratio > 0.88
    const sprintScore = Math.min(100, ((sprintRatio - 1.5) / 0.7) * 100);
    const sustainedScore = Math.min(100, ((sustainedRatio - 0.80) / 0.12) * 100);

    let phenotype: Phenotype;
    let description: string;
    let strengths: string[] = [];
    let weaknesses: string[] = [];

    if (sprintScore > 70 && sustainedScore < 40) {
      phenotype = 'sprinter';
      description = 'Strong in short, explosive efforts';
      strengths = ['Sprint finishes', 'Short climbs', 'Attacks'];
      weaknesses = ['Time trials', 'Long climbs', 'Breakaways'];
    } else if (sprintScore < 40 && sustainedScore > 70) {
      phenotype = 'time_trialist';
      description = 'Excels at sustained high power';
      strengths = ['Time trials', 'Long climbs', 'Solo breakaways'];
      weaknesses = ['Sprint finishes', 'Punchy races', 'Short attacks'];
    } else if (sprintScore > 50 && sustainedScore > 50) {
      phenotype = 'pursuiter';
      description = 'Strong in 1-5 minute efforts';
      strengths = ['VO2max intervals', 'Medium climbs', 'Criteriums'];
      weaknesses = ['Pure sprints', 'Very long TTs'];
    } else {
      phenotype = 'all_rounder';
      description = 'Balanced power across all durations';
      strengths = ['Versatility', 'Stage races', 'Varied terrain'];
      weaknesses = ['No standout specialty'];
    }

    return {
      phenotype,
      description,
      strengths,
      weaknesses,
      sprintScore: Math.round(Math.max(0, sprintScore)),
      sustainedScore: Math.round(Math.max(0, sustainedScore)),
    };
  }

  /**
   * Estimate FTP from power curve
   * Uses 95% of 20-min power or regression from curve
   */
  estimateFTPFromCurve(points: CurvePoint[]): number {
    // Method 1: 95% of 20-min power (most accurate if available)
    const peak20min = points.find((p) => p.duration === 1200);
    if (peak20min) {
      return Math.round(peak20min.value * 0.95);
    }

    // Method 2: Use 8-min power × 0.9 if 20-min not available
    const peak8min = points.find((p) => p.duration === 480);
    if (peak8min) {
      return Math.round(peak8min.value * 0.9);
    }

    // Method 3: Regression from 5-min power
    const peak5min = points.find((p) => p.duration === 300);
    if (peak5min) {
      return Math.round(peak5min.value * 0.85);
    }

    return 0;
  }

  /**
   * Compare two power curves (e.g., current vs previous period)
   */
  compareCurves(
    currentCurve: DurationCurve,
    previousCurve: DurationCurve
  ): Array<{ duration: number; label: string; current: number; previous: number; change: number }> {
    const comparison: Array<{
      duration: number;
      label: string;
      current: number;
      previous: number;
      change: number;
    }> = [];

    for (const currentPoint of currentCurve.points) {
      const previousPoint = previousCurve.points.find((p) => p.duration === currentPoint.duration);
      if (previousPoint) {
        const change =
          previousPoint.value > 0
            ? Math.round(((currentPoint.value - previousPoint.value) / previousPoint.value) * 1000) /
              10
            : 0;

        comparison.push({
          duration: currentPoint.duration,
          label: currentPoint.label,
          current: currentPoint.value,
          previous: previousPoint.value,
          change,
        });
      }
    }

    return comparison;
  }
}

// Export singleton instance
export const durationCurveService = new DurationCurveService();
export default durationCurveService;
