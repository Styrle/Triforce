/**
 * Strength Analysis Types
 * Based on Symmetric Strength methodology with 9-tier classification system
 */

// 9-tier classification system
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

// Classification colors for UI
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

// Classification thresholds for UI display
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

// Classification descriptions
export const CLASSIFICATION_DESCRIPTIONS: Record<Classification, string> = {
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

// Lift categories
export type LiftCategory = 'squat' | 'floor_pull' | 'horizontal_press' | 'vertical_press' | 'pull';

// Complete list of lift types (44 total)
export type LiftType =
  // Squat Pattern
  | 'BACK_SQUAT'
  | 'FRONT_SQUAT'
  | 'ZERCHER_SQUAT'
  | 'SAFETY_BAR_SQUAT'
  | 'LEG_PRESS'
  | 'HACK_SQUAT'
  | 'GOBLET_SQUAT'
  | 'BULGARIAN_SPLIT_SQUAT'
  // Floor Pull Pattern
  | 'DEADLIFT'
  | 'SUMO_DEADLIFT'
  | 'ROMANIAN_DEADLIFT'
  | 'TRAP_BAR_DEADLIFT'
  | 'STIFF_LEG_DEADLIFT'
  | 'DEFICIT_DEADLIFT'
  | 'BLOCK_PULL'
  | 'POWER_CLEAN'
  | 'CLEAN'
  | 'SNATCH'
  | 'HIP_THRUST'
  // Horizontal Press Pattern
  | 'BENCH_PRESS'
  | 'INCLINE_BENCH'
  | 'CLOSE_GRIP_BENCH'
  | 'DUMBBELL_BENCH_PRESS'
  | 'DUMBBELL_INCLINE_PRESS'
  | 'FLOOR_PRESS'
  | 'DIP'
  | 'WEIGHTED_DIP'
  // Vertical Press Pattern
  | 'OVERHEAD_PRESS'
  | 'PUSH_PRESS'
  | 'SEATED_PRESS'
  | 'DUMBBELL_SHOULDER_PRESS'
  | 'ARNOLD_PRESS'
  | 'BEHIND_NECK_PRESS'
  | 'Z_PRESS'
  // Pull Pattern
  | 'PULL_UP'
  | 'CHIN_UP'
  | 'PENDLAY_ROW'
  | 'BENT_OVER_ROW'
  | 'LAT_PULLDOWN'
  | 'BARBELL_ROW'
  | 'DUMBBELL_ROW'
  | 'CABLE_ROW'
  | 'T_BAR_ROW'
  | 'BARBELL_CURL';

// Muscle groups
export type MuscleGroup =
  | 'CHEST'
  | 'ANTERIOR_DELTS'
  | 'LATERAL_DELTS'
  | 'REAR_DELTS'
  | 'TRICEPS'
  | 'BICEPS'
  | 'FOREARMS'
  | 'LATS'
  | 'TRAPS'
  | 'RHOMBOIDS'
  | 'SPINAL_ERECTORS'
  | 'ABDOMINALS'
  | 'OBLIQUES'
  | 'QUADS'
  | 'GLUTES'
  | 'HAMSTRINGS'
  | 'HIP_FLEXORS'
  | 'ADDUCTORS'
  | 'CALVES'
  | 'TIBIALIS';

// Muscle group display names
export const MUSCLE_GROUP_NAMES: Record<MuscleGroup, string> = {
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

// Lift display names
export const LIFT_TYPE_NAMES: Record<LiftType, string> = {
  // Squat Pattern
  BACK_SQUAT: 'Back Squat',
  FRONT_SQUAT: 'Front Squat',
  ZERCHER_SQUAT: 'Zercher Squat',
  SAFETY_BAR_SQUAT: 'Safety Bar Squat',
  LEG_PRESS: 'Leg Press',
  HACK_SQUAT: 'Hack Squat',
  GOBLET_SQUAT: 'Goblet Squat',
  BULGARIAN_SPLIT_SQUAT: 'Bulgarian Split Squat',
  // Floor Pull Pattern
  DEADLIFT: 'Deadlift',
  SUMO_DEADLIFT: 'Sumo Deadlift',
  ROMANIAN_DEADLIFT: 'Romanian Deadlift',
  TRAP_BAR_DEADLIFT: 'Trap Bar Deadlift',
  STIFF_LEG_DEADLIFT: 'Stiff Leg Deadlift',
  DEFICIT_DEADLIFT: 'Deficit Deadlift',
  BLOCK_PULL: 'Block Pull',
  POWER_CLEAN: 'Power Clean',
  CLEAN: 'Clean',
  SNATCH: 'Snatch',
  HIP_THRUST: 'Hip Thrust',
  // Horizontal Press Pattern
  BENCH_PRESS: 'Bench Press',
  INCLINE_BENCH: 'Incline Bench',
  CLOSE_GRIP_BENCH: 'Close Grip Bench',
  DUMBBELL_BENCH_PRESS: 'Dumbbell Bench Press',
  DUMBBELL_INCLINE_PRESS: 'Dumbbell Incline Press',
  FLOOR_PRESS: 'Floor Press',
  DIP: 'Dip',
  WEIGHTED_DIP: 'Weighted Dip',
  // Vertical Press Pattern
  OVERHEAD_PRESS: 'Overhead Press',
  PUSH_PRESS: 'Push Press',
  SEATED_PRESS: 'Seated Press',
  DUMBBELL_SHOULDER_PRESS: 'Dumbbell Shoulder Press',
  ARNOLD_PRESS: 'Arnold Press',
  BEHIND_NECK_PRESS: 'Behind Neck Press',
  Z_PRESS: 'Z Press',
  // Pull Pattern
  PULL_UP: 'Pull-up',
  CHIN_UP: 'Chin-up',
  PENDLAY_ROW: 'Pendlay Row',
  BENT_OVER_ROW: 'Bent Over Row',
  LAT_PULLDOWN: 'Lat Pulldown',
  BARBELL_ROW: 'Barbell Row',
  DUMBBELL_ROW: 'Dumbbell Row',
  CABLE_ROW: 'Cable Row',
  T_BAR_ROW: 'T-Bar Row',
  BARBELL_CURL: 'Barbell Curl',
};

// Lift categories mapping
export const LIFT_CATEGORIES: Record<LiftType, LiftCategory> = {
  BACK_SQUAT: 'squat',
  FRONT_SQUAT: 'squat',
  ZERCHER_SQUAT: 'squat',
  SAFETY_BAR_SQUAT: 'squat',
  LEG_PRESS: 'squat',
  HACK_SQUAT: 'squat',
  GOBLET_SQUAT: 'squat',
  BULGARIAN_SPLIT_SQUAT: 'squat',
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
  BENCH_PRESS: 'horizontal_press',
  INCLINE_BENCH: 'horizontal_press',
  CLOSE_GRIP_BENCH: 'horizontal_press',
  DUMBBELL_BENCH_PRESS: 'horizontal_press',
  DUMBBELL_INCLINE_PRESS: 'horizontal_press',
  FLOOR_PRESS: 'horizontal_press',
  DIP: 'horizontal_press',
  WEIGHTED_DIP: 'horizontal_press',
  OVERHEAD_PRESS: 'vertical_press',
  PUSH_PRESS: 'vertical_press',
  SEATED_PRESS: 'vertical_press',
  DUMBBELL_SHOULDER_PRESS: 'vertical_press',
  ARNOLD_PRESS: 'vertical_press',
  BEHIND_NECK_PRESS: 'vertical_press',
  Z_PRESS: 'vertical_press',
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

// Category display names
export const CATEGORY_NAMES: Record<LiftCategory, string> = {
  squat: 'Squat',
  floor_pull: 'Floor Pull',
  horizontal_press: 'Horizontal Press',
  vertical_press: 'Vertical Press',
  pull: 'Pull',
};

// Bodyweight lifts
export const BODYWEIGHT_LIFTS: LiftType[] = ['PULL_UP', 'CHIN_UP', 'DIP', 'WEIGHTED_DIP'];

// Muscle group score data
export interface MuscleGroupScore {
  muscleGroup: MuscleGroup;
  score: number;
  classification: Classification;
  percentDeviation: number;
}

// Imbalance data
export interface Imbalance {
  muscleGroup: MuscleGroup;
  type: 'weak' | 'strong';
  deviation: number;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Category scores
export interface CategoryScores {
  squat: number | null;
  floorPull: number | null;
  horizPress: number | null;
  vertPress: number | null;
  pull: number | null;
}

// Strength profile data
export interface StrengthProfile {
  id: string;
  userId: string;
  strengthScore: number | null;
  symmetryScore: number | null;
  totalScore: number | null;
  classification: Classification | null;
  classificationColor: string | null;
  classificationColors: Record<Classification, string>;
  categoryScores: CategoryScores;
  muscleScores: MuscleGroupScore[];
  imbalances: Imbalance[];
  recommendations: string[];
  liftCount: number;
  lastUpdated: string;
}

// Lift history item
export interface LiftHistoryItem {
  id: string;
  liftType: LiftType;
  weight: number;
  reps: number;
  bodyweight: number;
  estimated1RM: number;
  strengthScore: number;
  classification: string;
  performedAt: string;
  isBodyweight: boolean;
  addedWeight: number | null;
}

// Muscle contribution
export interface MuscleContribution {
  muscleGroup: MuscleGroup;
  percentage: number;
}

// Calculate response
export interface CalculateResponse {
  estimated1RM: number;
  bodyweightRatio: number;
  score: number;
  classification: Classification;
  classificationColor: string;
  percentile: number;
  nextLevel: Classification | null;
  toNextLevel: number | null;
  muscleContributions: MuscleContribution[];
}

// Strength standards
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

// Progress data point
export interface ProgressPoint {
  date: string;
  estimated1RM: number;
  strengthScore: number;
}

// Anatomical position for SVG rendering
export interface AnatomicalPosition {
  view: 'front' | 'back';
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
}

// Anatomical positions mapping
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

// Helper function to get classification color
export function getClassificationColor(classification: Classification | null): string {
  if (!classification) return '#6B7280'; // Gray default
  return CLASSIFICATION_COLORS[classification];
}

// Helper function to get classification from score
export function getClassificationFromScore(score: number): Classification {
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
