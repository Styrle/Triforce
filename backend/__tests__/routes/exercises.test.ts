import request from 'supertest';
import express from 'express';
import exerciseRoutes from '../../src/routes/exercises';
import { customExerciseService } from '../../src/services/exercises/customExerciseService';

// Mock service
jest.mock('../../src/services/exercises/customExerciseService');

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
app.use('/api/exercises', exerciseRoutes);

describe('Exercise Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/exercises', () => {
    it('should return 200 with exercise list', async () => {
      const mockExercises = [
        { id: 'ex-1', name: 'Landmine Press', category: 'OTHER' },
        { id: 'ex-2', name: 'Cable Fly', category: 'ISOLATION' },
      ];

      (customExerciseService.getExercises as jest.Mock).mockResolvedValue(mockExercises);

      const response = await request(app).get('/api/exercises');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExercises);
      expect(customExerciseService.getExercises).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /api/exercises/combined', () => {
    it('should return 200 with predefined and custom lists', async () => {
      const mockCombined = {
        predefined: ['BACK_SQUAT', 'BENCH_PRESS'],
        custom: [{ id: 'ex-1', name: 'Custom' }],
      };

      (customExerciseService.getCombinedExerciseList as jest.Mock).mockResolvedValue(mockCombined);

      const response = await request(app).get('/api/exercises/combined');

      expect(response.status).toBe(200);
      expect(response.body.data.predefined).toBeDefined();
      expect(response.body.data.custom).toBeDefined();
    });
  });

  describe('POST /api/exercises', () => {
    it('should return 201 for valid exercise', async () => {
      const mockExercise = {
        id: 'ex-1',
        name: 'Landmine Press',
        category: 'OTHER',
      };

      (customExerciseService.createExercise as jest.Mock).mockResolvedValue(mockExercise);

      const response = await request(app)
        .post('/api/exercises')
        .send({ name: 'Landmine Press' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Landmine Press');
      expect(customExerciseService.createExercise).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ name: 'Landmine Press' })
      );
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/exercises')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/exercises')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 201 with muscle contributions', async () => {
      const input = {
        name: 'Landmine Press',
        muscleContributions: [
          { muscleGroup: 'CHEST', contribution: 0.6 },
          { muscleGroup: 'TRICEPS', contribution: 0.25 },
        ],
      };

      (customExerciseService.createExercise as jest.Mock).mockResolvedValue({
        id: 'ex-1',
        ...input,
      });

      const response = await request(app)
        .post('/api/exercises')
        .send(input);

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/exercises/:id', () => {
    it('should return 200 for valid update', async () => {
      const updated = { id: 'ex-1', name: 'Updated Name' };

      (customExerciseService.updateExercise as jest.Mock).mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/exercises/ex-1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
      expect(customExerciseService.updateExercise).toHaveBeenCalledWith(
        'test-user-id',
        'ex-1',
        expect.objectContaining({ name: 'Updated Name' })
      );
    });

    it('should return 500 if exercise not found', async () => {
      (customExerciseService.updateExercise as jest.Mock).mockRejectedValue(
        new Error('Exercise not found')
      );

      const response = await request(app)
        .put('/api/exercises/nonexistent')
        .send({ name: 'New' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/exercises/:id', () => {
    it('should return 200 and deactivate exercise', async () => {
      (customExerciseService.deleteExercise as jest.Mock).mockResolvedValue({
        id: 'ex-1',
        isActive: false,
      });

      const response = await request(app).delete('/api/exercises/ex-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Exercise deactivated');
      expect(customExerciseService.deleteExercise).toHaveBeenCalledWith(
        'test-user-id',
        'ex-1'
      );
    });

    it('should return 500 if exercise not found', async () => {
      (customExerciseService.deleteExercise as jest.Mock).mockRejectedValue(
        new Error('Exercise not found')
      );

      const response = await request(app).delete('/api/exercises/nonexistent');

      expect(response.status).toBe(500);
    });
  });
});
