import axios from 'axios';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { STRAVA_OAUTH_URL, STRAVA_SCOPES } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';
import { StravaTokenResponse } from '../../types';
import { logger } from '../../utils/logger';

export class StravaOAuthService {
  /**
   * Generate Strava authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.strava.clientId,
      redirect_uri: config.strava.redirectUri,
      response_type: 'code',
      scope: STRAVA_SCOPES,
      state,
    });

    return `${STRAVA_OAUTH_URL}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post<StravaTokenResponse>(
        `${STRAVA_OAUTH_URL}/token`,
        {
          client_id: config.strava.clientId,
          client_secret: config.strava.clientSecret,
          code,
          grant_type: 'authorization_code',
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Strava token exchange failed:', error);
      throw new AppError('Failed to connect to Strava', 500, 'STRAVA_ERROR');
    }
  }

  /**
   * Refresh expired tokens
   */
  async refreshTokens(refreshToken: string): Promise<StravaTokenResponse> {
    try {
      const response = await axios.post<StravaTokenResponse>(
        `${STRAVA_OAUTH_URL}/token`,
        {
          client_id: config.strava.clientId,
          client_secret: config.strava.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Strava token refresh failed:', error);
      throw new AppError('Failed to refresh Strava connection', 500, 'STRAVA_ERROR');
    }
  }

  /**
   * Connect Strava account to user
   */
  async connectStravaAccount(userId: string, code: string): Promise<void> {
    const tokens = await this.exchangeCode(code);

    // Check if this Strava account is already connected to another user
    const existingConnection = await prisma.stravaConnection.findFirst({
      where: { stravaAthleteId: String(tokens.athlete.id) },
    });

    if (existingConnection && existingConnection.userId !== userId) {
      throw new AppError(
        'This Strava account is already connected to another user',
        409,
        'STRAVA_ALREADY_CONNECTED'
      );
    }

    // Upsert Strava connection
    await prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        stravaAthleteId: String(tokens.athlete.id),
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at * 1000),
        scope: STRAVA_SCOPES,
      },
      update: {
        stravaAthleteId: String(tokens.athlete.id),
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at * 1000),
        scope: STRAVA_SCOPES,
      },
    });

    // Update user with Strava ID and name if not set
    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaId: String(tokens.athlete.id),
        name: await prisma.user
          .findUnique({ where: { id: userId } })
          .then((u) => u?.name || `${tokens.athlete.firstname} ${tokens.athlete.lastname}`),
      },
    });

    logger.info(`Strava account ${tokens.athlete.id} connected to user ${userId}`);
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new AppError('No Strava connection found', 404, 'STRAVA_NOT_CONNECTED');
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = new Date(connection.expiresAt);
    const bufferMs = 5 * 60 * 1000;

    if (now.getTime() + bufferMs > expiresAt.getTime()) {
      // Token expired or expiring soon, refresh it
      const newTokens = await this.refreshTokens(connection.refreshToken);

      await prisma.stravaConnection.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: new Date(newTokens.expires_at * 1000),
        },
      });

      logger.info(`Refreshed Strava tokens for user ${userId}`);
      return newTokens.access_token;
    }

    return connection.accessToken;
  }

  /**
   * Get Strava connection status
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    athleteId?: string;
    lastSync?: Date | null;
  }> {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId },
      select: {
        stravaAthleteId: true,
        lastSync: true,
      },
    });

    return {
      connected: !!connection,
      athleteId: connection?.stravaAthleteId,
      lastSync: connection?.lastSync,
    };
  }

  /**
   * Disconnect Strava account
   */
  async disconnectStrava(userId: string): Promise<void> {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new AppError('No Strava connection found', 404, 'STRAVA_NOT_CONNECTED');
    }

    // Optionally deauthorize with Strava API
    try {
      await axios.post(
        `${STRAVA_OAUTH_URL}/deauthorize`,
        { access_token: connection.accessToken }
      );
    } catch (error) {
      // Log but don't fail - token might already be invalid
      logger.warn('Failed to deauthorize with Strava:', error);
    }

    // Delete connection
    await prisma.stravaConnection.delete({
      where: { userId },
    });

    // Clear Strava ID from user
    await prisma.user.update({
      where: { id: userId },
      data: { stravaId: null },
    });

    logger.info(`Strava disconnected for user ${userId}`);
  }
}

// Export singleton instance
export const stravaOAuthService = new StravaOAuthService();
export default stravaOAuthService;
