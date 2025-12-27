import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { corosImportService } from '../services/import/corosImportService';
import { fitFileParserService } from '../services/activities/fitParser';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for larger files
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
 * POST /api/import/coros/csv
 * Import activities from COROS CSV export
 */
router.post(
  '/coros/csv',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw createValidationError('No file uploaded');
    }

    // Validate file type
    const fileName = req.file.originalname.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      throw createValidationError('Only CSV files are accepted');
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await corosImportService.importFromCSV(req.user!.userId, csvContent);

    res.json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors.slice(0, 10) : [], // Limit error messages
        message: `Successfully imported ${result.imported} activities, skipped ${result.skipped} duplicates`,
      },
    });
  })
);

/**
 * POST /api/import/fit
 * Import activities from FIT file (works for COROS, Garmin, Wahoo, etc.)
 */
router.post(
  '/fit',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw createValidationError('No file uploaded');
    }

    // Validate file type
    const fileName = req.file.originalname.toLowerCase();
    if (!fileName.endsWith('.fit')) {
      throw createValidationError('Only FIT files are accepted');
    }

    try {
      const activityId = await fitFileParserService.importFitFile(
        req.user!.userId,
        req.file.buffer,
        req.file.originalname
      );

      res.status(201).json({
        success: true,
        data: {
          activityId,
          message: 'FIT file imported successfully',
        },
      });
    } catch (error) {
      logger.error('FIT import failed:', error);
      throw createValidationError((error as Error).message);
    }
  })
);

/**
 * POST /api/import/fit/batch
 * Import multiple FIT files at once
 */
router.post(
  '/fit/batch',
  authMiddleware,
  upload.array('files', 50), // Max 50 files
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw createValidationError('No files uploaded');
    }

    const results = {
      imported: [] as string[],
      failed: [] as { file: string; error: string }[],
    };

    for (const file of files) {
      const fileName = file.originalname.toLowerCase();
      if (!fileName.endsWith('.fit')) {
        results.failed.push({
          file: file.originalname,
          error: 'Not a FIT file',
        });
        continue;
      }

      try {
        const activityId = await fitFileParserService.importFitFile(
          req.user!.userId,
          file.buffer,
          file.originalname
        );
        results.imported.push(activityId);
      } catch (error) {
        results.failed.push({
          file: file.originalname,
          error: (error as Error).message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        imported: results.imported.length,
        failed: results.failed.length,
        activityIds: results.imported,
        errors: results.failed,
      },
    });
  })
);

/**
 * POST /api/import/gpx
 * Import activity from GPX file
 * Note: GPX has less data than FIT, so metrics may be limited
 */
router.post(
  '/gpx',
  authMiddleware,
  upload.single('file'),
  [
    body('sportType')
      .optional()
      .isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'])
      .withMessage('Valid sport type required if provided'),
    body('name').optional().isString().withMessage('Name must be a string'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw createValidationError('No file uploaded');
    }

    const fileName = req.file.originalname.toLowerCase();
    if (!fileName.endsWith('.gpx')) {
      throw createValidationError('Only GPX files are accepted');
    }

    // GPX parsing would go here
    // For now, return not implemented
    res.status(501).json({
      success: false,
      message: 'GPX import is not yet implemented. Please export as FIT file instead.',
    });
  })
);

/**
 * GET /api/import/stats
 * Get import statistics
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await corosImportService.getImportStats(req.user!.userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/import/supported
 * Get list of supported import formats and devices
 */
router.get(
  '/supported',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        devices: [
          { name: 'COROS', formats: ['FIT', 'CSV'], notes: 'Export from COROS Training Hub' },
          { name: 'Garmin', formats: ['FIT'], notes: 'Export from Garmin Connect' },
          { name: 'Wahoo', formats: ['FIT'], notes: 'Export from Wahoo app or device' },
          { name: 'Polar', formats: ['FIT'], notes: 'Export from Polar Flow' },
          { name: 'Suunto', formats: ['FIT'], notes: 'Export from Suunto app' },
          { name: 'Zwift', formats: ['FIT'], notes: 'Export from Zwift' },
          { name: 'TrainerRoad', formats: ['FIT'], notes: 'Export from TrainerRoad' },
        ],
        formats: [
          { format: 'FIT', description: 'Flexible and Interoperable Data Transfer protocol - Full activity data with streams' },
          { format: 'CSV', description: 'Comma-separated values - Basic activity summaries (COROS only)' },
        ],
        notes: [
          'FIT files provide the most complete data including GPS, HR, power, and running dynamics',
          'CSV imports will not include GPS tracks or detailed stream data',
          'Duplicate activities (same time and sport) are automatically skipped',
        ],
      },
    });
  })
);

export default router;
