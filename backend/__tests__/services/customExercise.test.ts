// Mock prisma - must be before import
const mockCustomExercise = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  prisma: {
    customExercise: mockCustomExercise,
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { CustomExerciseService } from '../../src/services/exercises/customExerciseService';

const service = new CustomExerciseService();
const userId = 'test-user-id';

describe('CustomExerciseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExercise', () => {
    it('should create a custom exercise with basic info', async () => {
      const mockExercise = {
        id: 'ex-1',
        userId,
        name: 'Landmine Press',
        description: null,
        category: 'OTHER',
        equipment: null,
        isBodyweight: false,
        muscleContributions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockCustomExercise.create as jest.Mock).mockResolvedValue(mockExercise);

      const result = await service.createExercise(userId, { name: 'Landmine Press' });

      expect(result).toEqual(mockExercise);
      expect(mockCustomExercise.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: 'Landmine Press',
          description: undefined,
          category: 'OTHER',
          equipment: undefined,
          isBodyweight: false,
          muscleContributions: [],
        },
      });
    });

    it('should create an exercise with muscle contributions', async () => {
      const contributions = [
        { muscleGroup: 'CHEST', contribution: 0.6 },
        { muscleGroup: 'TRICEPS', contribution: 0.25 },
      ];

      const mockExercise = {
        id: 'ex-2',
        userId,
        name: 'Landmine Press',
        category: 'HORIZONTAL_PRESS',
        muscleContributions: contributions,
      };

      (mockCustomExercise.create as jest.Mock).mockResolvedValue(mockExercise);

      const result = await service.createExercise(userId, {
        name: 'Landmine Press',
        category: 'HORIZONTAL_PRESS',
        muscleContributions: contributions,
      });

      expect(result.muscleContributions).toEqual(contributions);
    });

    it('should reject if muscle contributions exceed 100%', async () => {
      const contributions = [
        { muscleGroup: 'CHEST', contribution: 0.7 },
        { muscleGroup: 'TRICEPS', contribution: 0.4 },
      ];

      await expect(
        service.createExercise(userId, {
          name: 'Bad Exercise',
          muscleContributions: contributions,
        })
      ).rejects.toThrow('Muscle contributions cannot exceed 100%');
    });

    it('should set default category to OTHER', async () => {
      (mockCustomExercise.create as jest.Mock).mockResolvedValue({});

      await service.createExercise(userId, { name: 'Test' });

      expect(mockCustomExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'OTHER' }),
        })
      );
    });
  });

  describe('getExercises', () => {
    it('should return only active exercises by default', async () => {
      const mockExercises = [
        { id: 'ex-1', name: 'A Exercise', isActive: true },
        { id: 'ex-2', name: 'B Exercise', isActive: true },
      ];

      (mockCustomExercise.findMany as jest.Mock).mockResolvedValue(mockExercises);

      const result = await service.getExercises(userId);

      expect(result).toEqual(mockExercises);
      expect(mockCustomExercise.findMany).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return all exercises when includeInactive is true', async () => {
      (mockCustomExercise.findMany as jest.Mock).mockResolvedValue([]);

      await service.getExercises(userId, true);

      expect(mockCustomExercise.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('updateExercise', () => {
    it('should update exercise name', async () => {
      const existing = { id: 'ex-1', userId, name: 'Old Name' };
      const updated = { ...existing, name: 'New Name' };

      (mockCustomExercise.findFirst as jest.Mock).mockResolvedValue(existing);
      (mockCustomExercise.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateExercise(userId, 'ex-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockCustomExercise.update).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
        data: { name: 'New Name' },
      });
    });

    it('should reject update if exercise not found', async () => {
      (mockCustomExercise.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateExercise(userId, 'nonexistent', { name: 'New' })
      ).rejects.toThrow('Exercise not found');
    });

    it('should reject update if exercise belongs to different user', async () => {
      (mockCustomExercise.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateExercise('other-user', 'ex-1', { name: 'New' })
      ).rejects.toThrow('Exercise not found');
    });
  });

  describe('deleteExercise', () => {
    it('should soft delete (deactivate) an exercise', async () => {
      const existing = { id: 'ex-1', userId, isActive: true };

      (mockCustomExercise.findFirst as jest.Mock).mockResolvedValue(existing);
      (mockCustomExercise.update as jest.Mock).mockResolvedValue({
        ...existing,
        isActive: false,
      });

      const result = await service.deleteExercise(userId, 'ex-1');

      expect(result.isActive).toBe(false);
      expect(mockCustomExercise.update).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
        data: { isActive: false },
      });
    });

    it('should reject if exercise not found', async () => {
      (mockCustomExercise.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteExercise(userId, 'nonexistent')).rejects.toThrow(
        'Exercise not found'
      );
    });
  });

  describe('getCombinedExerciseList', () => {
    it('should return both predefined and custom exercises', async () => {
      const mockCustom = [
        { id: 'ex-1', name: 'Custom Exercise', isActive: true },
      ];

      (mockCustomExercise.findMany as jest.Mock).mockResolvedValue(mockCustom);

      const result = await service.getCombinedExerciseList(userId);

      expect(result.predefined).toBeDefined();
      expect(result.predefined.length).toBe(44); // All LiftType enum values
      expect(result.custom).toEqual(mockCustom);
    });
  });
});
