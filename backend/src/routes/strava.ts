import { Router, Response, Request } from 'express';
import { stravaOAuthService } from '../services/strava/oauthService';
import { stravaWebhookService } from '../services/strava/webhookService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError, createValidationError } from '../middleware/errorHandler';
import { generateRandomString } from '../utils/helpers';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

// In-memory state store (use Redis in production for multi-instance)
const stateStore = new Map<string, { userId: string; expires: number }>();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (value.expires < now) {
      stateStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

/**
 * GET /api/strava/auth
 * Get Strava authorization URL
 */
router.get(
  '/auth',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Generate state for CSRF protection
    const state = generateRandomString(32);

    // Store state with user ID (expires in 10 minutes)
    stateStore.set(state, {
      userId: req.user!.userId,
      expires: Date.now() + 10 * 60 * 1000,
    });

    const authUrl = stravaOAuthService.getAuthorizationUrl(state);

    res.json({
      success: true,
      data: { url: authUrl },
    });
  })
);

/**
 * GET /api/strava/callback
 * Handle Strava OAuth callback
 */
router.get(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    // Handle Strava errors
    if (error) {
      logger.warn('Strava OAuth error:', error);
      res.redirect(`${config.frontendUrl}/settings?strava=error&reason=${error}`);
      return;
    }

    // Validate state
    if (!state || typeof state !== 'string') {
      res.redirect(`${config.frontendUrl}/settings?strava=invalid`);
      return;
    }

    const stateData = stateStore.get(state);

    if (!stateData) {
      logger.warn('Invalid or expired OAuth state');
      res.redirect(`${config.frontendUrl}/settings?strava=expired`);
      return;
    }

    if (stateData.expires < Date.now()) {
      stateStore.delete(state);
      res.redirect(`${config.frontendUrl}/settings?strava=expired`);
      return;
    }

    // Delete used state
    stateStore.delete(state);

    // Validate code
    if (!code || typeof code !== 'string') {
      res.redirect(`${config.frontendUrl}/settings?strava=invalid`);
      return;
    }

    try {
      // Exchange code for tokens and connect account
      await stravaOAuthService.connectStravaAccount(stateData.userId, code);

      res.redirect(`${config.frontendUrl}/settings?strava=success`);
    } catch (err) {
      logger.error('Strava connection error:', err);
      
      if (err instanceof AppError && err.code === 'STRAVA_ALREADY_CONNECTED') {
        res.redirect(`${config.frontendUrl}/settings?strava=already_connected`);
      } else {
        res.redirect(`${config.frontendUrl}/settings?strava=error`);
      }
    }
  })
);

/**
 * GET /api/strava/status
 * Get Strava connection status
 */
router.get(
  '/status',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = await stravaOAuthService.getConnectionStatus(req.user!.userId);

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * DELETE /api/strava/disconnect
 * Disconnect Strava account
 */
router.delete(
  '/disconnect',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await stravaOAuthService.disconnectStrava(req.user!.userId);

    res.json({
      success: true,
      data: { message: 'Strava disconnected successfully' },
    });
  })
);

/**
 * POST /api/strava/webhook
 * Handle Strava webhook events (for activity sync)
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const event = req.body;

    logger.info('Received Strava webhook:', {
      objectType: event.object_type,
      aspectType: event.aspect_type,
      objectId: event.object_id,
      ownerId: event.owner_id,
    });

    // Queue webhook event for processing
    try {
      const { jobQueueService } = await import('../services/jobs/queueService');
      await jobQueueService.queueWebhookEvent({
        objectType: event.object_type,
        objectId: event.object_id,
        aspectType: event.aspect_type,
        ownerId: event.owner_id,
        eventTime: event.event_time,
      });
    } catch (error) {
      // Log but don't fail - Strava expects 200 response
      logger.error('Failed to queue webhook event:', error);
    }

    // Always respond with 200 OK
    res.status(200).send('OK');
  })
);

/**
 * GET /api/strava/webhook
 * Verify Strava webhook subscription
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.strava.webhookVerifyToken) {
    logger.info('Strava webhook subscription verified');
    res.json({ 'hub.challenge': challenge });
  } else {
    logger.warn('Strava webhook verification failed');
    res.status(403).send('Verification failed');
  }
});

/**
 * POST /api/strava/webhook/subscribe
 * Create webhook subscription with Strava
 * Note: In production, restrict this to admin users
 */
router.post(
  '/webhook/subscribe',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { callbackUrl } = req.body;

    if (!callbackUrl) {
      throw createValidationError('callbackUrl is required');
    }

    const result = await stravaWebhookService.createSubscription(callbackUrl);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/strava/webhook/subscription
 * View current webhook subscription
 */
router.get(
  '/webhook/subscription',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const subscription = await stravaWebhookService.viewSubscription();
    res.json({ success: true, data: subscription });
  })
);

/**
 * DELETE /api/strava/webhook/subscription/:id
 * Delete webhook subscription
 */
router.delete(
  '/webhook/subscription/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await stravaWebhookService.deleteSubscription(parseInt(req.params.id, 10));
    res.json({ success: true, data: { message: 'Subscription deleted' } });
  })
);

export default router;
