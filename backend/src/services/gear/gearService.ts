import { prisma } from '../../config/database';
import { GearType, SportType } from '@prisma/client';
import { createNotFoundError } from '../../middleware/errorHandler';

interface CreateGearInput {
  name: string;
  gearType: GearType;
  brand?: string;
  model?: string;
  sportType?: SportType;
  purchaseDate?: Date;
  purchasePrice?: number;
  maxDistance?: number;  // meters (for replacement alerts)
  maxDuration?: number;  // seconds
  notes?: string;
  isDefault?: boolean;
  imageUrl?: string;
}

interface UpdateGearInput extends Partial<CreateGearInput> {
  isActive?: boolean;
}

export class GearService {
  /**
   * Get all gear for a user
   */
  async getGear(userId: string, includeRetired = false) {
    return prisma.gear.findMany({
      where: {
        userId,
        ...(includeRetired ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single gear item with details
   */
  async getGearById(userId: string, gearId: string) {
    return prisma.gear.findFirst({
      where: { id: gearId, userId },
      include: {
        activities: {
          include: {
            activity: {
              select: {
                id: true,
                name: true,
                startDate: true,
                distance: true,
                sportType: true,
              },
            },
          },
          orderBy: { activity: { startDate: 'desc' } },
          take: 20,
        },
        maintenance: {
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  /**
   * Create new gear
   */
  async createGear(userId: string, data: CreateGearInput) {
    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await prisma.gear.updateMany({
        where: { userId, gearType: data.gearType, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.gear.create({
      data: {
        userId,
        name: data.name,
        gearType: data.gearType,
        brand: data.brand,
        model: data.model,
        sportType: data.sportType,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        maxDistance: data.maxDistance,
        maxDuration: data.maxDuration,
        notes: data.notes,
        isDefault: data.isDefault || false,
        imageUrl: data.imageUrl,
      },
    });
  }

  /**
   * Update gear
   */
  async updateGear(userId: string, gearId: string, data: UpdateGearInput) {
    const gear = await prisma.gear.findFirst({
      where: { id: gearId, userId },
    });

    if (!gear) {
      throw createNotFoundError('Gear');
    }

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await prisma.gear.updateMany({
        where: { userId, gearType: gear.gearType, isDefault: true, id: { not: gearId } },
        data: { isDefault: false },
      });
    }

    return prisma.gear.update({
      where: { id: gearId },
      data: {
        ...data,
        // Set retiredAt when marking inactive
        ...(data.isActive === false && !gear.retiredAt ? { retiredAt: new Date() } : {}),
        // Clear retiredAt when reactivating
        ...(data.isActive === true && gear.retiredAt ? { retiredAt: null } : {}),
      },
    });
  }

  /**
   * Delete gear
   */
  async deleteGear(userId: string, gearId: string) {
    const gear = await prisma.gear.findFirst({
      where: { id: gearId, userId },
    });

    if (!gear) {
      throw createNotFoundError('Gear');
    }

    await prisma.gear.delete({ where: { id: gearId } });
  }

  /**
   * Add maintenance record
   */
  async addMaintenance(
    userId: string,
    gearId: string,
    data: {
      maintenanceType: string;
      notes?: string;
      cost?: number;
      date?: Date;
      nextDueDistance?: number;
      nextDueDate?: Date;
    }
  ) {
    const gear = await prisma.gear.findFirst({
      where: { id: gearId, userId },
    });

    if (!gear) {
      throw createNotFoundError('Gear');
    }

    return prisma.gearMaintenance.create({
      data: {
        gearId,
        maintenanceType: data.maintenanceType,
        notes: data.notes,
        cost: data.cost,
        date: data.date || new Date(),
        distanceAtMaintenance: gear.totalDistance,
        nextDueDistance: data.nextDueDistance,
        nextDueDate: data.nextDueDate,
      },
    });
  }

  /**
   * Update gear stats after an activity
   */
  async updateGearStats(gearId: string, distance: number, duration: number) {
    return prisma.gear.update({
      where: { id: gearId },
      data: {
        totalDistance: { increment: distance },
        totalDuration: { increment: duration },
        totalActivities: { increment: 1 },
      },
    });
  }

  /**
   * Get default gear for a sport type
   */
  async getDefaultGear(userId: string, sportType: SportType) {
    return prisma.gear.findFirst({
      where: {
        userId,
        sportType,
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Get gear approaching retirement (maxDistance or maxDuration)
   */
  async getGearNearingRetirement(userId: string) {
    const gear = await prisma.gear.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { maxDistance: { not: null } },
          { maxDuration: { not: null } },
        ],
      },
    });

    return gear.filter((g) => {
      const distanceWarning = g.maxDistance && g.totalDistance >= g.maxDistance * 0.8;
      const durationWarning = g.maxDuration && g.totalDuration >= g.maxDuration * 0.8;
      return distanceWarning || durationWarning;
    });
  }
}

export const gearService = new GearService();
export default gearService;
