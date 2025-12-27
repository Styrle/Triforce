import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock services before importing routes
jest.mock('../../src/services/strength', () => ({
  strengthService: {
    getStrengthProfile: jest.fn().mockResolvedValue({
      id: 'profile-1',
      userId: 'test-user-id',
      strengthScore: 60,
      symmetryScore: 85,
      classification: 'intermediate',
      lifts: [],
      muscleScores: [
        { muscleGroup: 'CHEST', score: 60, classification: 'intermediate', percentDeviation: 0 },
        { muscleGroup: 'LATS', score: 55, classification: 'intermediate', percentDeviation: -8 },
      ],
      imbalances: [],
      recommendations: ['Focus on maintaining balanced development.'],
      categoryScores: {
        squat: 65,
        floorPull: 60,
        horizPress: 55,
        vertPress: 50,
        pull: 58,
      },
    }),
    recordLift: jest.fn().mockResolvedValue({
      id: 'lift-1',
      liftType: 'BACK_SQUAT',
      weight: 100,
      reps: 5,
      bodyweight: 80,
      estimated1RM: 113,
      strengthScore: 55,
      classification: 'intermediate',
      performedAt: new Date(),
      isBodyweight: false,
      addedWeight: null,
    }),
    getLiftHistory: jest.fn().mockResolvedValue([]),
    deleteLift: jest.fn().mockResolvedValue(true),
    getStandards: jest.fn().mockResolvedValue({
      standards: {
        liftType: 'BACK_SQUAT',
        sex: 'MALE',
        bodyweight: 80,
        untrained: 50,
        beginner: 80,
        intermediate: 115,
        proficient: 145,
        advanced: 175,
        exceptional: 205,
        elite: 235,
      },
      userBest: null,
      currentLevel: null,
    }),
    getProgressChart: jest.fn().mockResolvedValue([]),
  },
  oneRepMaxCalculator: {
    calculate1RM: jest.fn().mockReturnValue(113),
    calculateDetailed: jest.fn().mockReturnValue({
      estimated1RM: 113,
      brzycki: 112.5,
      epley: 116.67,
      lander: 112.05,
      lombardi: 115.93,
      mayhew: 114.26,
      oconner: 111.67,
      wathan: 114.81,
    }),
    getRepRanges: jest.fn().mockReturnValue([
      { percentage: 100, weight: 113, repRange: '1' },
      { percentage: 95, weight: 107, repRange: '2-3' },
      { percentage: 90, weight: 102, repRange: '4-5' },
      { percentage: 85, weight: 96, repRange: '6-8' },
      { percentage: 80, weight: 90, repRange: '8-10' },
      { percentage: 75, weight: 85, repRange: '10-12' },
      { percentage: 70, weight: 79, repRange: '12-15' },
    ]),
    brzycki: jest.fn().mockReturnValue(112.5),
    epley: jest.fn().mockReturnValue(116.67),
    calculateRepsAtWeight: jest.fn().mockReturnValue(8),
    calculateBodyweight1RM: jest.fn().mockReturnValue({
      total1RM: 116,
      addedWeight1RM: 36,
    }),
  },
  strengthStandardsService: {
    getStrengthStandards: jest.fn().mockReturnValue({
      liftType: 'BACK_SQUAT',
      sex: 'MALE',
      bodyweight: 80,
      untrained: 50,
      beginner: 80,
      intermediate: 115,
      proficient: 145,
      advanced: 175,
      exceptional: 205,
      elite: 235,
    }),
    calculateStrengthScore: jest.fn().mockReturnValue({
      score: 55,
      classification: 'intermediate',
      bwRatio: 1.25,
      nextLevel: 'proficient',
      toNextLevel: 30,
    }),
    isBodyweightLift: jest.fn().mockImplementation((lift: string) =>
      ['PULL_UP', 'CHIN_UP', 'DIP'].includes(lift)
    ),
    getLiftCategory: jest.fn().mockImplementation((lift: string) => {
      const categories: Record<string, string> = {
        BACK_SQUAT: 'squat',
        FRONT_SQUAT: 'squat',
        DEADLIFT: 'floor_pull',
        BENCH_PRESS: 'horizontal_press',
        OVERHEAD_PRESS: 'vertical_press',
        PULL_UP: 'pull',
      };
      return categories[lift] || 'other';
    }),
  },
  muscleAnalysisService: {
    getMuscleContributions: jest.fn().mockReturnValue([
      { muscleGroup: 'CHEST', percentage: 40 },
      { muscleGroup: 'TRICEPS', percentage: 30 },
      { muscleGroup: 'FRONT_DELTS', percentage: 30 },
    ]),
    calculateMuscleGroupScores: jest.fn().mockReturnValue([
      { muscleGroup: 'CHEST', score: 60, classification: 'intermediate', percentDeviation: 0 },
    ]),
    identifyImbalances: jest.fn().mockReturnValue([]),
    calculateSymmetryScore: jest.fn().mockReturnValue(85),
  },
  OneRepMaxCalculator: jest.fn(),
  StrengthStandardsService: jest.fn(),
  MuscleAnalysisService: jest.fn(),
  StrengthService: jest.fn(),
}));

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  }),
  AuthRequest: jest.fn(),
}));

// Now import routes after mocks are set up
import strengthRoutes from '../../src/routes/strength';

describe('Strength Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/strength', strengthRoutes);
    app.use(errorHandler);
  });

  describe('GET /api/strength/profile', () => {
    it('should return strength profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/strength/profile')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/strength/lifts', () => {
    it('should record a new lift', async () => {
      const response = await request(app)
        .post('/api/strength/lifts')
        .set('Authorization', 'Bearer test-token')
        .send({
          liftType: 'BACK_SQUAT',
          weight: 100,
          reps: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estimated1RM');
      expect(response.body.data).toHaveProperty('strengthScore');
      expect(response.body.data).toHaveProperty('classification');
    });

    it('should validate lift type', async () => {
      const response = await request(app)
        .post('/api/strength/lifts')
        .set('Authorization', 'Bearer test-token')
        .send({
          liftType: 'INVALID_LIFT',
          weight: 100,
          reps: 5,
        });

      expect(response.status).toBe(400);
    });

    it('should validate reps range', async () => {
      const response = await request(app)
        .post('/api/strength/lifts')
        .set('Authorization', 'Bearer test-token')
        .send({
          liftType: 'BACK_SQUAT',
          weight: 100,
          reps: 100, // Too many
        });

      expect(response.status).toBe(400);
    });

    it('should accept bodyweight lift with added weight', async () => {
      const response = await request(app)
        .post('/api/strength/lifts')
        .set('Authorization', 'Bearer test-token')
        .send({
          liftType: 'PULL_UP',
          weight: 80,
          reps: 8,
          isBodyweight: true,
          addedWeight: 20,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/strength/lifts', () => {
    it('should return lift history', async () => {
      const response = await request(app)
        .get('/api/strength/lifts')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by lift type', async () => {
      const response = await request(app)
        .get('/api/strength/lifts?type=BACK_SQUAT')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });

    it('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/strength/lifts?limit=10')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/strength/standards/:liftType', () => {
    it('should return standards for a lift type', async () => {
      const response = await request(app)
        .get('/api/strength/standards/BACK_SQUAT')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('standards');
    });

    it('should reject invalid lift type', async () => {
      const response = await request(app)
        .get('/api/strength/standards/INVALID_LIFT')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/strength/calculate-1rm', () => {
    it('should calculate 1RM from weight and reps', async () => {
      const response = await request(app)
        .post('/api/strength/calculate-1rm')
        .set('Authorization', 'Bearer test-token')
        .send({
          weight: 100,
          reps: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estimated1RM');
      expect(response.body.data).toHaveProperty('brzycki');
      expect(response.body.data).toHaveProperty('epley');
      expect(response.body.data).toHaveProperty('repRanges');
    });

    it('should validate input', async () => {
      const response = await request(app)
        .post('/api/strength/calculate-1rm')
        .set('Authorization', 'Bearer test-token')
        .send({
          weight: 0,
          reps: 5,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/strength/muscles', () => {
    it('should return muscle group analysis', async () => {
      const response = await request(app)
        .get('/api/strength/muscles')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('muscleScores');
      expect(response.body.data).toHaveProperty('imbalances');
      expect(response.body.data).toHaveProperty('recommendations');
    });
  });

  describe('GET /api/strength/progress/:liftType', () => {
    it('should return progress data for a lift', async () => {
      const response = await request(app)
        .get('/api/strength/progress/BENCH_PRESS')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/strength/progress/BENCH_PRESS?days=60')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/strength/recommendations', () => {
    it('should return training recommendations', async () => {
      const response = await request(app)
        .get('/api/strength/recommendations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
    });
  });

  describe('GET /api/strength/lift-types', () => {
    it('should return all available lift types', async () => {
      const response = await request(app)
        .get('/api/strength/lift-types')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      response.body.data.forEach((lift: any) => {
        expect(lift).toHaveProperty('type');
        expect(lift).toHaveProperty('category');
        expect(lift).toHaveProperty('isBodyweight');
        expect(lift).toHaveProperty('muscles');
      });
    });
  });
});
