import { Router, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { LiftType } from '@prisma/client';

// Import services
import {
  strengthService,
  oneRepMaxCalculator,
  strengthStandardsService,
  muscleAnalysisService,
} from '../services/strength';

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

// Valid lift types for validation
const LIFT_TYPES: LiftType[] = [
  'BACK_SQUAT',
  'FRONT_SQUAT',
  'DEADLIFT',
  'SUMO_DEADLIFT',
  'ROMANIAN_DEADLIFT',
  'POWER_CLEAN',
  'BENCH_PRESS',
  'INCLINE_BENCH',
  'DIP',
  'OVERHEAD_PRESS',
  'PUSH_PRESS',
  'PULL_UP',
  'CHIN_UP',
  'PENDLAY_ROW',
  'BENT_OVER_ROW',
];

/**
 * GET /api/strength/profile
 * Get user's strength profile
 */
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await strengthService.getStrengthProfile(req.user!.userId);

    res.json({
      success: true,
      data: profile,
    });
  })
);

/**
 * POST /api/strength/lifts
 * Record a new lift
 */
router.post(
  '/lifts',
  authMiddleware,
  [
    body('liftType')
      .isIn(LIFT_TYPES)
      .withMessage('Invalid lift type'),
    body('weight')
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('reps')
      .isInt({ min: 1, max: 50 })
      .withMessage('Reps must be between 1-50'),
    body('isBodyweight')
      .optional()
      .isBoolean(),
    body('addedWeight')
      .optional()
      .isFloat({ min: 0 }),
    body('performedAt')
      .optional()
      .isISO8601(),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const liftData = {
      liftType: req.body.liftType as LiftType,
      weight: parseFloat(req.body.weight),
      reps: parseInt(req.body.reps),
      isBodyweight: req.body.isBodyweight,
      addedWeight: req.body.addedWeight ? parseFloat(req.body.addedWeight) : undefined,
      performedAt: req.body.performedAt ? new Date(req.body.performedAt) : undefined,
      source: 'manual' as const,
    };

    const lift = await strengthService.recordLift(req.user!.userId, liftData);

    res.status(201).json({
      success: true,
      data: lift,
    });
  })
);

/**
 * GET /api/strength/lifts
 * Get lift history
 */
router.get(
  '/lifts',
  authMiddleware,
  [
    query('type').optional().isIn(LIFT_TYPES),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const liftType = req.query.type as LiftType | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const lifts = await strengthService.getLiftHistory(req.user!.userId, liftType, limit);

    res.json({
      success: true,
      data: lifts,
    });
  })
);

/**
 * DELETE /api/strength/lifts/:id
 * Delete a lift record
 */
router.delete(
  '/lifts/:id',
  authMiddleware,
  [param('id').isString().notEmpty()],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const success = await strengthService.deleteLift(req.user!.userId, id);

    if (!success) {
      throw createNotFoundError('Lift record');
    }

    res.json({
      success: true,
      message: 'Lift deleted successfully',
    });
  })
);

/**
 * GET /api/strength/standards/:liftType
 * Get strength standards for a specific lift
 */
router.get(
  '/standards/:liftType',
  authMiddleware,
  [param('liftType').isIn(LIFT_TYPES).withMessage('Invalid lift type')],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const liftType = req.params.liftType as LiftType;

    const result = await strengthService.getStandards(req.user!.userId, liftType);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/strength/calculate-1rm
 * Calculate 1RM from weight and reps
 */
router.post(
  '/calculate-1rm',
  authMiddleware,
  [
    body('weight').isFloat({ min: 0.1 }).withMessage('Weight must be positive'),
    body('reps').isInt({ min: 1, max: 30 }).withMessage('Reps must be between 1-30'),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const weight = parseFloat(req.body.weight);
    const reps = parseInt(req.body.reps);

    const result = oneRepMaxCalculator.calculateDetailed(weight, reps);
    const repRanges = oneRepMaxCalculator.getRepRanges(result.estimated1RM);

    res.json({
      success: true,
      data: {
        ...result,
        repRanges,
      },
    });
  })
);

/**
 * GET /api/strength/muscles
 * GET /api/strength/muscle-analysis (alias)
 * Get muscle group analysis - Symmetric Strength style
 */
const muscleAnalysisHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await strengthService.getStrengthProfile(req.user!.userId);

  if (!profile) {
    res.json({
      success: true,
      data: {
        muscleScores: [],
        imbalances: [],
        recommendations: ['Start recording lifts to see your muscle analysis.'],
        symmetryScore: null,
        balanceScore: null,
        weakPoints: [],
      },
    });
    return;
  }

  // Transform imbalances to weak points for frontend
  const weakPoints = (profile.imbalances || [])
    .filter((i: any) => i.type === 'weak')
    .map((i: any) => ({
      muscleGroup: i.muscleGroup,
      deviation: Math.abs(i.deviation),
      recommendation: i.description,
    }));

  res.json({
    success: true,
    data: {
      muscleScores: profile.muscleScores || [],
      imbalances: profile.imbalances || [],
      recommendations: profile.recommendations || [],
      symmetryScore: profile.symmetryScore,
      balanceScore: profile.symmetryScore, // Alias for frontend compatibility
      weakPoints,
    },
  });
});

router.get('/muscles', authMiddleware, muscleAnalysisHandler);
router.get('/muscle-analysis', authMiddleware, muscleAnalysisHandler);

/**
 * GET /api/strength/progress/:liftType
 * Get progress chart data for a specific lift
 */
router.get(
  '/progress/:liftType',
  authMiddleware,
  [
    param('liftType').isIn(LIFT_TYPES).withMessage('Invalid lift type'),
    query('days').optional().isInt({ min: 7, max: 365 }),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const liftType = req.params.liftType as LiftType;
    const days = parseInt(req.query.days as string) || 90;

    const progress = await strengthService.getProgressChart(req.user!.userId, liftType, days);

    res.json({
      success: true,
      data: progress,
    });
  })
);

/**
 * GET /api/strength/recommendations
 * Get training recommendations based on profile
 */
router.get(
  '/recommendations',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await strengthService.getStrengthProfile(req.user!.userId);

    if (!profile) {
      res.json({
        success: true,
        data: {
          recommendations: [
            'Start recording your lifts to get personalized recommendations.',
            'Focus on the main compound lifts: Squat, Deadlift, Bench Press, Overhead Press, and Pull-ups.',
          ],
          weakAreas: [],
          strongAreas: [],
        },
      });
      return;
    }

    // Find weak and strong areas from category scores
    const categoryNames: Record<string, string> = {
      squat: 'Squat Pattern',
      floorPull: 'Floor Pull (Deadlift)',
      horizPress: 'Horizontal Press (Bench)',
      vertPress: 'Vertical Press (Overhead)',
      pull: 'Pulling Movements',
    };

    const categories = Object.entries(profile.categoryScores)
      .filter(([_, score]) => score !== null)
      .map(([name, score]) => ({
        name: categoryNames[name],
        score: score as number,
      }))
      .sort((a, b) => b.score - a.score);

    const weakAreas = categories.slice(-2).filter((c) => c.score < 60);
    const strongAreas = categories.slice(0, 2).filter((c) => c.score >= 60);

    res.json({
      success: true,
      data: {
        recommendations: profile.recommendations,
        weakAreas,
        strongAreas,
        classification: profile.classification,
        nextSteps: getNextSteps(profile.classification),
      },
    });
  })
);

/**
 * GET /api/strength/lift-types
 * Get available lift types with info
 */
router.get(
  '/lift-types',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const liftTypes = LIFT_TYPES.map((type) => ({
      type,
      category: strengthStandardsService.getLiftCategory(type),
      isBodyweight: strengthStandardsService.isBodyweightLift(type),
      muscles: muscleAnalysisService.getMuscleContributions(type),
    }));

    res.json({
      success: true,
      data: liftTypes,
    });
  })
);

/**
 * Helper function to get next steps based on classification
 */
function getNextSteps(classification: string | null): string[] {
  const steps: Record<string, string[]> = {
    untrained: [
      'Focus on learning proper form for compound lifts',
      'Start with 2-3 full body sessions per week',
      'Progress slowly and prioritize technique',
    ],
    beginner: [
      'Follow a linear progression program',
      'Add weight each session when possible',
      'Focus on the big 5: Squat, Bench, Deadlift, OHP, Row',
    ],
    intermediate: [
      'Consider weekly or bi-weekly progression',
      'Add accessory work to address weak points',
      'Experiment with different rep ranges',
    ],
    proficient: [
      'Use periodization in your training',
      'Focus on weak points identified in your analysis',
      'Consider specialized programming',
    ],
    advanced: [
      'Fine-tune your programming for specific goals',
      'Consider competition if interested',
      'Focus on maintaining while addressing imbalances',
    ],
    exceptional: [
      'Work with a coach for competition prep',
      'Focus on technique refinements',
      'Manage fatigue and recovery carefully',
    ],
    elite: [
      'Continue working with your coaching team',
      'Focus on peak performance and competition',
      'Prioritize recovery and injury prevention',
    ],
  };

  return steps[classification || 'beginner'] || steps.beginner;
}

export default router;
