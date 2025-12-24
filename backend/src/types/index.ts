// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    stack?: string;
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

// User types
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  stravaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Strava types
export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  description?: string;
  workout_type?: number;
  device_watts?: boolean;
}

export interface StravaStream<T = number> {
  type: string;
  data: T[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export type LatLng = [number, number];

export interface StravaStreamsResponse {
  time?: StravaStream<number>;
  heartrate?: StravaStream<number>;
  watts?: StravaStream<number>;
  cadence?: StravaStream<number>;
  velocity_smooth?: StravaStream<number>;
  altitude?: StravaStream<number>;
  latlng?: StravaStream<LatLng>;
  temp?: StravaStream<number>;
  distance?: StravaStream<number>;
  grade_smooth?: StravaStream<number>;
  moving?: StravaStream<boolean>;
}

// Activity types
export interface ActivityFilters {
  sportType?: string;
  startDate?: Date;
  endDate?: Date;
  minDistance?: number;
  maxDistance?: number;
  minDuration?: number;
  maxDuration?: number;
}

// Training metrics types
export interface PMCData {
  date: Date;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface ZoneDefinition {
  zone: number;
  name: string;
  min: number;
  max: number;
  description: string;
}

// Settings types
export interface UserSettingsInput {
  units?: 'METRIC' | 'IMPERIAL';
  weekStartDay?: number;
  timezone?: string;
  emailDigest?: boolean;
  weeklyReport?: boolean;
}

// Profile types
export interface AthleteProfileInput {
  dateOfBirth?: Date;
  sex?: 'MALE' | 'FEMALE';
  height?: number;
  weight?: number;
  ftp?: number;
  lthr?: number;
  thresholdPace?: number;
  css?: number;
  maxHr?: number;
  restingHr?: number;
}

// Request body types
export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

// Sport type mapping
export type SportType = 'SWIM' | 'BIKE' | 'RUN' | 'STRENGTH' | 'OTHER';

// Workout types
export type WorkoutType =
  | 'RACE'
  | 'LONG_RUN'
  | 'TEMPO'
  | 'INTERVALS'
  | 'RECOVERY'
  | 'ENDURANCE'
  | 'STRENGTH'
  | 'BRICK'
  | 'TIME_TRIAL'
  | 'OPEN_WATER'
  | 'TECHNIQUE'
  | 'OTHER';
