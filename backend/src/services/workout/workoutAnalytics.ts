import { MuscleGroup } from '@prisma/client';
import { oneRepMaxCalculator } from '../strength/oneRepMax';
import { muscleAnalysisService } from '../strength/muscleAnalysis';
import {
  WorkoutSet,
  WorkoutExercise,
  WorkoutSession,
  MuscleVolumeData,
  RPEPrescription,
  PercentageTraining,
} from '../../types/workout';

/**
 * RPE to Percentage of 1RM mapping (research-based)
 * Based on Mike Tuchscherer's RPE scale
 */
const RPE_TO_PERCENTAGE: Record<number, Record<number, number>> = {
  // RPE: { reps: percentage }
  10: { 1: 100, 2: 95.5, 3: 92.2, 4: 89.2, 5: 86.3, 6: 83.7, 7: 81.1, 8: 78.6, 10: 74.4, 12: 70.7 },
  9.5: { 1: 97.8, 2: 93.9, 3: 90.7, 4: 87.8, 5: 85.0, 6: 82.4, 7: 79.9, 8: 77.4, 10: 73.3, 12: 69.7 },
  9: { 1: 95.5, 2: 92.2, 3: 89.2, 4: 86.3, 5: 83.7, 6: 81.1, 7: 78.6, 8: 76.2, 10: 72.3, 12: 68.8 },
  8.5: { 1: 93.9, 2: 90.7, 3: 87.8, 4: 85.0, 5: 82.4, 6: 79.9, 7: 77.4, 8: 75.1, 10: 71.3, 12: 67.8 },
  8: { 1: 92.2, 2: 89.2, 3: 86.3, 4: 83.7, 5: 81.1, 6: 78.6, 7: 76.2, 8: 73.9, 10: 70.3, 12: 66.8 },
  7.5: { 1: 90.7, 2: 87.8, 3: 85.0, 4: 82.4, 5: 79.9, 6: 77.4, 7: 75.1, 8: 72.8, 10: 69.3, 12: 65.9 },
  7: { 1: 89.2, 2: 86.3, 3: 83.7, 4: 81.1, 5: 78.6, 6: 76.2, 7: 73.9, 8: 71.7, 10: 68.3, 12: 64.9 },
  6.5: { 1: 87.8, 2: 85.0, 3: 82.4, 4: 79.9, 5: 77.4, 6: 75.1, 7: 72.8, 8: 70.6, 10: 67.3, 12: 63.9 },
  6: { 1: 86.3, 2: 83.7, 3: 81.1, 4: 78.6, 5: 76.2, 6: 73.9, 7: 71.7, 8: 69.5, 10: 66.3, 12: 63.0 },
};

/**
 * Workout Analytics Service
 *
 * Provides volume calculations, RPE-based prescriptions,
 * percentage training, and muscle volume analysis
 */
export class WorkoutAnalyticsService {

  /**
   * Calculate volume for a single set
   * Volume = weight x reps (ignoring warmup sets)
   */
  calculateSetVolume(set: WorkoutSet): number {
    if (set.isWarmup) return 0;
    return set.weight * set.reps;
  }

  /**
   * Calculate total volume for an exercise
   */
  calculateExerciseVolume(exercise: WorkoutExercise): number {
    return exercise.sets.reduce((total, set) => total + this.calculateSetVolume(set), 0);
  }

  /**
   * Calculate total volume for a workout session
   */
  calculateSessionVolume(session: WorkoutSession): number {
    return session.exercises.reduce(
      (total, exercise) => total + this.calculateExerciseVolume(exercise),
      0
    );
  }

  /**
   * Calculate estimated 1RM from best set in an exercise
   * Uses average of Brzycki, Epley, and Wathan formulas
   */
  calculateExerciseE1RM(exercise: WorkoutExercise): number | null {
    const workingSets = exercise.sets.filter(s => !s.isWarmup);
    if (workingSets.length === 0) return null;

    let maxE1RM = 0;
    for (const set of workingSets) {
      if (set.weight <= 0 || set.reps <= 0) continue;
      const e1rm = oneRepMaxCalculator.calculate1RM(set.weight, set.reps);
      if (e1rm > maxE1RM) {
        maxE1RM = e1rm;
      }
    }
    return maxE1RM > 0 ? Math.round(maxE1RM * 10) / 10 : null;
  }

  /**
   * Estimate RPE from weight and reps based on known 1RM
   * Uses interpolation from RPE_TO_PERCENTAGE table
   */
  estimateRPEFromPerformance(weight: number, reps: number, known1RM: number): number {
    if (known1RM <= 0 || weight <= 0 || reps <= 0) return 0;

    const actualPercentage = (weight / known1RM) * 100;

    let closestRPE = 6;
    let closestDiff = Infinity;

    for (const [rpeStr, repMap] of Object.entries(RPE_TO_PERCENTAGE)) {
      const rpe = parseFloat(rpeStr);
      const repKeys = Object.keys(repMap).map(Number);
      const closestReps = repKeys.reduce((prev, curr) =>
        Math.abs(curr - reps) < Math.abs(prev - reps) ? curr : prev
      );
      const expectedPercentage = repMap[closestReps];
      const diff = Math.abs(actualPercentage - expectedPercentage);

      if (diff < closestDiff) {
        closestDiff = diff;
        closestRPE = rpe;
      }
    }

    return closestRPE;
  }

  /**
   * Calculate target weight from percentage of 1RM
   */
  calculatePercentageTraining(
    inputMax: number,
    targetPercentage: number,
    targetReps?: number
  ): PercentageTraining {
    const targetWeight = Math.round((inputMax * targetPercentage) / 100);

    const estimatedReps = targetReps ?? oneRepMaxCalculator.calculateRepsAtWeight(inputMax, targetWeight);

    const estimatedRPE = this.estimateRPEFromPerformance(targetWeight, estimatedReps, inputMax);

    return {
      inputMax,
      percentage: targetPercentage,
      targetWeight,
      estimatedReps,
      estimatedRPE,
    };
  }

  /**
   * Get RPE-based weight prescription
   * Given a known 1RM, target RPE, and rep range
   */
  getRPEPrescription(known1RM: number, targetRPE: number, targetReps: number): RPEPrescription {
    const rpeData = RPE_TO_PERCENTAGE[targetRPE] || RPE_TO_PERCENTAGE[8];

    const repKeys = Object.keys(rpeData).map(Number);
    const closestReps = repKeys.reduce((prev, curr) =>
      Math.abs(curr - targetReps) < Math.abs(prev - targetReps) ? curr : prev
    );

    const percentage = rpeData[closestReps];
    const estimatedWeight = Math.round(known1RM * (percentage / 100));

    return {
      targetRPE,
      estimatedWeight,
      repRange: { min: targetReps - 1, max: targetReps + 1 },
      percentageOf1RM: percentage,
    };
  }

  /**
   * Calculate volume breakdown by muscle group for a workout
   * Uses muscle contribution percentages from MuscleAnalysisService
   */
  calculateMuscleVolumeBreakdown(session: WorkoutSession): MuscleVolumeData[] {
    const muscleVolumes = new Map<MuscleGroup, {
      totalVolume: number;
      effectiveVolume: number;
      sets: number;
      exercises: Set<string>;
    }>();

    for (const exercise of session.exercises) {
      if (!exercise.liftType) continue;

      const contributions = muscleAnalysisService.getMuscleContributions(exercise.liftType);
      if (!contributions || contributions.length === 0) continue;

      const exerciseVolume = this.calculateExerciseVolume(exercise);
      const workingSets = exercise.sets.filter(s => !s.isWarmup).length;

      for (const contrib of contributions) {
        const existing = muscleVolumes.get(contrib.muscleGroup) || {
          totalVolume: 0,
          effectiveVolume: 0,
          sets: 0,
          exercises: new Set<string>(),
        };

        existing.totalVolume += exerciseVolume;
        existing.effectiveVolume += exerciseVolume * (contrib.percentage / 100);
        existing.sets += workingSets;
        existing.exercises.add(exercise.exerciseName);

        muscleVolumes.set(contrib.muscleGroup, existing);
      }
    }

    const result: MuscleVolumeData[] = [];
    for (const [muscleGroup, data] of muscleVolumes) {
      result.push({
        muscleGroup,
        totalVolume: Math.round(data.totalVolume),
        effectiveVolume: Math.round(data.effectiveVolume),
        sets: data.sets,
        exercises: Array.from(data.exercises),
      });
    }

    return result.sort((a, b) => b.effectiveVolume - a.effectiveVolume);
  }

  /**
   * Calculate average RPE for a workout
   */
  calculateAverageRPE(session: WorkoutSession): number | null {
    const rpeSets = session.exercises
      .flatMap(e => e.sets)
      .filter(s => !s.isWarmup && s.rpe !== undefined);

    if (rpeSets.length === 0) return null;

    const totalRPE = rpeSets.reduce((sum, s) => sum + (s.rpe || 0), 0);
    return Math.round((totalRPE / rpeSets.length) * 10) / 10;
  }

  /**
   * Get full rep range chart for a given 1RM
   */
  getRepRangeChart(oneRM: number): Array<{
    percentage: number;
    weight: number;
    reps: string;
    rpe: number;
    purpose: string;
  }> {
    return [
      { percentage: 100, weight: oneRM, reps: '1', rpe: 10, purpose: 'Max testing' },
      { percentage: 97, weight: Math.round(oneRM * 0.97), reps: '1-2', rpe: 9.5, purpose: 'Peaking' },
      { percentage: 95, weight: Math.round(oneRM * 0.95), reps: '2-3', rpe: 9, purpose: 'Strength peak' },
      { percentage: 92, weight: Math.round(oneRM * 0.92), reps: '3-4', rpe: 8.5, purpose: 'Max strength' },
      { percentage: 90, weight: Math.round(oneRM * 0.90), reps: '3-4', rpe: 8, purpose: 'Strength' },
      { percentage: 87, weight: Math.round(oneRM * 0.87), reps: '4-5', rpe: 8, purpose: 'Strength' },
      { percentage: 85, weight: Math.round(oneRM * 0.85), reps: '5-6', rpe: 8, purpose: 'Strength' },
      { percentage: 82, weight: Math.round(oneRM * 0.82), reps: '6-7', rpe: 8, purpose: 'Strength-hypertrophy' },
      { percentage: 80, weight: Math.round(oneRM * 0.80), reps: '7-8', rpe: 8, purpose: 'Hypertrophy' },
      { percentage: 77, weight: Math.round(oneRM * 0.77), reps: '8-9', rpe: 8, purpose: 'Hypertrophy' },
      { percentage: 75, weight: Math.round(oneRM * 0.75), reps: '9-10', rpe: 8, purpose: 'Hypertrophy' },
      { percentage: 72, weight: Math.round(oneRM * 0.72), reps: '10-12', rpe: 8, purpose: 'Hypertrophy' },
      { percentage: 70, weight: Math.round(oneRM * 0.70), reps: '12-15', rpe: 7, purpose: 'Endurance' },
      { percentage: 65, weight: Math.round(oneRM * 0.65), reps: '15-20', rpe: 7, purpose: 'Endurance' },
    ];
  }
}

export const workoutAnalyticsService = new WorkoutAnalyticsService();
export default workoutAnalyticsService;
