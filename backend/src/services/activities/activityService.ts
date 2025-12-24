import { prisma } from '../../config/database';
import { pmcService } from '../metrics/pmcService';
import { metricsCalculator } from '../metrics/calculator';
import { logger } from '../../utils/logger';
import { SportType, WorkoutType, Prisma } from '@prisma/client';
import { createPaginationMeta, parsePagination } from '../../utils/helpers';

interface CreateActivityInput {
  name: string;
  description?: string;
  sportType: SportType;
  workoutType?: WorkoutType;
  startDate: Date;
  elapsedTime: number;
  movingTime: number;
  distance?: number;
  totalElevation?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPower?: number;
  maxPower?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgCadence?: number;
  tss?: number;
}

interface UpdateActivityInput extends Partial<CreateActivityInput> {}

interface ActivityFilters {
  sportType?: SportType;
  startDate?: Date;
  endDate?: Date;
  minDistance?: number;
  maxDistance?: number;
  minDuration?: number;
  maxDuration?: number;
  hasStreams?: boolean;
}

export class ActivityService {
  /**
   * Create a manual activity
   */
  async createActivity(userId: string, input: CreateActivityInput) {
    const profile = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    // Calculate TSS if not provided
    let tss = input.tss;
    let intensityFactor: number | null = null;
    let efficiencyFactor: number | null = null;

    if (!tss) {
      if (input.sportType === 'BIKE' && input.avgPower && profile?.ftp) {
        intensityFactor = input.avgPower / profile.ftp;
        tss = metricsCalculator.calculateBikeTSS(
          input.movingTime,
          input.avgPower,
          profile.ftp
        );
      } else if (input.sportType === 'RUN' && input.avgSpeed && profile?.thresholdPace) {
        const avgPace = 1000 / input.avgSpeed / 60;
        intensityFactor = profile.thresholdPace / avgPace;
        tss = metricsCalculator.calculateRunTSS(input.movingTime, intensityFactor);
      } else if (input.sportType === 'SWIM' && input.avgSpeed && profile?.css) {
        intensityFactor = input.avgSpeed / profile.css;
        tss = metricsCalculator.calculateSwimTSS(input.movingTime, intensityFactor);
      } else if (input.avgHeartRate && profile?.lthr) {
        tss = metricsCalculator.calculateHRBasedTSS(
          input.movingTime,
          input.avgHeartRate,
          profile.lthr
        );
      }
    }

    // Calculate EF
    if (input.avgHeartRate && input.avgHeartRate > 0) {
      if (input.sportType === 'BIKE' && input.avgPower) {
        efficiencyFactor = input.avgPower / input.avgHeartRate;
      } else if (input.sportType === 'RUN' && input.avgSpeed) {
        efficiencyFactor = (input.avgSpeed * 60) / input.avgHeartRate;
      }
    }

    const activity = await prisma.activity.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        sportType: input.sportType,
        workoutType: input.workoutType,
        startDate: input.startDate,
        elapsedTime: input.elapsedTime,
        movingTime: input.movingTime,
        distance: input.distance,
        totalElevation: input.totalElevation,
        avgHeartRate: input.avgHeartRate,
        maxHeartRate: input.maxHeartRate,
        avgPower: input.avgPower,
        maxPower: input.maxPower,
        avgSpeed: input.avgSpeed,
        maxSpeed: input.maxSpeed,
        avgCadence: input.avgCadence,
        tss,
        intensityFactor,
        efficiencyFactor,
        isManual: true,
        processed: true,
      },
    });

    // Update daily metrics
    await pmcService.updateDailyMetrics(userId, input.startDate);

    logger.info(`Created manual activity ${activity.id} for user ${userId}`);
    return activity;
  }

  /**
   * Get activity by ID
   */
  async getActivity(activityId: string, userId: string) {
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        userId,
      },
      include: {
        laps: {
          orderBy: { lapIndex: 'asc' },
        },
        metrics: true,
      },
    });

    return activity;
  }

  /**
   * Get activities with filters and pagination
   */
  async getActivities(
    userId: string,
    filters: ActivityFilters = {},
    pagination: { page?: string; limit?: string } = {}
  ) {
    const { skip, take, page } = parsePagination(pagination);

    // Build where clause
    const where: Prisma.ActivityWhereInput = {
      userId,
    };

    if (filters.sportType) {
      where.sportType = filters.sportType;
    }

    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startDate.lte = filters.endDate;
      }
    }

    if (filters.minDistance || filters.maxDistance) {
      where.distance = {};
      if (filters.minDistance) {
        where.distance.gte = filters.minDistance;
      }
      if (filters.maxDistance) {
        where.distance.lte = filters.maxDistance;
      }
    }

    if (filters.minDuration || filters.maxDuration) {
      where.movingTime = {};
      if (filters.minDuration) {
        where.movingTime.gte = filters.minDuration;
      }
      if (filters.maxDuration) {
        where.movingTime.lte = filters.maxDuration;
      }
    }

    if (filters.hasStreams !== undefined) {
      where.hasStreams = filters.hasStreams;
    }

    // Get total count and activities
    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take,
        select: {
          id: true,
          stravaId: true,
          name: true,
          sportType: true,
          workoutType: true,
          startDate: true,
          elapsedTime: true,
          movingTime: true,
          distance: true,
          totalElevation: true,
          tss: true,
          avgHeartRate: true,
          maxHeartRate: true,
          avgPower: true,
          normalizedPower: true,
          avgSpeed: true,
          avgCadence: true,
          efficiencyFactor: true,
          isManual: true,
          hasStreams: true,
        },
      }),
    ]);

    return {
      activities,
      meta: createPaginationMeta(total, page, take),
    };
  }

  /**
   * Update an activity
   */
  async updateActivity(
    activityId: string,
    userId: string,
    input: UpdateActivityInput
  ) {
    // Get existing activity
    const existing = await prisma.activity.findFirst({
      where: { id: activityId, userId },
    });

    if (!existing) {
      return null;
    }

    const oldDate = existing.startDate;

    // Update activity
    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    // Recalculate metrics if relevant fields changed
    if (
      input.movingTime !== undefined ||
      input.avgPower !== undefined ||
      input.avgSpeed !== undefined ||
      input.avgHeartRate !== undefined
    ) {
      await this.recalculateActivityMetrics(activityId, userId);
    }

    // Update daily metrics for old and new dates
    await pmcService.updateDailyMetrics(userId, oldDate);
    if (input.startDate && input.startDate.getTime() !== oldDate.getTime()) {
      await pmcService.updateDailyMetrics(userId, input.startDate);
    }

    logger.info(`Updated activity ${activityId}`);
    return activity;
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: string, userId: string): Promise<boolean> {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, userId },
      select: { id: true, startDate: true },
    });

    if (!activity) {
      return false;
    }

    // Delete activity (cascades to records, laps, etc.)
    await prisma.activity.delete({
      where: { id: activityId },
    });

    // Recalculate daily metrics
    await pmcService.updateDailyMetrics(userId, activity.startDate);

    logger.info(`Deleted activity ${activityId}`);
    return true;
  }

  /**
   * Recalculate activity metrics
   */
  async recalculateActivityMetrics(activityId: string, userId: string) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        user: { include: { profile: true } },
      },
    });

    if (!activity) return;

    const profile = activity.user.profile;
    let tss: number | null = null;
    let intensityFactor: number | null = null;
    let efficiencyFactor: number | null = null;

    // Calculate TSS
    if (activity.sportType === 'BIKE') {
      const np = activity.normalizedPower || activity.avgPower;
      if (np && profile?.ftp) {
        intensityFactor = np / profile.ftp;
        tss = metricsCalculator.calculateBikeTSS(activity.movingTime, np, profile.ftp);
      }
    } else if (activity.sportType === 'RUN') {
      if (activity.avgSpeed && profile?.thresholdPace) {
        const avgPace = 1000 / activity.avgSpeed / 60;
        intensityFactor = profile.thresholdPace / avgPace;
        tss = metricsCalculator.calculateRunTSS(activity.movingTime, intensityFactor);
      }
    } else if (activity.sportType === 'SWIM') {
      if (activity.avgSpeed && profile?.css) {
        intensityFactor = activity.avgSpeed / profile.css;
        tss = metricsCalculator.calculateSwimTSS(activity.movingTime, intensityFactor);
      }
    }

    // Fallback to HR-based TSS
    if (!tss && activity.avgHeartRate && profile?.lthr) {
      tss = metricsCalculator.calculateHRBasedTSS(
        activity.movingTime,
        activity.avgHeartRate,
        profile.lthr
      );
    }

    // Calculate EF
    if (activity.avgHeartRate && activity.avgHeartRate > 0) {
      if (activity.sportType === 'BIKE' && activity.normalizedPower) {
        efficiencyFactor = activity.normalizedPower / activity.avgHeartRate;
      } else if (activity.sportType === 'RUN' && activity.avgSpeed) {
        efficiencyFactor = (activity.avgSpeed * 60) / activity.avgHeartRate;
      }
    }

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        tss,
        intensityFactor,
        efficiencyFactor,
      },
    });

    // Update daily metrics
    await pmcService.updateDailyMetrics(userId, activity.startDate);
  }

  /**
   * Get activity streams (time series data)
   */
  async getActivityStreams(activityId: string, userId: string) {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, userId },
      select: { id: true, hasStreams: true },
    });

    if (!activity || !activity.hasStreams) {
      return null;
    }

    const records = await prisma.activityRecord.findMany({
      where: { activityId },
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        heartRate: true,
        power: true,
        cadence: true,
        speed: true,
        altitude: true,
        latitude: true,
        longitude: true,
        groundContactTime: true,
        verticalOscillation: true,
      },
    });

    // Transform to stream format
    const streams: Record<string, (number | null)[]> = {
      time: [],
      heartrate: [],
      power: [],
      cadence: [],
      velocity: [],
      altitude: [],
      latlng: [],
    };

    for (const record of records) {
      streams.time.push(record.timestamp);
      streams.heartrate.push(record.heartRate);
      streams.power.push(record.power);
      streams.cadence.push(record.cadence);
      streams.velocity.push(record.speed);
      streams.altitude.push(record.altitude);
      if (record.latitude && record.longitude) {
        (streams.latlng as any).push([record.latitude, record.longitude]);
      }
    }

    return streams;
  }

  /**
   * Get activity splits
   */
  async getActivitySplits(activityId: string, userId: string) {
    const activity = await prisma.activity.findFirst({
      where: { id: activityId, userId },
      select: { id: true },
    });

    if (!activity) return null;

    return prisma.activitySplit.findMany({
      where: { activityId },
      orderBy: { splitIndex: 'asc' },
    });
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(userId: string, limit: number = 10) {
    return prisma.activity.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        sportType: true,
        startDate: true,
        movingTime: true,
        distance: true,
        tss: true,
        avgHeartRate: true,
        avgPower: true,
      },
    });
  }

  /**
   * Get activity count by sport type
   */
  async getActivityStats(userId: string) {
    const stats = await prisma.activity.groupBy({
      by: ['sportType'],
      where: { userId },
      _count: { id: true },
      _sum: {
        distance: true,
        movingTime: true,
        tss: true,
      },
    });

    return stats.map((s) => ({
      sportType: s.sportType,
      count: s._count.id,
      totalDistance: s._sum.distance || 0,
      totalDuration: s._sum.movingTime || 0,
      totalTss: s._sum.tss || 0,
    }));
  }
}

// Export singleton instance
export const activityService = new ActivityService();
export default activityService;
