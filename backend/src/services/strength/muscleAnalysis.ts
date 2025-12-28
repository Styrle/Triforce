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
   * Complete list for all 44 lift types
   */
  private muscleContributions: Record<LiftType, MuscleContribution[]> = {
    // === SQUAT PATTERN ===
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
    ZERCHER_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 35 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'ABDOMINALS', percentage: 20 },
      { muscleGroup: 'BICEPS', percentage: 10 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 10 },
    ],
    SAFETY_BAR_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 42 },
      { muscleGroup: 'GLUTES', percentage: 28 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 10 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],
    LEG_PRESS: [
      { muscleGroup: 'QUADS', percentage: 55 },
      { muscleGroup: 'GLUTES', percentage: 30 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
    ],
    HACK_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 60 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
    ],
    GOBLET_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 45 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'ABDOMINALS', percentage: 15 },
      { muscleGroup: 'BICEPS', percentage: 10 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 5 },
    ],
    BULGARIAN_SPLIT_SQUAT: [
      { muscleGroup: 'QUADS', percentage: 45 },
      { muscleGroup: 'GLUTES', percentage: 35 },
      { muscleGroup: 'HAMSTRINGS', percentage: 10 },
      { muscleGroup: 'ABDOMINALS', percentage: 10 },
    ],

    // === FLOOR PULL PATTERN ===
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
    TRAP_BAR_DEADLIFT: [
      { muscleGroup: 'QUADS', percentage: 25 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'HAMSTRINGS', percentage: 20 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 15 },
      { muscleGroup: 'TRAPS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    STIFF_LEG_DEADLIFT: [
      { muscleGroup: 'HAMSTRINGS', percentage: 45 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 20 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    DEFICIT_DEADLIFT: [
      { muscleGroup: 'QUADS', percentage: 20 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'HAMSTRINGS', percentage: 25 },
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 20 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    BLOCK_PULL: [
      { muscleGroup: 'SPINAL_ERECTORS', percentage: 30 },
      { muscleGroup: 'GLUTES', percentage: 25 },
      { muscleGroup: 'HAMSTRINGS', percentage: 20 },
      { muscleGroup: 'TRAPS', percentage: 15 },
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
    CLEAN: [
      { muscleGroup: 'QUADS', percentage: 25 },
      { muscleGroup: 'GLUTES', percentage: 22 },
      { muscleGroup: 'TRAPS', percentage: 20 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 8 },
    ],
    SNATCH: [
      { muscleGroup: 'QUADS', percentage: 22 },
      { muscleGroup: 'GLUTES', percentage: 22 },
      { muscleGroup: 'TRAPS', percentage: 20 },
      { muscleGroup: 'HAMSTRINGS', percentage: 15 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 12 },
      { muscleGroup: 'FOREARMS', percentage: 9 },
    ],
    HIP_THRUST: [
      { muscleGroup: 'GLUTES', percentage: 60 },
      { muscleGroup: 'HAMSTRINGS', percentage: 25 },
      { muscleGroup: 'QUADS', percentage: 10 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],

    // === HORIZONTAL PRESS PATTERN ===
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
    CLOSE_GRIP_BENCH: [
      { muscleGroup: 'TRICEPS', percentage: 50 },
      { muscleGroup: 'CHEST', percentage: 30 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 20 },
    ],
    DUMBBELL_BENCH_PRESS: [
      { muscleGroup: 'CHEST', percentage: 45 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 25 },
    ],
    DUMBBELL_INCLINE_PRESS: [
      { muscleGroup: 'CHEST', percentage: 40 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 35 },
      { muscleGroup: 'TRICEPS', percentage: 25 },
    ],
    FLOOR_PRESS: [
      { muscleGroup: 'TRICEPS', percentage: 45 },
      { muscleGroup: 'CHEST', percentage: 35 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 20 },
    ],
    DIP: [
      { muscleGroup: 'CHEST', percentage: 35 },
      { muscleGroup: 'TRICEPS', percentage: 40 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 25 },
    ],
    WEIGHTED_DIP: [
      { muscleGroup: 'CHEST', percentage: 35 },
      { muscleGroup: 'TRICEPS', percentage: 40 },
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 25 },
    ],

    // === VERTICAL PRESS PATTERN ===
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
    SEATED_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 45 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 20 },
      { muscleGroup: 'TRICEPS', percentage: 35 },
    ],
    DUMBBELL_SHOULDER_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 42 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 23 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],
    ARNOLD_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 35 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 30 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'ABDOMINALS', percentage: 5 },
    ],
    BEHIND_NECK_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 35 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 30 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'TRAPS', percentage: 5 },
    ],
    Z_PRESS: [
      { muscleGroup: 'ANTERIOR_DELTS', percentage: 40 },
      { muscleGroup: 'LATERAL_DELTS', percentage: 20 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'ABDOMINALS', percentage: 10 },
    ],

    // === PULL PATTERN ===
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
    LAT_PULLDOWN: [
      { muscleGroup: 'LATS', percentage: 55 },
      { muscleGroup: 'BICEPS', percentage: 25 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    BARBELL_ROW: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'RHOMBOIDS', percentage: 15 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'BICEPS', percentage: 15 },
      { muscleGroup: 'TRAPS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    DUMBBELL_ROW: [
      { muscleGroup: 'LATS', percentage: 45 },
      { muscleGroup: 'RHOMBOIDS', percentage: 15 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'BICEPS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    CABLE_ROW: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'RHOMBOIDS', percentage: 20 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'BICEPS', percentage: 15 },
      { muscleGroup: 'FOREARMS', percentage: 10 },
    ],
    T_BAR_ROW: [
      { muscleGroup: 'LATS', percentage: 40 },
      { muscleGroup: 'RHOMBOIDS', percentage: 15 },
      { muscleGroup: 'REAR_DELTS', percentage: 15 },
      { muscleGroup: 'BICEPS', percentage: 15 },
      { muscleGroup: 'TRAPS', percentage: 10 },
      { muscleGroup: 'FOREARMS', percentage: 5 },
    ],
    BARBELL_CURL: [
      { muscleGroup: 'BICEPS', percentage: 80 },
      { muscleGroup: 'FOREARMS', percentage: 20 },
    ],
  };

  /**
   * Display names for muscle groups (including new RHOMBOIDS and TIBIALIS)
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
    RHOMBOIDS: 'Rhomboids',
    SPINAL_ERECTORS: 'Lower Back',
    ABDOMINALS: 'Abs',
    OBLIQUES: 'Obliques',
    QUADS: 'Quads',
    GLUTES: 'Glutes',
    HAMSTRINGS: 'Hamstrings',
    HIP_FLEXORS: 'Hip Flexors',
    ADDUCTORS: 'Adductors',
    CALVES: 'Calves',
    TIBIALIS: 'Tibialis',
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
   * Classify a score into a strength level (9-tier system)
   */
  private classifyScore(score: number): Classification {
    if (score < 20) return 'subpar';
    if (score < 30) return 'untrained';
    if (score < 45) return 'novice';
    if (score < 60) return 'intermediate';
    if (score < 75) return 'proficient';
    if (score < 85) return 'advanced';
    if (score < 92) return 'exceptional';
    if (score < 97) return 'elite';
    return 'world_class';
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
      RHOMBOIDS: ['Add cable rows', 'Include face pulls', 'Try band pull-aparts'],
      SPINAL_ERECTORS: ['Add back extensions', 'Include good mornings', 'Try Romanian deadlifts'],
      ABDOMINALS: ['Add planks', 'Include leg raises', 'Try ab wheel rollouts'],
      OBLIQUES: ['Add side planks', 'Include Russian twists', 'Try woodchops'],
      QUADS: ['Add leg press', 'Include front squats', 'Try Bulgarian split squats'],
      GLUTES: ['Add hip thrusts', 'Include glute bridges', 'Try Romanian deadlifts'],
      HAMSTRINGS: ['Add leg curls', 'Include Romanian deadlifts', 'Try Nordic curls'],
      HIP_FLEXORS: ['Add hanging leg raises', 'Include hip flexor stretches'],
      ADDUCTORS: ['Add adductor machine', 'Include sumo squats', 'Try Copenhagen planks'],
      CALVES: ['Add standing calf raises', 'Include seated calf raises'],
      TIBIALIS: ['Add tibialis raises', 'Include toe walks', 'Try reverse calf raises'],
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

/**
 * Anatomical positions for SVG muscle model rendering
 * Maps muscle groups to their positions and which view they appear on
 */
export interface AnatomicalPosition {
  view: 'front' | 'back';
  cx: number;  // Center X position (0-100 scale)
  cy: number;  // Center Y position (0-100 scale)
  rx?: number; // Ellipse radius X (for paired muscles)
  ry?: number; // Ellipse radius Y
}

export const ANATOMICAL_POSITIONS: Record<MuscleGroup, AnatomicalPosition> = {
  // Front View - Upper Body
  CHEST: { view: 'front', cx: 50, cy: 28 },
  ANTERIOR_DELTS: { view: 'front', cx: 50, cy: 20, rx: 15 },
  LATERAL_DELTS: { view: 'front', cx: 50, cy: 22, rx: 20 },
  TRICEPS: { view: 'front', cx: 50, cy: 32, rx: 18 },
  BICEPS: { view: 'front', cx: 50, cy: 32, rx: 16 },
  FOREARMS: { view: 'front', cx: 50, cy: 42, rx: 18 },
  ABDOMINALS: { view: 'front', cx: 50, cy: 42 },
  OBLIQUES: { view: 'front', cx: 50, cy: 45, rx: 10 },
  HIP_FLEXORS: { view: 'front', cx: 50, cy: 52 },

  // Front View - Lower Body
  QUADS: { view: 'front', cx: 50, cy: 62, rx: 8 },
  ADDUCTORS: { view: 'front', cx: 50, cy: 65 },
  TIBIALIS: { view: 'front', cx: 50, cy: 80, rx: 6 },

  // Back View - Upper Body
  TRAPS: { view: 'back', cx: 50, cy: 18 },
  REAR_DELTS: { view: 'back', cx: 50, cy: 22, rx: 15 },
  RHOMBOIDS: { view: 'back', cx: 50, cy: 26 },
  LATS: { view: 'back', cx: 50, cy: 35, rx: 12 },
  SPINAL_ERECTORS: { view: 'back', cx: 50, cy: 42 },

  // Back View - Lower Body
  GLUTES: { view: 'back', cx: 50, cy: 52, rx: 10 },
  HAMSTRINGS: { view: 'back', cx: 50, cy: 65, rx: 8 },
  CALVES: { view: 'back', cx: 50, cy: 80, rx: 6 },
};

export default muscleAnalysisService;
