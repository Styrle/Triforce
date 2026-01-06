import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { wellnessService } from '../services/wellness/wellnessService';

const router = Router();

// Valid cycle phases from Prisma schema
const VALID_CYCLE_PHASES = ['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL'];

/**
 * GET /api/wellness/today
 * Get today's wellness (or create empty)
 */
router.get(
  '/today',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const wellness = await wellnessService.getOrCreateToday(req.user!.userId);
    const breakdown = wellnessService.getReadinessBreakdown(wellness);

    res.json({
      success: true,
      data: { ...wellness, breakdown },
    });
  })
);

/**
 * GET /api/wellness/stats/:days
 * Get wellness stats
 */
router.get(
  '/stats/:days',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.params.days) || 30;
    const stats = await wellnessService.getStats(req.user!.userId, days);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/wellness/trend/:days
 * Get wellness trend
 */
router.get(
  '/trend/:days',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.params.days) || 30;
    const trend = await wellnessService.getTrend(req.user!.userId, days);

    res.json({
      success: true,
      data: trend,
    });
  })
);

/**
 * GET /api/wellness/correlations/:days
 * Get correlations
 */
router.get(
  '/correlations/:days',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.params.days) || 90;
    const correlations = await wellnessService.getCorrelations(req.user!.userId, days);

    res.json({
      success: true,
      data: correlations,
    });
  })
);

/**
 * GET /api/wellness/:date
 * Get wellness for a specific date
 */
router.get(
  '/:date',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      throw createValidationError('Invalid date format');
    }

    const wellness = await wellnessService.getByDate(req.user!.userId, req.params.date);

    if (!wellness) {
      res.json({ success: true, data: null });
      return;
    }

    const breakdown = wellnessService.getReadinessBreakdown(wellness);

    res.json({
      success: true,
      data: { ...wellness, breakdown },
    });
  })
);

/**
 * POST /api/wellness
 * Log/update wellness
 */
router.post(
  '/',
  authMiddleware,
  [
    body('date').optional().isISO8601().withMessage('Invalid date format'),
    body('overallMood')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Overall mood must be between 1 and 10'),
    body('sleepQuality')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Sleep quality must be between 1 and 10'),
    body('energyLevel')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Energy level must be between 1 and 10'),
    body('stressLevel')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Stress level must be between 1 and 10'),
    body('muscleSoreness')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Muscle soreness must be between 1 and 10'),
    body('motivation')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Motivation must be between 1 and 10'),
    body('sleepDuration')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep duration must be between 0 and 24 hours'),
    body('restingHR')
      .optional()
      .isInt({ min: 20, max: 200 })
      .withMessage('Resting HR must be between 20 and 200 bpm'),
    body('hrv')
      .optional()
      .isFloat({ min: 0, max: 300 })
      .withMessage('HRV must be between 0 and 300 ms'),
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 500 })
      .withMessage('Weight must be between 20 and 500'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isString().withMessage('Each tag must be a string'),
    body('cycleDay')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('Cycle day must be between 1 and 60'),
    body('cyclePhase')
      .optional()
      .isIn(VALID_CYCLE_PHASES)
      .withMessage('Invalid cycle phase'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors
          .array()
          .map((e) => e.msg)
          .join(', ')
      );
    }

    const wellness = await wellnessService.logWellness(req.user!.userId, req.body);
    const breakdown = wellnessService.getReadinessBreakdown(wellness);

    res.json({
      success: true,
      data: { ...wellness, breakdown },
    });
  })
);

/**
 * DELETE /api/wellness/:date
 * Delete wellness entry
 */
router.delete(
  '/:date',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      throw createValidationError('Invalid date format');
    }

    await wellnessService.deleteWellness(req.user!.userId, req.params.date);

    res.json({
      success: true,
      data: { message: 'Wellness entry deleted' },
    });
  })
);

export default router;
