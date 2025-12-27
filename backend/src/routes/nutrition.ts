import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { nutritionService } from '../services/nutrition/nutritionService';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Valid meal types from Prisma schema
const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

/**
 * POST /api/nutrition/import
 * Import MFP CSV file
 */
router.post(
  '/import',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw createValidationError('No file uploaded');
    }

    if (!req.file.mimetype.includes('csv') && !req.file.originalname.endsWith('.csv')) {
      throw createValidationError('File must be a CSV');
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await nutritionService.importMFPCSV(req.user!.userId, csvContent);

    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/nutrition/weekly
 * Get weekly summary
 */
router.get(
  '/weekly',
  authMiddleware,
  [query('weekStart').isISO8601().withMessage('Valid week start date required')],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const weekStart = new Date(req.query.weekStart as string);
    const summary = await nutritionService.getWeeklySummary(req.user!.userId, weekStart);
    res.json({ success: true, data: summary });
  })
);

/**
 * GET /api/nutrition/range
 * Get nutrition for a date range
 */
router.get(
  '/range',
  authMiddleware,
  [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const nutrition = await nutritionService.getNutritionRange(
      req.user!.userId,
      startDate,
      endDate
    );
    res.json({ success: true, data: nutrition });
  })
);

/**
 * GET /api/nutrition/:date
 * Get daily nutrition
 */
router.get(
  '/:date',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      throw createValidationError('Invalid date format');
    }

    const nutrition = await nutritionService.getDailyNutrition(req.user!.userId, date);
    res.json({ success: true, data: nutrition });
  })
);

/**
 * POST /api/nutrition/log
 * Log a single food entry
 */
router.post(
  '/log',
  authMiddleware,
  [
    body('meal')
      .notEmpty()
      .isIn(VALID_MEAL_TYPES)
      .withMessage('Invalid meal type'),
    body('name').notEmpty().withMessage('Food name is required'),
    body('calories').isFloat({ min: 0 }).withMessage('Calories must be non-negative'),
    body('protein').isFloat({ min: 0 }).withMessage('Protein must be non-negative'),
    body('carbs').isFloat({ min: 0 }).withMessage('Carbs must be non-negative'),
    body('fat').isFloat({ min: 0 }).withMessage('Fat must be non-negative'),
    body('date').optional().isISO8601(),
    body('servings').optional().isFloat({ min: 0 }),
    body('fiber').optional().isFloat({ min: 0 }),
    body('sugar').optional().isFloat({ min: 0 }),
    body('sodium').optional().isFloat({ min: 0 }),
    body('notes').optional().isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const entryData = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };

    const result = await nutritionService.logEntry(req.user!.userId, entryData);
    res.status(201).json({ success: true, data: result });
  })
);

/**
 * DELETE /api/nutrition/entry/:id
 * Delete a nutrition entry
 */
router.delete(
  '/entry/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await nutritionService.deleteEntry(req.user!.userId, req.params.id);
      res.json({ success: true, data: { message: 'Entry deleted' } });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        throw createNotFoundError('Nutrition entry');
      }
      throw error;
    }
  })
);

/**
 * PUT /api/nutrition/targets/:date
 * Set nutrition targets for a date
 */
router.put(
  '/targets/:date',
  authMiddleware,
  [
    body('calorieTarget').optional().isFloat({ min: 0 }),
    body('proteinTarget').optional().isFloat({ min: 0 }),
    body('carbTarget').optional().isFloat({ min: 0 }),
    body('fatTarget').optional().isFloat({ min: 0 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      throw createValidationError('Invalid date format');
    }

    const result = await nutritionService.setTargets(
      req.user!.userId,
      date,
      req.body
    );
    res.json({ success: true, data: result });
  })
);

export default router;
