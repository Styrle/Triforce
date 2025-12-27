import { OneRepMaxCalculator } from '../../src/services/strength/oneRepMax';
import { StrengthStandardsService } from '../../src/services/strength/strengthStandards';
import { MuscleAnalysisService } from '../../src/services/strength/muscleAnalysis';

describe('OneRepMaxCalculator', () => {
  let calculator: OneRepMaxCalculator;

  beforeEach(() => {
    calculator = new OneRepMaxCalculator();
  });

  describe('calculate1RM', () => {
    it('should return weight for 1 rep', () => {
      expect(calculator.calculate1RM(100, 1)).toBe(100);
    });

    it('should estimate 1RM from 5 reps', () => {
      // 100kg x 5 reps
      const oneRM = calculator.calculate1RM(100, 5);
      // Should be approximately 112-116kg
      expect(oneRM).toBeGreaterThan(110);
      expect(oneRM).toBeLessThan(120);
    });

    it('should estimate 1RM from 10 reps', () => {
      // 100kg x 10 reps
      const oneRM = calculator.calculate1RM(100, 10);
      // Should be approximately 130-135kg
      expect(oneRM).toBeGreaterThan(125);
      expect(oneRM).toBeLessThan(140);
    });

    it('should throw error for invalid input', () => {
      expect(() => calculator.calculate1RM(0, 5)).toThrow('Weight and reps must be positive');
      expect(() => calculator.calculate1RM(100, 0)).toThrow('Weight and reps must be positive');
      expect(() => calculator.calculate1RM(-100, 5)).toThrow('Weight and reps must be positive');
    });
  });

  describe('individual formulas', () => {
    it('Brzycki formula should be accurate for 5 reps', () => {
      const result = calculator.brzycki(100, 5);
      // 100 × (36 / (37 - 5)) = 100 × (36 / 32) = 112.5
      expect(result).toBeCloseTo(112.5, 1);
    });

    it('Epley formula should be accurate for 5 reps', () => {
      const result = calculator.epley(100, 5);
      // 100 × (1 + 5/30) = 100 × 1.167 = 116.7
      expect(result).toBeCloseTo(116.67, 1);
    });
  });

  describe('calculateRepsAtWeight', () => {
    it('should return 1 for weight at 1RM', () => {
      expect(calculator.calculateRepsAtWeight(100, 100)).toBe(1);
    });

    it('should return more reps for lower weight', () => {
      const reps = calculator.calculateRepsAtWeight(100, 80);
      // At 80% of 1RM, should get about 8 reps
      expect(reps).toBeGreaterThan(5);
      expect(reps).toBeLessThan(12);
    });

    it('should throw error for invalid input', () => {
      expect(() => calculator.calculateRepsAtWeight(0, 80)).toThrow('1RM and target weight must be positive');
      expect(() => calculator.calculateRepsAtWeight(100, 0)).toThrow('1RM and target weight must be positive');
    });
  });

  describe('getRepRanges', () => {
    it('should return rep ranges for training', () => {
      const ranges = calculator.getRepRanges(100);

      expect(ranges.length).toBeGreaterThan(5);
      expect(ranges[0].percentage).toBe(100);
      expect(ranges[0].weight).toBe(100);
      expect(ranges[0].repRange).toBe('1');
    });

    it('should have descending percentages', () => {
      const ranges = calculator.getRepRanges(100);

      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].percentage).toBeLessThan(ranges[i-1].percentage);
      }
    });
  });

  describe('calculateBodyweight1RM', () => {
    it('should calculate 1RM for weighted pullups', () => {
      const result = calculator.calculateBodyweight1RM(80, 20, 5);
      // Total: 80 + 20 = 100kg for 5 reps
      // Estimated 1RM should be ~112-116kg total
      expect(result.total1RM).toBeGreaterThan(110);
      expect(result.addedWeight1RM).toBe(result.total1RM - 80);
    });
  });
});

describe('StrengthStandardsService', () => {
  let service: StrengthStandardsService;

  beforeEach(() => {
    service = new StrengthStandardsService();
  });

  describe('getStrengthStandards', () => {
    it('should return standards for back squat', () => {
      const standards = service.getStrengthStandards('BACK_SQUAT', 80, 'MALE');

      expect(standards.liftType).toBe('BACK_SQUAT');
      expect(standards.sex).toBe('MALE');
      expect(standards.beginner).toBeLessThan(standards.intermediate);
      expect(standards.intermediate).toBeLessThan(standards.advanced);
      expect(standards.advanced).toBeLessThan(standards.elite);
    });

    it('should scale standards by bodyweight', () => {
      const standards80 = service.getStrengthStandards('BENCH_PRESS', 80, 'MALE');
      const standards100 = service.getStrengthStandards('BENCH_PRESS', 100, 'MALE');

      expect(standards100.intermediate).toBeGreaterThan(standards80.intermediate);
    });

    it('should have different standards for male and female', () => {
      const male = service.getStrengthStandards('DEADLIFT', 70, 'MALE');
      const female = service.getStrengthStandards('DEADLIFT', 70, 'FEMALE');

      expect(male.intermediate).toBeGreaterThan(female.intermediate);
    });
  });

  describe('calculateStrengthScore', () => {
    it('should return correct classification for beginner', () => {
      // 80kg male, 60kg bench (0.75 BW ratio - beginner level)
      const result = service.calculateStrengthScore(60, 80, 'BENCH_PRESS', 'MALE');

      expect(result.classification).toBe('beginner');
      expect(result.score).toBeGreaterThan(20);
      expect(result.score).toBeLessThan(40);
    });

    it('should return correct classification for intermediate', () => {
      // 80kg male, 80kg bench (1.0 BW ratio - intermediate level)
      const result = service.calculateStrengthScore(80, 80, 'BENCH_PRESS', 'MALE');

      expect(result.classification).toBe('intermediate');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
    });

    it('should include next level info', () => {
      const result = service.calculateStrengthScore(80, 80, 'BENCH_PRESS', 'MALE');

      if (result.nextLevel) {
        expect(result.toNextLevel).toBeGreaterThan(0);
      }
    });

    it('should calculate BW ratio correctly', () => {
      const result = service.calculateStrengthScore(120, 80, 'BACK_SQUAT', 'MALE');

      expect(result.bwRatio).toBeCloseTo(1.5, 2);
    });
  });

  describe('isBodyweightLift', () => {
    it('should identify bodyweight lifts', () => {
      expect(service.isBodyweightLift('PULL_UP')).toBe(true);
      expect(service.isBodyweightLift('CHIN_UP')).toBe(true);
      expect(service.isBodyweightLift('DIP')).toBe(true);
    });

    it('should identify non-bodyweight lifts', () => {
      expect(service.isBodyweightLift('BENCH_PRESS')).toBe(false);
      expect(service.isBodyweightLift('BACK_SQUAT')).toBe(false);
      expect(service.isBodyweightLift('DEADLIFT')).toBe(false);
    });
  });

  describe('getLiftCategory', () => {
    it('should categorize lifts correctly', () => {
      expect(service.getLiftCategory('BACK_SQUAT')).toBe('squat');
      expect(service.getLiftCategory('DEADLIFT')).toBe('floor_pull');
      expect(service.getLiftCategory('BENCH_PRESS')).toBe('horizontal_press');
      expect(service.getLiftCategory('OVERHEAD_PRESS')).toBe('vertical_press');
      expect(service.getLiftCategory('PULL_UP')).toBe('pull');
    });
  });
});

describe('MuscleAnalysisService', () => {
  let service: MuscleAnalysisService;

  beforeEach(() => {
    service = new MuscleAnalysisService();
  });

  describe('getMuscleContributions', () => {
    it('should return muscle contributions for bench press', () => {
      const contributions = service.getMuscleContributions('BENCH_PRESS');

      expect(contributions.length).toBeGreaterThan(0);

      const totalPercentage = contributions.reduce((sum, c) => sum + c.percentage, 0);
      expect(totalPercentage).toBe(100);
    });

    it('should include chest as primary for bench press', () => {
      const contributions = service.getMuscleContributions('BENCH_PRESS');
      const chest = contributions.find(c => c.muscleGroup === 'CHEST');

      expect(chest).toBeDefined();
      expect(chest!.percentage).toBeGreaterThan(30);
    });
  });

  describe('calculateMuscleGroupScores', () => {
    it('should calculate scores from lift data', () => {
      const lifts = [
        { liftType: 'BENCH_PRESS' as const, strengthScore: 60 },
        { liftType: 'BACK_SQUAT' as const, strengthScore: 70 },
      ];

      const scores = service.calculateMuscleGroupScores(lifts);

      expect(scores.length).toBeGreaterThan(0);
      scores.forEach(score => {
        expect(score.score).toBeGreaterThan(0);
        expect(score.classification).toBeDefined();
      });
    });

    it('should return empty array for no lifts', () => {
      const scores = service.calculateMuscleGroupScores([]);
      expect(scores).toEqual([]);
    });
  });

  describe('identifyImbalances', () => {
    it('should identify weak muscles', () => {
      const scores = [
        { muscleGroup: 'CHEST' as const, score: 80, classification: 'advanced' as const, percentDeviation: 20 },
        { muscleGroup: 'LATS' as const, score: 50, classification: 'intermediate' as const, percentDeviation: -25 },
      ];

      const imbalances = service.identifyImbalances(scores);

      expect(imbalances.length).toBeGreaterThan(0);
      const latsImbalance = imbalances.find(i => i.muscleGroup === 'LATS');
      expect(latsImbalance?.type).toBe('weak');
    });

    it('should prioritize high deviations', () => {
      const scores = [
        { muscleGroup: 'CHEST' as const, score: 80, classification: 'advanced' as const, percentDeviation: 25 },
        { muscleGroup: 'LATS' as const, score: 40, classification: 'beginner' as const, percentDeviation: -30 },
        { muscleGroup: 'QUADS' as const, score: 65, classification: 'proficient' as const, percentDeviation: 5 },
      ];

      const imbalances = service.identifyImbalances(scores);

      // First imbalance should be high priority
      if (imbalances.length > 0) {
        expect(['high', 'medium']).toContain(imbalances[0].priority);
      }
    });
  });

  describe('calculateSymmetryScore', () => {
    it('should return 100 for perfectly balanced scores', () => {
      const scores = [
        { muscleGroup: 'CHEST' as const, score: 60, classification: 'intermediate' as const, percentDeviation: 0 },
        { muscleGroup: 'LATS' as const, score: 60, classification: 'intermediate' as const, percentDeviation: 0 },
      ];

      const symmetry = service.calculateSymmetryScore(scores);
      expect(symmetry).toBe(100);
    });

    it('should return lower score for imbalanced development', () => {
      const scores = [
        { muscleGroup: 'CHEST' as const, score: 80, classification: 'advanced' as const, percentDeviation: 25 },
        { muscleGroup: 'LATS' as const, score: 40, classification: 'beginner' as const, percentDeviation: -25 },
      ];

      const symmetry = service.calculateSymmetryScore(scores);
      expect(symmetry).toBeLessThan(60);
    });
  });
});
