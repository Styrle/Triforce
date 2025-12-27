import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { createTestUser, generateTestToken } from '../setup';

const app = createApp();

describe('Profile Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { contains: 'profile-test' } },
    });

    // Create test user
    testUser = await createTestUser({ email: 'profile-test@test.com' });
    authToken = generateTestToken(testUser);
  });

  describe('GET /api/profile', () => {
    it('should return athlete profile', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/profile');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update athlete profile', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sex: 'MALE',
          height: 180,
          weight: 75,
          ftp: 250,
          lthr: 165,
          thresholdPace: 4.5,
          maxHr: 190,
          restingHr: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sex).toBe('MALE');
      expect(res.body.data.height).toBe(180);
      expect(res.body.data.weight).toBe(75);
      expect(res.body.data.ftp).toBe(250);
      expect(res.body.data.lthr).toBe(165);
    });

    it('should reject invalid sex value', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sex: 'INVALID',
        });

      expect(res.status).toBe(400);
    });

    it('should reject out of range height', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 300,
        });

      expect(res.status).toBe(400);
    });

    it('should reject out of range FTP', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ftp: 700,
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/profile')
        .send({ weight: 70 });

      expect(res.status).toBe(401);
    });

    it('should handle date of birth', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateOfBirth: '1990-05-15',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateOfBirth).toBeDefined();
    });
  });

  describe('POST /api/profile/calculate-zones', () => {
    it('should calculate zones from thresholds', async () => {
      // First set thresholds
      await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lthr: 165,
          ftp: 250,
          thresholdPace: 4.5,
        });

      // Then calculate zones
      const res = await request(app)
        .post('/api/profile/calculate-zones')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hrZones).toBeDefined();
      expect(res.body.data.powerZones).toBeDefined();
      expect(res.body.data.paceZones).toBeDefined();
    });

    it('should return profile without zones if no thresholds set', async () => {
      const res = await request(app)
        .post('/api/profile/calculate-zones')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/profile/calculate-zones');

      expect(res.status).toBe(401);
    });
  });
});
