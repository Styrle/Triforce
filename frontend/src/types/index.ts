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
  ctl: number;
  atl: number;
  tsb: number;
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
