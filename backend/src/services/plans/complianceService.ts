import { prisma } from '../../config/database';
import { WorkoutStatus, SportType } from '@prisma/client';

interface ComplianceMetrics {
  overall: number;
  byWeek: { week: number; compliance: number; planned: number; completed: number }[];
  bySport: Record<string, { compliance: number; planned: number; completed: number }>;
  missedWorkouts: MissedWorkout[];
  upcomingWorkouts: UpcomingWorkout[];
  volumeCompliance: {
    targetHours: number;
    actualHours: number;
    percentage: number;
  };
  tssCompliance: {
    targetTss: number;
    actualTss: number;
    percentage: number;
  };
}

interface MissedWorkout {
  id: string;
  name: string;
  sportType: SportType;
  scheduledDate: Date;
  targetDuration: number | null;
}

interface UpcomingWorkout {
  id: string;
  name: string;
  sportType: SportType;
  scheduledDate: Date;
  targetDuration: number | null;
  targetTss: number | null;
}

interface MatchResult {
  matchedCount: number;
  partialCount: number;
  skippedCount: number;
}

interface PlanWeekWithWorkouts {
  weekNumber: number;
  workouts: {
    id: string;
    sportType: SportType;
    status: WorkoutStatus;
    scheduledDate: Date;
    name: string;
    targetDuration: number | null;
    completedActivity: {
      id: string;
      movingTime: number;
      tss: number | null;
    } | null;
  }[];
}

interface PlannedWorkoutForMatching {
  id: string;
  sportType: SportType;
  scheduledDate: Date;
  targetDuration: number | null;
  targetTss: number | null;
  status: WorkoutStatus;
}

interface ActivityForMatching {
  id: string;
  sportType: SportType;
  startDate: Date;
  movingTime: number;
  tss: number | null;
}

export class ComplianceService {
  /**
   * Calculate comprehensive compliance metrics for a plan
   */
  async calculateCompliance(planId: string): Promise<ComplianceMetrics> {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      include: {
        planWeeks: {
          include: {
            workouts: {
              include: { completedActivity: true },
            },
          },
          orderBy: { weekNumber: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = new Date();
    let totalPlanned = 0;
    let totalCompleted = 0;
    let totalTargetHours = 0;
    let totalActualHours = 0;
    let totalTargetTss = 0;
    let totalActualTss = 0;

    const bySport: Record<
      string,
      { planned: number; completed: number; targetHours: number; actualHours: number }
    > = {};

    const byWeek: { week: number; compliance: number; planned: number; completed: number }[] = [];
    const missedWorkouts: MissedWorkout[] = [];
    const upcomingWorkouts: UpcomingWorkout[] = [];

    for (const week of plan.planWeeks as PlanWeekWithWorkouts[]) {
      let weekPlanned = 0;
      let weekCompleted = 0;

      for (const workout of week.workouts) {
        const sport = workout.sportType;

        // Initialize sport tracking
        if (!bySport[sport]) {
          bySport[sport] = { planned: 0, completed: 0, targetHours: 0, actualHours: 0 };
        }

        if (workout.scheduledDate <= now) {
          // Past workout - count towards compliance
          totalPlanned++;
          weekPlanned++;
          bySport[sport].planned++;

          if (workout.targetDuration) {
            totalTargetHours += workout.targetDuration / 3600;
            bySport[sport].targetHours += workout.targetDuration / 3600;
          }

          if (workout.status === 'COMPLETED' || workout.status === 'PARTIAL') {
            totalCompleted++;
            weekCompleted++;
            bySport[sport].completed++;

            if (workout.completedActivity) {
              totalActualHours += workout.completedActivity.movingTime / 3600;
              bySport[sport].actualHours += workout.completedActivity.movingTime / 3600;
              totalActualTss += workout.completedActivity.tss || 0;
            }
          } else if (workout.status === 'PLANNED' || workout.status === 'SKIPPED') {
            // Missed workout
            missedWorkouts.push({
              id: workout.id,
              name: workout.name,
              sportType: workout.sportType,
              scheduledDate: workout.scheduledDate,
              targetDuration: workout.targetDuration,
            });
          }
        } else {
          // Future workout
          upcomingWorkouts.push({
            id: workout.id,
            name: workout.name,
            sportType: workout.sportType,
            scheduledDate: workout.scheduledDate,
            targetDuration: workout.targetDuration,
            targetTss: null,
          });

          if (workout.targetDuration) {
            totalTargetTss += (workout.targetDuration / 3600) * 70; // Estimate TSS
          }
        }
      }

      byWeek.push({
        week: week.weekNumber,
        compliance: weekPlanned > 0 ? Math.round((weekCompleted / weekPlanned) * 100) : 100,
        planned: weekPlanned,
        completed: weekCompleted,
      });
    }

    // Calculate sport compliance percentages
    const sportCompliance: Record<
      string,
      { compliance: number; planned: number; completed: number }
    > = {};
    for (const [sport, data] of Object.entries(bySport)) {
      sportCompliance[sport] = {
        compliance: data.planned > 0 ? Math.round((data.completed / data.planned) * 100) : 100,
        planned: data.planned,
        completed: data.completed,
      };
    }

    return {
      overall: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 100,
      byWeek,
      bySport: sportCompliance,
      missedWorkouts: missedWorkouts.slice(-10), // Last 10 missed
      upcomingWorkouts: upcomingWorkouts.slice(0, 7), // Next 7 upcoming
      volumeCompliance: {
        targetHours: Math.round(totalTargetHours * 10) / 10,
        actualHours: Math.round(totalActualHours * 10) / 10,
        percentage:
          totalTargetHours > 0 ? Math.round((totalActualHours / totalTargetHours) * 100) : 100,
      },
      tssCompliance: {
        targetTss: Math.round(totalTargetTss),
        actualTss: Math.round(totalActualTss),
        percentage:
          totalTargetTss > 0 ? Math.round((totalActualTss / totalTargetTss) * 100) : 100,
      },
    };
  }

  /**
   * Auto-match activities to planned workouts
   */
  async matchActivitiesToWorkouts(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MatchResult> {
    const [plannedWorkouts, activities] = await Promise.all([
      prisma.plannedWorkout.findMany({
        where: {
          userId,
          scheduledDate: { gte: startDate, lte: endDate },
          status: 'PLANNED',
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          startDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const usedActivities = new Set<string>();
    let matchedCount = 0;
    let partialCount = 0;
    let skippedCount = 0;

    for (const planned of plannedWorkouts as PlannedWorkoutForMatching[]) {
      let bestMatch: { activity: ActivityForMatching; score: number } | null = null;

      for (const activity of activities as ActivityForMatching[]) {
        if (usedActivities.has(activity.id)) continue;
        if (activity.sportType !== planned.sportType) continue;

        const dayDiff = Math.abs(
          (activity.startDate.getTime() - planned.scheduledDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (dayDiff > 1) continue;

        const score = this.calculateMatchScore(planned, activity);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { activity, score };
        }
      }

      if (bestMatch && bestMatch.score >= 50) {
        usedActivities.add(bestMatch.activity.id);

        const durationCompliance = planned.targetDuration
          ? Math.min(100, (bestMatch.activity.movingTime / planned.targetDuration) * 100)
          : 100;

        const status: WorkoutStatus = durationCompliance >= 80 ? 'COMPLETED' : 'PARTIAL';

        await prisma.plannedWorkout.update({
          where: { id: planned.id },
          data: {
            status,
            completedActivityId: bestMatch.activity.id,
          },
        });

        if (status === 'COMPLETED') {
          matchedCount++;
        } else {
          partialCount++;
        }
      } else if (planned.scheduledDate < new Date()) {
        // Past workout with no match - mark as skipped
        await prisma.plannedWorkout.update({
          where: { id: planned.id },
          data: { status: 'SKIPPED' },
        });
        skippedCount++;
      }
    }

    // Update week compliance
    await this.updateWeekCompliance(userId, startDate, endDate);

    return { matchedCount, partialCount, skippedCount };
  }

  /**
   * Mark a workout as completed manually
   */
  async markWorkoutCompleted(
    userId: string,
    workoutId: string,
    activityId?: string
  ): Promise<void> {
    const workout = await prisma.plannedWorkout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    await prisma.plannedWorkout.update({
      where: { id: workoutId },
      data: {
        status: 'COMPLETED',
        completedActivityId: activityId || null,
      },
    });
  }

  /**
   * Mark a workout as skipped
   */
  async markWorkoutSkipped(userId: string, workoutId: string, reason?: string): Promise<void> {
    const workout = await prisma.plannedWorkout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    await prisma.plannedWorkout.update({
      where: { id: workoutId },
      data: {
        status: 'SKIPPED',
        description: reason || workout.description,
      },
    });
  }

  /**
   * Calculate match score between planned workout and activity
   */
  private calculateMatchScore(
    planned: PlannedWorkoutForMatching,
    activity: ActivityForMatching
  ): number {
    let score = 30; // Base score for sport match

    // Duration match
    if (planned.targetDuration) {
      const ratio = activity.movingTime / planned.targetDuration;
      if (ratio >= 0.8 && ratio <= 1.2) score += 30;
      else if (ratio >= 0.6 && ratio <= 1.4) score += 15;
    } else {
      score += 20;
    }

    // TSS match (if available)
    if (planned.targetTss && activity.tss) {
      const ratio = activity.tss / planned.targetTss;
      if (ratio >= 0.8 && ratio <= 1.2) score += 25;
      else if (ratio >= 0.6 && ratio <= 1.4) score += 12;
    } else {
      score += 15;
    }

    // Same day bonus
    if (activity.startDate.toDateString() === planned.scheduledDate.toDateString()) {
      score += 15;
    }

    return score;
  }

  /**
   * Update week compliance after matching activities
   */
  private async updateWeekCompliance(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const weeks = await prisma.planWeek.findMany({
      where: {
        plan: { userId },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        workouts: true,
      },
    });

    for (const week of weeks) {
      const plannedCount = week.workouts.filter(
        (w) => w.scheduledDate <= new Date()
      ).length;
      const completedCount = week.workouts.filter(
        (w) => w.status === 'COMPLETED' || w.status === 'PARTIAL'
      ).length;

      const compliance = plannedCount > 0 ? (completedCount / plannedCount) * 100 : 100;

      const actualHours = week.workouts
        .filter((w) => w.completedActivityId)
        .reduce((sum, w) => sum + (w.targetDuration || 0) / 3600, 0);

      await prisma.planWeek.update({
        where: { id: week.id },
        data: {
          compliance: Math.round(compliance),
          actualHours: Math.round(actualHours * 10) / 10,
        },
      });
    }
  }

  /**
   * Get compliance summary for dashboard
   */
  async getComplianceSummary(userId: string): Promise<{
    activePlan: { id: string; name: string; compliance: number } | null;
    thisWeek: { planned: number; completed: number; compliance: number };
    streak: number;
  }> {
    // Get active plan
    const activePlan = await prisma.trainingPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        workouts: {
          where: { scheduledDate: { lte: new Date() } },
        },
      },
    });

    let planSummary = null;
    if (activePlan) {
      const completed = activePlan.workouts.filter(
        (w) => w.status === 'COMPLETED' || w.status === 'PARTIAL'
      ).length;
      const total = activePlan.workouts.length;

      planSummary = {
        id: activePlan.id,
        name: activePlan.name,
        compliance: total > 0 ? Math.round((completed / total) * 100) : 100,
      };
    }

    // Get this week's workouts
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        userId,
        scheduledDate: {
          gte: startOfWeek,
          lte: now,
        },
      },
    });

    const weekPlanned = thisWeekWorkouts.length;
    const weekCompleted = thisWeekWorkouts.filter(
      (w) => w.status === 'COMPLETED' || w.status === 'PARTIAL'
    ).length;

    // Calculate streak (consecutive days with completed workouts)
    const streak = await this.calculateStreak(userId);

    return {
      activePlan: planSummary,
      thisWeek: {
        planned: weekPlanned,
        completed: weekCompleted,
        compliance: weekPlanned > 0 ? Math.round((weekCompleted / weekPlanned) * 100) : 100,
      },
      streak,
    };
  }

  /**
   * Calculate workout completion streak
   */
  private async calculateStreak(userId: string): Promise<number> {
    const workouts = await prisma.plannedWorkout.findMany({
      where: {
        userId,
        scheduledDate: { lte: new Date() },
      },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
    });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const workoutsByDate = new Map<string, boolean>();
    for (const w of workouts) {
      const dateKey = w.scheduledDate.toISOString().split('T')[0];
      const isCompleted = w.status === 'COMPLETED' || w.status === 'PARTIAL';
      if (!workoutsByDate.has(dateKey) || isCompleted) {
        workoutsByDate.set(dateKey, isCompleted);
      }
    }

    for (let i = 0; i < 30; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      if (workoutsByDate.has(dateKey)) {
        if (workoutsByDate.get(dateKey)) {
          streak++;
        } else {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }
}

export const complianceService = new ComplianceService();
export default complianceService;
