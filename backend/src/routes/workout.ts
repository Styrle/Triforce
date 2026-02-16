import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { workoutSessionService } from '../services/workout/workoutSessionService';
import { workoutAnalyticsService } from '../services/workout/workoutAnalytics';
import { LiftType } from '@prisma/client';

const router = Router();

/**
 * POST /api/workouts
 * Create a new workout session
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await workoutSessionService.createSession(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: session });
  })
);

/**
 * GET /api/workouts
 * Get user's workout sessions with pagination
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit, offset, startDate, endDate } = req.query;
    const result = await workoutSessionService.getUserSessions(req.user!.userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/workouts/analytics/pbs
 * Get user's personal bests
 * NOTE: Must be before /:id to avoid route conflicts
 */
router.get(
  '/analytics/pbs',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { liftTypes } = req.query;
    const lifts = liftTypes
      ? (liftTypes as string).split(',') as LiftType[]
      : undefined;
    const pbs = await workoutSessionService.getPersonalBests(req.user!.userId, lifts);
    res.json({ success: true, data: pbs });
  })
);

/**
 * GET /api/workouts/analytics/volume
 * Get volume analytics for a period
 */
router.get(
  '/analytics/volume',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period, date } = req.query;
    const analytics = await workoutSessionService.getVolumeAnalytics(
      req.user!.userId,
      (period as 'day' | 'week' | 'month') || 'week',
      date ? new Date(date as string) : undefined
    );
    res.json({ success: true, data: analytics });
  })
);

/**
 * POST /api/workouts/calculate/percentage
 * Calculate weight from percentage of 1RM
 */
router.post(
  '/calculate/percentage',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { inputMax, percentage, targetReps } = req.body;
    const result = workoutAnalyticsService.calculatePercentageTraining(
      inputMax,
      percentage,
      targetReps
    );
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/workouts/calculate/rpe
 * Get RPE-based weight prescription
 */
router.post(
  '/calculate/rpe',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { known1RM, targetRPE, targetReps } = req.body;
    const result = workoutAnalyticsService.getRPEPrescription(known1RM, targetRPE, targetReps);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/workouts/calculate/rep-ranges/:oneRM
 * Get rep range chart for a given 1RM
 */
router.get(
  '/calculate/rep-ranges/:oneRM',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const oneRM = parseFloat(req.params.oneRM);
    if (isNaN(oneRM) || oneRM <= 0) {
      res.status(400).json({ success: false, error: { message: '1RM must be a positive number' } });
      return;
    }
    const chart = workoutAnalyticsService.getRepRangeChart(oneRM);
    res.json({ success: true, data: chart });
  })
);

/**
 * GET /api/workouts/:id
 * Get a specific workout session
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await workoutSessionService.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ success: false, error: { message: 'Session not found' } });
      return;
    }
    res.json({ success: true, data: session });
  })
);

/**
 * PUT /api/workouts/:id
 * Update a workout session
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await workoutSessionService.updateSession(req.params.id, req.body);
    res.json({ success: true, data: session });
  })
);

/**
 * DELETE /api/workouts/:id
 * Delete a workout session
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await workoutSessionService.deleteSession(req.params.id);
    res.status(204).send();
  })
);

export default router;
