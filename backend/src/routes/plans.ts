import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  asyncHandler,
  createNotFoundError,
  createValidationError,
} from '../middleware/errorHandler';
import { planBuilderService } from '../services/plans/planBuilderService';
import { complianceService } from '../services/plans/complianceService';
import { prisma } from '../config/database';

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
 * GET /api/plans
 * List user's training plans
 */
router.get(
  '/',
  authMiddleware,
  [query('status').optional().isIn(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;
    const plans = await planBuilderService.getUserPlans(req.user!.userId, status as string);

    res.json({
      success: true,
      data: plans,
    });
  })
);

/**
 * GET /api/plans/workouts/upcoming
 * Get upcoming planned workouts (must be before /:id to avoid route conflict)
 */
router.get(
  '/workouts/upcoming',
  authMiddleware,
  [query('days').optional().isInt({ min: 1, max: 30 })],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const workouts = await prisma.plannedWorkout.findMany({
      where: {
        userId: req.user!.userId,
        scheduledDate: {
          gte: new Date(),
          lte: endDate,
        },
        status: 'PLANNED',
      },
      include: {
        plan: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 14,
    });

    res.json({
      success: true,
      data: workouts,
    });
  })
);

/**
 * GET /api/plans/compliance/summary
 * Get compliance summary for dashboard
 */
router.get(
  '/compliance/summary',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await complianceService.getComplianceSummary(req.user!.userId);

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET /api/plans/:id
 * Get a single training plan with all details
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await planBuilderService.getPlanById(req.params.id);

    if (!plan || plan.userId !== req.user!.userId) {
      throw createNotFoundError('Plan not found');
    }

    res.json({
      success: true,
      data: plan,
    });
  })
);

/**
 * POST /api/plans
 * Create a new training plan
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('planType')
      .isIn([
        'SPRINT_TRI',
        'OLYMPIC_TRI',
        'HALF_IRONMAN',
        'IRONMAN',
        'MARATHON',
        'HALF_MARATHON',
        'CENTURY',
        'GENERAL_FITNESS',
        'CUSTOM',
      ])
      .withMessage('Invalid plan type'),
    body('targetDate').isISO8601().withMessage('Target date must be a valid date'),
    body('weeksAvailable')
      .isInt({ min: 4, max: 52 })
      .withMessage('Weeks must be between 4-52'),
    body('weeklyHoursMin')
      .isFloat({ min: 1, max: 40 })
      .withMessage('Min hours must be 1-40'),
    body('weeklyHoursMax')
      .isFloat({ min: 1, max: 50 })
      .withMessage('Max hours must be 1-50'),
    body('periodization')
      .optional()
      .isIn(['LINEAR', 'BLOCK', 'POLARIZED', 'PYRAMIDAL', 'REVERSE_LINEAR']),
    body('description').optional().isString(),
    body('targetEvent').optional().isString(),
    body('currentFitness').optional().isFloat({ min: 0, max: 150 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      name,
      planType,
      targetDate,
      weeksAvailable,
      weeklyHoursMin,
      weeklyHoursMax,
      periodization,
      description,
      targetEvent,
      currentFitness,
    } = req.body;

    // Validate hours range
    if (weeklyHoursMin > weeklyHoursMax) {
      throw createValidationError('Min hours cannot exceed max hours');
    }

    const plan = await planBuilderService.createPlan(req.user!.userId, {
      name,
      planType,
      targetDate: new Date(targetDate),
      weeksAvailable,
      weeklyHoursMin,
      weeklyHoursMax,
      periodization: periodization || 'LINEAR',
      description,
      targetEvent,
      currentFitness,
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  })
);

/**
 * PUT /api/plans/:id
 * Update a training plan
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isString().notEmpty(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('targetEvent').optional().isString(),
    body('targetDate').optional().isISO8601(),
    body('weeklyHoursMin').optional().isFloat({ min: 1, max: 40 }),
    body('weeklyHoursMax').optional().isFloat({ min: 1, max: 50 }),
    body('status')
      .optional()
      .isIn(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, targetEvent, targetDate, weeklyHoursMin, weeklyHoursMax, status } =
      req.body;

    const plan = await planBuilderService.updatePlan(req.user!.userId, req.params.id, {
      name,
      description,
      targetEvent,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      weeklyHoursMin,
      weeklyHoursMax,
      status,
    });

    res.json({
      success: true,
      data: plan,
    });
  })
);

/**
 * DELETE /api/plans/:id
 * Delete a training plan
 */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await planBuilderService.deletePlan(req.user!.userId, req.params.id);

    res.json({
      success: true,
      data: { message: 'Plan deleted successfully' },
    });
  })
);

/**
 * GET /api/plans/:id/compliance
 * Get compliance metrics for a plan
 */
router.get(
  '/:id/compliance',
  authMiddleware,
  [param('id').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!plan) {
      throw createNotFoundError('Plan not found');
    }

    const compliance = await complianceService.calculateCompliance(req.params.id);

    res.json({
      success: true,
      data: compliance,
    });
  })
);

/**
 * POST /api/plans/:id/match-activities
 * Auto-match activities to planned workouts
 */
router.post(
  '/:id/match-activities',
  authMiddleware,
  [param('id').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!plan) {
      throw createNotFoundError('Plan not found');
    }

    const result = await complianceService.matchActivitiesToWorkouts(
      req.user!.userId,
      plan.startDate,
      plan.endDate
    );

    res.json({
      success: true,
      data: {
        message: 'Activities matched successfully',
        ...result,
      },
    });
  })
);

/**
 * GET /api/plans/:id/weeks/:weekNumber
 * Get a specific week from a plan
 */
router.get(
  '/:id/weeks/:weekNumber',
  authMiddleware,
  [
    param('id').isString().notEmpty(),
    param('weekNumber').isInt({ min: 1 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const plan = await prisma.trainingPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!plan) {
      throw createNotFoundError('Plan not found');
    }

    const week = await planBuilderService.getPlanWeek(
      req.params.id,
      parseInt(req.params.weekNumber)
    );

    if (!week) {
      throw createNotFoundError('Week not found');
    }

    res.json({
      success: true,
      data: week,
    });
  })
);

/**
 * PUT /api/plans/workouts/:workoutId
 * Update a planned workout
 */
router.put(
  '/workouts/:workoutId',
  authMiddleware,
  [
    param('workoutId').isString().notEmpty(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('scheduledDate').optional().isISO8601(),
    body('timeOfDay').optional().isString(),
    body('targetDuration').optional().isInt({ min: 0 }),
    body('targetDistance').optional().isFloat({ min: 0 }),
    body('targetTss').optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, scheduledDate, timeOfDay, targetDuration, targetDistance, targetTss } =
      req.body;

    const workout = await planBuilderService.updatePlannedWorkout(
      req.user!.userId,
      req.params.workoutId,
      {
        name,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        timeOfDay,
        targetDuration,
        targetDistance,
        targetTss,
      }
    );

    res.json({
      success: true,
      data: workout,
    });
  })
);

/**
 * POST /api/plans/workouts/:workoutId/complete
 * Mark a workout as completed
 */
router.post(
  '/workouts/:workoutId/complete',
  authMiddleware,
  [
    param('workoutId').isString().notEmpty(),
    body('activityId').optional().isString(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { activityId } = req.body;

    await complianceService.markWorkoutCompleted(
      req.user!.userId,
      req.params.workoutId,
      activityId
    );

    res.json({
      success: true,
      data: { message: 'Workout marked as completed' },
    });
  })
);

/**
 * POST /api/plans/workouts/:workoutId/skip
 * Mark a workout as skipped
 */
router.post(
  '/workouts/:workoutId/skip',
  authMiddleware,
  [
    param('workoutId').isString().notEmpty(),
    body('reason').optional().isString(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;

    await complianceService.markWorkoutSkipped(req.user!.userId, req.params.workoutId, reason);

    res.json({
      success: true,
      data: { message: 'Workout marked as skipped' },
    });
  })
);

/**
 * GET /api/plans/templates
 * Get workout templates
 */
router.get(
  '/templates',
  authMiddleware,
  [
    query('sportType').optional().isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER']),
    query('category').optional().isString(),
    query('includePublic').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sportType, category, includePublic } = req.query;

    const templates = await prisma.workoutTemplate.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          ...(includePublic === 'true' ? [{ isPublic: true }] : []),
        ],
        ...(sportType && { sportType: sportType as any }),
        ...(category && { category: category as string }),
      },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * POST /api/plans/templates
 * Create a workout template
 */
router.post(
  '/templates',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Template name is required'),
    body('sportType').isIn(['SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER']),
    body('workoutType').optional().isString(),
    body('description').optional().isString(),
    body('estimatedDuration').optional().isInt({ min: 0 }),
    body('estimatedDistance').optional().isFloat({ min: 0 }),
    body('estimatedTss').optional().isFloat({ min: 0 }),
    body('category').optional().isString(),
    body('difficulty').optional().isString(),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean(),
    body('structure').optional().isObject(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await prisma.workoutTemplate.create({
      data: {
        userId: req.user!.userId,
        ...req.body,
        isStructured: !!req.body.structure,
      },
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  })
);

/**
 * DELETE /api/plans/templates/:templateId
 * Delete a workout template
 */
router.delete(
  '/templates/:templateId',
  authMiddleware,
  [param('templateId').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: req.params.templateId, userId: req.user!.userId },
    });

    if (!template) {
      throw createNotFoundError('Template not found');
    }

    await prisma.workoutTemplate.delete({
      where: { id: req.params.templateId },
    });

    res.json({
      success: true,
      data: { message: 'Template deleted successfully' },
    });
  })
);

export default router;
