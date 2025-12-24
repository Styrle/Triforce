import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { activityService } from '../services/activities/activityService';
import { activitySyncService } from '../services/activities/syncService';
import { fitFileParserService } from '../services/activities/fitParser';
import { jobQueueService } from '../services/jobs/queueService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { stravaSyncLimiter } from '../middleware/rateLimiter';
import { SportType } from '@prisma/client';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.fit')) {
      cb(null, true);
    } else {
      cb(new Error('Only .FIT files are allowed'));
    }
  },
});

// Validation middleware
const validateRequest = (req: AuthRequest, res: Response, next: () => void) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(
      errors.array().map((e) => e.msg).join(', ')
    );
  }
  next();
};

/**
 * GET /api/activities
 * Get activities with filters and pagination
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sportType').optional().isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      sportType: req.query.sportType as SportType | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const result = await activityService.getActivities(
      req.user!.userId,
      filters,
      {
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
    );

    res.json({
      success: true,
      data: result.activities,
      meta: result.meta,
    });
  })
);

/**
 * GET /api/activities/recent
 * Get recent activities
 */
router.get(
  '/recent',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await activityService.getRecentActivities(req.user!.userId, limit);

    res.json({
      success: true,
      data: activities,
    });
  })
);

/**
 * GET /api/activities/stats
 * Get activity statistics by sport type
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await activityService.getActivityStats(req.user!.userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * POST /api/activities/sync
 * Trigger Strava sync
 */
router.post(
  '/sync',
  authMiddleware,
  stravaSyncLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fullSync } = req.body;

    // Queue the sync job
    const job = await jobQueueService.queueActivitySync(req.user!.userId, {
      fullSync: !!fullSync,
    });

    res.json({
      success: true,
      data: {
        message: 'Sync started',
        jobId: job.id,
      },
    });
  })
);

/**
 * POST /api/activities/upload
 * Upload FIT file
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw createValidationError('No file uploaded');
    }

    const activityId = await fitFileParserService.importFitFile(
      req.user!.userId,
      req.file.buffer,
      req.file.originalname
    );

    const activity = await activityService.getActivity(activityId, req.user!.userId);

    res.status(201).json({
      success: true,
      data: activity,
    });
  })
);

/**
 * POST /api/activities
 * Create manual activity
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('sportType')
      .isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'])
      .withMessage('Valid sport type is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('elapsedTime').isInt({ min: 1 }).withMessage('Elapsed time is required'),
    body('movingTime').isInt({ min: 1 }).withMessage('Moving time is required'),
    body('distance').optional().isFloat({ min: 0 }),
    body('totalElevation').optional().isFloat({ min: 0 }),
    body('avgHeartRate').optional().isInt({ min: 30, max: 250 }),
    body('maxHeartRate').optional().isInt({ min: 30, max: 250 }),
    body('avgPower').optional().isInt({ min: 0 }),
    body('maxPower').optional().isInt({ min: 0 }),
    body('avgSpeed').optional().isFloat({ min: 0 }),
    body('avgCadence').optional().isInt({ min: 0 }),
    body('tss').optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const activity = await activityService.createActivity(req.user!.userId, {
      ...req.body,
      startDate: new Date(req.body.startDate),
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  })
);

/**
 * GET /api/activities/:id
 * Get single activity
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const activity = await activityService.getActivity(
      req.params.id,
      req.user!.userId
    );

    if (!activity) {
      throw createNotFoundError('Activity');
    }

    res.json({
      success: true,
      data: activity,
    });
  })
);

/**
 * PUT /api/activities/:id
 * Update activity
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').notEmpty(),
    body('name').optional().notEmpty(),
    body('sportType').optional().isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER']),
    body('startDate').optional().isISO8601(),
    body('elapsedTime').optional().isInt({ min: 1 }),
    body('movingTime').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const updateData = { ...req.body };
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }

    const activity = await activityService.updateActivity(
      req.params.id,
      req.user!.userId,
      updateData
    );

    if (!activity) {
      throw createNotFoundError('Activity');
    }

    res.json({
      success: true,
      data: activity,
    });
  })
);

/**
 * DELETE /api/activities/:id
 * Delete activity
 */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await activityService.deleteActivity(
      req.params.id,
      req.user!.userId
    );

    if (!deleted) {
      throw createNotFoundError('Activity');
    }

    res.json({
      success: true,
      data: { message: 'Activity deleted' },
    });
  })
);

/**
 * GET /api/activities/:id/streams
 * Get activity streams (time series data)
 */
router.get(
  '/:id/streams',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const streams = await activityService.getActivityStreams(
      req.params.id,
      req.user!.userId
    );

    if (!streams) {
      throw createNotFoundError('Activity streams');
    }

    res.json({
      success: true,
      data: streams,
    });
  })
);

/**
 * GET /api/activities/:id/splits
 * Get activity splits
 */
router.get(
  '/:id/splits',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const splits = await activityService.getActivitySplits(
      req.params.id,
      req.user!.userId
    );

    if (!splits) {
      throw createNotFoundError('Activity splits');
    }

    res.json({
      success: true,
      data: splits,
    });
  })
);

export default router;
