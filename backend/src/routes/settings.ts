import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { settingsService } from '../services/settings/settingsService';

const router = Router();

/**
 * GET /api/settings
 * Get user settings
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await settingsService.getSettings(req.user!.userId);
    res.json({ success: true, data: settings });
  })
);

/**
 * PUT /api/settings
 * Update user settings
 */
router.put(
  '/',
  authMiddleware,
  [
    body('units').optional().isIn(['METRIC', 'IMPERIAL']),
    body('weekStartDay').optional().isInt({ min: 0, max: 6 }),
    body('timezone').optional().isString(),
    body('emailDigest').optional().isBoolean(),
    body('weeklyReport').optional().isBoolean(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createValidationError(
        errors.array().map((e) => e.msg).join(', ')
      );
    }

    const settings = await settingsService.updateSettings(
      req.user!.userId,
      req.body
    );
    res.json({ success: true, data: settings });
  })
);

export default router;
