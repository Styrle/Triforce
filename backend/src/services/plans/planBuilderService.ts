import { prisma } from '../../config/database';
import {
  PlanType,
  PeriodizationType,
  PhaseType,
  WeekType,
  SportType,
  PlanStatus,
} from '@prisma/client';

interface PlanConfig {
  name: string;
  planType: PlanType;
  targetDate: Date;
  weeksAvailable: number;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  periodization: PeriodizationType;
  targetEvent?: string;
  description?: string;
  currentFitness?: number;
}

interface UpdatePlanConfig {
  name?: string;
  description?: string;
  targetEvent?: string;
  targetDate?: Date;
  weeklyHoursMin?: number;
  weeklyHoursMax?: number;
  status?: PlanStatus;
}

// Sport distributions by plan type (% of training time)
const PLAN_DISTRIBUTIONS: Record<
  string,
  { swim: number; bike: number; run: number; strength: number }
> = {
  SPRINT_TRI: { swim: 20, bike: 35, run: 35, strength: 10 },
  OLYMPIC_TRI: { swim: 20, bike: 40, run: 30, strength: 10 },
  HALF_IRONMAN: { swim: 15, bike: 45, run: 30, strength: 10 },
  IRONMAN: { swim: 12, bike: 50, run: 30, strength: 8 },
  MARATHON: { swim: 0, bike: 10, run: 80, strength: 10 },
  HALF_MARATHON: { swim: 0, bike: 15, run: 75, strength: 10 },
  CENTURY: { swim: 0, bike: 85, run: 5, strength: 10 },
  GENERAL_FITNESS: { swim: 20, bike: 30, run: 30, strength: 20 },
  CUSTOM: { swim: 25, bike: 35, run: 30, strength: 10 },
};

// Phase templates by periodization type
const PHASE_TEMPLATES: Record<string, { type: PhaseType; percentage: number }[]> = {
  LINEAR: [
    { type: 'BASE', percentage: 40 },
    { type: 'BUILD', percentage: 35 },
    { type: 'PEAK', percentage: 15 },
    { type: 'RACE', percentage: 10 },
  ],
  BLOCK: [
    { type: 'BASE', percentage: 25 },
    { type: 'BUILD', percentage: 25 },
    { type: 'BASE', percentage: 15 },
    { type: 'BUILD', percentage: 20 },
    { type: 'PEAK', percentage: 10 },
    { type: 'RACE', percentage: 5 },
  ],
  POLARIZED: [
    { type: 'BASE', percentage: 50 },
    { type: 'BUILD', percentage: 30 },
    { type: 'PEAK', percentage: 15 },
    { type: 'RACE', percentage: 5 },
  ],
  PYRAMIDAL: [
    { type: 'BASE', percentage: 35 },
    { type: 'BUILD', percentage: 40 },
    { type: 'PEAK', percentage: 20 },
    { type: 'RACE', percentage: 5 },
  ],
  REVERSE_LINEAR: [
    { type: 'BUILD', percentage: 35 },
    { type: 'BASE', percentage: 40 },
    { type: 'PEAK', percentage: 15 },
    { type: 'RACE', percentage: 10 },
  ],
};

interface PhaseInfo {
  id: string;
  type: PhaseType;
  weekStart: number;
  weekEnd: number;
}

interface WorkoutConfig {
  dayOfWeek: number;
  timeOfDay: string;
  name: string;
  sportType: SportType;
  workoutType: string;
  duration: number;
  tss: number;
}

interface PlanWeekInfo {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  targetHours: number | null;
  targetTss: number | null;
  weekType: WeekType;
}

export class PlanBuilderService {
  /**
   * Create a new training plan with auto-generated phases, weeks, and workouts
   */
  async createPlan(userId: string, config: PlanConfig) {
    const startDate = new Date();
    const endDate = new Date(config.targetDate);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks = Math.min(
      config.weeksAvailable,
      Math.floor((endDate.getTime() - startDate.getTime()) / msPerWeek)
    );

    if (weeks < 4) {
      throw new Error('Plan must be at least 4 weeks');
    }

    // Create the plan
    const plan = await prisma.trainingPlan.create({
      data: {
        userId,
        name: config.name,
        description: config.description,
        planType: config.planType,
        targetEvent: config.targetEvent,
        targetDate: config.targetDate,
        startDate,
        endDate,
        weeks,
        periodization: config.periodization,
        weeklyHoursMin: config.weeklyHoursMin,
        weeklyHoursMax: config.weeklyHoursMax,
      },
    });

    // Generate phases
    const phases = await this.generatePhases(plan.id, weeks, config.periodization);

    // Generate weeks
    const planWeeks = await this.generateWeeks(
      plan.id,
      weeks,
      startDate,
      phases,
      config.weeklyHoursMin,
      config.weeklyHoursMax,
      config.currentFitness || 50
    );

    // Populate workouts
    await this.populateWorkouts(plan.id, userId, planWeeks, config.planType, phases);

    return this.getPlanById(plan.id);
  }

  /**
   * Get a plan by ID with all related data
   */
  async getPlanById(planId: string) {
    return prisma.trainingPlan.findUnique({
      where: { id: planId },
      include: {
        phases: { orderBy: { weekStart: 'asc' } },
        planWeeks: {
          include: {
            workouts: {
              include: { completedActivity: true },
              orderBy: { scheduledDate: 'asc' },
            },
          },
          orderBy: { weekNumber: 'asc' },
        },
        _count: { select: { workouts: true } },
      },
    });
  }

  /**
   * Get all plans for a user
   */
  async getUserPlans(userId: string, status?: string) {
    return prisma.trainingPlan.findMany({
      where: {
        userId,
        ...(status && { status: status as PlanStatus }),
      },
      include: {
        phases: { orderBy: { weekStart: 'asc' } },
        _count: { select: { workouts: true, planWeeks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a plan
   */
  async updatePlan(userId: string, planId: string, updates: UpdatePlanConfig) {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return prisma.trainingPlan.update({
      where: { id: planId },
      data: updates,
      include: {
        phases: { orderBy: { weekStart: 'asc' } },
        planWeeks: { orderBy: { weekNumber: 'asc' } },
      },
    });
  }

  /**
   * Delete a plan
   */
  async deletePlan(userId: string, planId: string) {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    await prisma.trainingPlan.delete({ where: { id: planId } });
  }

  /**
   * Get a specific week from a plan
   */
  async getPlanWeek(planId: string, weekNumber: number) {
    return prisma.planWeek.findFirst({
      where: { planId, weekNumber },
      include: {
        workouts: {
          include: { completedActivity: true },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });
  }

  /**
   * Update a planned workout
   */
  async updatePlannedWorkout(userId: string, workoutId: string, updates: Partial<{
    name: string;
    description: string;
    scheduledDate: Date;
    timeOfDay: string;
    targetDuration: number;
    targetDistance: number;
    targetTss: number;
  }>) {
    const workout = await prisma.plannedWorkout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    return prisma.plannedWorkout.update({
      where: { id: workoutId },
      data: updates,
    });
  }

  /**
   * Generate phases for a plan
   */
  private async generatePhases(
    planId: string,
    totalWeeks: number,
    periodization: PeriodizationType
  ): Promise<PhaseInfo[]> {
    const template = PHASE_TEMPLATES[periodization] || PHASE_TEMPLATES.LINEAR;
    const phases: PhaseInfo[] = [];
    let currentWeek = 1;

    for (const pt of template) {
      const phaseWeeks = Math.max(1, Math.round(totalWeeks * (pt.percentage / 100)));
      const weekEnd = Math.min(currentWeek + phaseWeeks - 1, totalWeeks);

      const phase = await prisma.planPhase.create({
        data: {
          planId,
          name: this.getPhaseName(pt.type),
          phaseType: pt.type,
          weekStart: currentWeek,
          weekEnd,
          focusAreas: this.getPhaseFocus(pt.type),
          intensityLevel: this.getPhaseIntensity(pt.type),
          volumeLevel: this.getPhaseVolume(pt.type),
          description: this.getPhaseDescription(pt.type),
        },
      });

      phases.push({
        id: phase.id,
        type: pt.type,
        weekStart: currentWeek,
        weekEnd,
      });

      currentWeek = weekEnd + 1;
      if (currentWeek > totalWeeks) break;
    }

    return phases;
  }

  /**
   * Generate weeks for a plan
   */
  private async generateWeeks(
    planId: string,
    totalWeeks: number,
    startDate: Date,
    phases: PhaseInfo[],
    minHours: number,
    maxHours: number,
    currentCTL: number
  ): Promise<PlanWeekInfo[]> {
    const weeks: PlanWeekInfo[] = [];
    const peakWeek = Math.floor(totalWeeks * 0.85);
    const startTss = currentCTL * 7;
    const peakTss = maxHours * 75;

    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const phase = phases.find((p) => weekNum >= p.weekStart && weekNum <= p.weekEnd);

      let weekType: WeekType = 'NORMAL';
      if (weekNum % 4 === 0 && phase?.type !== 'RACE') weekType = 'RECOVERY';
      else if (weekNum === totalWeeks) weekType = 'RACE';

      let targetTss: number;
      if (weekType === 'RECOVERY') {
        targetTss = (startTss + (peakTss - startTss) * (weekNum / peakWeek)) * 0.6;
      } else if (weekType === 'RACE') {
        targetTss = startTss * 0.5;
      } else if (weekNum <= peakWeek) {
        targetTss = startTss + (peakTss - startTss) * (weekNum / peakWeek);
      } else {
        const taperProgress = (weekNum - peakWeek) / (totalWeeks - peakWeek);
        targetTss = peakTss * (1 - taperProgress * 0.4);
      }

      const week = await prisma.planWeek.create({
        data: {
          planId,
          weekNumber: weekNum,
          startDate: weekStart,
          endDate: weekEnd,
          targetTss: Math.round(targetTss),
          targetHours: Math.round((targetTss / 75) * 10) / 10,
          weekType,
        },
      });

      weeks.push({
        id: week.id,
        weekNumber: week.weekNumber,
        startDate: week.startDate,
        endDate: week.endDate,
        targetHours: week.targetHours,
        targetTss: week.targetTss,
        weekType: week.weekType,
      });
    }

    return weeks;
  }

  /**
   * Populate workouts for each week
   */
  private async populateWorkouts(
    planId: string,
    userId: string,
    weeks: PlanWeekInfo[],
    planType: PlanType,
    phases: PhaseInfo[]
  ) {
    const distribution = PLAN_DISTRIBUTIONS[planType] || PLAN_DISTRIBUTIONS.CUSTOM;

    for (const week of weeks) {
      const phase = phases.find(
        (p) => week.weekNumber >= p.weekStart && week.weekNumber <= p.weekEnd
      );
      const workouts = this.generateWeekWorkouts(
        week,
        distribution,
        phase?.type || 'BASE',
        week.weekType
      );

      for (const workout of workouts) {
        const scheduledDate = new Date(week.startDate);
        scheduledDate.setDate(scheduledDate.getDate() + workout.dayOfWeek);

        await prisma.plannedWorkout.create({
          data: {
            planId,
            weekId: week.id,
            userId,
            scheduledDate,
            dayOfWeek: workout.dayOfWeek,
            timeOfDay: workout.timeOfDay,
            name: workout.name,
            sportType: workout.sportType,
            workoutType: workout.workoutType as any,
            targetDuration: workout.duration,
            targetTss: workout.tss,
          },
        });
      }
    }
  }

  /**
   * Generate workouts for a specific week based on distribution and phase
   */
  private generateWeekWorkouts(
    week: PlanWeekInfo,
    distribution: { swim: number; bike: number; run: number; strength: number },
    phaseType: PhaseType,
    weekType: WeekType
  ): WorkoutConfig[] {
    const workouts: WorkoutConfig[] = [];
    const weeklyHours = week.targetHours || 10;
    const volumeMultiplier = weekType === 'RECOVERY' ? 0.6 : weekType === 'RACE' ? 0.5 : 1.0;

    // Swimming
    if (distribution.swim > 0) {
      const swimHours = weeklyHours * (distribution.swim / 100) * volumeMultiplier;
      const sessions = swimHours > 3 ? 3 : 2;
      for (let i = 0; i < sessions; i++) {
        workouts.push({
          dayOfWeek: i === 0 ? 1 : i === 1 ? 3 : 5,
          timeOfDay: 'morning',
          name: phaseType === 'BASE' ? 'Technique Swim' : 'Threshold Swim',
          sportType: 'SWIM',
          workoutType: phaseType === 'BASE' ? 'ENDURANCE' : 'TEMPO',
          duration: Math.round((swimHours / sessions) * 3600),
          tss: Math.round((swimHours / sessions) * 60),
        });
      }
    }

    // Cycling
    if (distribution.bike > 0) {
      const bikeHours = weeklyHours * (distribution.bike / 100) * volumeMultiplier;
      workouts.push({
        dayOfWeek: 6,
        timeOfDay: 'morning',
        name: 'Long Ride',
        sportType: 'BIKE',
        workoutType: 'ENDURANCE',
        duration: Math.round(bikeHours * 0.4 * 3600),
        tss: Math.round(bikeHours * 0.4 * 65),
      });
      workouts.push({
        dayOfWeek: 2,
        timeOfDay: 'afternoon',
        name: phaseType === 'BASE' ? 'Endurance Ride' : 'Sweet Spot',
        sportType: 'BIKE',
        workoutType: phaseType === 'BASE' ? 'ENDURANCE' : 'TEMPO',
        duration: Math.round(bikeHours * 0.3 * 3600),
        tss: Math.round(bikeHours * 0.3 * 75),
      });
      if (phaseType !== 'RACE' && weekType !== 'RECOVERY') {
        workouts.push({
          dayOfWeek: 4,
          timeOfDay: 'afternoon',
          name: phaseType === 'BUILD' ? 'Intervals' : 'Tempo Ride',
          sportType: 'BIKE',
          workoutType: phaseType === 'BUILD' ? 'INTERVALS' : 'TEMPO',
          duration: Math.round(bikeHours * 0.2 * 3600),
          tss: Math.round(bikeHours * 0.2 * 85),
        });
      }
    }

    // Running
    if (distribution.run > 0) {
      const runHours = weeklyHours * (distribution.run / 100) * volumeMultiplier;
      workouts.push({
        dayOfWeek: 0,
        timeOfDay: 'morning',
        name: 'Long Run',
        sportType: 'RUN',
        workoutType: 'LONG_RUN',
        duration: Math.round(runHours * 0.35 * 3600),
        tss: Math.round(runHours * 0.35 * 80),
      });
      workouts.push({
        dayOfWeek: 3,
        timeOfDay: 'afternoon',
        name: phaseType === 'BASE' ? 'Aerobic Run' : 'Tempo Run',
        sportType: 'RUN',
        workoutType: phaseType === 'BASE' ? 'ENDURANCE' : 'TEMPO',
        duration: Math.round(runHours * 0.25 * 3600),
        tss: Math.round(runHours * 0.25 * 90),
      });
      workouts.push({
        dayOfWeek: 5,
        timeOfDay: 'morning',
        name: 'Easy Run',
        sportType: 'RUN',
        workoutType: 'RECOVERY',
        duration: Math.round(runHours * 0.2 * 3600),
        tss: Math.round(runHours * 0.2 * 60),
      });
    }

    // Strength
    if (distribution.strength > 0 && weekType !== 'RACE') {
      workouts.push({
        dayOfWeek: 1,
        timeOfDay: 'evening',
        name: 'Strength Training',
        sportType: 'STRENGTH',
        workoutType: 'STRENGTH',
        duration: 45 * 60,
        tss: 30,
      });
      if (phaseType === 'BASE' && weekType !== 'RECOVERY') {
        workouts.push({
          dayOfWeek: 4,
          timeOfDay: 'evening',
          name: 'Core & Stability',
          sportType: 'STRENGTH',
          workoutType: 'STRENGTH',
          duration: 30 * 60,
          tss: 20,
        });
      }
    }

    return workouts;
  }

  private getPhaseName(type: PhaseType): string {
    const names: Record<PhaseType, string> = {
      BASE: 'Base Building',
      BUILD: 'Build Phase',
      PEAK: 'Peak & Sharpen',
      RACE: 'Race Week',
      RECOVERY: 'Recovery',
      TRANSITION: 'Transition',
    };
    return names[type];
  }

  private getPhaseFocus(type: PhaseType): string[] {
    const focus: Record<PhaseType, string[]> = {
      BASE: ['aerobic_endurance', 'technique', 'consistency'],
      BUILD: ['threshold', 'race_pace', 'muscular_endurance'],
      PEAK: ['speed', 'sharpening', 'race_simulation'],
      RACE: ['rest', 'activation', 'race_prep'],
      RECOVERY: ['active_recovery', 'mobility'],
      TRANSITION: ['rest', 'cross_training'],
    };
    return focus[type];
  }

  private getPhaseIntensity(type: PhaseType): string {
    const intensity: Record<PhaseType, string> = {
      BASE: 'low',
      BUILD: 'moderate-high',
      PEAK: 'high',
      RACE: 'low',
      RECOVERY: 'very_low',
      TRANSITION: 'low',
    };
    return intensity[type];
  }

  private getPhaseVolume(type: PhaseType): string {
    const volume: Record<PhaseType, string> = {
      BASE: 'moderate-high',
      BUILD: 'high',
      PEAK: 'moderate',
      RACE: 'low',
      RECOVERY: 'low',
      TRANSITION: 'low',
    };
    return volume[type];
  }

  private getPhaseDescription(type: PhaseType): string {
    const descriptions: Record<PhaseType, string> = {
      BASE: 'Focus on building aerobic capacity, perfecting technique, and establishing consistent training habits.',
      BUILD: 'Increase intensity to develop race-specific fitness. Include threshold and tempo work.',
      PEAK: 'Reduce volume while maintaining intensity. Sharpen race-day systems with specific workouts.',
      RACE: 'Taper and rest. Light activation workouts only. Focus on nutrition and mental preparation.',
      RECOVERY: 'Active recovery with reduced volume and intensity. Focus on mobility and rejuvenation.',
      TRANSITION: 'Off-season break with unstructured activity. Maintain basic fitness while recovering mentally.',
    };
    return descriptions[type];
  }
}

export const planBuilderService = new PlanBuilderService();
export default planBuilderService;
