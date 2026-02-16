import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { LiftType, MuscleGroup, ExerciseCategory, Prisma } from '@prisma/client';

export interface MuscleContributionInput {
  muscleGroup: string;
  contribution: number;
}

export interface CustomExerciseInput {
  name: string;
  description?: string;
  category?: ExerciseCategory;
  equipment?: string;
  isBodyweight?: boolean;
  muscleContributions?: MuscleContributionInput[];
}

export class CustomExerciseService {
  async createExercise(userId: string, input: CustomExerciseInput) {
    if (input.muscleContributions) {
      const total = input.muscleContributions.reduce((sum, mc) => sum + mc.contribution, 0);
      if (total > 1.05) {
        throw new Error('Muscle contributions cannot exceed 100%');
      }
    }

    return prisma.customExercise.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        category: input.category || 'OTHER',
        equipment: input.equipment,
        isBodyweight: input.isBodyweight || false,
        muscleContributions: (input.muscleContributions || []) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async getExercises(userId: string, includeInactive = false) {
    return prisma.customExercise.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateExercise(userId: string, exerciseId: string, input: Partial<CustomExerciseInput>) {
    const exercise = await prisma.customExercise.findFirst({
      where: { id: exerciseId, userId },
    });
    if (!exercise) throw new Error('Exercise not found');

    if (input.muscleContributions) {
      const total = input.muscleContributions.reduce((sum, mc) => sum + mc.contribution, 0);
      if (total > 1.05) throw new Error('Muscle contributions cannot exceed 100%');
    }

    return prisma.customExercise.update({
      where: { id: exerciseId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.equipment !== undefined && { equipment: input.equipment }),
        ...(input.isBodyweight !== undefined && { isBodyweight: input.isBodyweight }),
        ...(input.muscleContributions && { muscleContributions: input.muscleContributions as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  async deleteExercise(userId: string, exerciseId: string) {
    const exercise = await prisma.customExercise.findFirst({
      where: { id: exerciseId, userId },
    });
    if (!exercise) throw new Error('Exercise not found');

    return prisma.customExercise.update({
      where: { id: exerciseId },
      data: { isActive: false },
    });
  }

  async getCombinedExerciseList(userId: string) {
    const customExercises = await this.getExercises(userId);

    // Return predefined LiftType values and custom exercises
    const predefined = Object.values(LiftType);

    return {
      predefined,
      custom: customExercises,
    };
  }
}

export const customExerciseService = new CustomExerciseService();
