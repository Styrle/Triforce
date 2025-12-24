import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { createTestUser, generateTestToken } from './setup';

const app = createApp();

describe('Activity Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create a test user
    testUser = await createTestUser({
      email: 'activity-test@test.com',
      password: 'password123',
    });
    authToken = generateTestToken(testUser);

    // Create athlete profile with thresholds
    await prisma.athleteProfile.update({
      where: { userId: testUser.id },
      data: {
        ftp: 250,
        lthr: 170,
        thresholdPace: 4.0, // m/s
        css: 1.3, // m/s
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.activity.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
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
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
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
    beforeAll(async () => {
      // Create some test activities
      const activities = [
        { name: 'Run 1', sportType: 'RUN' as const, startDate: new Date('2024-01-01') },
        { name: 'Bike 1', sportType: 'BIKE' as const, startDate: new Date('2024-01-02') },
        { name: 'Swim 1', sportType: 'SWIM' as const, startDate: new Date('2024-01-03') },
      ];

      for (const activity of activities) {
        await prisma.activity.create({
          data: {
            userId: testUser.id,
            name: activity.name,
            sportType: activity.sportType,
            startDate: activity.startDate,
            elapsedTime: 3600,
            movingTime: 3500,
          },
        });
      }
    });

    it('should return list of activities', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by sport type', async () => {
      const res = await request(app)
        .get('/api/activities?sportType=RUN')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((a: any) => a.sportType === 'RUN')).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/activities?startDate=2024-01-01&endDate=2024-01-02')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/activities?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/activities/:id', () => {
    let activityId: string;

    beforeAll(async () => {
      const activity = await prisma.activity.create({
        data: {
          userId: testUser.id,
          name: 'Test Activity',
          sportType: 'RUN',
          startDate: new Date(),
          elapsedTime: 3600,
          movingTime: 3500,
        },
      });
      activityId = activity.id;
    });

    it('should return single activity', async () => {
      const res = await request(app)
        .get(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(activityId);
      expect(res.body.data.name).toBe('Test Activity');
    });

    it('should return 404 for non-existent activity', async () => {
      const res = await request(app)
        .get('/api/activities/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/activities/:id', () => {
    let activityId: string;

    beforeAll(async () => {
      const activity = await prisma.activity.create({
        data: {
          userId: testUser.id,
          name: 'Original Name',
          sportType: 'RUN',
          startDate: new Date(),
          elapsedTime: 3600,
          movingTime: 3500,
        },
      });
      activityId = activity.id;
    });

    it('should update activity', async () => {
      const res = await request(app)
        .put(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/activities/:id', () => {
    let activityId: string;

    beforeAll(async () => {
      const activity = await prisma.activity.create({
        data: {
          userId: testUser.id,
          name: 'To Delete',
          sportType: 'RUN',
          startDate: new Date(),
          elapsedTime: 3600,
          movingTime: 3500,
        },
      });
      activityId = activity.id;
    });

    it('should delete activity', async () => {
      const res = await request(app)
        .delete(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's deleted
      const check = await prisma.activity.findUnique({
        where: { id: activityId },
      });
      expect(check).toBeNull();
    });
  });

  describe('GET /api/activities/recent', () => {
    it('should return recent activities', async () => {
      const res = await request(app)
        .get('/api/activities/recent?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/activities/stats', () => {
    it('should return activity statistics', async () => {
      const res = await request(app)
        .get('/api/activities/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});

describe('Metrics Calculator', () => {
  // Import locally to test
  let metricsCalculator: any;

  beforeAll(async () => {
    const module = await import('../src/services/metrics/calculator');
    metricsCalculator = module.metricsCalculator;
  });

  describe('calculateNormalizedPower', () => {
    it('should calculate NP from power data', () => {
      // Simulate constant 200W for 30 seconds
      const powerData = Array(30).fill(200);
      const np = metricsCalculator.calculateNormalizedPower(powerData);
      
      expect(np).toBeGreaterThan(0);
      expect(np).toBeCloseTo(200, 0); // Should be close to 200W for constant power
    });

    it('should handle variable power', () => {
      // Simulate variable power (200-300W alternating)
      const powerData = Array(60)
        .fill(0)
        .map((_, i) => (i % 2 === 0 ? 200 : 300));
      const np = metricsCalculator.calculateNormalizedPower(powerData);

      // NP should be higher than simple average (250W) due to variability
      expect(np).toBeGreaterThan(250);
    });
  });

  describe('calculateBikeTSS', () => {
    it('should calculate TSS correctly', () => {
      // 1 hour at FTP should be ~100 TSS
      const tss = metricsCalculator.calculateBikeTSS(3600, 250, 250);
      expect(tss).toBeCloseTo(100, 0);
    });

    it('should handle below threshold intensity', () => {
      // 1 hour at 75% FTP
      const tss = metricsCalculator.calculateBikeTSS(3600, 187.5, 250);
      expect(tss).toBeLessThan(100);
      expect(tss).toBeGreaterThan(0);
    });
  });

  describe('calculateRunTSS', () => {
    it('should calculate running TSS correctly', () => {
      // 1 hour at threshold (IF = 1.0)
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
