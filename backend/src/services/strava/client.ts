import axios, { AxiosInstance, AxiosError } from 'axios';
import { stravaOAuthService } from './oauthService';
import { STRAVA_API_BASE_URL, STRAVA_SPORT_MAP } from '../../config/constants';
import { logger } from '../../utils/logger';
import { sleep, retryWithBackoff } from '../../utils/helpers';

// Strava API types
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
  has_heartrate?: boolean;
  suffer_score?: number;
  calories?: number;
  average_temp?: number;
}

export interface StravaDetailedActivity extends StravaActivity {
  laps?: StravaLap[];
  splits_metric?: StravaSplit[];
  splits_standard?: StravaSplit[];
  best_efforts?: StravaBestEffort[];
  segment_efforts?: StravaSegmentEffort[];
}

export interface StravaLap {
  id: number;
  activity: { id: number };
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  distance: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  average_cadence?: number;
  lap_index: number;
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  elevation_difference: number;
  average_speed: number;
  average_heartrate?: number;
  pace_zone: number;
  split: number;
}

export interface StravaBestEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  start_date: string;
}

export interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_watts?: number;
  average_heartrate?: number;
}

export interface StravaStream {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaStreamsResponse {
  time?: StravaStream;
  heartrate?: StravaStream;
  watts?: StravaStream;
  cadence?: StravaStream;
  velocity_smooth?: StravaStream;
  altitude?: StravaStream;
  latlng?: { data: [number, number][] };
  temp?: StravaStream;
  moving?: StravaStream;
  grade_smooth?: StravaStream;
}

export class StravaClient {
  private client: AxiosInstance;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.client = axios.create({
      baseURL: STRAVA_API_BASE_URL,
      timeout: 30000,
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await stravaOAuthService.getValidAccessToken(this.userId);
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Add response interceptor for rate limiting
    this.client.interceptors.response.use(
      (response) => {
        // Log rate limit info
        const rateLimit = response.headers['x-ratelimit-limit'];
        const rateUsage = response.headers['x-ratelimit-usage'];
        if (rateLimit && rateUsage) {
          logger.debug('Strava rate limit:', { limit: rateLimit, usage: rateUsage });
        }
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          logger.warn(`Strava rate limited, waiting ${waitTime}ms`);
          await sleep(waitTime);
          return this.client.request(error.config!);
        }
        throw error;
      }
    );
  }

  /**
   * Get list of activities with pagination
   */
  async getActivities(params: {
    before?: number; // Unix timestamp
    after?: number; // Unix timestamp
    page?: number;
    per_page?: number;
  } = {}): Promise<StravaActivity[]> {
    const { data } = await retryWithBackoff(() =>
      this.client.get<StravaActivity[]>('/athlete/activities', {
        params: {
          page: params.page || 1,
          per_page: params.per_page || 100,
          before: params.before,
          after: params.after,
        },
      })
    );
    return data;
  }

  /**
   * Get all activities since a date (handles pagination)
   */
  async getAllActivitiesSince(afterDate: Date): Promise<StravaActivity[]> {
    const activities: StravaActivity[] = [];
    let page = 1;
    const perPage = 100;
    const after = Math.floor(afterDate.getTime() / 1000);

    while (true) {
      logger.debug(`Fetching Strava activities page ${page}`);
      const pageActivities = await this.getActivities({
        after,
        page,
        per_page: perPage,
      });

      activities.push(...pageActivities);

      if (pageActivities.length < perPage) {
        break; // No more pages
      }

      page++;

      // Small delay to avoid rate limits
      await sleep(200);
    }

    logger.info(`Fetched ${activities.length} activities from Strava`);
    return activities;
  }

  /**
   * Get detailed activity with laps and splits
   */
  async getActivity(activityId: number): Promise<StravaDetailedActivity> {
    const { data } = await retryWithBackoff(() =>
      this.client.get<StravaDetailedActivity>(`/activities/${activityId}`)
    );
    return data;
  }

  /**
   * Get activity streams (time series data)
   */
  async getActivityStreams(
    activityId: number,
    streamTypes: string[] = [
      'time',
      'heartrate',
      'watts',
      'cadence',
      'velocity_smooth',
      'altitude',
      'latlng',
      'temp',
    ]
  ): Promise<StravaStreamsResponse> {
    try {
      const { data } = await retryWithBackoff(() =>
        this.client.get(`/activities/${activityId}/streams`, {
          params: {
            keys: streamTypes.join(','),
            key_by_type: true,
          },
        })
      );
      return data;
    } catch (error) {
      // Some activities don't have streams
      logger.warn(`No streams available for activity ${activityId}`);
      return {};
    }
  }

  /**
   * Get athlete profile
   */
  async getAthlete(): Promise<{
    id: number;
    firstname: string;
    lastname: string;
    weight?: number;
    ftp?: number;
  }> {
    const { data } = await this.client.get('/athlete');
    return data;
  }

  /**
   * Map Strava sport type to our SportType enum
   */
  static mapSportType(stravaType: string): string {
    return STRAVA_SPORT_MAP[stravaType] || 'OTHER';
  }
}

// Factory function to create client for a user
export function createStravaClient(userId: string): StravaClient {
  return new StravaClient(userId);
}
