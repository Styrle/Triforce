import axios, { AxiosInstance } from 'axios';
import { STRAVA_API_BASE_URL, STRAVA_SPORT_MAP } from '../../config/constants';
import { stravaOAuthService } from './oauthService';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { retryWithBackoff, sleep } from '../../utils/helpers';
import { StravaActivity, StravaStream } from '../../types';

// Rate limiting: Strava allows 100 requests per 15 minutes, 1000 per day
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

export class StravaApiClient {
  private lastRequestTime: number = 0;

  /**
   * Create an axios instance with user's access token
   */
  private async createClient(userId: string): Promise<AxiosInstance> {
    const accessToken = await stravaOAuthService.getValidAccessToken(userId);

    return axios.create({
      baseURL: STRAVA_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Rate limit requests to Strava API
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await sleep(RATE_LIMIT_DELAY - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch athlete profile
   */
  async getAthlete(userId: string) {
    const client = await this.createClient(userId);
    await this.rateLimit();

    try {
      const response = await client.get('/athlete');
      return response.data;
    } catch (error: any) {
      this.handleApiError(error, 'getAthlete');
    }
  }

  /**
   * Fetch activities list
   */
  async getActivities(
    userId: string,
    options: {
      page?: number;
      perPage?: number;
      before?: number; // Unix timestamp
      after?: number; // Unix timestamp
    } = {}
  ): Promise<StravaActivity[]> {
    const client = await this.createClient(userId);
    await this.rateLimit();

    const params: Record<string, number> = {
      page: options.page || 1,
      per_page: options.perPage || 30,
    };

    if (options.before) params.before = options.before;
    if (options.after) params.after = options.after;

    try {
      const response = await retryWithBackoff(
        () => client.get('/athlete/activities', { params }),
        3,
        2000
      );
      return response.data;
    } catch (error: any) {
      this.handleApiError(error, 'getActivities');
      return [];
    }
  }

  /**
   * Fetch single activity details
   */
  async getActivity(userId: string, activityId: number): Promise<StravaActivity | null> {
    const client = await this.createClient(userId);
    await this.rateLimit();

    try {
      const response = await client.get(`/activities/${activityId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleApiError(error, 'getActivity');
      return null;
    }
  }

  /**
   * Fetch activity streams (time series data)
   */
  async getActivityStreams(
    userId: string,
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
  ): Promise<Record<string, StravaStream>> {
    const client = await this.createClient(userId);
    await this.rateLimit();

    try {
      const response = await client.get(`/activities/${activityId}/streams`, {
        params: {
          keys: streamTypes.join(','),
          key_by_type: true,
        },
      });
      return response.data;
    } catch (error: any) {
      // Streams might not exist for all activities
      if (error.response?.status === 404) {
        return {};
      }
      this.handleApiError(error, 'getActivityStreams');
      return {};
    }
  }

  /**
   * Fetch activity laps
   */
  async getActivityLaps(userId: string, activityId: number): Promise<any[]> {
    const client = await this.createClient(userId);
    await this.rateLimit();

    try {
      const response = await client.get(`/activities/${activityId}/laps`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      this.handleApiError(error, 'getActivityLaps');
      return [];
    }
  }

  /**
   * Map Strava activity type to our SportType
   */
  mapSportType(stravaType: string): string {
    return STRAVA_SPORT_MAP[stravaType] || 'OTHER';
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any, context: string): never {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    logger.error(`Strava API error in ${context}:`, {
      status,
      message,
      errors: error.response?.data?.errors,
    });

    if (status === 401) {
      throw new AppError('Strava authentication failed', 401, 'STRAVA_AUTH_ERROR');
    }

    if (status === 403) {
      throw new AppError('Strava access forbidden', 403, 'STRAVA_FORBIDDEN');
    }

    if (status === 429) {
      throw new AppError('Strava rate limit exceeded', 429, 'STRAVA_RATE_LIMITED');
    }

    throw new AppError(
      `Strava API error: ${message}`,
      status || 500,
      'STRAVA_API_ERROR'
    );
  }
}

// Export singleton instance
export const stravaApiClient = new StravaApiClient();
export default stravaApiClient;
