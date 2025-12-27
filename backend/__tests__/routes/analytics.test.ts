import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock services before importing routes
jest.mock('../../src/services/zones/calculator', () => ({
  zoneCalculator: {
    getUserZones: jest.fn().mockResolvedValue({
      hrZones: [{ zone: 1, name: 'Recovery', min: 0, max: 134 }],
      powerZones: [{ zone: 1, name: 'Active Recovery', min: 0, max: 138 }],
      paceZones: null,
      swimZones: null,
    }),
    calculateHRZones: jest.fn().mockReturnValue([
      { zone: 1, name: 'Recovery', min: 0, max: 134 },
      { zone: 2, name: 'Aerobic', min: 134, max: 147 },
      { zone: 3, name: 'Tempo', min: 147, max: 154 },
      { zone: 4, name: 'SubThreshold', min: 154, max: 163 },
      { zone: 5, name: 'SuperThreshold', min: 163, max: 168 },
      { zone: 6, name: 'VO2max', min: 168, max: 175 },
      { zone: 7, name: 'Anaerobic', min: 175, max: 198 },
    ]),
    calculatePowerZones: jest.fn().mockReturnValue([
      { zone: 1, name: 'Active Recovery', min: 0, max: 138 },
      { zone: 2, name: 'Endurance', min: 138, max: 188 },
      { zone: 3, name: 'Tempo', min: 188, max: 225 },
      { zone: 4, name: 'Threshold', min: 225, max: 263 },
      { zone: 5, name: 'VO2max', min: 263, max: 300 },
      { zone: 6, name: 'Anaerobic', min: 300, max: 375 },
      { zone: 7, name: 'Neuromuscular', min: 375, max: 500 },
    ]),
    detectThreshold: jest.fn().mockResolvedValue(null),
  },
  ZoneCalculator: jest.fn(),
}));

jest.mock('../../src/services/analytics/aerobicService', () => ({
  aerobicService: {
    getEFTrend: jest.fn().mockResolvedValue({
      points: [],
      averageEF: 0,
      trendDirection: 'stable',
      trendPercent: 0,
      bestEF: null,
    }),
    calculateDecoupling: jest.fn().mockResolvedValue(null),
  },
  AerobicService: jest.fn(),
}));

jest.mock('../../src/services/analytics/durationCurveService', () => ({
  durationCurveService: {
    buildPowerCurve: jest.fn().mockResolvedValue({
      points: [],
      curveType: 'power',
      periodDays: 90,
      activityCount: 0,
    }),
    buildPaceCurve: jest.fn().mockResolvedValue({
      points: [],
      curveType: 'pace',
      periodDays: 90,
      activityCount: 0,
    }),
    determinePhenotype: jest.fn().mockReturnValue({
      phenotype: 'all_rounder',
      description: 'Not enough data',
      strengths: [],
      weaknesses: [],
      sprintScore: 0,
      sustainedScore: 0,
    }),
    estimateFTPFromCurve: jest.fn().mockReturnValue(0),
  },
  DurationCurveService: jest.fn(),
}));

jest.mock('../../src/services/analytics/cssService', () => ({
  cssService: {
    calculateCSS: jest.fn().mockReturnValue({
      css: 0.952,
      cssPace100m: 105,
      cssPaceFormatted: '1:45',
      estimatedT750: 780,
      estimatedT1500: 1620,
    }),
    calculateSwimZones: jest.fn().mockReturnValue([
      { zone: 1, name: 'Recovery', min: 0.71, max: 0.81 },
    ]),
    getTrainingPaces: jest.fn().mockReturnValue({
      recovery: { speed: 0.76, pace: '2:11' },
      threshold: { speed: 0.95, pace: '1:45' },
    }),
    predictRaceTimes: jest.fn().mockReturnValue({
      t400: { time: 380, formatted: '6:20' },
    }),
    updateUserCSS: jest.fn().mockResolvedValue(undefined),
    estimateCSSFromHistory: jest.fn().mockResolvedValue(null),
  },
  CSSService: jest.fn(),
}));

jest.mock('../../src/services/analytics/runningDynamicsService', () => ({
  runningDynamicsService: {
    analyzeRunningDynamics: jest.fn().mockResolvedValue(null),
    getRunningDynamicsTrend: jest.fn().mockResolvedValue({
      trend: [],
      averages: {},
      improvement: [],
    }),
  },
  RunningDynamicsService: jest.fn(),
}));

jest.mock('../../src/services/analytics/peakTrackerService', () => ({
  peakTrackerService: {
    getPeakPerformances: jest.fn().mockResolvedValue([]),
    getRecentPRs: jest.fn().mockResolvedValue([]),
  },
  PeakTrackerService: jest.fn(),
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
import analyticsRoutes from '../../src/routes/analytics';

describe('Analytics Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
    app.use(errorHandler);
  });

  describe('GET /api/analytics/zones', () => {
    it('should return training zones for authenticated user', async () => {
      const response = await request(app)
        .get('/api/analytics/zones')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hrZones');
      expect(response.body.data).toHaveProperty('powerZones');
    });
  });

  describe('GET /api/analytics/ef-trend', () => {
    it('should require sport parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/ef-trend')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });

    it('should return EF trend with valid sport', async () => {
      const response = await request(app)
        .get('/api/analytics/ef-trend?sport=BIKE')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('points');
      expect(response.body.data).toHaveProperty('averageEF');
      expect(response.body.data).toHaveProperty('trendDirection');
    });
  });

  describe('GET /api/analytics/power-curve', () => {
    it('should return power curve', async () => {
      const response = await request(app)
        .get('/api/analytics/power-curve')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('curve');
      expect(response.body.data).toHaveProperty('phenotype');
      expect(response.body.data).toHaveProperty('estimatedFTP');
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/power-curve?days=60')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/analytics/css', () => {
    it('should calculate CSS from test times', async () => {
      const response = await request(app)
        .post('/api/analytics/css')
        .set('Authorization', 'Bearer test-token')
        .send({ t400: 360, t200: 150 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.css).toHaveProperty('css');
      expect(response.body.data.css).toHaveProperty('cssPaceFormatted');
      expect(response.body.data).toHaveProperty('zones');
      expect(response.body.data).toHaveProperty('trainingPaces');
    });

    it('should validate t400 and t200', async () => {
      const response = await request(app)
        .post('/api/analytics/css')
        .set('Authorization', 'Bearer test-token')
        .send({ t400: 100, t200: 50 }); // Invalid - too fast

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/analytics/peaks', () => {
    it('should return peak performances', async () => {
      const response = await request(app)
        .get('/api/analytics/peaks')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by sport type', async () => {
      const response = await request(app)
        .get('/api/analytics/peaks?sport=BIKE')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/analytics/detect-threshold', () => {
    it('should require sport parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/detect-threshold')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });

    it('should accept valid sport types', async () => {
      const response = await request(app)
        .get('/api/analytics/detect-threshold?sport=BIKE')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/analytics/calculate-zones/hr', () => {
    it('should calculate HR zones from LTHR', async () => {
      const response = await request(app)
        .post('/api/analytics/calculate-zones/hr')
        .set('Authorization', 'Bearer test-token')
        .send({ lthr: 165 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(7);
    });

    it('should validate LTHR range', async () => {
      const response = await request(app)
        .post('/api/analytics/calculate-zones/hr')
        .set('Authorization', 'Bearer test-token')
        .send({ lthr: 50 }); // Too low

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/analytics/calculate-zones/power', () => {
    it('should calculate power zones from FTP', async () => {
      const response = await request(app)
        .post('/api/analytics/calculate-zones/power')
        .set('Authorization', 'Bearer test-token')
        .send({ ftp: 250 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(7);
    });
  });
});
