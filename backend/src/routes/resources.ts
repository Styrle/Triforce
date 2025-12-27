import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { resourceService } from '../services/resources/resourceService';

const router = Router();

// Valid resource categories from Prisma schema
const VALID_CATEGORIES = [
  'DRILL',
  'STRETCH',
  'WARMUP',
  'COOLDOWN',
  'STRENGTH_EXERCISE',
  'MOBILITY',
  'RECOVERY',
  'TECHNIQUE_VIDEO',
  'TUTORIAL',
];

// Valid sport types from Prisma schema
const VALID_SPORT_TYPES = ['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'];

// Valid difficulty levels
const VALID_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

// Valid content types
const VALID_CONTENT_TYPES = ['VIDEO', 'IMAGE', 'TEXT', 'INTERACTIVE'];

/**
 * GET /api/resources
 * List resources with filtering
 */
router.get(
  '/',
  optionalAuthMiddleware,
  [
    query('category').optional().isIn(VALID_CATEGORIES),
    query('sportType').optional().isIn(VALID_SPORT_TYPES),
    query('difficulty').optional().isIn(VALID_DIFFICULTIES),
    query('tags').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      category,
      sportType,
      difficulty,
      tags,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await resourceService.getResources(
      {
        category: category as any,
        sportType: sportType as any,
        difficulty: difficulty as any,
        tags: tags ? (tags as string).split(',') : undefined,
        search: search as string,
      },
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/resources/categories
 * Get categories with resource counts
 */
router.get(
  '/categories',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const categories = await resourceService.getCategoryCounts();
    res.json({ success: true, data: categories });
  })
);

/**
 * GET /api/resources/:id
 * Get single resource
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const resource = await resourceService.getResource(req.params.id);
    if (!resource) {
      throw createNotFoundError('Resource');
    }
    res.json({ success: true, data: resource });
  })
);

/**
 * POST /api/resources
 * Create new resource (authenticated)
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category')
      .notEmpty()
      .isIn(VALID_CATEGORIES)
      .withMessage('Invalid category'),
    body('contentType')
      .notEmpty()
      .isIn(VALID_CONTENT_TYPES)
      .withMessage('Invalid content type'),
    body('sportType').optional().isIn(VALID_SPORT_TYPES),
    body('difficulty').optional().isIn(VALID_DIFFICULTIES),
    body('description').optional().isString(),
    body('subcategory').optional().isString(),
    body('tags').optional().isArray(),
    body('content').optional().isString(),
    body('videoUrl').optional().isURL(),
    body('imageUrl').optional().isURL(),
    body('duration').optional().isInt({ min: 0 }),
    body('instructions').optional().isString(),
    body('cues').optional().isArray(),
    body('equipment').optional().isArray(),
    body('targetAreas').optional().isArray(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const resource = await resourceService.createResource({
      ...req.body,
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: resource });
  })
);

// ============ ROUTINES ============

/**
 * GET /api/resources/routines/list
 * List user's routines
 */
router.get(
  '/routines/list',
  authMiddleware,
  [query('category').optional().isIn(VALID_CATEGORIES)],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category } = req.query;
    const routines = await resourceService.getRoutines(
      req.user!.userId,
      category as any
    );
    res.json({ success: true, data: routines });
  })
);

/**
 * GET /api/resources/routines/:id
 * Get single routine
 */
router.get(
  '/routines/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const routine = await resourceService.getRoutine(req.params.id);
    if (!routine) {
      throw createNotFoundError('Routine');
    }
    res.json({ success: true, data: routine });
  })
);

/**
 * GET /api/resources/routines/:id/player
 * Get routine data formatted for workout player
 */
router.get(
  '/routines/:id/player',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const playerData = await resourceService.getRoutineForPlayer(req.params.id);
    if (!playerData) {
      throw createNotFoundError('Routine');
    }
    res.json({ success: true, data: playerData });
  })
);

/**
 * POST /api/resources/routines
 * Create new routine
 */
router.post(
  '/routines',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category')
      .notEmpty()
      .isIn(VALID_CATEGORIES)
      .withMessage('Invalid category'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('sportType').optional().isIn(VALID_SPORT_TYPES),
    body('description').optional().isString(),
    body('items.*.resourceId').optional().isString(),
    body('items.*.customName').optional().isString(),
    body('items.*.customDuration').optional().isInt({ min: 0 }),
    body('items.*.reps').optional().isInt({ min: 0 }),
    body('items.*.sets').optional().isInt({ min: 1 }),
    body('items.*.restBetweenSets').optional().isInt({ min: 0 }),
    body('items.*.customInstructions').optional().isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const routine = await resourceService.createRoutine(
      req.user!.userId,
      req.body
    );
    res.status(201).json({ success: true, data: routine });
  })
);

/**
 * PUT /api/resources/routines/:id
 * Update routine
 */
router.put(
  '/routines/:id',
  authMiddleware,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('sportType').optional().isIn(VALID_SPORT_TYPES),
    body('description').optional().isString(),
    body('items').optional().isArray({ min: 1 }),
    body('items.*.resourceId').optional().isString(),
    body('items.*.customName').optional().isString(),
    body('items.*.customDuration').optional().isInt({ min: 0 }),
    body('items.*.reps').optional().isInt({ min: 0 }),
    body('items.*.sets').optional().isInt({ min: 1 }),
    body('items.*.restBetweenSets').optional().isInt({ min: 0 }),
    body('items.*.customInstructions').optional().isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    try {
      const routine = await resourceService.updateRoutine(
        req.user!.userId,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: routine });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        throw createNotFoundError('Routine');
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/resources/routines/:id
 * Delete routine
 */
router.delete(
  '/routines/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await resourceService.deleteRoutine(req.user!.userId, req.params.id);
      res.json({ success: true, data: { message: 'Routine deleted' } });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        throw createNotFoundError('Routine');
      }
      throw error;
    }
  })
);

export default router;
