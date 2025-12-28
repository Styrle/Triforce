import { LiftType } from '@prisma/client';

/**
 * Strength classification levels (9-tier Symmetric Strength style)
 */
export type Classification =
  | 'subpar'
  | 'untrained'
  | 'novice'
  | 'intermediate'
  | 'proficient'
  | 'advanced'
  | 'exceptional'
  | 'elite'
  | 'world_class';

/**
 * Classification colors for UI display
 */
export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  subpar: '#FF6B9D',        // Pink
  untrained: '#9B59B6',     // Purple
  novice: '#3498DB',        // Blue
  intermediate: '#1ABC9C',  // Teal
  proficient: '#27AE60',    // Green
  advanced: '#ADFF2F',      // Yellow-Green
  exceptional: '#F1C40F',   // Yellow
  elite: '#E67E22',         // Orange
  world_class: '#E74C3C',   // Red
};

/**
 * Classification thresholds (score ranges)
 */
export const CLASSIFICATION_THRESHOLDS: Record<Classification, { min: number; max: number }> = {
  subpar: { min: 0, max: 20 },
  untrained: { min: 20, max: 30 },
  novice: { min: 30, max: 45 },
  intermediate: { min: 45, max: 60 },
  proficient: { min: 60, max: 75 },
  advanced: { min: 75, max: 85 },
  exceptional: { min: 85, max: 92 },
  elite: { min: 92, max: 97 },
  world_class: { min: 97, max: 100 },
};

/**
 * Strength standards for a specific lift
 */
export interface StrengthStandard {
  liftType: LiftType;
  sex: 'MALE' | 'FEMALE';
  subpar: number;
  untrained: number;
  novice: number;
  intermediate: number;
  proficient: number;
  advanced: number;
  exceptional: number;
  elite: number;
  worldClass: number;
}

/**
 * Result of strength score calculation
 */
export interface StrengthScore {
  score: number;
  classification: Classification;
  percentile: number;
  bwRatio: number;
  nextLevel: Classification | null;
  toNextLevel: number | null;
}

/**
 * Lift category groupings
 */
export type LiftCategory = 'squat' | 'floor_pull' | 'horizontal_press' | 'vertical_press' | 'pull';

/**
 * Strength Standards Service
 *
 * Provides strength standards based on bodyweight ratios (like Symmetric Strength)
 * Standards vary by lift type and sex
 */
export class StrengthStandardsService {
  /**
   * Strength standards expressed as bodyweight multipliers for 1RM
   * 9-tier system: subpar, untrained, novice, intermediate, proficient, advanced, exceptional, elite, world_class
   * Based on Symmetric Strength methodology
   */
  private standards: Record<LiftType, { male: number[]; female: number[] }> = {
    // === SQUAT PATTERN ===
    BACK_SQUAT: {
      male: [0.40, 0.60, 0.85, 1.15, 1.50, 1.85, 2.15, 2.40, 2.75],
      female: [0.30, 0.45, 0.65, 0.90, 1.20, 1.50, 1.75, 1.95, 2.25],
    },
    FRONT_SQUAT: {
      male: [0.30, 0.50, 0.70, 0.95, 1.25, 1.55, 1.80, 2.00, 2.30],
      female: [0.22, 0.38, 0.55, 0.75, 1.00, 1.25, 1.45, 1.62, 1.88],
    },
    ZERCHER_SQUAT: {
      male: [0.25, 0.40, 0.60, 0.80, 1.05, 1.30, 1.50, 1.68, 1.90],
      female: [0.18, 0.30, 0.45, 0.62, 0.82, 1.02, 1.18, 1.32, 1.50],
    },
    SAFETY_BAR_SQUAT: {
      male: [0.35, 0.55, 0.78, 1.05, 1.38, 1.70, 1.98, 2.20, 2.52],
      female: [0.27, 0.42, 0.60, 0.82, 1.10, 1.38, 1.60, 1.78, 2.06],
    },
    LEG_PRESS: {
      male: [0.80, 1.20, 1.70, 2.30, 3.00, 3.70, 4.30, 4.80, 5.50],
      female: [0.60, 0.95, 1.35, 1.80, 2.40, 3.00, 3.50, 3.90, 4.50],
    },
    HACK_SQUAT: {
      male: [0.35, 0.55, 0.78, 1.05, 1.38, 1.70, 1.98, 2.20, 2.52],
      female: [0.27, 0.42, 0.60, 0.82, 1.10, 1.38, 1.60, 1.78, 2.06],
    },
    GOBLET_SQUAT: {
      male: [0.15, 0.22, 0.32, 0.45, 0.60, 0.75, 0.88, 1.00, 1.15],
      female: [0.10, 0.16, 0.24, 0.35, 0.48, 0.60, 0.70, 0.80, 0.92],
    },
    BULGARIAN_SPLIT_SQUAT: {
      male: [0.15, 0.28, 0.42, 0.58, 0.78, 0.98, 1.15, 1.28, 1.48],
      female: [0.12, 0.22, 0.35, 0.48, 0.65, 0.82, 0.95, 1.08, 1.25],
    },

    // === FLOOR PULL PATTERN ===
    DEADLIFT: {
      male: [0.50, 0.80, 1.10, 1.45, 1.85, 2.25, 2.60, 2.90, 3.30],
      female: [0.40, 0.65, 0.90, 1.20, 1.55, 1.90, 2.20, 2.45, 2.80],
    },
    SUMO_DEADLIFT: {
      male: [0.50, 0.80, 1.10, 1.45, 1.85, 2.25, 2.60, 2.90, 3.30],
      female: [0.42, 0.68, 0.95, 1.25, 1.62, 2.00, 2.30, 2.55, 2.95],
    },
    ROMANIAN_DEADLIFT: {
      male: [0.35, 0.55, 0.80, 1.05, 1.35, 1.65, 1.90, 2.10, 2.40],
      female: [0.28, 0.45, 0.65, 0.88, 1.15, 1.42, 1.65, 1.82, 2.10],
    },
    TRAP_BAR_DEADLIFT: {
      male: [0.55, 0.85, 1.15, 1.55, 2.00, 2.45, 2.80, 3.10, 3.50],
      female: [0.45, 0.72, 1.00, 1.32, 1.70, 2.08, 2.40, 2.65, 3.05],
    },
    STIFF_LEG_DEADLIFT: {
      male: [0.30, 0.50, 0.72, 0.98, 1.28, 1.58, 1.82, 2.02, 2.32],
      female: [0.25, 0.42, 0.60, 0.82, 1.08, 1.35, 1.55, 1.72, 1.98],
    },
    DEFICIT_DEADLIFT: {
      male: [0.45, 0.72, 1.00, 1.32, 1.68, 2.05, 2.38, 2.65, 3.02],
      female: [0.38, 0.60, 0.85, 1.12, 1.45, 1.78, 2.06, 2.28, 2.62],
    },
    BLOCK_PULL: {
      male: [0.55, 0.88, 1.20, 1.58, 2.02, 2.45, 2.85, 3.18, 3.62],
      female: [0.45, 0.72, 1.00, 1.32, 1.70, 2.08, 2.42, 2.68, 3.08],
    },
    POWER_CLEAN: {
      male: [0.30, 0.50, 0.70, 0.90, 1.15, 1.40, 1.60, 1.78, 2.05],
      female: [0.22, 0.38, 0.55, 0.72, 0.95, 1.18, 1.38, 1.52, 1.78],
    },
    CLEAN: {
      male: [0.35, 0.55, 0.75, 1.00, 1.28, 1.55, 1.78, 1.98, 2.25],
      female: [0.28, 0.45, 0.62, 0.82, 1.08, 1.32, 1.55, 1.72, 2.00],
    },
    SNATCH: {
      male: [0.25, 0.40, 0.55, 0.75, 0.98, 1.20, 1.40, 1.55, 1.78],
      female: [0.20, 0.32, 0.45, 0.60, 0.80, 1.00, 1.18, 1.32, 1.52],
    },
    HIP_THRUST: {
      male: [0.50, 0.80, 1.10, 1.45, 1.85, 2.25, 2.60, 2.90, 3.30],
      female: [0.45, 0.72, 1.00, 1.35, 1.75, 2.15, 2.50, 2.80, 3.20],
    },

    // === HORIZONTAL PRESS PATTERN ===
    BENCH_PRESS: {
      male: [0.30, 0.45, 0.65, 0.90, 1.20, 1.50, 1.75, 1.95, 2.20],
      female: [0.18, 0.28, 0.42, 0.58, 0.78, 0.98, 1.15, 1.28, 1.48],
    },
    INCLINE_BENCH: {
      male: [0.25, 0.40, 0.55, 0.75, 1.00, 1.25, 1.45, 1.60, 1.85],
      female: [0.15, 0.24, 0.35, 0.48, 0.65, 0.82, 0.95, 1.05, 1.22],
    },
    CLOSE_GRIP_BENCH: {
      male: [0.25, 0.40, 0.55, 0.80, 1.05, 1.30, 1.50, 1.70, 1.95],
      female: [0.15, 0.25, 0.38, 0.55, 0.72, 0.90, 1.05, 1.18, 1.35],
    },
    DUMBBELL_BENCH_PRESS: {
      male: [0.12, 0.20, 0.30, 0.42, 0.55, 0.70, 0.82, 0.92, 1.05],
      female: [0.08, 0.14, 0.22, 0.32, 0.42, 0.55, 0.65, 0.72, 0.85],
    },
    DUMBBELL_INCLINE_PRESS: {
      male: [0.10, 0.18, 0.26, 0.36, 0.48, 0.62, 0.72, 0.82, 0.95],
      female: [0.07, 0.12, 0.18, 0.26, 0.36, 0.48, 0.56, 0.64, 0.75],
    },
    FLOOR_PRESS: {
      male: [0.25, 0.40, 0.58, 0.80, 1.05, 1.32, 1.52, 1.70, 1.95],
      female: [0.15, 0.25, 0.38, 0.52, 0.70, 0.88, 1.02, 1.15, 1.32],
    },
    DIP: {
      // Expressed as added weight / bodyweight multiplier
      male: [-0.25, -0.10, 0.10, 0.30, 0.55, 0.80, 1.00, 1.15, 1.35],
      female: [-0.40, -0.25, -0.08, 0.10, 0.30, 0.50, 0.68, 0.82, 1.00],
    },
    WEIGHTED_DIP: {
      // Same as DIP, expressed as added weight / bodyweight multiplier
      male: [-0.25, -0.10, 0.10, 0.30, 0.55, 0.80, 1.00, 1.15, 1.35],
      female: [-0.40, -0.25, -0.08, 0.10, 0.30, 0.50, 0.68, 0.82, 1.00],
    },

    // === VERTICAL PRESS PATTERN ===
    OVERHEAD_PRESS: {
      male: [0.20, 0.30, 0.45, 0.60, 0.80, 1.00, 1.15, 1.30, 1.50],
      female: [0.12, 0.20, 0.32, 0.45, 0.60, 0.78, 0.92, 1.02, 1.18],
    },
    PUSH_PRESS: {
      male: [0.25, 0.40, 0.55, 0.75, 1.00, 1.25, 1.45, 1.60, 1.85],
      female: [0.18, 0.30, 0.42, 0.58, 0.78, 0.98, 1.15, 1.28, 1.48],
    },
    SEATED_PRESS: {
      male: [0.18, 0.28, 0.42, 0.57, 0.75, 0.95, 1.10, 1.22, 1.40],
      female: [0.10, 0.18, 0.28, 0.42, 0.56, 0.72, 0.85, 0.95, 1.10],
    },
    DUMBBELL_SHOULDER_PRESS: {
      male: [0.10, 0.15, 0.24, 0.34, 0.45, 0.58, 0.68, 0.77, 0.90],
      female: [0.07, 0.12, 0.18, 0.26, 0.35, 0.45, 0.55, 0.62, 0.72],
    },
    ARNOLD_PRESS: {
      male: [0.08, 0.14, 0.22, 0.32, 0.42, 0.55, 0.65, 0.75, 0.88],
      female: [0.06, 0.10, 0.16, 0.24, 0.32, 0.42, 0.50, 0.58, 0.68],
    },
    BEHIND_NECK_PRESS: {
      male: [0.15, 0.25, 0.38, 0.52, 0.68, 0.85, 1.00, 1.12, 1.28],
      female: [0.10, 0.18, 0.28, 0.40, 0.52, 0.68, 0.80, 0.90, 1.05],
    },
    Z_PRESS: {
      male: [0.15, 0.25, 0.38, 0.52, 0.68, 0.85, 1.00, 1.12, 1.28],
      female: [0.10, 0.18, 0.28, 0.40, 0.52, 0.68, 0.80, 0.90, 1.05],
    },

    // === PULL PATTERN ===
    PULL_UP: {
      // Expressed as added weight / bodyweight multiplier
      male: [-0.35, -0.20, 0.00, 0.20, 0.45, 0.70, 0.90, 1.05, 1.25],
      female: [-0.55, -0.38, -0.20, 0.00, 0.22, 0.45, 0.65, 0.80, 1.00],
    },
    CHIN_UP: {
      // Expressed as added weight / bodyweight multiplier
      male: [-0.30, -0.15, 0.05, 0.25, 0.50, 0.75, 0.95, 1.12, 1.32],
      female: [-0.50, -0.32, -0.15, 0.05, 0.28, 0.52, 0.72, 0.88, 1.08],
    },
    PENDLAY_ROW: {
      male: [0.30, 0.50, 0.70, 0.90, 1.15, 1.40, 1.60, 1.78, 2.05],
      female: [0.24, 0.38, 0.55, 0.75, 0.98, 1.22, 1.42, 1.58, 1.82],
    },
    BENT_OVER_ROW: {
      male: [0.30, 0.45, 0.65, 0.85, 1.10, 1.35, 1.55, 1.70, 1.95],
      female: [0.22, 0.35, 0.52, 0.70, 0.92, 1.15, 1.32, 1.48, 1.70],
    },
    LAT_PULLDOWN: {
      male: [0.30, 0.45, 0.60, 0.80, 1.00, 1.20, 1.38, 1.52, 1.75],
      female: [0.25, 0.38, 0.52, 0.68, 0.88, 1.08, 1.25, 1.38, 1.58],
    },
    BARBELL_ROW: {
      male: [0.30, 0.45, 0.65, 0.85, 1.10, 1.35, 1.55, 1.70, 1.95],
      female: [0.22, 0.35, 0.52, 0.70, 0.92, 1.15, 1.32, 1.48, 1.70],
    },
    DUMBBELL_ROW: {
      male: [0.15, 0.25, 0.38, 0.52, 0.68, 0.85, 1.00, 1.12, 1.30],
      female: [0.12, 0.20, 0.30, 0.42, 0.55, 0.70, 0.82, 0.92, 1.08],
    },
    CABLE_ROW: {
      male: [0.30, 0.45, 0.62, 0.82, 1.05, 1.28, 1.48, 1.65, 1.90],
      female: [0.24, 0.38, 0.52, 0.68, 0.88, 1.08, 1.25, 1.40, 1.62],
    },
    T_BAR_ROW: {
      male: [0.30, 0.50, 0.70, 0.90, 1.15, 1.40, 1.60, 1.78, 2.05],
      female: [0.25, 0.42, 0.58, 0.78, 1.00, 1.22, 1.42, 1.58, 1.82],
    },
    BARBELL_CURL: {
      male: [0.12, 0.20, 0.30, 0.42, 0.55, 0.70, 0.82, 0.92, 1.05],
      female: [0.08, 0.14, 0.22, 0.32, 0.42, 0.55, 0.65, 0.72, 0.85],
    },
  };

  /**
   * Classification labels in order (9-tier)
   */
  private classifications: Classification[] = [
    'subpar',
    'untrained',
    'novice',
    'intermediate',
    'proficient',
    'advanced',
    'exceptional',
    'elite',
    'world_class',
  ];

  /**
   * Map lifts to their categories
   */
  private liftCategories: Record<LiftType, LiftCategory> = {
    // Squat Pattern
    BACK_SQUAT: 'squat',
    FRONT_SQUAT: 'squat',
    ZERCHER_SQUAT: 'squat',
    SAFETY_BAR_SQUAT: 'squat',
    LEG_PRESS: 'squat',
    HACK_SQUAT: 'squat',
    GOBLET_SQUAT: 'squat',
    BULGARIAN_SPLIT_SQUAT: 'squat',

    // Floor Pull Pattern
    DEADLIFT: 'floor_pull',
    SUMO_DEADLIFT: 'floor_pull',
    ROMANIAN_DEADLIFT: 'floor_pull',
    TRAP_BAR_DEADLIFT: 'floor_pull',
    STIFF_LEG_DEADLIFT: 'floor_pull',
    DEFICIT_DEADLIFT: 'floor_pull',
    BLOCK_PULL: 'floor_pull',
    POWER_CLEAN: 'floor_pull',
    CLEAN: 'floor_pull',
    SNATCH: 'floor_pull',
    HIP_THRUST: 'floor_pull',

    // Horizontal Press Pattern
    BENCH_PRESS: 'horizontal_press',
    INCLINE_BENCH: 'horizontal_press',
    CLOSE_GRIP_BENCH: 'horizontal_press',
    DUMBBELL_BENCH_PRESS: 'horizontal_press',
    DUMBBELL_INCLINE_PRESS: 'horizontal_press',
    FLOOR_PRESS: 'horizontal_press',
    DIP: 'horizontal_press',
    WEIGHTED_DIP: 'horizontal_press',

    // Vertical Press Pattern
    OVERHEAD_PRESS: 'vertical_press',
    PUSH_PRESS: 'vertical_press',
    SEATED_PRESS: 'vertical_press',
    DUMBBELL_SHOULDER_PRESS: 'vertical_press',
    ARNOLD_PRESS: 'vertical_press',
    BEHIND_NECK_PRESS: 'vertical_press',
    Z_PRESS: 'vertical_press',

    // Pull Pattern
    PULL_UP: 'pull',
    CHIN_UP: 'pull',
    PENDLAY_ROW: 'pull',
    BENT_OVER_ROW: 'pull',
    LAT_PULLDOWN: 'pull',
    BARBELL_ROW: 'pull',
    DUMBBELL_ROW: 'pull',
    CABLE_ROW: 'pull',
    T_BAR_ROW: 'pull',
    BARBELL_CURL: 'pull',
  };

  /**
   * Check if a lift is a bodyweight exercise
   */
  isBodyweightLift(liftType: LiftType): boolean {
    return ['PULL_UP', 'CHIN_UP', 'DIP', 'WEIGHTED_DIP'].includes(liftType);
  }

  /**
   * Get lift category
   */
  getLiftCategory(liftType: LiftType): LiftCategory {
    return this.liftCategories[liftType];
  }

  /**
   * Get strength standards for a specific lift (9-tier system)
   */
  getStrengthStandards(
    liftType: LiftType,
    bodyweight: number,
    sex: 'MALE' | 'FEMALE'
  ): StrengthStandard {
    const multipliers = this.standards[liftType][sex.toLowerCase() as 'male' | 'female'];

    return {
      liftType,
      sex,
      subpar: Math.round(bodyweight * multipliers[0]),
      untrained: Math.round(bodyweight * multipliers[1]),
      novice: Math.round(bodyweight * multipliers[2]),
      intermediate: Math.round(bodyweight * multipliers[3]),
      proficient: Math.round(bodyweight * multipliers[4]),
      advanced: Math.round(bodyweight * multipliers[5]),
      exceptional: Math.round(bodyweight * multipliers[6]),
      elite: Math.round(bodyweight * multipliers[7]),
      worldClass: Math.round(bodyweight * multipliers[8]),
    };
  }

  /**
   * Calculate strength score for a lift
   *
   * 9-tier score system (0-100+ scale):
   * 0-20 = Subpar
   * 20-30 = Untrained
   * 30-45 = Novice
   * 45-60 = Intermediate
   * 60-75 = Proficient
   * 75-85 = Advanced
   * 85-92 = Exceptional
   * 92-97 = Elite
   * 97+ = World Class
   */
  calculateStrengthScore(
    oneRM: number,
    bodyweight: number,
    liftType: LiftType,
    sex: 'MALE' | 'FEMALE'
  ): StrengthScore {
    const multipliers = this.standards[liftType][sex.toLowerCase() as 'male' | 'female'];
    const bwRatio = oneRM / bodyweight;

    // Find where the ratio falls in the standards
    let classification: Classification = 'subpar';
    let index = 0;

    for (let i = 0; i < multipliers.length; i++) {
      if (bwRatio >= multipliers[i]) {
        classification = this.classifications[i];
        index = i;
      } else {
        break;
      }
    }

    // Calculate score (0-100 scale) - 9-tier ranges
    // Score ranges matching CLASSIFICATION_THRESHOLDS:
    // subpar: 0-20, untrained: 20-30, novice: 30-45, intermediate: 45-60,
    // proficient: 60-75, advanced: 75-85, exceptional: 85-92, elite: 92-97, world_class: 97+
    const scoreRanges = [
      [0, 20],    // subpar
      [20, 30],   // untrained
      [30, 45],   // novice
      [45, 60],   // intermediate
      [60, 75],   // proficient
      [75, 85],   // advanced
      [85, 92],   // exceptional
      [92, 97],   // elite
      [97, 110],  // world_class
    ];

    let score: number;
    if (index === 0 && bwRatio < multipliers[0]) {
      // Below subpar threshold
      score = Math.max(0, (bwRatio / multipliers[0]) * 20);
    } else if (index >= multipliers.length - 1) {
      // At or above world_class
      const worldClassRatio = multipliers[multipliers.length - 1];
      score = 97 + Math.min(13, ((bwRatio - worldClassRatio) / worldClassRatio) * 15);
    } else {
      // Between two levels
      const lowerBound = multipliers[index];
      const upperBound = multipliers[index + 1];
      const progress = (bwRatio - lowerBound) / (upperBound - lowerBound);
      const range = scoreRanges[index];
      score = range[0] + progress * (range[1] - range[0]);
    }

    // Calculate percentile (approximate based on score)
    const percentile = this.scoreToPercentile(score);

    // Calculate next level info
    let nextLevel: Classification | null = null;
    let toNextLevel: number | null = null;

    if (index < multipliers.length - 1) {
      nextLevel = this.classifications[index + 1];
      const nextMultiplier = multipliers[index + 1];
      toNextLevel = Math.round(nextMultiplier * bodyweight - oneRM);
    }

    return {
      score: Math.round(score * 10) / 10,
      classification,
      percentile,
      bwRatio: Math.round(bwRatio * 100) / 100,
      nextLevel,
      toNextLevel: toNextLevel !== null && toNextLevel > 0 ? toNextLevel : null,
    };
  }

  /**
   * Convert score to approximate percentile (9-tier system)
   */
  private scoreToPercentile(score: number): number {
    // Approximate percentile based on assumed normal distribution of lifters
    // 9-tier mapping
    if (score <= 20) return Math.round((score / 20) * 15);           // 0-15%
    if (score <= 30) return 15 + Math.round(((score - 20) / 10) * 15);  // 15-30%
    if (score <= 45) return 30 + Math.round(((score - 30) / 15) * 20);  // 30-50%
    if (score <= 60) return 50 + Math.round(((score - 45) / 15) * 15);  // 50-65%
    if (score <= 75) return 65 + Math.round(((score - 60) / 15) * 15);  // 65-80%
    if (score <= 85) return 80 + Math.round(((score - 75) / 10) * 10);  // 80-90%
    if (score <= 92) return 90 + Math.round(((score - 85) / 7) * 5);    // 90-95%
    if (score <= 97) return 95 + Math.round(((score - 92) / 5) * 3);    // 95-98%
    return Math.min(99.9, 98 + ((score - 97) / 13) * 1.9);              // 98-99.9%
  }

  /**
   * Classify a strength score into a rating (9-tier system)
   */
  classifyLift(score: number): Classification {
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
   * Get description for a classification (9-tier system)
   */
  getClassificationDescription(classification: Classification): string {
    const descriptions: Record<Classification, string> = {
      subpar: 'Below average, just starting out',
      untrained: 'No structured weight training experience',
      novice: 'Consistent training for 0-6 months',
      intermediate: 'Consistent training for 6-18 months',
      proficient: 'Consistent training for 1.5-3 years',
      advanced: 'Consistent training for 3-5+ years',
      exceptional: 'Top regional/state competitive level',
      elite: 'National/professional competitive level',
      world_class: 'International/world record competitive level',
    };
    return descriptions[classification];
  }

  /**
   * Get all available lift types
   */
  getAvailableLiftTypes(): LiftType[] {
    return Object.keys(this.standards) as LiftType[];
  }

  /**
   * Get lifts by category
   */
  getLiftsByCategory(category: LiftCategory): LiftType[] {
    return Object.entries(this.liftCategories)
      .filter(([_, cat]) => cat === category)
      .map(([lift]) => lift as LiftType);
  }
}

// Export singleton instance
export const strengthStandardsService = new StrengthStandardsService();
export default strengthStandardsService;
