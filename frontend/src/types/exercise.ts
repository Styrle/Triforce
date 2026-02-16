export type ExerciseCategory =
  | 'SQUAT'
  | 'FLOOR_PULL'
  | 'HORIZONTAL_PRESS'
  | 'VERTICAL_PRESS'
  | 'PULL'
  | 'ISOLATION'
  | 'ACCESSORY'
  | 'CARDIO'
  | 'OTHER';

export const EXERCISE_CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'SQUAT', label: 'Squat' },
  { value: 'FLOOR_PULL', label: 'Floor Pull' },
  { value: 'HORIZONTAL_PRESS', label: 'Horizontal Press' },
  { value: 'VERTICAL_PRESS', label: 'Vertical Press' },
  { value: 'PULL', label: 'Pull' },
  { value: 'ISOLATION', label: 'Isolation' },
  { value: 'ACCESSORY', label: 'Accessory' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'OTHER', label: 'Other' },
];

export interface ExerciseMuscleContribution {
  muscleGroup: string;
  contribution: number;
}

export interface CustomExercise {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: ExerciseCategory;
  equipment: string | null;
  isBodyweight: boolean;
  muscleContributions: ExerciseMuscleContribution[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomExerciseInput {
  name: string;
  description?: string;
  category?: ExerciseCategory;
  equipment?: string;
  isBodyweight?: boolean;
  muscleContributions?: ExerciseMuscleContribution[];
}
