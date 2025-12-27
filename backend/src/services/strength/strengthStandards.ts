import { LiftType } from '@prisma/client';

/**
 * Strength classification levels
 */
export type Classification =
  | 'untrained'
  | 'beginner'
  | 'intermediate'
  | 'proficient'
  | 'advanced'
  | 'exceptional'
  | 'elite';

/**
 * Strength standards for a specific lift
 */
export interface StrengthStandard {
  liftType: LiftType;
  sex: 'MALE' | 'FEMALE';
  untrained: number;
  beginner: number;
  intermediate: number;
  proficient: number;
  advanced: number;
  exceptional: number;
  elite: number;
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
   * Based on research and competitive lifting data
   *
   * These are approximate thresholds:
   * - Untrained: No training background
   * - Beginner: 0-6 months training
   * - Intermediate: 6-24 months training
   * - Proficient: 2-5 years training
   * - Advanced: 5+ years training
   * - Exceptional: Competitive level
   * - Elite: Top competitive level
   */
  private standards: Record<LiftType, { male: number[]; female: number[] }> = {
    // Squat patterns
    BACK_SQUAT: {
      male: [0.5, 0.75, 1.25, 1.5, 1.75, 2.0, 2.25],
      female: [0.35, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75],
    },
    FRONT_SQUAT: {
      male: [0.4, 0.6, 1.0, 1.25, 1.5, 1.75, 2.0],
      female: [0.3, 0.45, 0.65, 0.85, 1.05, 1.25, 1.45],
    },

    // Floor pulls
    DEADLIFT: {
      male: [0.75, 1.0, 1.5, 1.75, 2.0, 2.25, 2.5],
      female: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0],
    },
    SUMO_DEADLIFT: {
      male: [0.75, 1.0, 1.5, 1.75, 2.0, 2.25, 2.5],
      female: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0],
    },
    ROMANIAN_DEADLIFT: {
      male: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0],
      female: [0.35, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75],
    },
    POWER_CLEAN: {
      male: [0.4, 0.6, 0.85, 1.0, 1.15, 1.3, 1.45],
      female: [0.25, 0.4, 0.55, 0.7, 0.85, 1.0, 1.15],
    },

    // Horizontal press
    BENCH_PRESS: {
      male: [0.35, 0.5, 1.0, 1.25, 1.5, 1.75, 2.0],
      female: [0.2, 0.35, 0.5, 0.75, 0.9, 1.05, 1.2],
    },
    INCLINE_BENCH: {
      male: [0.3, 0.45, 0.85, 1.1, 1.35, 1.55, 1.75],
      female: [0.15, 0.3, 0.45, 0.65, 0.8, 0.95, 1.05],
    },
    DIP: {
      // Expressed as BW + added weight multiplier
      male: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85],
      female: [0, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55],
    },

    // Vertical press
    OVERHEAD_PRESS: {
      male: [0.25, 0.35, 0.65, 0.8, 0.95, 1.1, 1.25],
      female: [0.15, 0.25, 0.4, 0.55, 0.65, 0.75, 0.85],
    },
    PUSH_PRESS: {
      male: [0.35, 0.5, 0.8, 0.95, 1.1, 1.25, 1.4],
      female: [0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1.0],
    },

    // Pulls
    PULL_UP: {
      // Expressed as BW + added weight multiplier
      male: [0, 0, 0.2, 0.35, 0.5, 0.65, 0.8],
      female: [0, 0, 0.1, 0.2, 0.3, 0.4, 0.5],
    },
    CHIN_UP: {
      // Expressed as BW + added weight multiplier
      male: [0, 0.05, 0.25, 0.4, 0.55, 0.7, 0.85],
      female: [0, 0, 0.15, 0.25, 0.35, 0.45, 0.55],
    },
    PENDLAY_ROW: {
      male: [0.35, 0.5, 0.8, 1.0, 1.2, 1.35, 1.5],
      female: [0.2, 0.35, 0.55, 0.7, 0.85, 1.0, 1.1],
    },
    BENT_OVER_ROW: {
      male: [0.35, 0.5, 0.8, 1.0, 1.2, 1.35, 1.5],
      female: [0.2, 0.35, 0.55, 0.7, 0.85, 1.0, 1.1],
    },
  };

  /**
   * Classification labels in order
   */
  private classifications: Classification[] = [
    'untrained',
    'beginner',
    'intermediate',
    'proficient',
    'advanced',
    'exceptional',
    'elite',
  ];

  /**
   * Map lifts to their categories
   */
  private liftCategories: Record<LiftType, LiftCategory> = {
    BACK_SQUAT: 'squat',
    FRONT_SQUAT: 'squat',
    DEADLIFT: 'floor_pull',
    SUMO_DEADLIFT: 'floor_pull',
    ROMANIAN_DEADLIFT: 'floor_pull',
    POWER_CLEAN: 'floor_pull',
    BENCH_PRESS: 'horizontal_press',
    INCLINE_BENCH: 'horizontal_press',
    DIP: 'horizontal_press',
    OVERHEAD_PRESS: 'vertical_press',
    PUSH_PRESS: 'vertical_press',
    PULL_UP: 'pull',
    CHIN_UP: 'pull',
    PENDLAY_ROW: 'pull',
    BENT_OVER_ROW: 'pull',
  };

  /**
   * Check if a lift is a bodyweight exercise
   */
  isBodyweightLift(liftType: LiftType): boolean {
    return ['PULL_UP', 'CHIN_UP', 'DIP'].includes(liftType);
  }

  /**
   * Get lift category
   */
  getLiftCategory(liftType: LiftType): LiftCategory {
    return this.liftCategories[liftType];
  }

  /**
   * Get strength standards for a specific lift
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
      untrained: Math.round(bodyweight * multipliers[0]),
      beginner: Math.round(bodyweight * multipliers[1]),
      intermediate: Math.round(bodyweight * multipliers[2]),
      proficient: Math.round(bodyweight * multipliers[3]),
      advanced: Math.round(bodyweight * multipliers[4]),
      exceptional: Math.round(bodyweight * multipliers[5]),
      elite: Math.round(bodyweight * multipliers[6]),
    };
  }

  /**
   * Calculate strength score for a lift
   *
   * Score is 0-100+ scale where:
   * 0-20 = Untrained
   * 20-40 = Beginner
   * 40-60 = Intermediate
   * 60-75 = Proficient
   * 75-85 = Advanced
   * 85-95 = Exceptional
   * 95+ = Elite
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
    let classification: Classification = 'untrained';
    let index = 0;

    for (let i = 0; i < multipliers.length; i++) {
      if (bwRatio >= multipliers[i]) {
        classification = this.classifications[i];
        index = i;
      } else {
        break;
      }
    }

    // Calculate score (0-100 scale)
    let score: number;
    if (index === 0 && bwRatio < multipliers[0]) {
      // Below untrained
      score = Math.max(0, (bwRatio / multipliers[0]) * 20);
    } else if (index >= multipliers.length - 1) {
      // At or above elite
      const eliteRatio = multipliers[multipliers.length - 1];
      score = 95 + Math.min(15, ((bwRatio - eliteRatio) / eliteRatio) * 20);
    } else {
      // Between two levels
      const lowerBound = multipliers[index];
      const upperBound = multipliers[index + 1];
      const progress = (bwRatio - lowerBound) / (upperBound - lowerBound);

      // Score ranges: 0-20, 20-40, 40-60, 60-75, 75-85, 85-95, 95+
      const scoreRanges = [
        [0, 20],
        [20, 40],
        [40, 60],
        [60, 75],
        [75, 85],
        [85, 95],
        [95, 110],
      ];
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
   * Convert score to approximate percentile
   */
  private scoreToPercentile(score: number): number {
    // Approximate percentile based on assumed normal distribution of lifters
    if (score <= 20) return Math.round((score / 20) * 25);
    if (score <= 40) return 25 + Math.round(((score - 20) / 20) * 25);
    if (score <= 60) return 50 + Math.round(((score - 40) / 20) * 25);
    if (score <= 75) return 75 + Math.round(((score - 60) / 15) * 10);
    if (score <= 85) return 85 + Math.round(((score - 75) / 10) * 7);
    if (score <= 95) return 92 + Math.round(((score - 85) / 10) * 5);
    return Math.min(99.9, 97 + ((score - 95) / 15) * 2.9);
  }

  /**
   * Classify a strength score into a rating
   */
  classifyLift(score: number): Classification {
    if (score < 20) return 'untrained';
    if (score < 40) return 'beginner';
    if (score < 60) return 'intermediate';
    if (score < 75) return 'proficient';
    if (score < 85) return 'advanced';
    if (score < 95) return 'exceptional';
    return 'elite';
  }

  /**
   * Get description for a classification
   */
  getClassificationDescription(classification: Classification): string {
    const descriptions: Record<Classification, string> = {
      untrained: 'No weight training experience',
      beginner: 'Consistent training for 0-6 months',
      intermediate: 'Consistent training for 6-24 months',
      proficient: 'Consistent training for 2-5 years',
      advanced: 'Consistent training for 5+ years, competitive level',
      exceptional: 'Top regional/national competitive level',
      elite: 'Professional/international competitive level',
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
