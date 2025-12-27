import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { createTestUser, generateTestToken } from '../setup';

const app = createApp();

describe('Settings Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { contains: 'settings-test' } },
    });

    // Create test user
    testUser = await createTestUser({ email: 'settings-test@test.com' });
    authToken = generateTestToken(testUser);
  });

  describe('GET /api/settings', () => {
    it('should return user settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/settings');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update user settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          units: 'IMPERIAL',
          weekStartDay: 0,
          timezone: 'America/New_York',
          emailDigest: false,
          weeklyReport: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.units).toBe('IMPERIAL');
      expect(res.body.data.weekStartDay).toBe(0);
      expect(res.body.data.timezone).toBe('America/New_York');
      expect(res.body.data.emailDigest).toBe(false);
      expect(res.body.data.weeklyReport).toBe(true);
    });

    it('should reject invalid units', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          units: 'INVALID',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid weekStartDay', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          weekStartDay: 7,
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send({ units: 'METRIC' });

      expect(res.status).toBe(401);
    });

    it('should handle partial updates', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailDigest: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailDigest).toBe(false);
    });
  });
});
