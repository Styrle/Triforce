// API Version
export const API_VERSION = 'v1';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Training metrics constants
export const CTL_TIME_CONSTANT = 42; // Days for Chronic Training Load
export const ATL_TIME_CONSTANT = 7;  // Days for Acute Training Load

// TSS calculation constants
export const TSS_HOUR_AT_THRESHOLD = 100;

// Strava constants
export const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
export const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth';
export const STRAVA_SCOPES = 'read,activity:read_all,profile:read_all';

// Sport type mappings from Strava
export const STRAVA_SPORT_MAP: Record<string, string> = {
  'Swim': 'SWIM',
  'Ride': 'BIKE',
  'VirtualRide': 'BIKE',
  'Run': 'RUN',
  'VirtualRun': 'RUN',
  'WeightTraining': 'STRENGTH',
  'Workout': 'STRENGTH',
};

// Heart Rate Zone percentages (of LTHR)
export const HR_ZONE_PERCENTAGES = {
  zone1Max: 0.81,
  zone2Max: 0.89,
  zone3Max: 0.93,
  zone4Max: 0.99,
  zone5aMax: 1.02,
  zone5bMax: 1.06,
};

// Power Zone percentages (of FTP)
export const POWER_ZONE_PERCENTAGES = {
  zone1Max: 0.55,
  zone2Max: 0.75,
  zone3Max: 0.90,
  zone4Max: 1.05,
  zone5Max: 1.20,
  zone6Max: 1.50,
};

// Cookie/Session names
export const AUTH_COOKIE_NAME = 'triforce_auth';
export const SESSION_COOKIE_NAME = 'triforce_session';

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  STRAVA_ERROR: 'STRAVA_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
