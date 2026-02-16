import { PrismaClient } from '@prisma/client';

type MockPrismaClient = {
  [K in keyof PrismaClient]: {
    [M in keyof PrismaClient[K]]: jest.Mock;
  };
};

function createMockModel() {
  return {
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
}

export const prismaMock = {
  strengthSession: createMockModel(),
  strengthExercise: createMockModel(),
  strengthProfile: createMockModel(),
  liftRecord: createMockModel(),
  athleteProfile: createMockModel(),
  muscleGroupScore: createMockModel(),
  user: createMockModel(),
  customExercise: createMockModel(),
} as unknown as MockPrismaClient;
