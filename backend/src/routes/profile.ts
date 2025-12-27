import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { profileService } from '../services/profile/profileService';

const router = Router();

/**
 * GET /api/profile
 * Get athlete profile
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await profileService.getProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  })
);

/**
 * PUT /api/profile
 * Update athlete profile
 */
router.put(
  '/',
  authMiddleware,
  [
    body('dateOfBirth').optional().isISO8601(),
    body('sex').optional().isIn(['MALE', 'FEMALE']),
    body('height').optional().isFloat({ min: 50, max: 250 }),
    body('weight').optional().isFloat({ min: 20, max: 300 }),
    body('ftp').optional().isInt({ min: 50, max: 600 }),
    body('lthr').optional().isInt({ min: 100, max: 220 }),
    body('thresholdPace').optional().isFloat({ min: 1, max: 10 }),
    body('css').optional().isFloat({ min: 0.5, max: 3 }),
    body('maxHr').optional().isInt({ min: 120, max: 250 }),
    body('restingHr').optional().isInt({ min: 30, max: 100 }),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const profile = await profileService.updateProfile(
      req.user!.userId,
      req.body
    );
    res.json({ success: true, data: profile });
  })
);

/**
 * POST /api/profile/calculate-zones
 * Recalculate zones from thresholds
 */
router.post(
  '/calculate-zones',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await profileService.calculateAndSaveZones(req.user!.userId);
    res.json({ success: true, data: profile });
  })
);

export default router;
