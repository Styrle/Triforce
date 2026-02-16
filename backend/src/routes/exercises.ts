import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { customExerciseService } from '../services/exercises/customExerciseService';

const router = Router();

/**
 * GET /api/exercises
 * Get all custom exercises for the authenticated user
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exercises = await customExerciseService.getExercises(req.user!.userId);
    res.json({ success: true, data: exercises });
  })
);

/**
 * GET /api/exercises/combined
 * Get combined predefined + custom exercise list
 */
router.get(
  '/combined',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exercises = await customExerciseService.getCombinedExerciseList(req.user!.userId);
    res.json({ success: true, data: exercises });
  })
);

/**
 * POST /api/exercises
 * Create a new custom exercise
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, category, equipment, isBodyweight, muscleContributions } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Exercise name is required' });
      return;
    }

    const exercise = await customExerciseService.createExercise(req.user!.userId, {
      name: name.trim(),
      description,
      category,
      equipment,
      isBodyweight,
      muscleContributions,
    });
    res.status(201).json({ success: true, data: exercise });
  })
);

/**
 * PUT /api/exercises/:id
 * Update a custom exercise
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exercise = await customExerciseService.updateExercise(
      req.user!.userId,
      req.params.id,
      req.body
    );
    res.json({ success: true, data: exercise });
  })
);

/**
 * DELETE /api/exercises/:id
 * Soft delete (deactivate) a custom exercise
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await customExerciseService.deleteExercise(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Exercise deactivated' });
  })
);

export default router;
