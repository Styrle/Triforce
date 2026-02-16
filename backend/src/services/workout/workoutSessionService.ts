import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { oneRepMaxCalculator } from '../strength/oneRepMax';
import { strengthStandardsService } from '../strength/strengthStandards';
import { workoutAnalyticsService } from './workoutAnalytics';
import {
  WorkoutSession,
  WorkoutSessionInput,
  WorkoutExercise,
  WorkoutSet,
  PersonalBest,
  VolumeAnalytics,
  MuscleVolumeData,
} from '../../types/workout';
import { LiftType, MuscleGroup } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export class WorkoutSessionService {

  /**
   * Create a new workout session
   */
  async createSession(userId: string, input: WorkoutSessionInput): Promise<WorkoutSession> {
    try {
      const session = await prisma.strengthSession.create({
        data: {
          userId,
          name: input.name,
          date: input.date || new Date(),
          duration: input.duration,
          notes: input.notes,
          exercises: {
            create: input.exercises.map((ex, idx) => ({
              exerciseName: ex.exerciseName,
              liftType: ex.liftType,
              orderIndex: ex.orderIndex ?? idx,
              sets: ex.sets.map((set, setIdx) => ({
                setNumber: setIdx + 1,
                ...set,
              })),
              notes: ex.notes,
            })),
          },
        },
        include: { exercises: true },
      });

      await this.processPersonalBests(userId, session.id, input.exercises);

      return this.formatSession(session);
    } catch (error) {
      logger.error(`Failed to create workout session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get a workout session by ID
   */
  async getSession(sessionId: string): Promise<WorkoutSession | null> {
    const session = await prisma.strengthSession.findUnique({
      where: { id: sessionId },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!session) return null;
    return this.formatSession(session);
  }

  /**
   * Get user's workout sessions with pagination
   */
  async getUserSessions(
    userId: string,
    options: { limit?: number; offset?: number; startDate?: Date; endDate?: Date } = {}
  ): Promise<{ sessions: WorkoutSession[]; total: number }> {
    const { limit = 20, offset = 0, startDate, endDate } = options;

    const where = {
      userId,
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.strengthSession.findMany({
        where,
        include: { exercises: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.strengthSession.count({ where }),
    ]);

    return {
      sessions: sessions.map(s => this.formatSession(s)),
      total,
    };
  }

  /**
   * Update an existing workout session
   */
  async updateSession(sessionId: string, input: Partial<WorkoutSessionInput>): Promise<WorkoutSession> {
    const existing = await prisma.strengthSession.findUnique({
      where: { id: sessionId },
      include: { exercises: true },
    });

    if (!existing) {
      throw new Error('Session not found');
    }

    const updated = await prisma.strengthSession.update({
      where: { id: sessionId },
      data: {
        name: input.name ?? existing.name,
        date: input.date ?? existing.date,
        duration: input.duration ?? existing.duration,
        notes: input.notes ?? existing.notes,
        ...(input.exercises && {
          exercises: {
            deleteMany: {},
            create: input.exercises.map((ex, idx) => ({
              exerciseName: ex.exerciseName,
              liftType: ex.liftType,
              orderIndex: ex.orderIndex ?? idx,
              sets: ex.sets.map((set, setIdx) => ({
                setNumber: setIdx + 1,
                ...set,
              })),
              notes: ex.notes,
            })),
          },
        }),
      },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    if (input.exercises) {
      await this.processPersonalBests(existing.userId, sessionId, input.exercises);
    }

    return this.formatSession(updated);
  }

  /**
   * Delete a workout session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await prisma.strengthSession.delete({ where: { id: sessionId } });
  }

  /**
   * Get personal bests for a user
   */
  async getPersonalBests(userId: string, liftTypes?: LiftType[]): Promise<PersonalBest[]> {
    const profile = await prisma.strengthProfile.findUnique({
      where: { userId },
      include: {
        lifts: {
          where: liftTypes ? { liftType: { in: liftTypes } } : undefined,
          orderBy: { estimated1RM: 'desc' },
        },
      },
    });

    if (!profile) return [];

    const bestByLift = new Map<LiftType, PersonalBest>();
    for (const lift of profile.lifts) {
      const existing = bestByLift.get(lift.liftType);
      if (!existing || lift.estimated1RM > existing.estimated1RM) {
        bestByLift.set(lift.liftType, {
          liftType: lift.liftType,
          weight: lift.weight,
          reps: lift.reps,
          estimated1RM: lift.estimated1RM,
          achievedAt: lift.performedAt,
          sessionId: lift.sessionId || undefined,
        });
      }
    }

    return Array.from(bestByLift.values());
  }

  /**
   * Get volume analytics for a time period
   */
  async getVolumeAnalytics(
    userId: string,
    period: 'day' | 'week' | 'month',
    date?: Date
  ): Promise<VolumeAnalytics> {
    const targetDate = date || new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = startOfWeek(targetDate, { weekStartsOn: 1 });
        endDate = endOfWeek(targetDate, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(targetDate);
        endDate = endOfMonth(targetDate);
        break;
    }

    const sessions = await prisma.strengthSession.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { exercises: true },
    });

    let totalVolume = 0;
    const muscleVolumes = new Map<MuscleGroup, MuscleVolumeData>();
    const liftVolumes = new Map<LiftType, number>();

    for (const session of sessions) {
      const formatted = this.formatSession(session);
      const sessionVolume = workoutAnalyticsService.calculateSessionVolume(formatted);
      totalVolume += sessionVolume;

      const muscleBreakdown = workoutAnalyticsService.calculateMuscleVolumeBreakdown(formatted);
      for (const mv of muscleBreakdown) {
        const existing = muscleVolumes.get(mv.muscleGroup);
        if (existing) {
          existing.totalVolume += mv.totalVolume;
          existing.effectiveVolume += mv.effectiveVolume;
          existing.sets += mv.sets;
          mv.exercises.forEach(e => {
            if (!existing.exercises.includes(e)) {
              existing.exercises.push(e);
            }
          });
        } else {
          muscleVolumes.set(mv.muscleGroup, { ...mv });
        }
      }

      for (const ex of formatted.exercises) {
        if (ex.liftType) {
          const exVolume = workoutAnalyticsService.calculateExerciseVolume(ex);
          liftVolumes.set(ex.liftType, (liftVolumes.get(ex.liftType) || 0) + exVolume);
        }
      }
    }

    return {
      period,
      startDate,
      endDate,
      totalVolume,
      volumeByMuscle: Array.from(muscleVolumes.values()).sort(
        (a, b) => b.effectiveVolume - a.effectiveVolume
      ),
      volumeByLift: Array.from(liftVolumes.entries())
        .map(([liftType, volume]) => ({ liftType, volume }))
        .sort((a, b) => b.volume - a.volume),
      sessionCount: sessions.length,
      averageSessionVolume: sessions.length > 0 ? Math.round(totalVolume / sessions.length) : 0,
    };
  }

  /**
   * Process personal bests from a workout's exercises
   */
  private async processPersonalBests(
    userId: string,
    sessionId: string,
    exercises: WorkoutSessionInput['exercises']
  ): Promise<void> {
    try {
      let profile = await prisma.strengthProfile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await prisma.strengthProfile.create({ data: { userId } });
      }

      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId },
        select: { weight: true, sex: true },
      });
      const bodyweight = athleteProfile?.weight || 70;
      const sex = (athleteProfile?.sex as 'MALE' | 'FEMALE') || 'MALE';

      for (const exercise of exercises) {
        if (!exercise.liftType) continue;

        const workingSets = exercise.sets.filter(s => !s.isWarmup);
        if (workingSets.length === 0) continue;

        let bestSet: typeof workingSets[0] | null = null;
        let bestE1RM = 0;
        for (const set of workingSets) {
          if (set.weight <= 0 || set.reps <= 0) continue;
          const e1rm = oneRepMaxCalculator.calculate1RM(set.weight, set.reps);
          if (e1rm > bestE1RM) {
            bestE1RM = e1rm;
            bestSet = set;
          }
        }

        if (!bestSet) continue;

        const existingBest = await prisma.liftRecord.findFirst({
          where: { profileId: profile.id, liftType: exercise.liftType },
          orderBy: { estimated1RM: 'desc' },
        });

        // Record if it's a PR or within 95% of existing best
        if (!existingBest || bestE1RM >= existingBest.estimated1RM * 0.95) {
          const scoreResult = strengthStandardsService.calculateStrengthScore(
            bestE1RM,
            bodyweight,
            exercise.liftType,
            sex
          );

          await prisma.liftRecord.create({
            data: {
              profileId: profile.id,
              liftType: exercise.liftType,
              weight: bestSet.weight,
              reps: bestSet.reps,
              bodyweight,
              estimated1RM: bestE1RM,
              strengthScore: scoreResult.score,
              percentile: scoreResult.percentile,
              classification: scoreResult.classification,
              source: 'session',
              sessionId,
            },
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to process PRs for session ${sessionId}:`, error);
    }
  }

  /**
   * Format database session to typed response
   */
  private formatSession(session: any): WorkoutSession {
    const exercises: WorkoutExercise[] = session.exercises.map((ex: any) => {
      const sets: WorkoutSet[] = (ex.sets as any[]).map((set: any, idx: number) => ({
        setNumber: set.setNumber ?? idx + 1,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe,
        isWarmup: set.isWarmup,
        isDropset: set.isDropset,
        isFailure: set.isFailure,
        restAfter: set.restAfter,
        notes: set.notes,
      }));

      const exercise: WorkoutExercise = {
        id: ex.id,
        exerciseName: ex.exerciseName,
        liftType: ex.liftType,
        orderIndex: ex.orderIndex,
        sets,
        notes: ex.notes,
      };

      exercise.totalVolume = workoutAnalyticsService.calculateExerciseVolume(exercise);
      exercise.estimatedE1RM = workoutAnalyticsService.calculateExerciseE1RM(exercise) ?? undefined;

      const rpeSets = sets.filter(s => !s.isWarmup && s.rpe !== undefined);
      if (rpeSets.length > 0) {
        exercise.averageRPE = Math.round(
          (rpeSets.reduce((sum, s) => sum + (s.rpe || 0), 0) / rpeSets.length) * 10
        ) / 10;
      }

      return exercise;
    });

    const formatted: WorkoutSession = {
      id: session.id,
      userId: session.userId,
      name: session.name,
      date: session.date,
      duration: session.duration,
      notes: session.notes,
      exercises,
    };

    formatted.totalVolume = workoutAnalyticsService.calculateSessionVolume(formatted);
    formatted.totalSets = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => !s.isWarmup).length,
      0
    );
    formatted.muscleVolumeBreakdown = workoutAnalyticsService.calculateMuscleVolumeBreakdown(formatted);

    return formatted;
  }
}

export const workoutSessionService = new WorkoutSessionService();
export default workoutSessionService;
