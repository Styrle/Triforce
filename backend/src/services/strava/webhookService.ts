import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

interface SubscriptionResponse {
  id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

export class StravaWebhookService {
  private readonly STRAVA_API = 'https://www.strava.com/api/v3';

  /**
   * Create webhook subscription with Strava
   * Only needs to be called once to set up the subscription
   */
  async createSubscription(
    callbackUrl: string
  ): Promise<{ id: number; created: boolean }> {
    try {
      // First check if subscription already exists
      const existing = await this.viewSubscription();
      if (existing) {
        logger.info('Webhook subscription already exists', { id: existing.id });
        return { id: existing.id, created: false };
      }

      const response = await axios.post(`${this.STRAVA_API}/push_subscriptions`, {
        client_id: config.strava.clientId,
        client_secret: config.strava.clientSecret,
        callback_url: callbackUrl,
        verify_token: config.strava.webhookVerifyToken,
      });

      logger.info('Webhook subscription created', { id: response.data.id });
      return { id: response.data.id, created: true };
    } catch (error: any) {
      logger.error('Failed to create webhook subscription', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * View current webhook subscription
   */
  async viewSubscription(): Promise<SubscriptionResponse | null> {
    try {
      const response = await axios.get(`${this.STRAVA_API}/push_subscriptions`, {
        params: {
          client_id: config.strava.clientId,
          client_secret: config.strava.clientSecret,
        },
      });

      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error: any) {
      logger.error('Failed to view webhook subscription', {
        error: error.response?.data || error.message,
      });
      return null;
    }
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(subscriptionId: number): Promise<void> {
    try {
      await axios.delete(
        `${this.STRAVA_API}/push_subscriptions/${subscriptionId}`,
        {
          params: {
            client_id: config.strava.clientId,
            client_secret: config.strava.clientSecret,
          },
        }
      );
      logger.info('Webhook subscription deleted', { id: subscriptionId });
    } catch (error: any) {
      logger.error('Failed to delete webhook subscription', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }
}

export const stravaWebhookService = new StravaWebhookService();
export default stravaWebhookService;
