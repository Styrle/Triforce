// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  stravaId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Sport types
export type SportType = 'SWIM' | 'BIKE' | 'RUN' | 'STRENGTH' | 'OTHER';

// Activity types
export interface Activity {
  id: string;
  name: string;
  sportType: SportType;
  startDate: string;
  movingTime: number;
  elapsedTime: number;
  distance: number | null;
  totalElevation: number | null;
  tss: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPower: number | null;
  normalizedPower: number | null;
  avgSpeed: number | null;
}

// PMC types
export interface PMCData {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rampRate?: number | null;
}

export interface PMCProjection {
  date: string;
  projectedTss: number;
  projectedCtl: number;
  projectedAtl: number;
  projectedTsb: number;
}

export interface PMCResponse {
  history: PMCData[];
  projections: PMCProjection[];
  current: PMCData | null;
}

// Tri-Score types
export interface SportScore {
  score: number;
  trend: number;
  weeklyHours: number;
  weeklyTss: number;
  activityCount: number;
}

export interface TriScoreData {
  overall: number;
  overallTrend: number;
  swim: SportScore;
  bike: SportScore;
  run: SportScore;
  strength: SportScore;
  balance: {
    balanced: boolean;
    balanceScore: number;
    weakest: string;
    strongest: string;
    recommendations: string[];
  };
  fitness: {
    ctl: number;
    atl: number;
    tsb: number;
    rampRate: number;
    fitnessLevel: string;
  };
  lastUpdated: string;
}

// Dashboard summary types
export interface DashboardSummary {
  triScore: number;
  triScoreTrend: number;
  fitnessLevel: string;
  ctl: number;
  tsb: number;
  weeklyHours: number;
  weeklyTss: number;
  streak: number;
}

// Strava types
export interface StravaStatus {
  connected: boolean;
  athleteId?: string;
  lastSync?: string;
}

// Settings types
export interface UserSettings {
  units: 'METRIC' | 'IMPERIAL';
  weekStartDay: number;
  timezone: string;
  emailDigest: boolean;
  weeklyReport: boolean;
}

// Profile types
export interface AthleteProfile {
  dateOfBirth: string | null;
  sex: 'MALE' | 'FEMALE' | null;
  height: number | null;
  weight: number | null;
  ftp: number | null;
  lthr: number | null;
  thresholdPace: number | null;
  css: number | null;
  maxHr: number | null;
  restingHr: number | null;
}

// Training Plan types
export type PlanType =
  | 'SPRINT_TRI'
  | 'OLYMPIC_TRI'
  | 'HALF_IRONMAN'
  | 'IRONMAN'
  | 'MARATHON'
  | 'HALF_MARATHON'
  | 'CENTURY'
  | 'GENERAL_FITNESS'
  | 'CUSTOM';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type Periodization = 'LINEAR' | 'BLOCK' | 'POLARIZED' | 'PYRAMIDAL' | 'REVERSE_LINEAR';

export type PhaseType = 'BASE' | 'BUILD' | 'PEAK' | 'RACE' | 'RECOVERY' | 'TRANSITION';

export type WorkoutStatus = 'PLANNED' | 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'MOVED';

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  planType: PlanType;
  targetEvent: string | null;
  startDate: string;
  endDate: string;
  weeksTotal: number;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  periodization: Periodization;
  status: PlanStatus;
  currentWeek: number;
  createdAt: string;
  updatedAt: string;
  phases?: PlanPhase[];
  weeks?: PlanWeek[];
}

export interface PlanPhase {
  id: string;
  planId: string;
  name: string;
  phaseType: PhaseType;
  weekStart: number;
  weekEnd: number;
  focus: string[];
  targetIntensityDistribution: Record<string, number> | null;
}

export interface PlanWeek {
  id: string;
  planId: string;
  phaseId: string | null;
  weekNumber: number;
  startDate: string;
  endDate: string;
  targetHours: number;
  targetTss: number;
  isRecoveryWeek: boolean;
  focus: string | null;
  notes: string | null;
  workouts?: PlannedWorkout[];
}

export interface PlannedWorkout {
  id: string;
  planId: string;
  weekId: string | null;
  userId: string;
  name: string;
  description: string | null;
  sportType: SportType;
  workoutType: string | null;
  scheduledDate: string;
  timeOfDay: string | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetTss: number | null;
  targetIntensity: string | null;
  status: WorkoutStatus;
  completedActivityId: string | null;
  notes: string | null;
  plan?: { id: string; name: string };
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sportType: SportType;
  workoutType: string | null;
  estimatedDuration: number | null;
  estimatedDistance: number | null;
  estimatedTss: number | null;
  category: string | null;
  difficulty: string | null;
  tags: string[];
  isPublic: boolean;
  isStructured: boolean;
  structure: Record<string, unknown> | null;
  usageCount: number;
}

export interface CreatePlanInput {
  name: string;
  planType: PlanType;
  targetDate: string;
  weeksAvailable: number;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  periodization?: Periodization;
  description?: string;
  targetEvent?: string;
  currentFitness?: number;
}

export interface PlanComplianceMetrics {
  planId: string;
  overallCompliance: number;
  workoutsPlanned: number;
  workoutsCompleted: number;
  workoutsPartial: number;
  workoutsSkipped: number;
  currentStreak: number;
  longestStreak: number;
  weeklyCompliance: Array<{
    weekNumber: number;
    compliance: number;
    completedCount: number;
    plannedCount: number;
  }>;
  sportBreakdown: Record<SportType, {
    planned: number;
    completed: number;
    compliance: number;
  }>;
}
