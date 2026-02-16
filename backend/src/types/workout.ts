import { LiftType, MuscleGroup } from '@prisma/client';

// Individual set within an exercise
export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number; // kg or lbs based on user preference
  rpe?: number; // 1-10 scale (optional)
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
  restAfter?: number; // seconds
  notes?: string;
}

// Exercise with all its sets
export interface WorkoutExercise {
  id?: string;
  exerciseName: string;
  liftType?: LiftType; // null for custom exercises
  orderIndex: number;
  sets: WorkoutSet[];
  notes?: string;
  // Calculated fields
  totalVolume?: number; // weight x reps x sets
  estimatedE1RM?: number; // best set's estimated 1RM
  averageRPE?: number;
}

// Complete workout session
export interface WorkoutSession {
  id?: string;
  userId: string;
  name: string;
  date: Date;
  duration?: number; // seconds
  notes?: string;
  exercises: WorkoutExercise[];
  // Summary stats (calculated)
  totalVolume?: number;
  totalSets?: number;
  muscleVolumeBreakdown?: MuscleVolumeData[];
}

// Input for creating/updating a workout
export interface WorkoutSessionInput {
  name: string;
  date?: Date;
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
  totalVolume: number; // absolute volume (kg x reps)
  effectiveVolume: number; // volume x contribution percentage
  sets: number; // number of sets targeting this muscle
  exercises: string[]; // which exercises contributed
}

// Personal Best tracking
export interface PersonalBest {
  liftType: LiftType;
  weight: number;
  reps: number;
  estimated1RM: number;
  achievedAt: Date;
  sessionId?: string;
}

// RPE-based training recommendations
export interface RPEPrescription {
  targetRPE: number;
  estimatedWeight: number;
  repRange: { min: number; max: number };
  percentageOf1RM: number;
}

// Percentage-based training from input max
export interface PercentageTraining {
  inputMax: number; // user's input 1RM
  percentage: number;
  targetWeight: number;
  estimatedReps: number;
  estimatedRPE: number;
}

// Volume analytics over time
export interface VolumeAnalytics {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalVolume: number;
  volumeByMuscle: MuscleVolumeData[];
  volumeByLift: { liftType: LiftType; volume: number }[];
  sessionCount: number;
  averageSessionVolume: number;
}
