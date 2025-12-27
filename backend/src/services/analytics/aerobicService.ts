import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Decoupling result with rating
 */
export interface DecouplingResult {
  decouplingPercent: number;
  efFirstHalf: number;
  efSecondHalf: number;
  rating: 'excellent' | 'good' | 'needs_work' | 'deficient';
  usedPower: boolean;
}

/**
 * EF trend data point
 */
export interface EFTrendPoint {
  date: Date;
  activityId: string;
  activityName: string;
  ef: number;
  duration: number;
  distance?: number;
}

/**
 * EF trend analysis
 */
export interface EFTrendData {
  points: EFTrendPoint[];
  averageEF: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  trendPercent: number;
  bestEF: EFTrendPoint | null;
}

/**
 * Aerobic Analytics Service
 * Handles Efficiency Factor and Aerobic Decoupling calculations
 */
export class AerobicService {
  /**
   * Calculate Efficiency Factor (EF)
   * Bike: NP / Avg HR
   * Run: Speed (m/s × 60) / Avg HR
   *
   * Higher EF = better aerobic efficiency
   */
  calculateEfficiencyFactor(
    output: number, // NP for bike (watts), speed for run (m/s)
    avgHR: number,
    sportType: 'BIKE' | 'RUN'
  ): number {
    if (avgHR <= 0) return 0;

    if (sportType === 'BIKE') {
      // EF = NP / HR (typically 1.0-2.0 for trained cyclists)
      return Math.round((output / avgHR) * 1000) / 1000;
    } else {
      // EF = (m/s × 60) / HR (expressed as m/min/bpm)
      return Math.round(((output * 60) / avgHR) * 1000) / 1000;
    }
  }

  /**
   * Calculate Aerobic Decoupling (Pw:Hr or Pa:Hr)
   * Compares first half EF to second half EF
   * Decoupling % = ((EF1 - EF2) / EF1) × 100
   *
   * Ratings:
   * <5% = excellent (fully aerobic)
   * 5-7.5% = good (aerobic with some drift)
   * 7.5-10% = needs work (aerobic capacity developing)
   * >10% = deficient (needs more base training)
   */
  async calculateDecoupling(
    activityId: string,
    usePower: boolean = true
  ): Promise<DecouplingResult | null> {
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

      if (records.length < 20) {
        logger.debug(`Not enough records for decoupling calculation: ${records.length}`);
        return null;
      }

      const midpoint = Math.floor(records.length / 2);
      const firstHalf = records.slice(0, midpoint);
      const secondHalf = records.slice(midpoint);

      const calculateHalfEF = (
        data: typeof records,
        usePower: boolean
      ): { ef: number; usedPower: boolean } | null => {
        const validRecords = data.filter((r) => {
          if (usePower) {
            return r.heartRate && r.power;
          }
          return r.heartRate && r.speed;
        });

        if (validRecords.length < 10) return null;

        const avgHR = validRecords.reduce((sum, r) => sum + (r.heartRate || 0), 0) / validRecords.length;

        if (usePower) {
          const avgPower = validRecords.reduce((sum, r) => sum + (r.power || 0), 0) / validRecords.length;
          return { ef: avgPower / avgHR, usedPower: true };
        } else {
          const avgSpeed = validRecords.reduce((sum, r) => sum + (r.speed || 0), 0) / validRecords.length;
          return { ef: (avgSpeed * 60) / avgHR, usedPower: false };
        }
      };

      let result1 = calculateHalfEF(firstHalf, usePower);
      let result2 = calculateHalfEF(secondHalf, usePower);

      // Fall back to speed if power not available
      if (!result1 && usePower) {
        result1 = calculateHalfEF(firstHalf, false);
        result2 = calculateHalfEF(secondHalf, false);
      }

      if (!result1 || !result2) {
        return null;
      }

      const decouplingPercent = ((result1.ef - result2.ef) / result1.ef) * 100;
      const roundedDecoupling = Math.round(decouplingPercent * 100) / 100;

      let rating: DecouplingResult['rating'];
      if (roundedDecoupling < 5) {
        rating = 'excellent';
      } else if (roundedDecoupling < 7.5) {
        rating = 'good';
      } else if (roundedDecoupling < 10) {
        rating = 'needs_work';
      } else {
        rating = 'deficient';
      }

      return {
        decouplingPercent: roundedDecoupling,
        efFirstHalf: Math.round(result1.ef * 1000) / 1000,
        efSecondHalf: Math.round(result2.ef * 1000) / 1000,
        rating,
        usedPower: result1.usedPower,
      };
    } catch (error) {
      logger.error(`Failed to calculate decoupling for activity ${activityId}:`, error);
      return null;
    }
  }

  /**
   * Get EF trend over time for a user
   */
  async getEFTrend(
    userId: string,
    sportType: 'BIKE' | 'RUN',
    days: number = 90
  ): Promise<EFTrendData> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          sportType,
          startDate: { gte: startDate },
          avgHeartRate: { not: null },
          movingTime: { gte: 1800 }, // At least 30 min
        },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          name: true,
          startDate: true,
          movingTime: true,
          distance: true,
          avgHeartRate: true,
          avgSpeed: true,
          normalizedPower: true,
          efficiencyFactor: true,
        },
      });

      const points: EFTrendPoint[] = [];

      for (const activity of activities) {
        let ef: number | null = activity.efficiencyFactor;

        // Calculate EF if not stored
        if (!ef) {
          if (sportType === 'BIKE' && activity.normalizedPower && activity.avgHeartRate) {
            ef = this.calculateEfficiencyFactor(
              activity.normalizedPower,
              activity.avgHeartRate,
              'BIKE'
            );
          } else if (sportType === 'RUN' && activity.avgSpeed && activity.avgHeartRate) {
            ef = this.calculateEfficiencyFactor(
              activity.avgSpeed,
              activity.avgHeartRate,
              'RUN'
            );
          }
        }

        if (ef && ef > 0) {
          points.push({
            date: activity.startDate,
            activityId: activity.id,
            activityName: activity.name,
            ef,
            duration: activity.movingTime,
            distance: activity.distance || undefined,
          });
        }
      }

      if (points.length === 0) {
        return {
          points: [],
          averageEF: 0,
          trendDirection: 'stable',
          trendPercent: 0,
          bestEF: null,
        };
      }

      // Calculate average
      const averageEF = points.reduce((sum, p) => sum + p.ef, 0) / points.length;

      // Find best EF
      const bestEF = points.reduce((best, p) => (p.ef > best.ef ? p : best), points[0]);

      // Calculate trend (compare first third to last third)
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      let trendPercent = 0;

      if (points.length >= 6) {
        const thirdCount = Math.floor(points.length / 3);
        const firstThird = points.slice(0, thirdCount);
        const lastThird = points.slice(-thirdCount);

        const firstAvg = firstThird.reduce((sum, p) => sum + p.ef, 0) / firstThird.length;
        const lastAvg = lastThird.reduce((sum, p) => sum + p.ef, 0) / lastThird.length;

        trendPercent = Math.round(((lastAvg - firstAvg) / firstAvg) * 1000) / 10;

        if (trendPercent > 3) {
          trendDirection = 'improving';
        } else if (trendPercent < -3) {
          trendDirection = 'declining';
        }
      }

      return {
        points,
        averageEF: Math.round(averageEF * 1000) / 1000,
        trendDirection,
        trendPercent,
        bestEF,
      };
    } catch (error) {
      logger.error(`Failed to get EF trend for user ${userId}:`, error);
      return {
        points: [],
        averageEF: 0,
        trendDirection: 'stable',
        trendPercent: 0,
        bestEF: null,
      };
    }
  }

  /**
   * Calculate EF for an activity and store it
   */
  async calculateAndStoreEF(activityId: string): Promise<number | null> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          sportType: true,
          avgHeartRate: true,
          avgSpeed: true,
          normalizedPower: true,
        },
      });

      if (!activity || !activity.avgHeartRate) return null;

      let ef: number | null = null;

      if (activity.sportType === 'BIKE' && activity.normalizedPower) {
        ef = this.calculateEfficiencyFactor(
          activity.normalizedPower,
          activity.avgHeartRate,
          'BIKE'
        );
      } else if (activity.sportType === 'RUN' && activity.avgSpeed) {
        ef = this.calculateEfficiencyFactor(
          activity.avgSpeed,
          activity.avgHeartRate,
          'RUN'
        );
      }

      if (ef) {
        await prisma.activity.update({
          where: { id: activityId },
          data: { efficiencyFactor: ef },
        });
      }

      return ef;
    } catch (error) {
      logger.error(`Failed to calculate and store EF for activity ${activityId}:`, error);
      return null;
    }
  }

  /**
   * Calculate decoupling for an activity and store it
   */
  async calculateAndStoreDecoupling(activityId: string): Promise<number | null> {
    try {
      const result = await this.calculateDecoupling(activityId);

      if (result) {
        await prisma.activity.update({
          where: { id: activityId },
          data: { decoupling: result.decouplingPercent },
        });

        // Also update ActivityMetrics if exists
        await prisma.activityMetrics.updateMany({
          where: { activityId },
          data: { aerobicDecoupling: result.decouplingPercent },
        });

        return result.decouplingPercent;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to calculate and store decoupling for activity ${activityId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const aerobicService = new AerobicService();
export default aerobicService;
