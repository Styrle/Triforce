import type { LiftType, MuscleGroup } from './strength';

// Individual set within an exercise
export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
  restAfter?: number;
  notes?: string;
}

// Exercise with calculated fields
export interface WorkoutExercise {
  id?: string;
  exerciseName: string;
  liftType?: LiftType;
  orderIndex: number;
  sets: WorkoutSet[];
  notes?: string;
  totalVolume?: number;
  estimatedE1RM?: number;
  averageRPE?: number;
}

// Complete workout session
export interface WorkoutSession {
  id: string;
  userId: string;
  name: string;
  date: string;
  duration?: number;
  notes?: string;
  exercises: WorkoutExercise[];
  totalVolume?: number;
  totalSets?: number;
  muscleVolumeBreakdown?: MuscleVolumeData[];
}

// Input for creating/updating a workout
export interface WorkoutSessionInput {
  name: string;
  date?: string;
  duration?: number;
  notes?: string;
  exercises: WorkoutExerciseInput[];
}

export interface WorkoutExerciseInput {
  exerciseName: string;
  liftType?: LiftType;
  orderIndex: number;
  sets: WorkoutSetInput[];
  notes?: string;
}

export interface WorkoutSetInput {
  reps: number;
  weight: number;
  rpe?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
  restAfter?: number;
  notes?: string;
}

// Volume analysis per muscle group
export interface MuscleVolumeData {
  muscleGroup: MuscleGroup;
  totalVolume: number;
  effectiveVolume: number;
  sets: number;
  exercises: string[];
}

// Personal best
export interface PersonalBest {
  liftType: LiftType;
  weight: number;
  reps: number;
  estimated1RM: number;
  achievedAt: string;
  sessionId?: string;
}

// RPE prescription
export interface RPEPrescription {
  targetRPE: number;
  estimatedWeight: number;
  repRange: { min: number; max: number };
  percentageOf1RM: number;
}

// Percentage-based training
export interface PercentageTraining {
  inputMax: number;
  percentage: number;
  targetWeight: number;
  estimatedReps: number;
  estimatedRPE: number;
}

// Volume analytics
export interface VolumeAnalytics {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalVolume: number;
  volumeByMuscle: MuscleVolumeData[];
  volumeByLift: { liftType: LiftType; volume: number }[];
  sessionCount: number;
  averageSessionVolume: number;
}

// Rep range chart entry
export interface RepRangeEntry {
  percentage: number;
  weight: number;
  reps: string;
}
