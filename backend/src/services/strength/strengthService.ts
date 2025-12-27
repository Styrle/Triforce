import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { LiftType, MuscleGroup } from '@prisma/client';
import { oneRepMaxCalculator } from './oneRepMax';
import { strengthStandardsService, StrengthScore, Classification } from './strengthStandards';
import { muscleAnalysisService, MuscleGroupScoreData, Imbalance } from './muscleAnalysis';

/**
 * Lift record input data
 */
export interface LiftInput {
  liftType: LiftType;
  weight: number;
  reps: number;
  isBodyweight?: boolean;
  addedWeight?: number;
  performedAt?: Date;
  source?: string;
  sessionId?: string;
}

/**
 * Full strength profile
 */
export interface StrengthProfileData {
  id: string;
  userId: string;
  strengthScore: number | null;
  symmetryScore: number | null;
  totalScore: number | null;
  classification: Classification | null;
  categoryScores: {
    squat: number | null;
    floorPull: number | null;
    horizPress: number | null;
    vertPress: number | null;
    pull: number | null;
  };
  muscleScores: MuscleGroupScoreData[];
  imbalances: Imbalance[];
  recommendations: string[];
  liftCount: number;
  lastUpdated: Date;
}

/**
 * Lift history item
 */
export interface LiftHistoryItem {
  id: string;
  liftType: LiftType;
  weight: number;
  reps: number;
  bodyweight: number;
  estimated1RM: number;
  strengthScore: number;
  classification: string;
  performedAt: Date;
  isBodyweight: boolean;
  addedWeight: number | null;
}

/**
 * Progress data point
 */
export interface ProgressPoint {
  date: Date;
  estimated1RM: number;
  strengthScore: number;
}

/**
 * Main Strength Service
 *
 * Coordinates strength profile management, lift recording,
 * and progress tracking
 */
export class StrengthService {
  /**
   * Get or create user's strength profile
   */
  async getStrengthProfile(userId: string): Promise<StrengthProfileData | null> {
    try {
      // Get or create profile
      let profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        include: {
          lifts: {
            orderBy: { performedAt: 'desc' },
          },
          muscleScores: true,
        },
      });

      if (!profile) {
        // Create empty profile
        profile = await prisma.strengthProfile.create({
          data: { userId },
          include: {
            lifts: true,
            muscleScores: true,
          },
        });
      }

      // Calculate current scores from lifts
      const liftScores = profile.lifts.map((l) => ({
        liftType: l.liftType,
        strengthScore: l.strengthScore,
      }));

      const muscleScores = muscleAnalysisService.calculateMuscleGroupScores(liftScores);
      const imbalances = muscleAnalysisService.identifyImbalances(muscleScores);
      const recommendations = muscleAnalysisService.getRecommendations(imbalances);

      // Get best lift per category for category scores
      const getCategoryBest = (liftTypes: LiftType[]): number | null => {
        const categoryLifts = profile!.lifts.filter((l) => liftTypes.includes(l.liftType));
        if (categoryLifts.length === 0) return null;
        return Math.max(...categoryLifts.map((l) => l.strengthScore));
      };

      const categoryScores = {
        squat: getCategoryBest(['BACK_SQUAT', 'FRONT_SQUAT']),
        floorPull: getCategoryBest(['DEADLIFT', 'SUMO_DEADLIFT', 'ROMANIAN_DEADLIFT', 'POWER_CLEAN']),
        horizPress: getCategoryBest(['BENCH_PRESS', 'INCLINE_BENCH', 'DIP']),
        vertPress: getCategoryBest(['OVERHEAD_PRESS', 'PUSH_PRESS']),
        pull: getCategoryBest(['PULL_UP', 'CHIN_UP', 'PENDLAY_ROW', 'BENT_OVER_ROW']),
      };

      // Calculate overall scores
      const validCategoryScores = Object.values(categoryScores).filter(
        (s) => s !== null
      ) as number[];
      const strengthScore =
        validCategoryScores.length > 0
          ? validCategoryScores.reduce((a, b) => a + b, 0) / validCategoryScores.length
          : null;

      const symmetryScore =
        muscleScores.length > 0
          ? muscleAnalysisService.calculateSymmetryScore(muscleScores)
          : null;

      const totalScore =
        strengthScore !== null && symmetryScore !== null
          ? Math.round((strengthScore * 0.7 + symmetryScore * 0.3) * 10) / 10
          : null;

      const classification =
        strengthScore !== null
          ? strengthStandardsService.classifyLift(strengthScore)
          : null;

      return {
        id: profile.id,
        userId: profile.userId,
        strengthScore: strengthScore !== null ? Math.round(strengthScore * 10) / 10 : null,
        symmetryScore,
        totalScore,
        classification,
        categoryScores,
        muscleScores,
        imbalances,
        recommendations,
        liftCount: profile.lifts.length,
        lastUpdated: profile.updatedAt,
      };
    } catch (error) {
      logger.error(`Failed to get strength profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Record a new lift
   */
  async recordLift(userId: string, liftData: LiftInput): Promise<LiftHistoryItem> {
    try {
      // Get user's current bodyweight from profile
      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId },
        select: { weight: true, sex: true },
      });

      const bodyweight = athleteProfile?.weight || 70; // Default to 70kg if not set
      const sex = (athleteProfile?.sex as 'MALE' | 'FEMALE') || 'MALE';

      // Calculate 1RM
      let estimated1RM: number;
      let recordWeight = liftData.weight;

      if (liftData.isBodyweight) {
        const bwResult = oneRepMaxCalculator.calculateBodyweight1RM(
          bodyweight,
          liftData.addedWeight || 0,
          liftData.reps
        );
        estimated1RM = bwResult.total1RM;
        recordWeight = bodyweight + (liftData.addedWeight || 0);
      } else {
        estimated1RM = oneRepMaxCalculator.calculate1RM(liftData.weight, liftData.reps);
      }

      // Calculate strength score
      const scoreResult = strengthStandardsService.calculateStrengthScore(
        estimated1RM,
        bodyweight,
        liftData.liftType,
        sex
      );

      // Get or create strength profile
      let profile = await prisma.strengthProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        profile = await prisma.strengthProfile.create({
          data: { userId },
        });
      }

      // Create lift record
      const lift = await prisma.liftRecord.create({
        data: {
          profileId: profile.id,
          liftType: liftData.liftType,
          weight: recordWeight,
          reps: liftData.reps,
          bodyweight,
          estimated1RM,
          strengthScore: scoreResult.score,
          percentile: scoreResult.percentile,
          classification: scoreResult.classification,
          isBodyweight: liftData.isBodyweight || false,
          addedWeight: liftData.addedWeight,
          performedAt: liftData.performedAt || new Date(),
          source: liftData.source || 'manual',
          sessionId: liftData.sessionId,
        },
      });

      // Update profile
      await this.recalculateProfile(userId);

      return {
        id: lift.id,
        liftType: lift.liftType,
        weight: lift.weight,
        reps: lift.reps,
        bodyweight: lift.bodyweight,
        estimated1RM: lift.estimated1RM,
        strengthScore: lift.strengthScore,
        classification: lift.classification,
        performedAt: lift.performedAt,
        isBodyweight: lift.isBodyweight,
        addedWeight: lift.addedWeight,
      };
    } catch (error) {
      logger.error(`Failed to record lift for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate and update strength profile
   */
  async recalculateProfile(userId: string): Promise<void> {
    try {
      const profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        include: {
          lifts: {
            orderBy: { performedAt: 'desc' },
          },
        },
      });

      if (!profile) return;

      // Get best lift per type (most recent if tied)
      const bestLifts = new Map<LiftType, typeof profile.lifts[0]>();

      for (const lift of profile.lifts) {
        const existing = bestLifts.get(lift.liftType);
        if (!existing || lift.strengthScore > existing.strengthScore) {
          bestLifts.set(lift.liftType, lift);
        }
      }

      // Calculate category scores
      const getCategoryBest = (liftTypes: LiftType[]): number | null => {
        let best: number | null = null;
        for (const liftType of liftTypes) {
          const lift = bestLifts.get(liftType);
          if (lift && (best === null || lift.strengthScore > best)) {
            best = lift.strengthScore;
          }
        }
        return best;
      };

      const squatScore = getCategoryBest(['BACK_SQUAT', 'FRONT_SQUAT']);
      const floorPullScore = getCategoryBest([
        'DEADLIFT',
        'SUMO_DEADLIFT',
        'ROMANIAN_DEADLIFT',
        'POWER_CLEAN',
      ]);
      const horizPressScore = getCategoryBest(['BENCH_PRESS', 'INCLINE_BENCH', 'DIP']);
      const vertPressScore = getCategoryBest(['OVERHEAD_PRESS', 'PUSH_PRESS']);
      const pullScore = getCategoryBest(['PULL_UP', 'CHIN_UP', 'PENDLAY_ROW', 'BENT_OVER_ROW']);

      // Calculate muscle group scores
      const liftScores = Array.from(bestLifts.values()).map((l) => ({
        liftType: l.liftType,
        strengthScore: l.strengthScore,
      }));

      const muscleScores = muscleAnalysisService.calculateMuscleGroupScores(liftScores);

      // Calculate overall scores
      const validCategoryScores = [
        squatScore,
        floorPullScore,
        horizPressScore,
        vertPressScore,
        pullScore,
      ].filter((s) => s !== null) as number[];

      const strengthScore =
        validCategoryScores.length > 0
          ? validCategoryScores.reduce((a, b) => a + b, 0) / validCategoryScores.length
          : null;

      const symmetryScore =
        muscleScores.length > 0
          ? muscleAnalysisService.calculateSymmetryScore(muscleScores)
          : null;

      const totalScore =
        strengthScore !== null && symmetryScore !== null
          ? Math.round((strengthScore * 0.7 + symmetryScore * 0.3) * 10) / 10
          : null;

      const classification =
        strengthScore !== null
          ? strengthStandardsService.classifyLift(strengthScore)
          : null;

      // Update profile
      await prisma.strengthProfile.update({
        where: { id: profile.id },
        data: {
          strengthScore: strengthScore !== null ? Math.round(strengthScore * 10) / 10 : null,
          symmetryScore,
          totalScore,
          classification,
          squatScore,
          floorPullScore,
          horizPressScore,
          vertPressScore,
          pullScore,
        },
      });

      // Update muscle group scores
      for (const score of muscleScores) {
        await prisma.muscleGroupScore.upsert({
          where: {
            profileId_muscleGroup: {
              profileId: profile.id,
              muscleGroup: score.muscleGroup,
            },
          },
          update: {
            score: score.score,
            classification: score.classification,
            percentDeviation: score.percentDeviation,
          },
          create: {
            profileId: profile.id,
            muscleGroup: score.muscleGroup,
            score: score.score,
            classification: score.classification,
            percentDeviation: score.percentDeviation,
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to recalculate profile for user ${userId}:`, error);
    }
  }

  /**
   * Get lift history for a user
   */
  async getLiftHistory(
    userId: string,
    liftType?: LiftType,
    limit: number = 50
  ): Promise<LiftHistoryItem[]> {
    try {
      const profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) return [];

      const where: any = { profileId: profile.id };
      if (liftType) {
        where.liftType = liftType;
      }

      const lifts = await prisma.liftRecord.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
      });

      return lifts.map((l) => ({
        id: l.id,
        liftType: l.liftType,
        weight: l.weight,
        reps: l.reps,
        bodyweight: l.bodyweight,
        estimated1RM: l.estimated1RM,
        strengthScore: l.strengthScore,
        classification: l.classification,
        performedAt: l.performedAt,
        isBodyweight: l.isBodyweight,
        addedWeight: l.addedWeight,
      }));
    } catch (error) {
      logger.error(`Failed to get lift history for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Delete a lift record
   */
  async deleteLift(userId: string, liftId: string): Promise<boolean> {
    try {
      const profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) return false;

      const lift = await prisma.liftRecord.findFirst({
        where: {
          id: liftId,
          profileId: profile.id,
        },
      });

      if (!lift) return false;

      await prisma.liftRecord.delete({
        where: { id: liftId },
      });

      // Recalculate profile
      await this.recalculateProfile(userId);

      return true;
    } catch (error) {
      logger.error(`Failed to delete lift ${liftId} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get progress chart data for a specific lift
   */
  async getProgressChart(
    userId: string,
    liftType: LiftType,
    days: number = 90
  ): Promise<ProgressPoint[]> {
    try {
      const profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const lifts = await prisma.liftRecord.findMany({
        where: {
          profileId: profile.id,
          liftType,
          performedAt: { gte: startDate },
        },
        orderBy: { performedAt: 'asc' },
        select: {
          performedAt: true,
          estimated1RM: true,
          strengthScore: true,
        },
      });

      return lifts.map((l) => ({
        date: l.performedAt,
        estimated1RM: l.estimated1RM,
        strengthScore: l.strengthScore,
      }));
    } catch (error) {
      logger.error(`Failed to get progress chart for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get standards for a specific lift
   */
  async getStandards(
    userId: string,
    liftType: LiftType
  ): Promise<{
    standards: ReturnType<typeof strengthStandardsService.getStrengthStandards>;
    userScore: StrengthScore | null;
    userBest1RM: number | null;
  }> {
    try {
      // Get user profile
      const athleteProfile = await prisma.athleteProfile.findUnique({
        where: { userId },
        select: { weight: true, sex: true },
      });

      const bodyweight = athleteProfile?.weight || 70;
      const sex = (athleteProfile?.sex as 'MALE' | 'FEMALE') || 'MALE';

      const standards = strengthStandardsService.getStrengthStandards(liftType, bodyweight, sex);

      // Get user's best lift for this type
      const profile = await prisma.strengthProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      let userScore: StrengthScore | null = null;
      let userBest1RM: number | null = null;

      if (profile) {
        const bestLift = await prisma.liftRecord.findFirst({
          where: {
            profileId: profile.id,
            liftType,
          },
          orderBy: { estimated1RM: 'desc' },
        });

        if (bestLift) {
          userBest1RM = bestLift.estimated1RM;
          userScore = strengthStandardsService.calculateStrengthScore(
            bestLift.estimated1RM,
            bodyweight,
            liftType,
            sex
          );
        }
      }

      return { standards, userScore, userBest1RM };
    } catch (error) {
      logger.error(`Failed to get standards for user ${userId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const strengthService = new StrengthService();
export default strengthService;
