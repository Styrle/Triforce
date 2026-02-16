import request from 'supertest';
import express from 'express';
import workoutRoutes from '../../src/routes/workout';
import { workoutSessionService } from '../../src/services/workout/workoutSessionService';
import { workoutAnalyticsService } from '../../src/services/workout/workoutAnalytics';

// Mock services
jest.mock('../../src/services/workout/workoutSessionService');
jest.mock('../../src/services/workout/workoutAnalytics');

// Mock auth middleware to inject test user
jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// Mock error handler
jest.mock('../../src/middleware/errorHandler', () => {
  const original = jest.requireActual('../../src/middleware/errorHandler');
  return {
    ...original,
    asyncHandler: (fn: Function) => (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    },
  };
});

const app = express();
app.use(express.json());
app.use('/api/workouts', workoutRoutes);

describe('Workout Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/workouts', () => {
    it('should create a workout session', async () => {
      const mockSession = {
        id: 'session-1',
        name: 'Push Day',
        totalVolume: 1500,
        exercises: [],
      };

      (workoutSessionService.createSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/workouts')
        .send({
          name: 'Push Day',
          exercises: [
            {
              exerciseName: 'Bench Press',
              liftType: 'BENCH_PRESS',
              sets: [{ reps: 5, weight: 100 }],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Push Day');
      expect(workoutSessionService.createSession).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(Object)
      );
    });

    it('should return 500 on error', async () => {
      (workoutSessionService.createSession as jest.Mock).mockRejectedValue(
        new Error('Invalid input')
      );

      const response = await request(app)
        .post('/api/workouts')
        .send({ name: 'Bad', exercises: [] });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/workouts', () => {
    it('should return paginated sessions', async () => {
      (workoutSessionService.getUserSessions as jest.Mock).mockResolvedValue({
        sessions: [{ id: 's1', name: 'Session 1' }],
        total: 1,
      });

      const response = await request(app)
        .get('/api/workouts')
        .query({ limit: '10', offset: '0' });

      expect(response.status).toBe(200);
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should pass date filters', async () => {
      (workoutSessionService.getUserSessions as jest.Mock).mockResolvedValue({
        sessions: [],
        total: 0,
      });

      await request(app)
        .get('/api/workouts')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(workoutSessionService.getUserSessions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('GET /api/workouts/:id', () => {
    it('should return session by id', async () => {
      (workoutSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 'session-1',
        name: 'My Workout',
      });

      const response = await request(app).get('/api/workouts/session-1');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('session-1');
    });

    it('should return 404 if not found', async () => {
      (workoutSessionService.getSession as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/workouts/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/workouts/:id', () => {
    it('should update session', async () => {
      (workoutSessionService.updateSession as jest.Mock).mockResolvedValue({
        id: 'session-1',
        name: 'Updated Name',
      });

      const response = await request(app)
        .put('/api/workouts/session-1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/workouts/:id', () => {
    it('should delete session', async () => {
      (workoutSessionService.deleteSession as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/api/workouts/session-1');

      expect(response.status).toBe(204);
    });
  });

  describe('GET /api/workouts/analytics/pbs', () => {
    it('should return personal bests', async () => {
      (workoutSessionService.getPersonalBests as jest.Mock).mockResolvedValue([
        { liftType: 'BENCH_PRESS', estimated1RM: 100 },
      ]);

      const response = await request(app).get('/api/workouts/analytics/pbs');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by lift types', async () => {
      (workoutSessionService.getPersonalBests as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/workouts/analytics/pbs')
        .query({ liftTypes: 'BENCH_PRESS,BACK_SQUAT' });

      expect(workoutSessionService.getPersonalBests).toHaveBeenCalledWith(
        'test-user-id',
        ['BENCH_PRESS', 'BACK_SQUAT']
      );
    });
  });

  describe('GET /api/workouts/analytics/volume', () => {
    it('should return volume analytics', async () => {
      (workoutSessionService.getVolumeAnalytics as jest.Mock).mockResolvedValue({
        period: 'week',
        totalVolume: 5000,
        sessionCount: 3,
      });

      const response = await request(app)
        .get('/api/workouts/analytics/volume')
        .query({ period: 'week' });

      expect(response.status).toBe(200);
      expect(response.body.data.totalVolume).toBe(5000);
    });
  });

  describe('POST /api/workouts/calculate/percentage', () => {
    it('should calculate percentage training', async () => {
      (workoutAnalyticsService.calculatePercentageTraining as jest.Mock).mockReturnValue({
        inputMax: 100,
        percentage: 80,
        targetWeight: 80,
        estimatedReps: 8,
        estimatedRPE: 8,
      });

      const response = await request(app)
        .post('/api/workouts/calculate/percentage')
        .send({ inputMax: 100, percentage: 80 });

      expect(response.status).toBe(200);
      expect(response.body.data.targetWeight).toBe(80);
    });
  });

  describe('POST /api/workouts/calculate/rpe', () => {
    it('should return RPE prescription', async () => {
      (workoutAnalyticsService.getRPEPrescription as jest.Mock).mockReturnValue({
        targetRPE: 8,
        estimatedWeight: 81,
        repRange: { min: 4, max: 6 },
        percentageOf1RM: 81,
      });

      const response = await request(app)
        .post('/api/workouts/calculate/rpe')
        .send({ known1RM: 100, targetRPE: 8, targetReps: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.estimatedWeight).toBe(81);
    });
  });

  describe('GET /api/workouts/calculate/rep-ranges/:oneRM', () => {
    it('should return rep range chart', async () => {
      (workoutAnalyticsService.getRepRangeChart as jest.Mock).mockReturnValue([
        { percentage: 100, weight: 100, reps: '1' },
        { percentage: 95, weight: 95, reps: '2-3' },
      ]);

      const response = await request(app).get('/api/workouts/calculate/rep-ranges/100');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 400 for invalid 1RM', async () => {
      const response = await request(app).get('/api/workouts/calculate/rep-ranges/invalid');

      expect(response.status).toBe(400);
    });
  });
});
