import { WorkoutAnalyticsService } from '../../src/services/workout/workoutAnalytics';
import { WorkoutSet, WorkoutExercise, WorkoutSession } from '../../src/types/workout';

describe('WorkoutAnalyticsService', () => {
  let service: WorkoutAnalyticsService;

  beforeEach(() => {
    service = new WorkoutAnalyticsService();
  });

  // ==================== VOLUME CALCULATIONS ====================

  describe('calculateSetVolume', () => {
    it('should calculate volume as weight x reps', () => {
      const set: WorkoutSet = { setNumber: 1, reps: 10, weight: 100 };
      expect(service.calculateSetVolume(set)).toBe(1000);
    });

    it('should return 0 for warmup sets', () => {
      const set: WorkoutSet = { setNumber: 1, reps: 10, weight: 100, isWarmup: true };
      expect(service.calculateSetVolume(set)).toBe(0);
    });

    it('should handle zero weight', () => {
      const set: WorkoutSet = { setNumber: 1, reps: 10, weight: 0 };
      expect(service.calculateSetVolume(set)).toBe(0);
    });

    it('should handle zero reps', () => {
      const set: WorkoutSet = { setNumber: 1, reps: 0, weight: 100 };
      expect(service.calculateSetVolume(set)).toBe(0);
    });
  });

  describe('calculateExerciseVolume', () => {
    it('should sum volume across all working sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Bench Press',
        liftType: 'BENCH_PRESS',
        orderIndex: 0,
        sets: [
          { setNumber: 1, reps: 5, weight: 60, isWarmup: true },
          { setNumber: 2, reps: 5, weight: 80, isWarmup: true },
          { setNumber: 3, reps: 5, weight: 100 },
          { setNumber: 4, reps: 5, weight: 100 },
          { setNumber: 5, reps: 5, weight: 100 },
        ],
      };
      // Only working sets: 3 x (5 x 100) = 1500
      expect(service.calculateExerciseVolume(exercise)).toBe(1500);
    });

    it('should return 0 for all warmup sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Warm Up',
        orderIndex: 0,
        sets: [
          { setNumber: 1, reps: 10, weight: 20, isWarmup: true },
          { setNumber: 2, reps: 10, weight: 40, isWarmup: true },
        ],
      };
      expect(service.calculateExerciseVolume(exercise)).toBe(0);
    });

    it('should handle empty sets array', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Empty',
        orderIndex: 0,
        sets: [],
      };
      expect(service.calculateExerciseVolume(exercise)).toBe(0);
    });
  });

  describe('calculateSessionVolume', () => {
    it('should sum volume across all exercises', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Push Day',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Bench Press',
            liftType: 'BENCH_PRESS',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 8, weight: 80 },
              { setNumber: 2, reps: 8, weight: 80 },
              { setNumber: 3, reps: 8, weight: 80 },
            ],
          },
          {
            exerciseName: 'Incline Press',
            liftType: 'INCLINE_BENCH',
            orderIndex: 1,
            sets: [
              { setNumber: 1, reps: 10, weight: 60 },
              { setNumber: 2, reps: 10, weight: 60 },
              { setNumber: 3, reps: 10, weight: 60 },
            ],
          },
        ],
      };
      // Bench: 3 x 8 x 80 = 1920
      // Incline: 3 x 10 x 60 = 1800
      // Total: 3720
      expect(service.calculateSessionVolume(session)).toBe(3720);
    });
  });

  // ==================== E1RM CALCULATIONS ====================

  describe('calculateExerciseE1RM', () => {
    it('should return highest estimated 1RM from working sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Squat',
        liftType: 'BACK_SQUAT',
        orderIndex: 0,
        sets: [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 3, weight: 110 },
          { setNumber: 3, reps: 1, weight: 120 },
        ],
      };
      const e1rm = service.calculateExerciseE1RM(exercise);
      expect(e1rm).toBe(120); // 1 rep = actual weight
    });

    it('should exclude warmup sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Squat',
        liftType: 'BACK_SQUAT',
        orderIndex: 0,
        sets: [
          { setNumber: 1, reps: 5, weight: 140, isWarmup: true },
          { setNumber: 2, reps: 5, weight: 100 },
        ],
      };
      const e1rm = service.calculateExerciseE1RM(exercise);
      // Should only consider the 100kg x 5 set
      expect(e1rm).toBeGreaterThan(110);
      expect(e1rm).toBeLessThan(120);
    });

    it('should return null for all warmup sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Warmup',
        orderIndex: 0,
        sets: [
          { setNumber: 1, reps: 10, weight: 60, isWarmup: true },
        ],
      };
      expect(service.calculateExerciseE1RM(exercise)).toBeNull();
    });

    it('should return null for empty sets', () => {
      const exercise: WorkoutExercise = {
        exerciseName: 'Empty',
        orderIndex: 0,
        sets: [],
      };
      expect(service.calculateExerciseE1RM(exercise)).toBeNull();
    });
  });

  // ==================== RPE ESTIMATION ====================

  describe('estimateRPEFromPerformance', () => {
    it('should return RPE 10 for max attempt', () => {
      const rpe = service.estimateRPEFromPerformance(100, 1, 100);
      expect(rpe).toBe(10);
    });

    it('should return lower RPE for lighter weights', () => {
      // 80kg for 5 reps when 1RM is 100kg = 80%
      const rpe = service.estimateRPEFromPerformance(80, 5, 100);
      expect(rpe).toBeGreaterThanOrEqual(7);
      expect(rpe).toBeLessThanOrEqual(8.5);
    });

    it('should return 0 for invalid inputs', () => {
      expect(service.estimateRPEFromPerformance(0, 5, 100)).toBe(0);
      expect(service.estimateRPEFromPerformance(80, 0, 100)).toBe(0);
      expect(service.estimateRPEFromPerformance(80, 5, 0)).toBe(0);
    });

    it('should handle high rep sets', () => {
      // 60kg for 12 reps when 1RM is 100kg = 60%
      const rpe = service.estimateRPEFromPerformance(60, 12, 100);
      expect(rpe).toBeGreaterThanOrEqual(6);
      expect(rpe).toBeLessThanOrEqual(8);
    });
  });

  // ==================== PERCENTAGE TRAINING ====================

  describe('calculatePercentageTraining', () => {
    it('should calculate correct target weight', () => {
      const result = service.calculatePercentageTraining(100, 80);
      expect(result.targetWeight).toBe(80);
      expect(result.percentage).toBe(80);
      expect(result.inputMax).toBe(100);
    });

    it('should estimate reps if not provided', () => {
      const result = service.calculatePercentageTraining(100, 75);
      // 75% should give roughly 8-10 reps
      expect(result.estimatedReps).toBeGreaterThanOrEqual(6);
      expect(result.estimatedReps).toBeLessThanOrEqual(12);
    });

    it('should use provided target reps', () => {
      const result = service.calculatePercentageTraining(100, 85, 5);
      expect(result.estimatedReps).toBe(5);
    });

    it('should estimate RPE', () => {
      const result = service.calculatePercentageTraining(100, 90);
      // 90% should be around RPE 8-9
      expect(result.estimatedRPE).toBeGreaterThanOrEqual(7);
      expect(result.estimatedRPE).toBeLessThanOrEqual(10);
    });

    it('should round target weight', () => {
      const result = service.calculatePercentageTraining(137, 82.5);
      expect(Number.isInteger(result.targetWeight)).toBe(true);
    });
  });

  // ==================== RPE PRESCRIPTION ====================

  describe('getRPEPrescription', () => {
    it('should return weight for RPE 8 at 5 reps', () => {
      const result = service.getRPEPrescription(100, 8, 5);
      expect(result.targetRPE).toBe(8);
      expect(result.repRange.min).toBe(4);
      expect(result.repRange.max).toBe(6);
      // At RPE 8, 5 reps should be around 81% = 81kg
      expect(result.estimatedWeight).toBeGreaterThan(75);
      expect(result.estimatedWeight).toBeLessThan(90);
    });

    it('should return higher weight for lower RPE', () => {
      const rpe8 = service.getRPEPrescription(100, 8, 5);
      const rpe7 = service.getRPEPrescription(100, 7, 5);
      expect(rpe7.estimatedWeight).toBeLessThan(rpe8.estimatedWeight);
    });

    it('should include percentage of 1RM', () => {
      const result = service.getRPEPrescription(100, 9, 3);
      expect(result.percentageOf1RM).toBeGreaterThan(85);
      expect(result.percentageOf1RM).toBeLessThan(95);
    });

    it('should handle edge RPE values', () => {
      const result10 = service.getRPEPrescription(100, 10, 1);
      expect(result10.estimatedWeight).toBe(100);
      expect(result10.percentageOf1RM).toBe(100);
    });
  });

  // ==================== REP RANGE CHART ====================

  describe('getRepRangeChart', () => {
    it('should return chart with descending percentages', () => {
      const chart = service.getRepRangeChart(100);
      expect(chart.length).toBeGreaterThan(10);

      for (let i = 1; i < chart.length; i++) {
        expect(chart[i].percentage).toBeLessThan(chart[i - 1].percentage);
      }
    });

    it('should have correct max weight', () => {
      const chart = service.getRepRangeChart(100);
      expect(chart[0].percentage).toBe(100);
      expect(chart[0].weight).toBe(100);
    });

    it('should scale weights to 1RM', () => {
      const chart150 = service.getRepRangeChart(150);
      const row85 = chart150.find(r => r.percentage === 85);
      expect(row85?.weight).toBe(Math.round(150 * 0.85));
    });

    it('should include purpose descriptions', () => {
      const chart = service.getRepRangeChart(100);
      chart.forEach(row => {
        expect(row.purpose).toBeDefined();
        expect(row.purpose.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== MUSCLE VOLUME BREAKDOWN ====================

  describe('calculateMuscleVolumeBreakdown', () => {
    it('should calculate effective volume by muscle contribution', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Bench Press',
            liftType: 'BENCH_PRESS',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 10, weight: 100 },
            ],
          },
        ],
      };

      const breakdown = service.calculateMuscleVolumeBreakdown(session);

      // Bench press hits CHEST (40%), TRICEPS (35%), ANTERIOR_DELTS (25%)
      const chest = breakdown.find(m => m.muscleGroup === 'CHEST');
      const triceps = breakdown.find(m => m.muscleGroup === 'TRICEPS');
      const anteriorDelts = breakdown.find(m => m.muscleGroup === 'ANTERIOR_DELTS');

      expect(chest).toBeDefined();
      expect(triceps).toBeDefined();
      expect(anteriorDelts).toBeDefined();

      // Total volume = 10 x 100 = 1000
      // Chest effective = 1000 x 0.40 = 400
      expect(chest!.effectiveVolume).toBe(400);
      expect(triceps!.effectiveVolume).toBe(350);
      expect(anteriorDelts!.effectiveVolume).toBe(250);
    });

    it('should aggregate across multiple exercises', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Push Day',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Bench Press',
            liftType: 'BENCH_PRESS',
            orderIndex: 0,
            sets: [{ setNumber: 1, reps: 10, weight: 100 }],
          },
          {
            exerciseName: 'Overhead Press',
            liftType: 'OVERHEAD_PRESS',
            orderIndex: 1,
            sets: [{ setNumber: 1, reps: 10, weight: 60 }],
          },
        ],
      };

      const breakdown = service.calculateMuscleVolumeBreakdown(session);
      const anteriorDelts = breakdown.find(m => m.muscleGroup === 'ANTERIOR_DELTS');

      // Both exercises hit anterior delts
      expect(anteriorDelts!.exercises.length).toBe(2);
      expect(anteriorDelts!.exercises).toContain('Bench Press');
      expect(anteriorDelts!.exercises).toContain('Overhead Press');
    });

    it('should skip exercises without liftType', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Custom Exercise',
            orderIndex: 0,
            sets: [{ setNumber: 1, reps: 10, weight: 100 }],
          },
        ],
      };

      const breakdown = service.calculateMuscleVolumeBreakdown(session);
      expect(breakdown.length).toBe(0);
    });

    it('should sort by effective volume descending', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Full Body',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Back Squat',
            liftType: 'BACK_SQUAT',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 140 },
              { setNumber: 2, reps: 5, weight: 140 },
              { setNumber: 3, reps: 5, weight: 140 },
            ],
          },
          {
            exerciseName: 'Bench Press',
            liftType: 'BENCH_PRESS',
            orderIndex: 1,
            sets: [
              { setNumber: 1, reps: 8, weight: 80 },
              { setNumber: 2, reps: 8, weight: 80 },
            ],
          },
        ],
      };

      const breakdown = service.calculateMuscleVolumeBreakdown(session);

      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i].effectiveVolume).toBeLessThanOrEqual(
          breakdown[i - 1].effectiveVolume
        );
      }
    });

    it('should count working sets only', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Squat',
            liftType: 'BACK_SQUAT',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 60, isWarmup: true },
              { setNumber: 2, reps: 5, weight: 100 },
              { setNumber: 3, reps: 5, weight: 100 },
            ],
          },
        ],
      };

      const breakdown = service.calculateMuscleVolumeBreakdown(session);
      const quads = breakdown.find(m => m.muscleGroup === 'QUADS');

      expect(quads!.sets).toBe(2); // Only 2 working sets
    });
  });

  // ==================== AVERAGE RPE ====================

  describe('calculateAverageRPE', () => {
    it('should calculate average of RPE values', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Squat',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 100, rpe: 7 },
              { setNumber: 2, reps: 5, weight: 100, rpe: 8 },
              { setNumber: 3, reps: 5, weight: 100, rpe: 9 },
            ],
          },
        ],
      };

      const avgRPE = service.calculateAverageRPE(session);
      expect(avgRPE).toBe(8); // (7 + 8 + 9) / 3 = 8
    });

    it('should exclude warmup sets', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Squat',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 60, rpe: 5, isWarmup: true },
              { setNumber: 2, reps: 5, weight: 100, rpe: 8 },
              { setNumber: 3, reps: 5, weight: 100, rpe: 9 },
            ],
          },
        ],
      };

      const avgRPE = service.calculateAverageRPE(session);
      expect(avgRPE).toBe(8.5); // (8 + 9) / 2 = 8.5
    });

    it('should return null when no RPE data', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Squat',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 100 },
            ],
          },
        ],
      };

      expect(service.calculateAverageRPE(session)).toBeNull();
    });

    it('should handle mixed RPE/non-RPE sets', () => {
      const session: WorkoutSession = {
        userId: 'test',
        name: 'Test',
        date: new Date(),
        exercises: [
          {
            exerciseName: 'Squat',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 100 }, // no RPE
              { setNumber: 2, reps: 5, weight: 100, rpe: 8 },
              { setNumber: 3, reps: 5, weight: 100, rpe: 9 },
            ],
          },
        ],
      };

      const avgRPE = service.calculateAverageRPE(session);
      expect(avgRPE).toBe(8.5); // Only count sets with RPE
    });
  });
});
