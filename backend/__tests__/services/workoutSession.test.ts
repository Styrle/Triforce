import { WorkoutSessionService } from '../../src/services/workout/workoutSessionService';
import { prismaMock } from '../__mocks__/prisma';
import { WorkoutSessionInput } from '../../src/types/workout';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  prisma: require('../__mocks__/prisma').prismaMock,
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WorkoutSessionService', () => {
  let service: WorkoutSessionService;

  beforeEach(() => {
    service = new WorkoutSessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const mockInput: WorkoutSessionInput = {
      name: 'Push Day',
      exercises: [
        {
          exerciseName: 'Bench Press',
          liftType: 'BENCH_PRESS',
          orderIndex: 0,
          sets: [
            { reps: 5, weight: 100 },
            { reps: 5, weight: 100 },
            { reps: 5, weight: 100 },
          ],
        },
      ],
    };

    it('should create session with exercises', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        name: 'Push Day',
        date: new Date(),
        duration: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: [
          {
            id: 'ex-1',
            sessionId: 'session-1',
            exerciseName: 'Bench Press',
            liftType: 'BENCH_PRESS',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 100 },
              { setNumber: 2, reps: 5, weight: 100 },
              { setNumber: 3, reps: 5, weight: 100 },
            ],
            notes: null,
          },
        ],
      };

      (prismaMock.strengthSession as any).create.mockResolvedValue(mockSession);
      (prismaMock.strengthProfile as any).findUnique.mockResolvedValue(null);
      (prismaMock.strengthProfile as any).create.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
      (prismaMock.athleteProfile as any).findUnique.mockResolvedValue({ weight: 80, sex: 'MALE' });
      (prismaMock.liftRecord as any).findFirst.mockResolvedValue(null);
      (prismaMock.liftRecord as any).create.mockResolvedValue({});

      const result = await service.createSession('user-1', mockInput);

      expect(result.name).toBe('Push Day');
      expect(result.exercises.length).toBe(1);
      expect(result.totalVolume).toBe(1500); // 3 x 5 x 100
    });

    it('should calculate session totals', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        name: 'Full Session',
        date: new Date(),
        duration: null,
        notes: null,
        exercises: [
          {
            id: 'ex-1',
            exerciseName: 'Squat',
            liftType: 'BACK_SQUAT',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 140 },
              { setNumber: 2, reps: 5, weight: 140 },
            ],
          },
          {
            id: 'ex-2',
            exerciseName: 'Bench',
            liftType: 'BENCH_PRESS',
            orderIndex: 1,
            sets: [
              { setNumber: 1, reps: 8, weight: 80 },
              { setNumber: 2, reps: 8, weight: 80 },
            ],
          },
        ],
      };

      (prismaMock.strengthSession as any).create.mockResolvedValue(mockSession);
      (prismaMock.strengthProfile as any).findUnique.mockResolvedValue({ id: 'p1' });
      (prismaMock.athleteProfile as any).findUnique.mockResolvedValue({ weight: 80, sex: 'MALE' });
      (prismaMock.liftRecord as any).findFirst.mockResolvedValue(null);
      (prismaMock.liftRecord as any).create.mockResolvedValue({});

      const result = await service.createSession('user-1', {
        name: 'Full Session',
        exercises: mockInput.exercises,
      });

      // Squat: 2 x 5 x 140 = 1400
      // Bench: 2 x 8 x 80 = 1280
      // Total: 2680
      expect(result.totalVolume).toBe(2680);
      expect(result.totalSets).toBe(4);
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', async () => {
      (prismaMock.strengthSession as any).findUnique.mockResolvedValue(null);

      const result = await service.getSession('non-existent');
      expect(result).toBeNull();
    });

    it('should return formatted session with calculated fields', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        name: 'Test',
        date: new Date(),
        duration: 3600,
        notes: 'Great workout',
        exercises: [
          {
            id: 'ex-1',
            exerciseName: 'Deadlift',
            liftType: 'DEADLIFT',
            orderIndex: 0,
            sets: [
              { setNumber: 1, reps: 5, weight: 180, rpe: 8 },
            ],
            notes: null,
          },
        ],
      };

      (prismaMock.strengthSession as any).findUnique.mockResolvedValue(mockSession);

      const result = await service.getSession('session-1');

      expect(result).not.toBeNull();
      expect(result!.exercises[0].totalVolume).toBe(900);
      expect(result!.exercises[0].estimatedE1RM).toBeDefined();
      expect(result!.exercises[0].averageRPE).toBe(8);
      expect(result!.muscleVolumeBreakdown).toBeDefined();
      expect(result!.muscleVolumeBreakdown!.length).toBeGreaterThan(0);
    });
  });

  describe('getPersonalBests', () => {
    it('should return best lift for each type', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        lifts: [
          {
            liftType: 'BENCH_PRESS',
            weight: 100,
            reps: 1,
            estimated1RM: 100,
            performedAt: new Date('2024-01-01'),
            sessionId: 's1',
          },
          {
            liftType: 'BENCH_PRESS',
            weight: 95,
            reps: 3,
            estimated1RM: 103,
            performedAt: new Date('2024-02-01'),
            sessionId: 's2',
          },
          {
            liftType: 'BACK_SQUAT',
            weight: 140,
            reps: 5,
            estimated1RM: 158,
            performedAt: new Date('2024-01-15'),
            sessionId: 's3',
          },
        ],
      };

      (prismaMock.strengthProfile as any).findUnique.mockResolvedValue(mockProfile);

      const pbs = await service.getPersonalBests('user-1');

      expect(pbs.length).toBe(2); // One for bench, one for squat

      const benchPB = pbs.find(p => p.liftType === 'BENCH_PRESS');
      expect(benchPB?.estimated1RM).toBe(103); // Higher e1RM

      const squatPB = pbs.find(p => p.liftType === 'BACK_SQUAT');
      expect(squatPB?.estimated1RM).toBe(158);
    });

    it('should filter by lift types if provided', async () => {
      const mockProfile = {
        id: 'profile-1',
        lifts: [
          { liftType: 'BENCH_PRESS', weight: 100, reps: 1, estimated1RM: 100, performedAt: new Date(), sessionId: null },
        ],
      };

      (prismaMock.strengthProfile as any).findUnique.mockResolvedValue(mockProfile);

      const pbs = await service.getPersonalBests('user-1', ['BENCH_PRESS']);

      expect((prismaMock.strengthProfile as any).findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            lifts: expect.objectContaining({
              where: { liftType: { in: ['BENCH_PRESS'] } },
            }),
          }),
        })
      );
    });

    it('should return empty array if no profile', async () => {
      (prismaMock.strengthProfile as any).findUnique.mockResolvedValue(null);

      const pbs = await service.getPersonalBests('user-1');
      expect(pbs).toEqual([]);
    });
  });

  describe('getVolumeAnalytics', () => {
    it('should aggregate volumes by period', async () => {
      const mockSessions = [
        {
          id: 's1',
          userId: 'user-1',
          name: 'Day 1',
          date: new Date('2024-01-15'),
          duration: null,
          notes: null,
          exercises: [
            {
              id: 'ex1',
              exerciseName: 'Squat',
              liftType: 'BACK_SQUAT',
              orderIndex: 0,
              sets: [{ reps: 5, weight: 100 }],
              notes: null,
            },
          ],
        },
        {
          id: 's2',
          userId: 'user-1',
          name: 'Day 2',
          date: new Date('2024-01-17'),
          duration: null,
          notes: null,
          exercises: [
            {
              id: 'ex2',
              exerciseName: 'Bench',
              liftType: 'BENCH_PRESS',
              orderIndex: 0,
              sets: [{ reps: 8, weight: 80 }],
              notes: null,
            },
          ],
        },
      ];

      (prismaMock.strengthSession as any).findMany.mockResolvedValue(mockSessions);

      const analytics = await service.getVolumeAnalytics('user-1', 'week', new Date('2024-01-15'));

      expect(analytics.sessionCount).toBe(2);
      expect(analytics.totalVolume).toBe(500 + 640); // 5x100 + 8x80
      expect(analytics.averageSessionVolume).toBe(570); // 1140 / 2
      expect(analytics.volumeByMuscle.length).toBeGreaterThan(0);
      expect(analytics.volumeByLift.length).toBe(2);
    });

    it('should handle day period correctly', async () => {
      (prismaMock.strengthSession as any).findMany.mockResolvedValue([]);

      const analytics = await service.getVolumeAnalytics('user-1', 'day', new Date('2024-01-15'));

      expect(analytics.startDate.getHours()).toBe(0);
      expect(analytics.endDate.getHours()).toBe(23);
    });

    it('should return zeros for no sessions', async () => {
      (prismaMock.strengthSession as any).findMany.mockResolvedValue([]);

      const analytics = await service.getVolumeAnalytics('user-1', 'week');

      expect(analytics.totalVolume).toBe(0);
      expect(analytics.sessionCount).toBe(0);
      expect(analytics.averageSessionVolume).toBe(0);
    });
  });
});
