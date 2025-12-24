import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

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
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').optional().isString().trim(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, name } = req.body;

    const result = await authService.register(email, password, name);

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post(
  '/refresh',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const token = authService.generateToken({
      id: req.user!.userId,
      email: req.user!.email,
    });

    res.json({
      success: true,
      data: { token },
    });
  })
);

/**
 * PUT /api/auth/password
 * Change password
 */
router.put(
  '/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user!.userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  })
);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('name').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, email } = req.body;

    const user = await authService.updateUser(req.user!.userId, { name, email });

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete(
  '/account',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.deleteAccount(req.user!.userId);

    res.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  })
);

export default router;
