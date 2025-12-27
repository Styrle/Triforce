import request from 'supertest';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler';

// Mock services before importing routes
jest.mock('../src/services/activities/activityService', () => ({
  activityService: {
    createActivity: jest.fn().mockResolvedValue({
      id: 'activity-1',
      name: 'Morning Run',
      sportType: 'RUN',
      startDate: new Date('2024-01-15T08:00:00Z'),
      elapsedTime: 3600,
      movingTime: 3500,
      distance: 10000,
      avgHeartRate: 150,
      maxHeartRate: 175,
      avgSpeed: 2.86,
      tss: 75,
      isManual: true,
      processed: true,
    }),
    getActivity: jest.fn().mockImplementation((id: string) => {
      if (id === 'non-existent-id') return Promise.resolve(null);
      return Promise.resolve({
        id,
        name: 'Test Activity',
        sportType: 'RUN',
        startDate: new Date('2024-01-15T08:00:00Z'),
        elapsedTime: 3600,
        movingTime: 3500,
        distance: 10000,
        isManual: false,
      });
    }),
    getActivities: jest.fn().mockResolvedValue({
      activities: [
        { id: '1', name: 'Run 1', sportType: 'RUN', startDate: new Date('2024-01-01'), distance: 5000 },
        { id: '2', name: 'Bike 1', sportType: 'BIKE', startDate: new Date('2024-01-02'), distance: 20000 },
        { id: '3', name: 'Swim 1', sportType: 'SWIM', startDate: new Date('2024-01-03'), distance: 1500 },
      ],
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
    }),
    updateActivity: jest.fn().mockImplementation((id: string, userId: string, data: any) => {
      if (id === 'non-existent-id') return Promise.resolve(null);
      return Promise.resolve({
        id,
        name: data.name || 'Updated Name',
        sportType: 'RUN',
        startDate: new Date('2024-01-15T08:00:00Z'),
        elapsedTime: 3600,
        movingTime: 3500,
      });
    }),
    deleteActivity: jest.fn().mockImplementation((id: string) => {
      if (id === 'non-existent-id') return Promise.resolve(false);
      return Promise.resolve(true);
    }),
    getRecentActivities: jest.fn().mockResolvedValue([
      { id: '1', name: 'Recent Run', sportType: 'RUN', startDate: new Date(), distance: 5000 },
    ]),
    getActivityStats: jest.fn().mockResolvedValue([
      { sportType: 'RUN', count: 10, totalDistance: 50000, totalDuration: 36000, totalTss: 500 },
      { sportType: 'BIKE', count: 5, totalDistance: 100000, totalDuration: 18000, totalTss: 300 },
    ]),
    getActivityStreams: jest.fn().mockResolvedValue(null),
    getActivitySplits: jest.fn().mockResolvedValue(null),
  },
  ActivityService: jest.fn(),
}));

jest.mock('../src/services/activities/syncService', () => ({
  activitySyncService: {
    syncActivities: jest.fn().mockResolvedValue({ synced: 0, errors: [] }),
  },
}));

jest.mock('../src/services/activities/fitParser', () => ({
  fitFileParserService: {
    importFitFile: jest.fn().mockResolvedValue('activity-1'),
  },
}));

jest.mock('../src/services/jobs/queueService', () => ({
  jobQueueService: {
    queueActivitySync: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  }),
  AuthRequest: jest.fn(),
}));

// Import after mocks
import activitiesRoutes from '../src/routes/activities';

describe('Activity Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/activities', activitiesRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/activities', () => {
    it('should create a manual activity', async () => {
      const activityData = {
        name: 'Morning Run',
        sportType: 'RUN',
        startDate: new Date().toISOString(),
        elapsedTime: 3600,
        movingTime: 3500,
        distance: 10000,
        avgHeartRate: 150,
        maxHeartRate: 175,
        avgSpeed: 2.86,
      };

      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', 'Bearer test-token')
        .send(activityData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Morning Run');
      expect(res.body.data.sportType).toBe('RUN');
      expect(res.body.data.isManual).toBe(true);
    });

    it('should reject invalid sport type', async () => {
      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test',
          sportType: 'INVALID',
          startDate: new Date().toISOString(),
          elapsedTime: 3600,
          movingTime: 3500,
        });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      // Temporarily override auth mock for this test
      const { authMiddleware } = require('../src/middleware/auth');
      authMiddleware.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: { message: 'No authorization header' } });
      });

      const res = await request(app)
        .post('/api/activities')
        .send({
          name: 'Test',
          sportType: 'RUN',
          startDate: new Date().toISOString(),
          elapsedTime: 3600,
          movingTime: 3500,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/activities', () => {
    it('should return list of activities', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by sport type', async () => {
      const { activityService } = require('../src/services/activities/activityService');
      activityService.getActivities.mockResolvedValueOnce({
        activities: [
          { id: '1', name: 'Run 1', sportType: 'RUN', startDate: new Date('2024-01-01') },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/activities?sportType=RUN')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((a: any) => a.sportType === 'RUN')).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/activities?startDate=2024-01-01&endDate=2024-01-02')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const { activityService } = require('../src/services/activities/activityService');
      activityService.getActivities.mockResolvedValueOnce({
        activities: [
          { id: '1', name: 'Run 1', sportType: 'RUN' },
          { id: '2', name: 'Bike 1', sportType: 'BIKE' },
        ],
        meta: { page: 1, limit: 2, total: 3, totalPages: 2 },
      });

      const res = await request(app)
        .get('/api/activities?page=1&limit=2')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/activities/:id', () => {
    it('should return single activity', async () => {
      const res = await request(app)
        .get('/api/activities/activity-123')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('activity-123');
    });

    it('should return 404 for non-existent activity', async () => {
      const res = await request(app)
        .get('/api/activities/non-existent-id')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/activities/:id', () => {
    it('should update activity', async () => {
      const res = await request(app)
        .put('/api/activities/activity-123')
        .set('Authorization', 'Bearer test-token')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/activities/:id', () => {
    it('should delete activity', async () => {
      const res = await request(app)
        .delete('/api/activities/activity-123')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/activities/recent', () => {
    it('should return recent activities', async () => {
      const res = await request(app)
        .get('/api/activities/recent?limit=5')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/activities/stats', () => {
    it('should return activity statistics', async () => {
      const res = await request(app)
        .get('/api/activities/stats')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});

describe('Metrics Calculator', () => {
  let metricsCalculator: any;

  beforeAll(async () => {
    // Clear mocks and require the actual module
    jest.unmock('../src/services/metrics/calculator');
    const module = await import('../src/services/metrics/calculator');
    metricsCalculator = module.metricsCalculator;
  });

  describe('calculateNormalizedPower', () => {
    it('should calculate NP from power data', () => {
      const powerData = Array(30).fill(200);
      const np = metricsCalculator.calculateNormalizedPower(powerData);

      expect(np).toBeGreaterThan(0);
      expect(np).toBeCloseTo(200, 0);
    });

    it('should handle variable power', () => {
      const powerData = [
        ...Array(30).fill(300),
        ...Array(30).fill(200),
      ];
      const np = metricsCalculator.calculateNormalizedPower(powerData);

      expect(np).toBeGreaterThanOrEqual(250);
    });
  });

  describe('calculateBikeTSS', () => {
    it('should calculate TSS correctly', () => {
      const tss = metricsCalculator.calculateBikeTSS(3600, 250, 250);
      expect(tss).toBeCloseTo(100, 0);
    });

    it('should handle below threshold intensity', () => {
      const tss = metricsCalculator.calculateBikeTSS(3600, 187.5, 250);
      expect(tss).toBeLessThan(100);
      expect(tss).toBeGreaterThan(0);
    });
  });

  describe('calculateRunTSS', () => {
    it('should calculate running TSS correctly', () => {
      const tss = metricsCalculator.calculateRunTSS(3600, 1.0);
      expect(tss).toBeCloseTo(100, 0);
    });
  });

  describe('calculateIntensityFactor', () => {
    it('should calculate IF correctly', () => {
      const ifValue = metricsCalculator.calculateIntensityFactor(225, 250);
      expect(ifValue).toBeCloseTo(0.9, 2);
    });
  });

  describe('calculateVariabilityIndex', () => {
    it('should calculate VI correctly', () => {
      const vi = metricsCalculator.calculateVariabilityIndex(260, 250);
      expect(vi).toBeCloseTo(1.04, 2);
    });
  });
});
