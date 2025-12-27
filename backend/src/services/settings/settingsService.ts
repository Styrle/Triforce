import { prisma } from '../../config/database';
import { Units } from '@prisma/client';

interface UpdateSettingsInput {
  units?: Units;
  weekStartDay?: number;  // 0-6 (Sunday-Saturday)
  timezone?: string;
  emailDigest?: boolean;
  weeklyReport?: boolean;
}

export class SettingsService {
  async getSettings(userId: string) {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  async updateSettings(userId: string, data: UpdateSettingsInput) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}

export const settingsService = new SettingsService();
export default settingsService;
