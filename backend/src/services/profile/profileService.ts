import { prisma } from '../../config/database';
import { Sex } from '@prisma/client';

interface UpdateProfileInput {
  dateOfBirth?: Date;
  sex?: Sex;
  height?: number;  // cm
  weight?: number;  // kg
  ftp?: number;     // watts
  lthr?: number;    // bpm
  thresholdPace?: number;  // m/s
  css?: number;     // m/s (Critical Swim Speed)
  maxHr?: number;
  restingHr?: number;
  hrZones?: object;
  powerZones?: object;
  paceZones?: object;
}

export class ProfileService {
  async getProfile(userId: string) {
    return prisma.athleteProfile.findUnique({
      where: { userId },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Handle date conversion if string
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }

    return prisma.athleteProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Calculate zones from thresholds using standard models
   * - HR zones: Joe Friel 7-zone model
   * - Power zones: Coggan 7-zone model
   * - Pace zones: 6-zone model
   */
  async calculateAndSaveZones(userId: string) {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const updates: Partial<UpdateProfileInput> = {};

    // Calculate HR zones from LTHR (Joe Friel 7-zone model)
    if (profile.lthr) {
      const lthr = profile.lthr;
      updates.hrZones = {
        zone1: { min: 0, max: Math.round(lthr * 0.81), name: 'Recovery' },
        zone2: { min: Math.round(lthr * 0.81), max: Math.round(lthr * 0.89), name: 'Aerobic' },
        zone3: { min: Math.round(lthr * 0.89), max: Math.round(lthr * 0.93), name: 'Tempo' },
        zone4: { min: Math.round(lthr * 0.93), max: Math.round(lthr * 0.99), name: 'SubThreshold' },
        zone5a: { min: Math.round(lthr * 0.99), max: Math.round(lthr * 1.02), name: 'SuperThreshold' },
        zone5b: { min: Math.round(lthr * 1.02), max: Math.round(lthr * 1.06), name: 'VO2max' },
        zone5c: { min: Math.round(lthr * 1.06), max: 255, name: 'Anaerobic' },
      };
    }

    // Calculate Power zones from FTP (Coggan 7-zone model)
    if (profile.ftp) {
      const ftp = profile.ftp;
      updates.powerZones = {
        zone1: { min: 0, max: Math.round(ftp * 0.55), name: 'Active Recovery' },
        zone2: { min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), name: 'Endurance' },
        zone3: { min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90), name: 'Tempo' },
        zone4: { min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05), name: 'Threshold' },
        zone5: { min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20), name: 'VO2max' },
        zone6: { min: Math.round(ftp * 1.20), max: Math.round(ftp * 1.50), name: 'Anaerobic' },
        zone7: { min: Math.round(ftp * 1.50), max: 9999, name: 'Neuromuscular' },
      };
    }

    // Calculate Pace zones from threshold pace (6-zone model)
    if (profile.thresholdPace) {
      const tp = profile.thresholdPace;
      updates.paceZones = {
        zone1: { min: tp * 0.70, max: tp * 0.80, name: 'Recovery' },
        zone2: { min: tp * 0.80, max: tp * 0.88, name: 'Aerobic' },
        zone3: { min: tp * 0.88, max: tp * 0.95, name: 'Tempo' },
        zone4: { min: tp * 0.95, max: tp * 1.00, name: 'Threshold' },
        zone5: { min: tp * 1.00, max: tp * 1.10, name: 'VO2max' },
        zone6: { min: tp * 1.10, max: tp * 1.30, name: 'Speed' },
      };
    }

    if (Object.keys(updates).length > 0) {
      return this.updateProfile(userId, updates);
    }

    return profile;
  }
}

export const profileService = new ProfileService();
export default profileService;
