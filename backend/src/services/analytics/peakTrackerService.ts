import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { SportType, PeakMetricType } from '@prisma/client';
import { durationCurveService, STANDARD_DURATIONS, DURATION_LABELS } from './durationCurveService';

/**
 * Peak performance record
 */
export interface PeakPerformance {
  id: string;
  sportType: SportType;
  metricType: PeakMetricType;
  value: number;
  duration?: number;
  distance?: number;
  activityId?: string;
  achievedAt: Date;
  previousBest?: number;
  improvement?: number;
  isAllTime: boolean;
}

/**
 * Peak performances grouped by sport
 */
export interface SportPeaks {
  sportType: SportType;
  peaks: PeakPerformance[];
}

/**
 * Duration to PeakMetricType mapping for power
 */
const POWER_DURATION_MAP: Record<number, PeakMetricType> = {
  5: 'POWER_5S',
  10: 'POWER_10S',
  15: 'POWER_15S',
  30: 'POWER_30S',
  60: 'POWER_1MIN',
  120: 'POWER_2MIN',
  180: 'POWER_3MIN',
  300: 'POWER_5MIN',
  600: 'POWER_10MIN',
  1200: 'POWER_20MIN',
  1800: 'POWER_30MIN',
  3600: 'POWER_60MIN',
  5400: 'POWER_90MIN',
  7200: 'POWER_120MIN',
};

/**
 * Peak Performance Tracker Service
 *
 * Tracks personal records across all sports and metrics
 */
export class PeakTrackerService {
  /**
   * Get all peak performances for a user
   */
  async getPeakPerformances(
    userId: string,
    sportType?: SportType
  ): Promise<SportPeaks[]> {
    try {
      const where: any = { userId };
      if (sportType) {
        where.sportType = sportType;
      }

      const peaks = await prisma.peakPerformance.findMany({
        where,
        orderBy: [{ sportType: 'asc' }, { metricType: 'asc' }, { achievedAt: 'desc' }],
      });

      // Group by sport
      const grouped = new Map<SportType, PeakPerformance[]>();

      for (const peak of peaks) {
        const sportPeaks = grouped.get(peak.sportType) || [];
        sportPeaks.push({
          id: peak.id,
          sportType: peak.sportType,
          metricType: peak.metricType,
          value: peak.value,
          duration: peak.duration || undefined,
          distance: peak.distance || undefined,
          activityId: peak.activityId || undefined,
          achievedAt: peak.achievedAt,
          previousBest: peak.previousBest || undefined,
          improvement: peak.improvement || undefined,
          isAllTime: true, // All stored peaks are all-time PRs
        });
        grouped.set(peak.sportType, sportPeaks);
      }

      const result: SportPeaks[] = [];
      for (const [sport, sportPeaks] of grouped) {
        result.push({ sportType: sport, peaks: sportPeaks });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get peak performances for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Check for new PRs in an activity and record them
   */
  async checkForPRs(activityId: string): Promise<PeakPerformance[]> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          metrics: true,
          user: {
            select: { id: true },
          },
        },
      });

      if (!activity) {
        return [];
      }

      const userId = activity.userId;
      const sportType = activity.sportType;
      const newPRs: PeakPerformance[] = [];

      if (sportType === 'BIKE' && activity.metrics) {
        // Check power PRs
        const powerPeaks: [number, number | null][] = [
          [5, activity.metrics.peak5s],
          [30, activity.metrics.peak30s],
          [60, activity.metrics.peak1min],
          [300, activity.metrics.peak5min],
          [1200, activity.metrics.peak20min],
          [3600, activity.metrics.peak60min],
        ];

        for (const [duration, value] of powerPeaks) {
          if (value && value > 0) {
            const metricType = POWER_DURATION_MAP[duration];
            if (metricType) {
              const pr = await this.checkAndRecordPR(
                userId,
                sportType,
                metricType,
                value,
                activityId,
                activity.startDate,
                duration
              );
              if (pr) newPRs.push(pr);
            }
          }
        }
      }

      if (sportType === 'RUN' && activity.metrics) {
        // Check pace PRs
        const pacePeaks: [PeakMetricType, number | null][] = [
          ['PACE_400M', activity.metrics.pacePeak5s], // Approximate
          ['PACE_1KM', activity.metrics.pacePeak1min],
          ['PACE_5KM', activity.metrics.pacePeak5min],
        ];

        for (const [metricType, value] of pacePeaks) {
          if (value && value > 0) {
            const pr = await this.checkAndRecordPR(
              userId,
              sportType,
              metricType,
              value,
              activityId,
              activity.startDate
            );
            if (pr) newPRs.push(pr);
          }
        }
      }

      // Check longest activity PRs
      if (activity.distance) {
        let metricType: PeakMetricType | null = null;
        if (sportType === 'RUN') metricType = 'LONGEST_RUN';
        else if (sportType === 'BIKE') metricType = 'LONGEST_RIDE';

        if (metricType) {
          const pr = await this.checkAndRecordPR(
            userId,
            sportType,
            metricType,
            activity.distance,
            activityId,
            activity.startDate,
            undefined,
            activity.distance
          );
          if (pr) newPRs.push(pr);
        }
      }

      // Check max HR PR
      if (activity.maxHeartRate) {
        const pr = await this.checkAndRecordPR(
          userId,
          sportType,
          'MAX_HR',
          activity.maxHeartRate,
          activityId,
          activity.startDate
        );
        if (pr) newPRs.push(pr);
      }

      // Check TSS PR
      if (activity.tss) {
        const pr = await this.checkAndRecordPR(
          userId,
          sportType,
          'HIGHEST_TSS',
          activity.tss,
          activityId,
          activity.startDate
        );
        if (pr) newPRs.push(pr);
      }

      // Check EF PR
      if (activity.efficiencyFactor) {
        const pr = await this.checkAndRecordPR(
          userId,
          sportType,
          'BEST_EF',
          activity.efficiencyFactor,
          activityId,
          activity.startDate
        );
        if (pr) newPRs.push(pr);
      }

      return newPRs;
    } catch (error) {
      logger.error(`Failed to check for PRs in activity ${activityId}:`, error);
      return [];
    }
  }

  /**
   * Check if a value is a PR and record it
   */
  private async checkAndRecordPR(
    userId: string,
    sportType: SportType,
    metricType: PeakMetricType,
    value: number,
    activityId: string,
    achievedAt: Date,
    duration?: number,
    distance?: number
  ): Promise<PeakPerformance | null> {
    try {
      // Get current best
      const currentBest = await prisma.peakPerformance.findFirst({
        where: {
          userId,
          sportType,
          metricType,
        },
        orderBy: { value: 'desc' },
      });

      // Check if new value is better
      const isPR = !currentBest || value > currentBest.value;

      if (!isPR) {
        return null;
      }

      const previousBest = currentBest?.value;
      const improvement = previousBest ? ((value - previousBest) / previousBest) * 100 : undefined;

      // Record the new PR
      const newPR = await prisma.peakPerformance.create({
        data: {
          userId,
          sportType,
          metricType,
          value,
          duration,
          distance,
          activityId,
          achievedAt,
          previousBest,
          improvement: improvement ? Math.round(improvement * 100) / 100 : undefined,
        },
      });

      logger.info(
        `New PR recorded for user ${userId}: ${metricType} = ${value} (${improvement?.toFixed(1)}% improvement)`
      );

      return {
        id: newPR.id,
        sportType: newPR.sportType,
        metricType: newPR.metricType,
        value: newPR.value,
        duration: newPR.duration || undefined,
        distance: newPR.distance || undefined,
        activityId: newPR.activityId || undefined,
        achievedAt: newPR.achievedAt,
        previousBest: newPR.previousBest || undefined,
        improvement: newPR.improvement || undefined,
        isAllTime: true,
      };
    } catch (error) {
      logger.error(`Failed to check/record PR for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get recent PRs for a user
   */
  async getRecentPRs(userId: string, days: number = 30): Promise<PeakPerformance[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const peaks = await prisma.peakPerformance.findMany({
        where: {
          userId,
          achievedAt: { gte: startDate },
        },
        orderBy: { achievedAt: 'desc' },
      });

      return peaks.map((p) => ({
        id: p.id,
        sportType: p.sportType,
        metricType: p.metricType,
        value: p.value,
        duration: p.duration || undefined,
        distance: p.distance || undefined,
        activityId: p.activityId || undefined,
        achievedAt: p.achievedAt,
        previousBest: p.previousBest || undefined,
        improvement: p.improvement || undefined,
        isAllTime: true,
      }));
    } catch (error) {
      logger.error(`Failed to get recent PRs for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Format metric type for display
   */
  formatMetricType(metricType: PeakMetricType): string {
    const labels: Partial<Record<PeakMetricType, string>> = {
      POWER_5S: '5-Second Power',
      POWER_10S: '10-Second Power',
      POWER_15S: '15-Second Power',
      POWER_30S: '30-Second Power',
      POWER_1MIN: '1-Minute Power',
      POWER_2MIN: '2-Minute Power',
      POWER_3MIN: '3-Minute Power',
      POWER_5MIN: '5-Minute Power',
      POWER_10MIN: '10-Minute Power',
      POWER_20MIN: '20-Minute Power',
      POWER_30MIN: '30-Minute Power',
      POWER_60MIN: '60-Minute Power',
      POWER_90MIN: '90-Minute Power',
      POWER_120MIN: '120-Minute Power',
      PACE_400M: '400m Pace',
      PACE_1KM: '1km Pace',
      PACE_1MILE: '1 Mile Pace',
      PACE_5KM: '5km Pace',
      PACE_10KM: '10km Pace',
      PACE_HALF_MARATHON: 'Half Marathon Pace',
      PACE_MARATHON: 'Marathon Pace',
      SWIM_100M: '100m Swim',
      SWIM_200M: '200m Swim',
      SWIM_400M: '400m Swim',
      SWIM_1500M: '1500m Swim',
      MAX_HR: 'Max Heart Rate',
      LONGEST_RIDE: 'Longest Ride',
      LONGEST_RUN: 'Longest Run',
      HIGHEST_TSS: 'Highest TSS',
      BEST_EF: 'Best Efficiency Factor',
    };

    return labels[metricType] || metricType;
  }

  /**
   * Format value with appropriate unit
   */
  formatValue(metricType: PeakMetricType, value: number): string {
    if (metricType.startsWith('POWER_')) {
      return `${Math.round(value)}W`;
    }
    if (metricType.startsWith('PACE_')) {
      // Value is in m/s, convert to min/km
      const minPerKm = 1000 / value / 60;
      const mins = Math.floor(minPerKm);
      const secs = Math.round((minPerKm - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}/km`;
    }
    if (metricType.startsWith('SWIM_')) {
      // Value is time in seconds
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    if (metricType === 'MAX_HR') {
      return `${Math.round(value)} bpm`;
    }
    if (metricType === 'LONGEST_RIDE' || metricType === 'LONGEST_RUN') {
      // Value is in meters
      return `${(value / 1000).toFixed(1)} km`;
    }
    if (metricType === 'HIGHEST_TSS') {
      return `${Math.round(value)} TSS`;
    }
    if (metricType === 'BEST_EF') {
      return value.toFixed(3);
    }

    return String(value);
  }

  /**
   * Build complete power curve from stored peaks
   */
  async getPowerCurveFromPeaks(userId: string): Promise<Map<number, number>> {
    try {
      const powerMetricTypes: PeakMetricType[] = [
        'POWER_5S',
        'POWER_10S',
        'POWER_15S',
        'POWER_30S',
        'POWER_1MIN',
        'POWER_2MIN',
        'POWER_3MIN',
        'POWER_5MIN',
        'POWER_10MIN',
        'POWER_20MIN',
        'POWER_30MIN',
        'POWER_60MIN',
        'POWER_90MIN',
        'POWER_120MIN',
      ];

      const peaks = await prisma.peakPerformance.findMany({
        where: {
          userId,
          sportType: 'BIKE',
          metricType: { in: powerMetricTypes },
        },
      });

      const curve = new Map<number, number>();

      for (const peak of peaks) {
        if (peak.duration) {
          curve.set(peak.duration, peak.value);
        }
      }

      return curve;
    } catch (error) {
      logger.error(`Failed to get power curve from peaks for user ${userId}:`, error);
      return new Map();
    }
  }
}

// Export singleton instance
export const peakTrackerService = new PeakTrackerService();
export default peakTrackerService;
