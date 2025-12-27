/**
 * 1RM (One Rep Max) Calculator Service
 *
 * Uses multiple formulas to estimate 1RM from submaximal lifts
 * and provides rep range calculations
 */

/**
 * 1RM calculation result with multiple formula estimates
 */
export interface OneRMResult {
  estimated1RM: number;
  brzycki: number;
  epley: number;
  lander: number;
  lombardi: number;
  oconner: number;
  wathan: number;
  weight: number;
  reps: number;
}

/**
 * Rep ranges for percentage of 1RM
 */
export interface RepRangeInfo {
  percentage: number;
  weight: number;
  repRange: string;
  purpose: string;
}

/**
 * One Rep Max Calculator
 *
 * Provides accurate 1RM estimates using multiple validated formulas
 */
export class OneRepMaxCalculator {
  /**
   * Calculate 1RM using Brzycki formula (most accurate for reps 1-10)
   * 1RM = weight × (36 / (37 - reps))
   */
  brzycki(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps >= 37) return weight * 2.5; // Limit for very high reps
    return weight * (36 / (37 - reps));
  }

  /**
   * Calculate 1RM using Epley formula (good for reps 1-15)
   * 1RM = weight × (1 + reps / 30)
   */
  epley(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  }

  /**
   * Calculate 1RM using Lander formula
   * 1RM = weight / (1.013 - 0.0267123 × reps)
   */
  lander(weight: number, reps: number): number {
    if (reps === 1) return weight;
    const divisor = 1.013 - 0.0267123 * reps;
    if (divisor <= 0) return weight * 2.5;
    return weight / divisor;
  }

  /**
   * Calculate 1RM using Lombardi formula
   * 1RM = weight × reps^0.10
   */
  lombardi(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * Math.pow(reps, 0.1);
  }

  /**
   * Calculate 1RM using O'Conner formula
   * 1RM = weight × (1 + reps / 40)
   */
  oconner(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 40);
  }

  /**
   * Calculate 1RM using Wathan formula
   * 1RM = weight × (100 / (48.8 + 53.8 × e^(-0.075 × reps)))
   */
  wathan(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
  }

  /**
   * Calculate 1RM using average of multiple formulas
   * More accurate than single formula for reps 2-12
   */
  calculate1RM(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) {
      throw new Error('Weight and reps must be positive numbers');
    }

    if (reps === 1) {
      return weight;
    }

    // Use average of Brzycki, Epley, and Wathan (most validated)
    const brzycki = this.brzycki(weight, reps);
    const epley = this.epley(weight, reps);
    const wathan = this.wathan(weight, reps);

    return Math.round((brzycki + epley + wathan) / 3);
  }

  /**
   * Get detailed 1RM estimates from all formulas
   */
  calculateDetailed(weight: number, reps: number): OneRMResult {
    if (weight <= 0 || reps <= 0) {
      throw new Error('Weight and reps must be positive numbers');
    }

    const brzycki = Math.round(this.brzycki(weight, reps));
    const epley = Math.round(this.epley(weight, reps));
    const lander = Math.round(this.lander(weight, reps));
    const lombardi = Math.round(this.lombardi(weight, reps));
    const oconner = Math.round(this.oconner(weight, reps));
    const wathan = Math.round(this.wathan(weight, reps));

    // Average of the three most validated formulas
    const estimated1RM = Math.round((brzycki + epley + wathan) / 3);

    return {
      estimated1RM,
      brzycki,
      epley,
      lander,
      lombardi,
      oconner,
      wathan,
      weight,
      reps,
    };
  }

  /**
   * Calculate expected reps at a given weight based on 1RM
   * Uses inverted Epley formula
   */
  calculateRepsAtWeight(oneRM: number, targetWeight: number): number {
    if (oneRM <= 0 || targetWeight <= 0) {
      throw new Error('1RM and target weight must be positive');
    }

    if (targetWeight >= oneRM) {
      return 1;
    }

    // Inverted Epley: reps = 30 × ((1RM / weight) - 1)
    const reps = 30 * (oneRM / targetWeight - 1);
    return Math.max(1, Math.round(reps));
  }

  /**
   * Calculate weight for target reps based on 1RM
   * Uses inverted Epley formula
   */
  calculateWeightForReps(oneRM: number, targetReps: number): number {
    if (oneRM <= 0 || targetReps <= 0) {
      throw new Error('1RM and target reps must be positive');
    }

    if (targetReps === 1) {
      return oneRM;
    }

    // Inverted Epley: weight = 1RM / (1 + reps / 30)
    const weight = oneRM / (1 + targetReps / 30);
    return Math.round(weight * 10) / 10;
  }

  /**
   * Get rep ranges with weights for training
   */
  getRepRanges(oneRM: number): RepRangeInfo[] {
    if (oneRM <= 0) {
      throw new Error('1RM must be a positive number');
    }

    return [
      {
        percentage: 100,
        weight: oneRM,
        repRange: '1',
        purpose: 'Max strength testing',
      },
      {
        percentage: 95,
        weight: Math.round(oneRM * 0.95),
        repRange: '1-2',
        purpose: 'Peaking, competition',
      },
      {
        percentage: 90,
        weight: Math.round(oneRM * 0.9),
        repRange: '3-4',
        purpose: 'Max strength',
      },
      {
        percentage: 85,
        weight: Math.round(oneRM * 0.85),
        repRange: '5-6',
        purpose: 'Strength',
      },
      {
        percentage: 80,
        weight: Math.round(oneRM * 0.8),
        repRange: '6-8',
        purpose: 'Strength-hypertrophy',
      },
      {
        percentage: 75,
        weight: Math.round(oneRM * 0.75),
        repRange: '8-10',
        purpose: 'Hypertrophy',
      },
      {
        percentage: 70,
        weight: Math.round(oneRM * 0.7),
        repRange: '10-12',
        purpose: 'Hypertrophy-endurance',
      },
      {
        percentage: 65,
        weight: Math.round(oneRM * 0.65),
        repRange: '12-15',
        purpose: 'Muscular endurance',
      },
      {
        percentage: 60,
        weight: Math.round(oneRM * 0.6),
        repRange: '15-20',
        purpose: 'Endurance, technique',
      },
    ];
  }

  /**
   * Calculate 1RM for bodyweight exercises with added weight
   * Total load = bodyweight + added weight
   */
  calculateBodyweight1RM(
    bodyweight: number,
    addedWeight: number,
    reps: number
  ): { total1RM: number; addedWeight1RM: number } {
    const totalWeight = bodyweight + addedWeight;
    const total1RM = this.calculate1RM(totalWeight, reps);
    const addedWeight1RM = total1RM - bodyweight;

    return {
      total1RM: Math.round(total1RM),
      addedWeight1RM: Math.round(addedWeight1RM),
    };
  }

  /**
   * Calculate Wilks Score for powerlifting comparison
   * Allows comparison of strength across different bodyweights
   *
   * @param total - Sum of best squat, bench, and deadlift (kg)
   * @param bodyweight - Athlete bodyweight (kg)
   * @param sex - 'MALE' or 'FEMALE'
   * @returns Wilks score (higher is better, elite >400)
   */
  calculateWilks(total: number, bodyweight: number, sex: 'MALE' | 'FEMALE'): number {
    if (total <= 0 || bodyweight <= 0) {
      throw new Error('Total and bodyweight must be positive');
    }

    // Clamp bodyweight to valid range
    const bw = Math.min(Math.max(bodyweight, 40), 200);

    // Wilks coefficients (2020 updated version)
    const maleCoeff = [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8];
    const femaleCoeff = [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];

    const coeff = sex === 'MALE' ? maleCoeff : femaleCoeff;

    const denominator =
      coeff[0] +
      coeff[1] * bw +
      coeff[2] * Math.pow(bw, 2) +
      coeff[3] * Math.pow(bw, 3) +
      coeff[4] * Math.pow(bw, 4) +
      coeff[5] * Math.pow(bw, 5);

    return Math.round((total * 500 / denominator) * 100) / 100;
  }

  /**
   * Calculate DOTS Score (modern Wilks alternative)
   * More accurate for extreme bodyweights
   *
   * @param total - Sum of best squat, bench, and deadlift (kg)
   * @param bodyweight - Athlete bodyweight (kg)
   * @param sex - 'MALE' or 'FEMALE'
   * @returns DOTS score
   */
  calculateDOTS(total: number, bodyweight: number, sex: 'MALE' | 'FEMALE'): number {
    if (total <= 0 || bodyweight <= 0) {
      throw new Error('Total and bodyweight must be positive');
    }

    // DOTS coefficients
    const maleCoeff = { a: -307.75076, b: 24.0900756, c: -0.1918759221, d: 0.0007391293, e: -0.000001093 };
    const femaleCoeff = { a: -57.96288, b: 13.6175032, c: -0.1126655495, d: 0.0005158568, e: -0.0000010706 };

    const c = sex === 'MALE' ? maleCoeff : femaleCoeff;
    const bw = bodyweight;

    const denominator =
      c.a +
      c.b * bw +
      c.c * Math.pow(bw, 2) +
      c.d * Math.pow(bw, 3) +
      c.e * Math.pow(bw, 4);

    return Math.round((total * 500 / denominator) * 100) / 100;
  }

  /**
   * Get strength classification based on Wilks score
   */
  classifyWilks(wilksScore: number): string {
    if (wilksScore >= 500) return 'Elite International';
    if (wilksScore >= 450) return 'Elite National';
    if (wilksScore >= 400) return 'Elite';
    if (wilksScore >= 350) return 'Advanced';
    if (wilksScore >= 300) return 'Intermediate';
    if (wilksScore >= 250) return 'Novice';
    if (wilksScore >= 200) return 'Beginner';
    return 'Untrained';
  }

  /**
   * Calculate Mayhew formula for 1RM
   * 1RM = (100 × weight) / (52.2 + 41.9 × e^(-0.055 × reps))
   */
  mayhew(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
  }
}

// Export singleton instance
export const oneRepMaxCalculator = new OneRepMaxCalculator();
export default oneRepMaxCalculator;
