import { Router, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { SportType } from '@prisma/client';
import { prisma } from '../config/database';

// Import services
import { zoneCalculator } from '../services/zones/calculator';
import { aerobicService } from '../services/analytics/aerobicService';
import { durationCurveService } from '../services/analytics/durationCurveService';
import { cssService } from '../services/analytics/cssService';
import { runningDynamicsService } from '../services/analytics/runningDynamicsService';
import { peakTrackerService } from '../services/analytics/peakTrackerService';
import { triScoreService } from '../services/analytics/triScoreService';
import { racePredictionService } from '../services/analytics/racePredictionService';
import { forecastService } from '../services/analytics/forecastService';
import { pdfReportService } from '../services/reports/pdfService';

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

/**
 * GET /api/analytics/tri-score
 * Get comprehensive Tri-Score
 */
router.get(
  '/tri-score',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const triScore = await triScoreService.calculateTriScore(req.user!.userId);

    res.json({
      success: true,
      data: triScore,
    });
  })
);

/**
 * GET /api/analytics/tri-score/history
 * Get Tri-Score history over time
 */
router.get(
  '/tri-score/history',
  authMiddleware,
  [query('weeks').optional().isInt({ min: 4, max: 52 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const weeks = parseInt(req.query.weeks as string) || 12;

    const history = await triScoreService.getTriScoreHistory(req.user!.userId, weeks);

    res.json({
      success: true,
      data: history,
    });
  })
);

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary metrics
 */
router.get(
  '/dashboard',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await triScoreService.getDashboardSummary(req.user!.userId);

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET /api/analytics/calendar
 * Get calendar data with activities, workouts, and metrics
 */
router.get(
  '/calendar',
  authMiddleware,
  [
    query('start').isISO8601().withMessage('Start date required'),
    query('end').isISO8601().withMessage('End date required'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = new Date(req.query.start as string);
    const endDate = new Date(req.query.end as string);

    // Validate date range (max 90 days)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      throw createValidationError('Date range cannot exceed 90 days');
    }

    const [activities, workouts, metrics] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: req.user!.userId,
          startDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          name: true,
          sportType: true,
          startDate: true,
          movingTime: true,
          distance: true,
          tss: true,
          avgHeartRate: true,
          avgPower: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      prisma.plannedWorkout.findMany({
        where: {
          userId: req.user!.userId,
          scheduledDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          name: true,
          sportType: true,
          scheduledDate: true,
          targetDuration: true,
          targetTss: true,
          status: true,
          completedActivityId: true,
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      prisma.dailyMetrics.findMany({
        where: {
          userId: req.user!.userId,
          date: { gte: startDate, lte: endDate },
        },
        select: {
          date: true,
          tss: true,
          ctl: true,
          atl: true,
          tsb: true,
          activityCount: true,
          totalDuration: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Group by date
    const days: {
      date: string;
      activities: typeof activities;
      plannedWorkouts: typeof workouts;
      metrics: (typeof metrics)[0] | null;
    }[] = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        activities: activities.filter(
          (a) => a.startDate.toISOString().split('T')[0] === dateStr
        ),
        plannedWorkouts: workouts.filter(
          (w) => w.scheduledDate.toISOString().split('T')[0] === dateStr
        ),
        metrics: metrics.find((m) => m.date.toISOString().split('T')[0] === dateStr) || null,
      });

      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        days,
        summary: {
          totalActivities: activities.length,
          totalPlannedWorkouts: workouts.length,
          totalDuration: activities.reduce((sum, a) => sum + a.movingTime, 0),
          totalTss: activities.reduce((sum, a) => sum + (a.tss || 0), 0),
        },
      },
    });
  })
);

/**
 * GET /api/analytics/pmc
 * Get PMC (Performance Management Chart) data
 */
router.get(
  '/pmc',
  authMiddleware,
  [query('days').optional().isInt({ min: 30, max: 365 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        userId: req.user!.userId,
        date: { gte: startDate },
      },
      select: {
        date: true,
        tss: true,
        ctl: true,
        atl: true,
        tsb: true,
        rampRate: true,
      },
      orderBy: { date: 'asc' },
    });

    // Get future planned TSS for projection
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 14);

    const plannedWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        userId: req.user!.userId,
        scheduledDate: { gt: new Date(), lte: futureEnd },
        status: 'PLANNED',
      },
      select: {
        scheduledDate: true,
        targetTss: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Create projection data
    const projections: { date: string; projectedTss: number; projectedCtl: number; projectedAtl: number; projectedTsb: number }[] = [];

    if (metrics.length > 0) {
      const lastMetrics = metrics[metrics.length - 1];
      let projectedCtl = lastMetrics.ctl || 0;
      let projectedAtl = lastMetrics.atl || 0;

      const currentDate = new Date();
      for (let i = 1; i <= 14; i++) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dateStr = currentDate.toISOString().split('T')[0];

        const dayWorkouts = plannedWorkouts.filter(
          (w) => w.scheduledDate.toISOString().split('T')[0] === dateStr
        );
        const projectedTss = dayWorkouts.reduce((sum, w) => sum + (w.targetTss || 0), 0);

        // Update projections using exponential decay
        projectedCtl = projectedCtl + (projectedTss - projectedCtl) / 42;
        projectedAtl = projectedAtl + (projectedTss - projectedAtl) / 7;

        projections.push({
          date: dateStr,
          projectedTss,
          projectedCtl: Math.round(projectedCtl),
          projectedAtl: Math.round(projectedAtl),
          projectedTsb: Math.round(projectedCtl - projectedAtl),
        });
      }
    }

    res.json({
      success: true,
      data: {
        history: metrics,
        projections,
        current: metrics.length > 0 ? metrics[metrics.length - 1] : null,
      },
    });
  })
);

/**
 * GET /api/analytics/week-summary
 * Get summary for current or specified week
 */
router.get(
  '/week-summary',
  authMiddleware,
  [query('weekStart').optional().isISO8601()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    let weekStart: Date;
    if (req.query.weekStart) {
      weekStart = new Date(req.query.weekStart as string);
    } else {
      weekStart = new Date();
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - day); // Go to Sunday
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [activities, plannedWorkouts] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: req.user!.userId,
          startDate: { gte: weekStart, lt: weekEnd },
        },
        select: {
          sportType: true,
          movingTime: true,
          distance: true,
          tss: true,
        },
      }),
      prisma.plannedWorkout.findMany({
        where: {
          userId: req.user!.userId,
          scheduledDate: { gte: weekStart, lt: weekEnd },
        },
        select: {
          sportType: true,
          targetDuration: true,
          targetTss: true,
          status: true,
        },
      }),
    ]);

    // Calculate by sport
    const bySport: Record<string, {
      plannedDuration: number;
      actualDuration: number;
      plannedTss: number;
      actualTss: number;
      plannedCount: number;
      completedCount: number;
    }> = {};

    for (const sport of ['SWIM', 'BIKE', 'RUN', 'STRENGTH']) {
      const sportActivities = activities.filter((a) => a.sportType === sport);
      const sportWorkouts = plannedWorkouts.filter((w) => w.sportType === sport);

      bySport[sport] = {
        plannedDuration: sportWorkouts.reduce((sum, w) => sum + (w.targetDuration || 0), 0),
        actualDuration: sportActivities.reduce((sum, a) => sum + a.movingTime, 0),
        plannedTss: sportWorkouts.reduce((sum, w) => sum + (w.targetTss || 0), 0),
        actualTss: sportActivities.reduce((sum, a) => sum + (a.tss || 0), 0),
        plannedCount: sportWorkouts.length,
        completedCount: sportWorkouts.filter(
          (w) => w.status === 'COMPLETED' || w.status === 'PARTIAL'
        ).length,
      };
    }

    const totalPlanned = plannedWorkouts.length;
    const totalCompleted = plannedWorkouts.filter(
      (w) => w.status === 'COMPLETED' || w.status === 'PARTIAL'
    ).length;

    res.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        bySport,
        totals: {
          plannedDuration: Object.values(bySport).reduce((sum, s) => sum + s.plannedDuration, 0),
          actualDuration: Object.values(bySport).reduce((sum, s) => sum + s.actualDuration, 0),
          plannedTss: Object.values(bySport).reduce((sum, s) => sum + s.plannedTss, 0),
          actualTss: Object.values(bySport).reduce((sum, s) => sum + s.actualTss, 0),
          activityCount: activities.length,
          compliance: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 100,
        },
      },
    });
  })
);

// ============ RACE PREDICTIONS ============

/**
 * GET /api/analytics/race-predictions/:sport
 * Get race predictions for a sport
 */
router.get(
  '/race-predictions/:sport',
  authMiddleware,
  [param('sport').isIn(['RUN', 'BIKE', 'SWIM']).withMessage('Sport must be RUN, BIKE, or SWIM')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const predictions = await racePredictionService.getPredictions(
      req.user!.userId,
      req.params.sport.toUpperCase()
    );
    res.json({ success: true, data: predictions });
  })
);

/**
 * GET /api/analytics/triathlon-prediction/:raceType
 * Get triathlon finish time predictions
 */
router.get(
  '/triathlon-prediction/:raceType',
  authMiddleware,
  [param('raceType').isIn(['sprint', 'olympic', 'half', 'full']).withMessage('Invalid race type')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const prediction = await racePredictionService.predictTriathlon(
        req.user!.userId,
        req.params.raceType as 'sprint' | 'olympic' | 'half' | 'full'
      );
      res.json({ success: true, data: prediction });
    } catch (error) {
      res.json({
        success: false,
        error: (error as Error).message,
        message: 'Need swim, bike, and run data for triathlon prediction',
      });
    }
  })
);

/**
 * POST /api/analytics/race-predictions/calculate
 * Calculate predictions from custom time
 */
router.post(
  '/race-predictions/calculate',
  authMiddleware,
  [
    body('baseDistance').isInt({ min: 100 }).withMessage('Base distance must be at least 100m'),
    body('baseTime').isInt({ min: 60 }).withMessage('Base time must be at least 60 seconds'),
    body('targetDistances').optional().isArray(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { baseDistance, baseTime, targetDistances } = req.body;

    const defaults = [5000, 10000, 21097, 42195];
    const predictions = racePredictionService.calculateFromInput(
      baseDistance,
      baseTime,
      targetDistances || defaults
    );

    res.json({ success: true, data: predictions });
  })
);

// ============ FITNESS FORECASTING ============

/**
 * GET /api/analytics/fitness-forecast
 * Get CTL/ATL/TSB forecast from training plan
 */
router.get(
  '/fitness-forecast',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const forecast = await forecastService.getForecastFromPlan(req.user!.userId);
    res.json({ success: true, data: forecast });
  })
);

/**
 * POST /api/analytics/calculate-required-tss
 * Calculate required weekly TSS to reach target CTL
 */
router.post(
  '/calculate-required-tss',
  authMiddleware,
  [
    body('currentCTL').isFloat({ min: 0, max: 200 }).withMessage('Current CTL must be 0-200'),
    body('targetCTL').isFloat({ min: 0, max: 200 }).withMessage('Target CTL must be 0-200'),
    body('weeksToRace').isInt({ min: 1, max: 52 }).withMessage('Weeks to race must be 1-52'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentCTL, targetCTL, weeksToRace } = req.body;
    const result = forecastService.calculateRequiredTSS(currentCTL, targetCTL, weeksToRace);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/analytics/fitness-forecast/simulate
 * Simulate fitness with custom TSS modifications
 */
router.post(
  '/fitness-forecast/simulate',
  authMiddleware,
  [
    body('modifications').isArray().withMessage('Modifications must be an array'),
    body('modifications.*.date').isISO8601().withMessage('Each modification needs a valid date'),
    body('modifications.*.tss').isFloat({ min: 0 }).withMessage('Each modification needs TSS >= 0'),
    body('daysAhead').optional().isInt({ min: 7, max: 90 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { modifications, daysAhead = 30 } = req.body;
    const forecast = await forecastService.projectWithModifications(
      req.user!.userId,
      modifications,
      daysAhead
    );
    res.json({ success: true, data: forecast });
  })
);

/**
 * POST /api/analytics/fitness-forecast/taper
 * Get taper plan for a race
 */
router.post(
  '/fitness-forecast/taper',
  authMiddleware,
  [
    body('raceDate').isISO8601().withMessage('Valid race date required'),
    body('targetTSB').optional().isFloat({ min: 0, max: 30 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { raceDate, targetTSB = 15 } = req.body;
    try {
      const taperPlan = await forecastService.simulateTaper(
        req.user!.userId,
        new Date(raceDate),
        targetTSB
      );
      res.json({ success: true, data: taperPlan });
    } catch (error) {
      res.json({
        success: false,
        error: (error as Error).message,
      });
    }
  })
);

// ============ PDF REPORTS ============

/**
 * GET /api/analytics/report/pdf
 * Generate training report PDF
 */
router.get(
  '/report/pdf',
  authMiddleware,
  [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
    query('includeActivities').optional().isBoolean(),
    query('includePMC').optional().isBoolean(),
    query('includeStrength').optional().isBoolean(),
    query('includeNutrition').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      startDate,
      endDate,
      includeActivities = 'true',
      includePMC = 'true',
      includeStrength = 'false',
      includeNutrition = 'false',
    } = req.query;

    const pdf = await pdfReportService.generateTrainingReport(req.user!.userId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      includeActivities: includeActivities === 'true',
      includePMC: includePMC === 'true',
      includeStrength: includeStrength === 'true',
      includeNutrition: includeNutrition === 'true',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=training-report.pdf');
    res.send(pdf);
  })
);

/**
 * GET /api/analytics/report/weekly
 * Generate weekly summary PDF
 */
router.get(
  '/report/weekly',
  authMiddleware,
  [query('weekStart').isISO8601().withMessage('Valid week start date required')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const weekStart = new Date(req.query.weekStart as string);

    const pdf = await pdfReportService.generateWeeklySummary(req.user!.userId, weekStart);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-summary.pdf');
    res.send(pdf);
  })
);

export default router;
