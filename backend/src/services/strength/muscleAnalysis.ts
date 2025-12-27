import { LiftType, MuscleGroup } from '@prisma/client';
import { Classification } from './strengthStandards';

/**
 * Muscle contribution in a lift (as percentage)
 */
export interface MuscleContribution {
  muscleGroup: MuscleGroup;
  percentage: number;
}

/**
 * Calculated muscle group score
 */
export interface MuscleGroupScoreData {
  muscleGroup: MuscleGroup;
  score: number;
  classification: Classification;
  percentDeviation: number;
}

/**
 * Imbalance detected between muscle groups
 */
export interface Imbalance {
  muscleGroup: MuscleGroup;
  type: 'weak' | 'strong';
  deviation: number;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Lift record for muscle analysis
 */
export interface LiftForAnalysis {
  liftType: LiftType;
  strengthScore: number;
}

/**
 * Muscle Analysis Service
 *
 * Maps lifts to muscle groups and calculates muscle balance scores
 */
export class MuscleAnalysisService {
  /**
   * Muscle contributions per lift (percentages add up to 100)
   * Based on EMG studies and exercise science
   */
  private muscleContributions: Record<LiftType, MuscleContribution[]> = {
    // Squat patterns
    BACK_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 40 },
      { muscleGroup: 'GLUTES', percentage: 30 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 10 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],
    FRONT_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 50 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'ABDOMINALS', percentage: 15 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 10 },
    ],

    // Deadlift patterns
    DEADLIFT: [
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 25 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'HAMSTRINGS', percentage: 25 },
      { muscleGroup: 'QUADS', percentage: 15 },
      { muscleGroup: 'TRAPS', percentage: 5 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    SUMO_DEADLIFT: [
      { muscleGroup: 'QUADS', percentage: 30 },
      { muscleGroup: 'GLUTES', percentage: 30 },
      { muscleGroup: 'ADDUCTORS', percentage: 15 },
      { muscleGroup: 'HAMSTRINGS', percentage: 10 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    ROMANIAN_DEADLIFT: [
      { muscleGroup: 'HAMSTRINGS', percentage: 40 },
      { muscleGroup: 'GLUTES', percentage: 30 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 20 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    POWER_CLEAN: [
      { muscleGroup: 'QUADS', percentage: 25 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'TRAPS', percentage: 20 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],

    // Pressing patterns
    BENCH_PRESS: [
      { muscleGroup: 'CHEST', percentage: 40 },
      { muscleGroup: 'TRICEPS', percentage: 35 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 25 },
    ],
    INCLINE_BENCH: [
      { muscleGroup: 'CHEST', percentage: 35 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 35 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
    ],
    DIP: [
      { muscleGroup: 'CHEST', percentage: 35 },
      { muscleGroup: 'TRICEPS', percentage: 40 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 25 },
    ],
    OVERHEAD_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 40 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 20 },
      { muscleGroup: 'TRICEPS', percentage: 35 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],
    PUSH_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 35 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 15 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'QUADS', percentage: 15 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],

    // Pulling patterns
    PULL_UP: [
      { muscleGroup: 'LATS', percentage: 50 },
      { muscleGroup: 'BICEPS', percentage: 25 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    CHIN_UP: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'BICEPS', percentage: 35 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    PENDLAY_ROW: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'REAR_DELTS', percentage: 20 },
      { muscleGroup: 'BICEPS', percentage: 20 },
      { muscleGroup: 'TRAPS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    BENT_OVER_ROW: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'REAR_DELTS', percentage: 20 },
      { muscleGroup: 'BICEPS', percentage: 20 },
      { muscleGroup: 'TRAPS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
  };

  /**
   * Display names for muscle groups
   */
  private muscleGroupNames: Record<MuscleGroup, string> = {
    CHEST: 'Chest',
    ANTERIOR_DELTS: 'Front Delts',
    LATERAL_DELTS: 'Side Delts',
    REAR_DELTS: 'Rear Delts',
    TRICEPS: 'Triceps',
    BICEPS: 'Biceps',
    FOREARMS: 'Forearms',
    LATS: 'Lats',
    TRAPS: 'Traps',
    SPINAL_ERECTORS: 'Lower Back',
    ABDOMINALS: 'Abs',
    OBLIQUES: 'Obliques',
    QUADS: 'Quads',
    GLUTES: 'Glutes',
    HAMSTRINGS: 'Hamstrings',
    HIP_FLEXORS: 'Hip Flexors',
    ADDUCTORS: 'Adductors',
    CALVES: 'Calves',
  };

  /**
   * Get muscle contributions for a lift
   */
  getMuscleContributions(liftType: LiftType): MuscleContribution[] {
    return this.muscleContributions[liftType] || [];
  }

  /**
   * Get display name for muscle group
   */
  getMuscleGroupName(muscleGroup: MuscleGroup): string {
    return this.muscleGroupNames[muscleGroup];
  }

  /**
   * Calculate muscle group scores from lift records
   *
   * Uses weighted average of lift scores based on muscle contribution
   */
  calculateMuscleGroupScores(lifts: LiftForAnalysis[]): MuscleGroupScoreData[] {
    if (lifts.length === 0) {
      return [];
    }

    // Accumulate weighted scores for each muscle group
    const muscleScores: Record<MuscleGroup, { totalScore: number; totalWeight: number }> = {} as any;

    for (const lift of lifts) {
      const contributions = this.muscleContributions[lift.liftType];
      if (!contributions) continue;

      for (const contrib of contributions) {
        if (!muscleScores[contrib.muscleGroup]) {
          muscleScores[contrib.muscleGroup] = { totalScore: 0, totalWeight: 0 };
        }

        const weight = contrib.percentage / 100;
        muscleScores[contrib.muscleGroup].totalScore += lift.strengthScore * weight;
        muscleScores[contrib.muscleGroup].totalWeight += weight;
      }
    }

    // Calculate final scores
    const scores: MuscleGroupScoreData[] = [];
    let totalScore = 0;
    let count = 0;

    for (const [muscleGroup, data] of Object.entries(muscleScores)) {
      if (data.totalWeight > 0) {
        const score = data.totalScore / data.totalWeight;
        scores.push({
          muscleGroup: muscleGroup as MuscleGroup,
          score: Math.round(score * 10) / 10,
          classification: this.classifyScore(score),
          percentDeviation: 0, // Will be calculated below
        });
        totalScore += score;
        count++;
      }
    }

    // Calculate average and deviations
    const averageScore = count > 0 ? totalScore / count : 0;

    for (const score of scores) {
      score.percentDeviation =
        averageScore > 0 ? Math.round(((score.score - averageScore) / averageScore) * 1000) / 10 : 0;
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores;
  }

  /**
   * Classify a score into a strength level
   */
  private classifyScore(score: number): Classification {
    if (score < 20) return 'untrained';
    if (score < 40) return 'beginner';
    if (score < 60) return 'intermediate';
    if (score < 75) return 'proficient';
    if (score < 85) return 'advanced';
    if (score < 95) return 'exceptional';
    return 'elite';
  }

  /**
   * Identify muscle imbalances from scores
   *
   * Imbalance thresholds:
   * - High priority: >20% deviation
   * - Medium priority: 10-20% deviation
   * - Low priority: 5-10% deviation
   */
  identifyImbalances(scores: MuscleGroupScoreData[]): Imbalance[] {
    if (scores.length < 2) {
      return [];
    }

    const imbalances: Imbalance[] = [];

    for (const score of scores) {
      const deviation = Math.abs(score.percentDeviation);

      if (deviation < 5) continue;

      const type: 'weak' | 'strong' = score.percentDeviation < 0 ? 'weak' : 'strong';
      let priority: 'high' | 'medium' | 'low';
      let description: string;

      if (deviation >= 20) {
        priority = 'high';
        description =
          type === 'weak'
            ? `${this.muscleGroupNames[score.muscleGroup]} is significantly weaker than average. Consider prioritizing this muscle group.`
            : `${this.muscleGroupNames[score.muscleGroup]} is significantly stronger than average. Maintain current training.`;
      } else if (deviation >= 10) {
        priority = 'medium';
        description =
          type === 'weak'
            ? `${this.muscleGroupNames[score.muscleGroup]} is moderately weaker than average.`
            : `${this.muscleGroupNames[score.muscleGroup]} is moderately stronger than average.`;
      } else {
        priority = 'low';
        description =
          type === 'weak'
            ? `${this.muscleGroupNames[score.muscleGroup]} is slightly below average.`
            : `${this.muscleGroupNames[score.muscleGroup]} is slightly above average.`;
      }

      imbalances.push({
        muscleGroup: score.muscleGroup,
        type,
        deviation: score.percentDeviation,
        description,
        priority,
      });
    }

    // Sort by priority (high first) then by deviation magnitude
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    imbalances.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return Math.abs(b.deviation) - Math.abs(a.deviation);
    });

    return imbalances;
  }

  /**
   * Generate training recommendations based on imbalances
   */
  getRecommendations(imbalances: Imbalance[]): string[] {
    const recommendations: string[] = [];
    const weakMuscles = imbalances.filter((i) => i.type === 'weak' && i.priority !== 'low');

    if (weakMuscles.length === 0) {
      recommendations.push(
        'Your muscle development is well-balanced! Continue with your current training program.'
      );
      return recommendations;
    }

    // Generate specific recommendations for weak muscles
    const exerciseRecommendations: Record<MuscleGroup, string[]> = {
      CHEST: ['Add incline dumbbell press', 'Include chest flyes', 'Try dips'],
      ANTERIOR_DELTS: ['Add front raises', 'Include overhead press variations'],
      LATERAL_DELTS: ['Add lateral raises', 'Include upright rows'],
      REAR_DELTS: ['Add face pulls', 'Include reverse flyes', 'Try rear delt rows'],
      TRICEPS: ['Add tricep pushdowns', 'Include close-grip bench', 'Try skull crushers'],
      BICEPS: ['Add bicep curls', 'Include hammer curls', 'Try preacher curls'],
      FOREARMS: ['Add wrist curls', 'Include farmer carries', 'Try dead hangs'],
      LATS: ['Add pull-ups or lat pulldowns', 'Include rowing variations'],
      TRAPS: ['Add shrugs', 'Include face pulls', 'Try farmer carries'],
      SPINAL_ERECTORS: ['Add back extensions', 'Include good mornings', 'Try Romanian deadlifts'],
      ABDOMINALS: ['Add planks', 'Include leg raises', 'Try ab wheel rollouts'],
      OBLIQUES: ['Add side planks', 'Include Russian twists', 'Try woodchops'],
      QUADS: ['Add leg press', 'Include front squats', 'Try Bulgarian split squats'],
      GLUTES: ['Add hip thrusts', 'Include glute bridges', 'Try Romanian deadlifts'],
      HAMSTRINGS: ['Add leg curls', 'Include Romanian deadlifts', 'Try Nordic curls'],
      HIP_FLEXORS: ['Add hanging leg raises', 'Include hip flexor stretches'],
      ADDUCTORS: ['Add adductor machine', 'Include sumo squats', 'Try Copenhagen planks'],
      CALVES: ['Add standing calf raises', 'Include seated calf raises'],
    };

    for (const weakness of weakMuscles.slice(0, 3)) {
      // Top 3 priorities
      const exercises = exerciseRecommendations[weakness.muscleGroup];
      if (exercises) {
        recommendations.push(
          `To strengthen ${this.muscleGroupNames[weakness.muscleGroup]}: ${exercises.join(', ')}`
        );
      }
    }

    if (weakMuscles.length > 0) {
      recommendations.push(
        'Consider prioritizing weaker muscle groups by training them earlier in your workout when fresh.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate symmetry score (0-100)
   * Higher = more balanced muscle development
   */
  calculateSymmetryScore(scores: MuscleGroupScoreData[]): number {
    if (scores.length < 2) {
      return 100;
    }

    // Calculate standard deviation of percent deviations
    const deviations = scores.map((s) => Math.abs(s.percentDeviation));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

    // Convert to 0-100 score (0% deviation = 100, 50% avg deviation = 0)
    const symmetryScore = Math.max(0, 100 - avgDeviation * 2);

    return Math.round(symmetryScore);
  }
}

// Export singleton instance
export const muscleAnalysisService = new MuscleAnalysisService();
export default muscleAnalysisService;
