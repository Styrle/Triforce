import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { ZoneDefinition } from '../../types';
import { HR_ZONE_PERCENTAGES, POWER_ZONE_PERCENTAGES } from '../../config/constants';

/**
 * Time spent in each zone
 */
export interface TimeInZone {
  zone: number;
  name: string;
  seconds: number;
  percentage: number;
}

/**
 * Result of threshold detection
 */
export interface ThresholdDetection {
  value: number;
  confidence: number;
  method: string;
  basedOnActivities: number;
  suggestedAt: Date;
}

/**
 * Zone Calculator Service
 * Calculates training zones for HR, Power, Pace, and Swimming
 */
export class ZoneCalculator {
  /**
   * Calculate HR Zones (7-zone model based on LTHR - Joe Friel)
   * Zone 1: <81% LTHR (Recovery)
   * Zone 2: 81-89% (Aerobic)
   * Zone 3: 89-93% (Tempo)
   * Zone 4: 93-99% (SubThreshold)
   * Zone 5a: 99-102% (SuperThreshold)
   * Zone 5b: 102-106% (VO2max)
   * Zone 5c: >106% (Anaerobic)
   */
  calculateHRZones(lthr: number): ZoneDefinition[] {
    if (lthr <= 0) {
      throw new Error('LTHR must be a positive number');
    }

    return [
      {
        zone: 1,
        name: 'Recovery',
        min: 0,
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone1Max),
        description: 'Active recovery, very easy effort',
      },
      {
        zone: 2,
        name: 'Aerobic',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone1Max),
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone2Max),
        description: 'Endurance pace, conversational',
      },
      {
        zone: 3,
        name: 'Tempo',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone2Max),
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone3Max),
        description: 'Moderate effort, steady state',
      },
      {
        zone: 4,
        name: 'SubThreshold',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone3Max),
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone4Max),
        description: 'Hard effort, sustainable for 20-60 min',
      },
      {
        zone: 5,
        name: 'SuperThreshold',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone4Max),
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone5aMax),
        description: 'Very hard, threshold to VO2max',
      },
      {
        zone: 6,
        name: 'VO2max',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone5aMax),
        max: Math.round(lthr * HR_ZONE_PERCENTAGES.zone5bMax),
        description: 'Maximum aerobic capacity',
      },
      {
        zone: 7,
        name: 'Anaerobic',
        min: Math.round(lthr * HR_ZONE_PERCENTAGES.zone5bMax),
        max: Math.round(lthr * 1.2), // Cap at 120% LTHR
        description: 'Maximum effort, very short duration',
      },
    ];
  }

  /**
   * Calculate Power Zones (7-zone model based on FTP - Coggan)
   * Zone 1: <55% FTP (Active Recovery)
   * Zone 2: 55-75% (Endurance)
   * Zone 3: 75-90% (Tempo)
   * Zone 4: 90-105% (Threshold)
   * Zone 5: 105-120% (VO2max)
   * Zone 6: 120-150% (Anaerobic)
   * Zone 7: >150% (Neuromuscular)
   */
  calculatePowerZones(ftp: number): ZoneDefinition[] {
    if (ftp <= 0) {
      throw new Error('FTP must be a positive number');
    }

    return [
      {
        zone: 1,
        name: 'Active Recovery',
        min: 0,
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone1Max),
        description: 'Very easy spinning, recovery',
      },
      {
        zone: 2,
        name: 'Endurance',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone1Max),
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone2Max),
        description: 'Long rides, base training',
      },
      {
        zone: 3,
        name: 'Tempo',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone2Max),
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone3Max),
        description: 'Brisk pace, moderate effort',
      },
      {
        zone: 4,
        name: 'Threshold',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone3Max),
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone4Max),
        description: 'FTP efforts, sustainable for 20-60 min',
      },
      {
        zone: 5,
        name: 'VO2max',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone4Max),
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone5Max),
        description: '3-8 minute intervals',
      },
      {
        zone: 6,
        name: 'Anaerobic',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone5Max),
        max: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone6Max),
        description: '30s-3min efforts',
      },
      {
        zone: 7,
        name: 'Neuromuscular',
        min: Math.round(ftp * POWER_ZONE_PERCENTAGES.zone6Max),
        max: Math.round(ftp * 2.0), // Cap at 200% FTP
        description: 'Short sprints, max power',
      },
    ];
  }

  /**
   * Calculate Pace Zones (6-zone model based on threshold pace)
   * @param thresholdPace - Threshold pace in m/s
   */
  calculatePaceZones(thresholdPace: number): ZoneDefinition[] {
    if (thresholdPace <= 0) {
      throw new Error('Threshold pace must be a positive number');
    }

    // Convert pace to min/km for user-friendly display
    const paceToMinKm = (speedMs: number): string => {
      const minPerKm = 1000 / speedMs / 60;
      const mins = Math.floor(minPerKm);
      const secs = Math.round((minPerKm - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Zone percentages for running (relative to threshold pace)
    // Lower percentage = slower pace (easier)
    return [
      {
        zone: 1,
        name: 'Recovery',
        min: Math.round(thresholdPace * 0.65 * 100) / 100,
        max: Math.round(thresholdPace * 0.75 * 100) / 100,
        description: `Easy recovery pace (${paceToMinKm(thresholdPace * 0.7)}/km)`,
      },
      {
        zone: 2,
        name: 'Aerobic',
        min: Math.round(thresholdPace * 0.75 * 100) / 100,
        max: Math.round(thresholdPace * 0.85 * 100) / 100,
        description: `Endurance pace (${paceToMinKm(thresholdPace * 0.80)}/km)`,
      },
      {
        zone: 3,
        name: 'Tempo',
        min: Math.round(thresholdPace * 0.85 * 100) / 100,
        max: Math.round(thresholdPace * 0.92 * 100) / 100,
        description: `Marathon to half-marathon pace (${paceToMinKm(thresholdPace * 0.88)}/km)`,
      },
      {
        zone: 4,
        name: 'Threshold',
        min: Math.round(thresholdPace * 0.92 * 100) / 100,
        max: Math.round(thresholdPace * 1.00 * 100) / 100,
        description: `Lactate threshold (${paceToMinKm(thresholdPace * 0.96)}/km)`,
      },
      {
        zone: 5,
        name: 'VO2max',
        min: Math.round(thresholdPace * 1.00 * 100) / 100,
        max: Math.round(thresholdPace * 1.10 * 100) / 100,
        description: `5K race pace (${paceToMinKm(thresholdPace * 1.05)}/km)`,
      },
      {
        zone: 6,
        name: 'Anaerobic',
        min: Math.round(thresholdPace * 1.10 * 100) / 100,
        max: Math.round(thresholdPace * 1.30 * 100) / 100,
        description: `Sprint intervals (${paceToMinKm(thresholdPace * 1.20)}/km)`,
      },
    ];
  }

  /**
   * Calculate Swim Zones (5-zone model based on CSS)
   * @param css - Critical Swim Speed in m/s
   */
  calculateSwimZones(css: number): ZoneDefinition[] {
    if (css <= 0) {
      throw new Error('CSS must be a positive number');
    }

    // Convert to pace per 100m for display
    const pacePer100m = (speedMs: number): string => {
      const secsPer100m = 100 / speedMs;
      const mins = Math.floor(secsPer100m / 60);
      const secs = Math.round(secsPer100m % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return [
      {
        zone: 1,
        name: 'Recovery',
        min: Math.round(css * 0.75 * 100) / 100,
        max: Math.round(css * 0.85 * 100) / 100,
        description: `Easy swimming, drills (${pacePer100m(css * 0.80)}/100m)`,
      },
      {
        zone: 2,
        name: 'Endurance',
        min: Math.round(css * 0.85 * 100) / 100,
        max: Math.round(css * 0.93 * 100) / 100,
        description: `Long distance, aerobic base (${pacePer100m(css * 0.89)}/100m)`,
      },
      {
        zone: 3,
        name: 'Tempo',
        min: Math.round(css * 0.93 * 100) / 100,
        max: Math.round(css * 1.00 * 100) / 100,
        description: `Race pace effort (${pacePer100m(css * 0.96)}/100m)`,
      },
      {
        zone: 4,
        name: 'Threshold',
        min: Math.round(css * 1.00 * 100) / 100,
        max: Math.round(css * 1.05 * 100) / 100,
        description: `CSS intervals (${pacePer100m(css * 1.02)}/100m)`,
      },
      {
        zone: 5,
        name: 'VO2max',
        min: Math.round(css * 1.05 * 100) / 100,
        max: Math.round(css * 1.20 * 100) / 100,
        description: `Sprint work (${pacePer100m(css * 1.12)}/100m)`,
      },
    ];
  }

  /**
   * Calculate time spent in each zone from activity records
   */
  calculateTimeInZones(
    records: Array<{ heartRate?: number | null; power?: number | null; speed?: number | null }>,
    zones: ZoneDefinition[],
    metricType: 'heartRate' | 'power' | 'speed'
  ): TimeInZone[] {
    if (records.length === 0) {
      return zones.map((z) => ({
        zone: z.zone,
        name: z.name,
        seconds: 0,
        percentage: 0,
      }));
    }

    const zoneCounts = zones.map(() => 0);
    let validRecords = 0;

    for (const record of records) {
      const value = record[metricType];
      if (value == null || value <= 0) continue;

      validRecords++;
      for (let i = 0; i < zones.length; i++) {
        if (value >= zones[i].min && value < zones[i].max) {
          zoneCounts[i]++;
          break;
        }
        // Handle values above the highest zone
        if (i === zones.length - 1 && value >= zones[i].max) {
          zoneCounts[i]++;
        }
      }
    }

    const totalSeconds = validRecords; // Assuming 1-second samples

    return zones.map((z, i) => ({
      zone: z.zone,
      name: z.name,
      seconds: zoneCounts[i],
      percentage: totalSeconds > 0 ? Math.round((zoneCounts[i] / totalSeconds) * 1000) / 10 : 0,
    }));
  }

  /**
   * Detect threshold value from recent activities
   * Uses 95% of best 20-minute effort for power (FTP)
   * Uses best sustained HR from long efforts for LTHR
   */
  async detectThreshold(
    userId: string,
    sportType: 'BIKE' | 'RUN' | 'SWIM',
    lookbackDays: number = 90
  ): Promise<ThresholdDetection | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          sportType,
          startDate: { gte: startDate },
          movingTime: { gte: 1200 }, // At least 20 minutes
        },
        include: {
          metrics: true,
        },
        orderBy: { startDate: 'desc' },
      });

      if (activities.length === 0) {
        return null;
      }

      if (sportType === 'BIKE') {
        // Find best 20-min power
        let best20min = 0;
        for (const activity of activities) {
          if (activity.metrics?.peak20min && activity.metrics.peak20min > best20min) {
            best20min = activity.metrics.peak20min;
          }
        }

        if (best20min === 0) {
          // Fall back to normalized power average
          const nps = activities
            .filter((a) => a.normalizedPower)
            .map((a) => a.normalizedPower!);
          if (nps.length > 0) {
            best20min = Math.max(...nps);
          }
        }

        if (best20min === 0) return null;

        const estimatedFTP = Math.round(best20min * 0.95);

        return {
          value: estimatedFTP,
          confidence: activities.length >= 5 ? 0.8 : 0.6,
          method: 'Best 20-min power × 0.95',
          basedOnActivities: activities.length,
          suggestedAt: new Date(),
        };
      } else if (sportType === 'RUN') {
        // Find best threshold pace from tempo/threshold efforts
        const tempoActivities = activities.filter(
          (a) =>
            a.workoutType === 'TEMPO' ||
            a.workoutType === 'TIME_TRIAL' ||
            (a.movingTime >= 1800 && a.movingTime <= 3600)
        );

        if (tempoActivities.length === 0) return null;

        // Use best average pace from 20-40 min efforts
        let bestPace = 0;
        for (const activity of tempoActivities) {
          if (activity.avgSpeed && activity.avgSpeed > bestPace) {
            bestPace = activity.avgSpeed;
          }
        }

        if (bestPace === 0) return null;

        return {
          value: Math.round(bestPace * 100) / 100,
          confidence: tempoActivities.length >= 3 ? 0.75 : 0.5,
          method: 'Best average pace from tempo efforts',
          basedOnActivities: tempoActivities.length,
          suggestedAt: new Date(),
        };
      } else if (sportType === 'SWIM') {
        // Look for test set activities or estimate from longer swims
        const swimActivities = activities.filter(
          (a) => a.distance && a.distance >= 400 && a.distance <= 1500
        );

        if (swimActivities.length === 0) return null;

        let bestPace = 0;
        for (const activity of swimActivities) {
          if (activity.avgSpeed && activity.avgSpeed > bestPace) {
            bestPace = activity.avgSpeed;
          }
        }

        if (bestPace === 0) return null;

        return {
          value: Math.round(bestPace * 100) / 100,
          confidence: 0.6,
          method: 'Best average pace from 400-1500m swims',
          basedOnActivities: swimActivities.length,
          suggestedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to detect threshold for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get all zones for a user based on their profile thresholds
   */
  async getUserZones(userId: string): Promise<{
    hrZones: ZoneDefinition[] | null;
    powerZones: ZoneDefinition[] | null;
    paceZones: ZoneDefinition[] | null;
    swimZones: ZoneDefinition[] | null;
  }> {
    try {
      const profile = await prisma.athleteProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return {
          hrZones: null,
          powerZones: null,
          paceZones: null,
          swimZones: null,
        };
      }

      return {
        hrZones: profile.lthr ? this.calculateHRZones(profile.lthr) : null,
        powerZones: profile.ftp ? this.calculatePowerZones(profile.ftp) : null,
        paceZones: profile.thresholdPace ? this.calculatePaceZones(profile.thresholdPace) : null,
        swimZones: profile.css ? this.calculateSwimZones(profile.css) : null,
      };
    } catch (error) {
      logger.error(`Failed to get zones for user ${userId}:`, error);
      return {
        hrZones: null,
        powerZones: null,
        paceZones: null,
        swimZones: null,
      };
    }
  }
}

// Export singleton instance
export const zoneCalculator = new ZoneCalculator();
export default zoneCalculator;
