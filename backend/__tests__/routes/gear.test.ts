import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { createTestUser, generateTestToken } from '../setup';

const app = createApp();

describe('Gear Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.gear.deleteMany({
      where: { user: { email: { contains: 'gear-test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'gear-test' } },
    });

    // Create test user
    testUser = await createTestUser({ email: 'gear-test@test.com' });
    authToken = generateTestToken(testUser);
  });

  describe('GET /api/gear', () => {
    it('should return empty list when no gear', async () => {
      const res = await request(app)
        .get('/api/gear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return gear list', async () => {
      // Create some gear
      await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Test Bike',
          gearType: 'BIKE',
          brand: 'Trek',
        },
      });

      const res = await request(app)
        .get('/api/gear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Bike');
    });

    it('should exclude retired gear by default', async () => {
      await prisma.gear.createMany({
        data: [
          { userId: testUser.id, name: 'Active Bike', gearType: 'BIKE', isActive: true },
          { userId: testUser.id, name: 'Retired Bike', gearType: 'BIKE', isActive: false },
        ],
      });

      const res = await request(app)
        .get('/api/gear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Active Bike');
    });

    it('should include retired gear when requested', async () => {
      await prisma.gear.createMany({
        data: [
          { userId: testUser.id, name: 'Active Bike', gearType: 'BIKE', isActive: true },
          { userId: testUser.id, name: 'Retired Bike', gearType: 'BIKE', isActive: false },
        ],
      });

      const res = await request(app)
        .get('/api/gear?includeRetired=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/gear');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gear/:id', () => {
    it('should return single gear item', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Test Shoes',
          gearType: 'RUN_SHOES',
          brand: 'Nike',
          model: 'Pegasus',
        },
      });

      const res = await request(app)
        .get(`/api/gear/${gear.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Shoes');
      expect(res.body.data.brand).toBe('Nike');
    });

    it('should return 404 for non-existent gear', async () => {
      const res = await request(app)
        .get('/api/gear/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/gear', () => {
    it('should create new gear', async () => {
      const res = await request(app)
        .post('/api/gear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Bike',
          gearType: 'BIKE',
          brand: 'Specialized',
          model: 'Tarmac',
          sportType: 'BIKE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Bike');
      expect(res.body.data.brand).toBe('Specialized');
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/gear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gearType: 'BIKE',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid gear type', async () => {
      const res = await request(app)
        .post('/api/gear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Gear',
          gearType: 'INVALID',
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/gear')
        .send({
          name: 'Test Gear',
          gearType: 'BIKE',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/gear/:id', () => {
    it('should update gear', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Old Name',
          gearType: 'BIKE',
        },
      });

      const res = await request(app)
        .put(`/api/gear/${gear.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          brand: 'New Brand',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.brand).toBe('New Brand');
    });

    it('should return 404 for non-existent gear', async () => {
      const res = await request(app)
        .put('/api/gear/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/gear/:id', () => {
    it('should delete gear', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'To Delete',
          gearType: 'BIKE',
        },
      });

      const res = await request(app)
        .delete(`/api/gear/${gear.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's deleted
      const deleted = await prisma.gear.findUnique({ where: { id: gear.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent gear', async () => {
      const res = await request(app)
        .delete('/api/gear/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/gear/:id/maintenance', () => {
    it('should add maintenance record', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Bike',
          gearType: 'BIKE',
          totalDistance: 5000,
        },
      });

      const res = await request(app)
        .post(`/api/gear/${gear.id}/maintenance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          maintenanceType: 'Chain replacement',
          notes: 'Replaced worn chain',
          cost: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maintenanceType).toBe('Chain replacement');
      expect(res.body.data.distanceAtMaintenance).toBe(5000);
    });

    it('should reject missing maintenance type', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Bike',
          gearType: 'BIKE',
        },
      });

      const res = await request(app)
        .post(`/api/gear/${gear.id}/maintenance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Some notes',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/gear/:id/retire', () => {
    it('should retire gear', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Old Shoes',
          gearType: 'RUN_SHOES',
          isActive: true,
        },
      });

      const res = await request(app)
        .post(`/api/gear/${gear.id}/retire`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data.retiredAt).toBeDefined();
    });
  });

  describe('POST /api/gear/:id/reactivate', () => {
    it('should reactivate retired gear', async () => {
      const gear = await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Retired Bike',
          gearType: 'BIKE',
          isActive: false,
          retiredAt: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/gear/${gear.id}/reactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.retiredAt).toBeNull();
    });
  });

  describe('GET /api/gear/warnings', () => {
    it('should return gear nearing retirement', async () => {
      await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'Worn Shoes',
          gearType: 'RUN_SHOES',
          maxDistance: 500000, // 500km
          totalDistance: 450000, // 450km - 90%
          isActive: true,
        },
      });

      const res = await request(app)
        .get('/api/gear/warnings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Worn Shoes');
    });

    it('should not include gear under threshold', async () => {
      await prisma.gear.create({
        data: {
          userId: testUser.id,
          name: 'New Shoes',
          gearType: 'RUN_SHOES',
          maxDistance: 500000, // 500km
          totalDistance: 100000, // 100km - 20%
          isActive: true,
        },
      });

      const res = await request(app)
        .get('/api/gear/warnings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
