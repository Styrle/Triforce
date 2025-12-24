import { prisma } from '../../config/database';
import { CTL_TIME_CONSTANT, ATL_TIME_CONSTANT } from '../../config/constants';
import { logger } from '../../utils/logger';
import { startOfDay, addDays } from '../../utils/helpers';

export class PMCService {
  /**
   * Update daily metrics for a specific date
   * Aggregates all activities for the day and recalculates PMC
   */
  async updateDailyMetrics(userId: string, date: Date): Promise<void> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // Get all activities for the day
      const activities = await prisma.activity.findMany({
        where: {
          userId,
          startDate: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: {
          sportType: true,
          tss: true,
          movingTime: true,
          distance: true,
        },
      });

      // Aggregate metrics
      const totalTss = activities.reduce((sum, a) => sum + (a.tss || 0), 0);
      const totalDuration = activities.reduce((sum, a) => sum + a.movingTime, 0);
      const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);

      // By sport
      const bySport = {
        swimDuration: 0,
        bikeDuration: 0,
        runDuration: 0,
        strengthDuration: 0,
        swimTss: 0,
        bikeTss: 0,
        runTss: 0,
      };

      for (const activity of activities) {
        if (activity.sportType === 'SWIM') {
          bySport.swimDuration += activity.movingTime;
          bySport.swimTss += activity.tss || 0;
        } else if (activity.sportType === 'BIKE') {
          bySport.bikeDuration += activity.movingTime;
          bySport.bikeTss += activity.tss || 0;
        } else if (activity.sportType === 'RUN') {
          bySport.runDuration += activity.movingTime;
          bySport.runTss += activity.tss || 0;
        } else if (activity.sportType === 'STRENGTH') {
          bySport.strengthDuration += activity.movingTime;
        }
      }

      // Get previous day's metrics for PMC calculation
      const previousDate = addDays(dayStart, -1);
      const previousMetrics = await prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: previousDate } },
        select: { ctl: true, atl: true },
      });

      const prevCtl = previousMetrics?.ctl || 0;
      const prevAtl = previousMetrics?.atl || 0;

      // Calculate new CTL, ATL, TSB
      // CTL = yesterday_CTL + (today_TSS - yesterday_CTL) / CTL_constant
      // ATL = yesterday_ATL + (today_TSS - yesterday_ATL) / ATL_constant
      // TSB = CTL - ATL
      const ctl = prevCtl + (totalTss - prevCtl) / CTL_TIME_CONSTANT;
      const atl = prevAtl + (totalTss - prevAtl) / ATL_TIME_CONSTANT;
      const tsb = ctl - atl;

      // Upsert daily metrics
      await prisma.dailyMetrics.upsert({
        where: { userId_date: { userId, date: dayStart } },
        create: {
          userId,
          date: dayStart,
          tss: totalTss,
          ctl,
          atl,
          tsb,
          activityCount: activities.length,
          totalDuration,
          totalDistance,
          ...bySport,
        },
        update: {
          tss: totalTss,
          ctl,
          atl,
          tsb,
          activityCount: activities.length,
          totalDuration,
          totalDistance,
          ...bySport,
        },
      });

      // Propagate PMC updates to future days
      await this.propagatePMC(userId, dayStart);

      logger.debug(`Updated daily metrics for ${userId} on ${dayStart.toISOString()}`);
    } catch (error) {
      logger.error(`Failed to update daily metrics:`, error);
      throw error;
    }
  }

  /**
   * Propagate PMC calculations forward in time
   * Called after a historical activity is added/modified
   */
  async propagatePMC(userId: string, fromDate: Date): Promise<void> {
    try {
      const today = startOfDay(new Date());
      let currentDate = addDays(startOfDay(fromDate), 1);

      // Get starting metrics
      let prevMetrics = await prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: startOfDay(fromDate) } },
        select: { ctl: true, atl: true },
      });

      while (currentDate <= today) {
        // Get or create daily metrics for this day
        const existing = await prisma.dailyMetrics.findUnique({
          where: { userId_date: { userId, date: currentDate } },
        });

        const prevCtl = prevMetrics?.ctl || 0;
        const prevAtl = prevMetrics?.atl || 0;
        const dayTss = existing?.tss || 0;

        const ctl = prevCtl + (dayTss - prevCtl) / CTL_TIME_CONSTANT;
        const atl = prevAtl + (dayTss - prevAtl) / ATL_TIME_CONSTANT;
        const tsb = ctl - atl;

        if (existing) {
          // Update existing
          await prisma.dailyMetrics.update({
            where: { id: existing.id },
            data: { ctl, atl, tsb },
          });
        } else {
          // Create new (no training day)
          await prisma.dailyMetrics.create({
            data: {
              userId,
              date: currentDate,
              tss: 0,
              ctl,
              atl,
              tsb,
              activityCount: 0,
              totalDuration: 0,
              totalDistance: 0,
            },
          });
        }

        prevMetrics = { ctl, atl };
        currentDate = addDays(currentDate, 1);
      }
    } catch (error) {
      logger.error(`Failed to propagate PMC:`, error);
      throw error;
    }
  }

  /**
   * Get PMC data for a date range
   */
  async getPMCData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    date: Date;
    tss: number;
    ctl: number;
    atl: number;
    tsb: number;
  }[]> {
    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay(startDate),
          lte: startOfDay(endDate),
        },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        tss: true,
        ctl: true,
        atl: true,
        tsb: true,
      },
    });

    return metrics.map((m) => ({
      date: m.date,
      tss: m.tss,
      ctl: m.ctl || 0,
      atl: m.atl || 0,
      tsb: m.tsb || 0,
    }));
  }

  /**
   * Get current fitness metrics
   */
  async getCurrentMetrics(userId: string): Promise<{
    ctl: number;
    atl: number;
    tsb: number;
    ctlChange: number;
    atlChange: number;
  }> {
    const today = startOfDay(new Date());
    const weekAgo = addDays(today, -7);

    const [currentMetrics, weekAgoMetrics] = await Promise.all([
      prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { ctl: true, atl: true, tsb: true },
      }),
      prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: weekAgo } },
        select: { ctl: true, atl: true },
      }),
    ]);

    const current = {
      ctl: currentMetrics?.ctl || 0,
      atl: currentMetrics?.atl || 0,
      tsb: currentMetrics?.tsb || 0,
    };

    return {
      ...current,
      ctlChange: current.ctl - (weekAgoMetrics?.ctl || 0),
      atlChange: current.atl - (weekAgoMetrics?.atl || 0),
    };
  }

  /**
   * Calculate ramp rate (weekly CTL change)
   */
  async calculateRampRate(userId: string): Promise<number> {
    const today = startOfDay(new Date());
    const weekAgo = addDays(today, -7);

    const [todayMetrics, weekAgoMetrics] = await Promise.all([
      prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { ctl: true },
      }),
      prisma.dailyMetrics.findUnique({
        where: { userId_date: { userId, date: weekAgo } },
        select: { ctl: true },
      }),
    ]);

    const currentCtl = todayMetrics?.ctl || 0;
    const previousCtl = weekAgoMetrics?.ctl || 0;

    return currentCtl - previousCtl;
  }

  /**
   * Get week summary
   */
  async getWeekSummary(userId: string, weekStart?: Date): Promise<{
    totalTss: number;
    totalDuration: number;
    totalDistance: number;
    activityCount: number;
    bySport: Record<string, { duration: number; tss: number }>;
    targetTss?: number;
  }> {
    const start = weekStart ? startOfDay(weekStart) : this.getWeekStart(new Date());
    const end = addDays(start, 7);

    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const summary = {
      totalTss: 0,
      totalDuration: 0,
      totalDistance: 0,
      activityCount: 0,
      bySport: {
        SWIM: { duration: 0, tss: 0 },
        BIKE: { duration: 0, tss: 0 },
        RUN: { duration: 0, tss: 0 },
        STRENGTH: { duration: 0, tss: 0 },
      } as Record<string, { duration: number; tss: number }>,
    };

    for (const day of metrics) {
      summary.totalTss += day.tss;
      summary.totalDuration += day.totalDuration;
      summary.totalDistance += day.totalDistance;
      summary.activityCount += day.activityCount;
      summary.bySport.SWIM.duration += day.swimDuration;
      summary.bySport.SWIM.tss += day.swimTss;
      summary.bySport.BIKE.duration += day.bikeDuration;
      summary.bySport.BIKE.tss += day.bikeTss;
      summary.bySport.RUN.duration += day.runDuration;
      summary.bySport.RUN.tss += day.runTss;
      summary.bySport.STRENGTH.duration += day.strengthDuration;
    }

    return summary;
  }

  /**
   * Get start of week (Monday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Initialize PMC for a new user (backfill from first activity)
   */
  async initializePMC(userId: string): Promise<void> {
    try {
      // Find the first activity
      const firstActivity = await prisma.activity.findFirst({
        where: { userId },
        orderBy: { startDate: 'asc' },
        select: { startDate: true },
      });

      if (!firstActivity) {
        logger.info(`No activities found for user ${userId}, skipping PMC init`);
        return;
      }

      // Start from the first activity date
      const startDate = startOfDay(firstActivity.startDate);
      const today = startOfDay(new Date());
      let currentDate = startDate;

      let prevCtl = 0;
      let prevAtl = 0;

      while (currentDate <= today) {
        // Get activities for this day
        const dayEnd = addDays(currentDate, 1);
        const activities = await prisma.activity.findMany({
          where: {
            userId,
            startDate: {
              gte: currentDate,
              lt: dayEnd,
            },
          },
          select: { tss: true },
        });

        const dayTss = activities.reduce((sum, a) => sum + (a.tss || 0), 0);

        // Calculate PMC
        const ctl = prevCtl + (dayTss - prevCtl) / CTL_TIME_CONSTANT;
        const atl = prevAtl + (dayTss - prevAtl) / ATL_TIME_CONSTANT;
        const tsb = ctl - atl;

        // Upsert daily metrics
        await prisma.dailyMetrics.upsert({
          where: { userId_date: { userId, date: currentDate } },
          create: {
            userId,
            date: currentDate,
            tss: dayTss,
            ctl,
            atl,
            tsb,
            activityCount: activities.length,
          },
          update: {
            ctl,
            atl,
            tsb,
          },
        });

        prevCtl = ctl;
        prevAtl = atl;
        currentDate = addDays(currentDate, 1);
      }

      logger.info(`Initialized PMC for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to initialize PMC:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const pmcService = new PMCService();
export default pmcService;
