import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { gearService } from '../services/gear/gearService';

const router = Router();

// Valid gear types from Prisma schema
const VALID_GEAR_TYPES = [
  'BIKE',
  'BIKE_SHOES',
  'RUN_SHOES',
  'WETSUIT',
  'GOGGLES',
  'HELMET',
  'POWER_METER',
  'HR_MONITOR',
  'GPS_WATCH',
  'OTHER',
];

// Valid sport types from Prisma schema
const VALID_SPORT_TYPES = ['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'];

/**
 * GET /api/gear
 * List all gear
 */
router.get(
  '/',
  authMiddleware,
  [query('includeRetired').optional().isBoolean()],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeRetired = req.query.includeRetired === 'true';
    const gear = await gearService.getGear(req.user!.userId, includeRetired);
    res.json({ success: true, data: gear });
  })
);

/**
 * GET /api/gear/warnings
 * Get gear nearing retirement thresholds
 */
router.get(
  '/warnings',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const gear = await gearService.getGearNearingRetirement(req.user!.userId);
    res.json({ success: true, data: gear });
  })
);

/**
 * GET /api/gear/:id
 * Get single gear item
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const gear = await gearService.getGearById(req.user!.userId, req.params.id);
    if (!gear) {
      throw createNotFoundError('Gear');
    }
    res.json({ success: true, data: gear });
  })
);

/**
 * POST /api/gear
 * Create new gear
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('gearType')
      .notEmpty()
      .isIn(VALID_GEAR_TYPES)
      .withMessage('Invalid gear type'),
    body('brand').optional().isString(),
    body('model').optional().isString(),
    body('sportType').optional().isIn(VALID_SPORT_TYPES),
    body('purchaseDate').optional().isISO8601(),
    body('purchasePrice').optional().isFloat({ min: 0 }),
    body('maxDistance').optional().isFloat({ min: 0 }),
    body('maxDuration').optional().isInt({ min: 0 }),
    body('notes').optional().isString(),
    body('isDefault').optional().isBoolean(),
    body('imageUrl').optional().isURL(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const gear = await gearService.createGear(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: gear });
  })
);

/**
 * PUT /api/gear/:id
 * Update gear
 */
router.put(
  '/:id',
  authMiddleware,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('gearType').optional().isIn(VALID_GEAR_TYPES),
    body('brand').optional().isString(),
    body('model').optional().isString(),
    body('sportType').optional().isIn(VALID_SPORT_TYPES),
    body('purchaseDate').optional().isISO8601(),
    body('purchasePrice').optional().isFloat({ min: 0 }),
    body('maxDistance').optional().isFloat({ min: 0 }),
    body('maxDuration').optional().isInt({ min: 0 }),
    body('notes').optional().isString(),
    body('isDefault').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('imageUrl').optional().isURL(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const gear = await gearService.updateGear(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.json({ success: true, data: gear });
  })
);

/**
 * DELETE /api/gear/:id
 * Delete gear
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await gearService.deleteGear(req.user!.userId, req.params.id);
    res.json({ success: true, data: { message: 'Gear deleted' } });
  })
);

/**
 * POST /api/gear/:id/maintenance
 * Add maintenance record
 */
router.post(
  '/:id/maintenance',
  authMiddleware,
  [
    body('maintenanceType').notEmpty().withMessage('Maintenance type is required'),
    body('notes').optional().isString(),
    body('cost').optional().isFloat({ min: 0 }),
    body('date').optional().isISO8601(),
    body('nextDueDistance').optional().isFloat({ min: 0 }),
    body('nextDueDate').optional().isISO8601(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const maintenance = await gearService.addMaintenance(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.status(201).json({ success: true, data: maintenance });
  })
);

/**
 * POST /api/gear/:id/retire
 * Retire a gear item
 */
router.post(
  '/:id/retire',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const gear = await gearService.updateGear(req.user!.userId, req.params.id, {
      isActive: false,
    });
    res.json({ success: true, data: gear });
  })
);

/**
 * POST /api/gear/:id/reactivate
 * Reactivate a retired gear item
 */
router.post(
  '/:id/reactivate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const gear = await gearService.updateGear(req.user!.userId, req.params.id, {
      isActive: true,
    });
    res.json({ success: true, data: gear });
  })
);

export default router;
