import { Router, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { SportType } from '@prisma/client';

// Import services
import { zoneCalculator } from '../services/zones/calculator';
import { aerobicService } from '../services/analytics/aerobicService';
import { durationCurveService } from '../services/analytics/durationCurveService';
import { cssService } from '../services/analytics/cssService';
import { runningDynamicsService } from '../services/analytics/runningDynamicsService';
import { peakTrackerService } from '../services/analytics/peakTrackerService';

const router = Router();

// Validation middleware
const validateRequest = (req: AuthRequest, res: Response, next: () => void) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(
      errors
        .array()
        .map((e) => e.msg)
        .join(', ')
    );
  }
  next();
};

/**
 * GET /api/analytics/zones
 * Get all training zones for user
 */
router.get(
  '/zones',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const zones = await zoneCalculator.getUserZones(req.user!.userId);

    res.json({
      success: true,
      data: zones,
    });
  })
);

/**
 * GET /api/analytics/ef-trend
 * Get Efficiency Factor trend
 */
router.get(
  '/ef-trend',
  authMiddleware,
  [
    query('sport').isIn(['BIKE', 'RUN']).withMessage('Sport must be BIKE or RUN'),
    query('days').optional().isInt({ min: 7, max: 365 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sportType = req.query.sport as 'BIKE' | 'RUN';
    const days = parseInt(req.query.days as string) || 90;

    const trend = await aerobicService.getEFTrend(req.user!.userId, sportType, days);

    res.json({
      success: true,
      data: trend,
    });
  })
);

/**
 * GET /api/analytics/power-curve
 * Get power duration curve
 */
router.get(
  '/power-curve',
  authMiddleware,
  [query('days').optional().isInt({ min: 7, max: 365 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 90;

    const curve = await durationCurveService.buildPowerCurve(req.user!.userId, days);
    const phenotype = durationCurveService.determinePhenotype(curve.points);
    const estimatedFTP = durationCurveService.estimateFTPFromCurve(curve.points);

    res.json({
      success: true,
      data: {
        curve,
        phenotype,
        estimatedFTP,
      },
    });
  })
);

/**
 * GET /api/analytics/pace-curve
 * Get pace duration curve
 */
router.get(
  '/pace-curve',
  authMiddleware,
  [query('days').optional().isInt({ min: 7, max: 365 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 90;

    const curve = await durationCurveService.buildPaceCurve(req.user!.userId, days);

    res.json({
      success: true,
      data: curve,
    });
  })
);

/**
 * POST /api/analytics/css
 * Calculate CSS from test times
 */
router.post(
  '/css',
  authMiddleware,
  [
    body('t400').isInt({ min: 180, max: 1200 }).withMessage('400m time must be between 3-20 minutes'),
    body('t200').isInt({ min: 90, max: 600 }).withMessage('200m time must be between 1.5-10 minutes'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { t400, t200 } = req.body;

    const result = cssService.calculateCSS(t400, t200);
    const zones = cssService.calculateSwimZones(result.cssPace100m);
    const trainingPaces = cssService.getTrainingPaces(result.css);
    const racePredictions = cssService.predictRaceTimes(result.css);

    // Save CSS to user's profile
    await cssService.updateUserCSS(req.user!.userId, result.css);

    res.json({
      success: true,
      data: {
        css: result,
        zones,
        trainingPaces,
        racePredictions,
      },
    });
  })
);

/**
 * GET /api/analytics/css/estimate
 * Estimate CSS from swim history
 */
router.get(
  '/css/estimate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const estimate = await cssService.estimateCSSFromHistory(req.user!.userId);

    if (!estimate) {
      res.json({
        success: true,
        data: null,
        message: 'Not enough swim data to estimate CSS. Record some 400-1500m swims.',
      });
      return;
    }

    const zones = cssService.calculateSwimZones(estimate.cssPace100m);
    const trainingPaces = cssService.getTrainingPaces(estimate.css);

    res.json({
      success: true,
      data: {
        estimate,
        zones,
        trainingPaces,
      },
    });
  })
);

/**
 * GET /api/analytics/running-dynamics/:activityId
 * Get running dynamics analysis for an activity
 */
router.get(
  '/running-dynamics/:activityId',
  authMiddleware,
  [param('activityId').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { activityId } = req.params;

    const analysis = await runningDynamicsService.analyzeRunningDynamics(activityId);

    if (!analysis) {
      throw createNotFoundError('Running dynamics data');
    }

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * GET /api/analytics/running-dynamics-trend
 * Get running dynamics trend over time
 */
router.get(
  '/running-dynamics-trend',
  authMiddleware,
  [query('days').optional().isInt({ min: 7, max: 365 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 90;

    const trend = await runningDynamicsService.getRunningDynamicsTrend(req.user!.userId, days);

    res.json({
      success: true,
      data: trend,
    });
  })
);

/**
 * GET /api/analytics/peaks
 * Get peak performances
 */
router.get(
  '/peaks',
  authMiddleware,
  [query('sport').optional().isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'])],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sportType = req.query.sport as SportType | undefined;

    const peaks = await peakTrackerService.getPeakPerformances(req.user!.userId, sportType);

    res.json({
      success: true,
      data: peaks,
    });
  })
);

/**
 * GET /api/analytics/peaks/recent
 * Get recent PRs
 */
router.get(
  '/peaks/recent',
  authMiddleware,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    const recentPRs = await peakTrackerService.getRecentPRs(req.user!.userId, days);

    res.json({
      success: true,
      data: recentPRs,
    });
  })
);

/**
 * GET /api/analytics/detect-threshold
 * Auto-detect threshold for a sport
 */
router.get(
  '/detect-threshold',
  authMiddleware,
  [
    query('sport').isIn(['BIKE', 'RUN', 'SWIM']).withMessage('Sport must be BIKE, RUN, or SWIM'),
    query('days').optional().isInt({ min: 30, max: 365 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sportType = req.query.sport as 'BIKE' | 'RUN' | 'SWIM';
    const days = parseInt(req.query.days as string) || 90;

    const detection = await zoneCalculator.detectThreshold(req.user!.userId, sportType, days);

    if (!detection) {
      res.json({
        success: true,
        data: null,
        message: `Not enough ${sportType.toLowerCase()} data to detect threshold.`,
      });
      return;
    }

    res.json({
      success: true,
      data: detection,
    });
  })
);

/**
 * GET /api/analytics/decoupling/:activityId
 * Get decoupling analysis for an activity
 */
router.get(
  '/decoupling/:activityId',
  authMiddleware,
  [
    param('activityId').isString().notEmpty(),
    query('usePower').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { activityId } = req.params;
    const usePower = req.query.usePower !== 'false';

    const result = await aerobicService.calculateDecoupling(activityId, usePower);

    if (!result) {
      throw createNotFoundError('Decoupling data');
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/analytics/calculate-zones/hr
 * Calculate HR zones from LTHR
 */
router.post(
  '/calculate-zones/hr',
  authMiddleware,
  [body('lthr').isInt({ min: 100, max: 220 }).withMessage('LTHR must be between 100-220')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lthr } = req.body;

    const zones = zoneCalculator.calculateHRZones(lthr);

    res.json({
      success: true,
      data: zones,
    });
  })
);

/**
 * POST /api/analytics/calculate-zones/power
 * Calculate power zones from FTP
 */
router.post(
  '/calculate-zones/power',
  authMiddleware,
  [body('ftp').isInt({ min: 50, max: 600 }).withMessage('FTP must be between 50-600')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ftp } = req.body;

    const zones = zoneCalculator.calculatePowerZones(ftp);

    res.json({
      success: true,
      data: zones,
    });
  })
);

/**
 * POST /api/analytics/calculate-zones/pace
 * Calculate pace zones from threshold pace
 */
router.post(
  '/calculate-zones/pace',
  authMiddleware,
  [
    body('thresholdPace')
      .isFloat({ min: 2, max: 7 })
      .withMessage('Threshold pace must be between 2-7 m/s'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { thresholdPace } = req.body;

    const zones = zoneCalculator.calculatePaceZones(thresholdPace);

    res.json({
      success: true,
      data: zones,
    });
  })
);

export default router;
