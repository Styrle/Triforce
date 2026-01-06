import { prisma } from '../../config/database';
import { stravaApiClient } from '../strava/apiClient';
import { metricsCalculator } from '../metrics/calculator';
import { pmcService } from '../metrics/pmcService';
import { logger } from '../../utils/logger';
import { StravaActivity, LatLng } from '../../types';
import { SportType } from '@prisma/client';

interface SyncResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class ActivitySyncService {
  /**
   * Sync all activities from Strava for a user
   */
  async syncAllActivities(
    userId: string,
    options: {
      afterDate?: Date;
      fullSync?: boolean;
    } = {}
  ): Promise<SyncResult> {
    const result: SyncResult = {
      total: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Get last sync time if not doing full sync
      let after: number | undefined;
      if (!options.fullSync) {
        const connection = await prisma.stravaConnection.findUnique({
          where: { userId },
          select: { lastSync: true },
        });

        if (connection?.lastSync) {
          after = Math.floor(connection.lastSync.getTime() / 1000);
        }
      }

      if (options.afterDate) {
        after = Math.floor(options.afterDate.getTime() / 1000);
      }

      // Fetch activities in batches
      let page = 1;
      const perPage = 30;
      let hasMore = true;

      while (hasMore) {
        const activities = await stravaApiClient.getActivities(userId, {
          page,
          perPage,
          after,
        });

        if (activities.length === 0) {
          hasMore = false;
          break;
        }

        result.total += activities.length;

        // Process each activity
        for (const stravaActivity of activities) {
          try {
            const syncResult = await this.syncSingleActivity(userId, stravaActivity);
            
            if (syncResult === 'imported') {
              result.imported++;
            } else if (syncResult === 'updated') {
              result.updated++;
            } else {
              result.skipped++;
            }
          } catch (error: any) {
            result.errors.push(`Activity ${stravaActivity.id}: ${error.message}`);
            logger.error(`Failed to sync activity ${stravaActivity.id}:`, error);
          }
        }

        // Check if there are more pages
        if (activities.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Update last sync time
      await prisma.stravaConnection.update({
        where: { userId },
        data: { lastSync: new Date() },
      });

      logger.info(`Sync completed for user ${userId}:`, result);
      return result;
    } catch (error: any) {
      logger.error(`Sync failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Sync a single activity from Strava
   */
  async syncSingleActivity(
    userId: string,
    stravaActivity: StravaActivity
  ): Promise<'imported' | 'updated' | 'skipped'> {
    const stravaId = String(stravaActivity.id);

    // Check if activity already exists
    const existing = await prisma.activity.findUnique({
      where: { stravaId },
    });

    // Map sport type
    const sportType = stravaApiClient.mapSportType(
      stravaActivity.type || stravaActivity.sport_type
    ) as SportType;

    // Prepare activity data
    const activityData = {
      userId,
      stravaId,
      name: stravaActivity.name,
      description: stravaActivity.description || null,
      sportType,
      startDate: new Date(stravaActivity.start_date),
      elapsedTime: stravaActivity.elapsed_time,
      movingTime: stravaActivity.moving_time,
      distance: stravaActivity.distance || null,
      totalElevation: stravaActivity.total_elevation_gain || null,
      avgHeartRate: stravaActivity.average_heartrate
        ? Math.round(stravaActivity.average_heartrate)
        : null,
      maxHeartRate: stravaActivity.max_heartrate
        ? Math.round(stravaActivity.max_heartrate)
        : null,
      avgPower: stravaActivity.average_watts
        ? Math.round(stravaActivity.average_watts)
        : null,
      maxPower: stravaActivity.max_watts
        ? Math.round(stravaActivity.max_watts)
        : null,
      avgSpeed: stravaActivity.average_speed || null,
      maxSpeed: stravaActivity.max_speed || null,
      avgCadence: stravaActivity.average_cadence
        ? Math.round(stravaActivity.average_cadence)
        : null,
      isManual: false,
      processed: false,
    };

    let activity;

    if (existing) {
      // Update existing activity
      activity = await prisma.activity.update({
        where: { id: existing.id },
        data: activityData,
      });
    } else {
      // Create new activity
      activity = await prisma.activity.create({
        data: activityData,
      });
    }

    // Queue processing for metrics calculation
    await this.processActivity(activity.id, userId);

    return existing ? 'updated' : 'imported';
  }

  /**
   * Sync a single activity by Strava ID (for webhooks)
   */
  async syncActivityById(userId: string, stravaActivityId: number): Promise<void> {
    const stravaActivity = await stravaApiClient.getActivity(userId, stravaActivityId);

    if (!stravaActivity) {
      logger.warn(`Activity ${stravaActivityId} not found on Strava`);
      return;
    }

    await this.syncSingleActivity(userId, stravaActivity);
  }

  /**
   * Process activity to calculate metrics
   */
  async processActivity(activityId: string, userId: string): Promise<void> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      if (!activity) {
        logger.warn(`Activity ${activityId} not found for processing`);
        return;
      }

      const profile = activity.user.profile;

      // Calculate TSS based on sport type
      let tss: number | null = null;
      let normalizedPower: number | null = activity.normalizedPower;
      let intensityFactor: number | null = null;

      if (activity.sportType === 'BIKE' && activity.avgPower) {
        // Calculate NP if we have power data (simplified without streams)
        normalizedPower = activity.avgPower; // Would be better with stream data

        if (profile?.ftp && normalizedPower) {
          // Bike TSS = (duration × NP × IF) / (FTP × 3600) × 100
          intensityFactor = normalizedPower / profile.ftp;
          tss = metricsCalculator.calculateBikeTSS(
            activity.movingTime,
            normalizedPower,
            profile.ftp
          );
        }
      } else if (activity.sportType === 'RUN') {
        if (profile?.thresholdPace && activity.avgSpeed && activity.avgSpeed > 0) {
          // Run TSS based on pace
          const avgPace = 1000 / activity.avgSpeed / 60; // min/km
          intensityFactor = profile.thresholdPace / avgPace;
          tss = metricsCalculator.calculateRunTSS(
            activity.movingTime,
            intensityFactor
          );
        } else if (profile?.lthr && activity.avgHeartRate) {
          // Fallback to HR-based TSS
          tss = metricsCalculator.calculateHRBasedTSS(
            activity.movingTime,
            activity.avgHeartRate,
            profile.lthr
          );
        }
      } else if (activity.sportType === 'SWIM') {
        if (profile?.css && activity.avgSpeed && activity.avgSpeed > 0) {
          // Swim TSS
          intensityFactor = activity.avgSpeed / profile.css;
          tss = metricsCalculator.calculateSwimTSS(
            activity.movingTime,
            intensityFactor
          );
        }
      }

      // FALLBACK: Estimate TSS if we couldn't calculate it but have useful data
      if (tss === null) {
        tss = this.estimateTSS(activity);
      }

      // Calculate efficiency factor if we have HR and power/pace
      let efficiencyFactor: number | null = null;
      if (activity.avgHeartRate && activity.avgHeartRate > 0) {
        if (activity.sportType === 'BIKE' && normalizedPower) {
          efficiencyFactor = normalizedPower / activity.avgHeartRate;
        } else if (activity.sportType === 'RUN' && activity.avgSpeed) {
          // EF for running = pace (m/min) / HR
          efficiencyFactor = (activity.avgSpeed * 60) / activity.avgHeartRate;
        }
      }

      // Update activity with calculated metrics
      await prisma.activity.update({
        where: { id: activityId },
        data: {
          tss,
          normalizedPower,
          intensityFactor,
          efficiencyFactor,
          processed: true,
        },
      });

      // Update daily metrics
      await pmcService.updateDailyMetrics(userId, activity.startDate);

      logger.info(`Processed activity ${activityId}: TSS=${tss}, IF=${intensityFactor}`);
    } catch (error) {
      logger.error(`Failed to process activity ${activityId}:`, error);
      throw error;
    }
  }

  /**
   * Estimate TSS when profile thresholds are not set
   * Uses duration, heart rate, and power to estimate training load
   */
  private estimateTSS(activity: {
    sportType: SportType;
    movingTime: number;
    avgHeartRate: number | null;
    avgPower: number | null;
    avgSpeed: number | null;
    distance: number | null;
  }): number {
    const durationHours = activity.movingTime / 3600;

    // Base TSS per hour by sport type (assuming moderate effort)
    const baseTssPerHour: Record<SportType, number> = {
      BIKE: 50,
      RUN: 60,
      SWIM: 55,
      STRENGTH: 40,
      OTHER: 40,
    };

    let baseTss = (baseTssPerHour[activity.sportType] || 50) * durationHours;

    // Adjust based on heart rate intensity if available
    if (activity.avgHeartRate) {
      // Assume 150 bpm is moderate intensity (IF ~= 0.75)
      // Scale TSS based on HR deviation from moderate
      const hrIntensity = activity.avgHeartRate / 150;
      baseTss *= Math.pow(hrIntensity, 2); // Square to emphasize intensity effect
    }

    // For cycling, adjust based on power if available
    if (activity.sportType === 'BIKE' && activity.avgPower) {
      // Assume 150W is moderate for recreational cyclist
      const powerIntensity = activity.avgPower / 150;
      baseTss *= Math.pow(powerIntensity, 1.5);
    }

    // For running, adjust based on pace if available
    if (activity.sportType === 'RUN' && activity.avgSpeed && activity.avgSpeed > 0) {
      // Assume 3 m/s (~5:30/km) is moderate pace
      const paceIntensity = activity.avgSpeed / 3.0;
      baseTss *= Math.pow(paceIntensity, 1.5);
    }

    // Cap estimated TSS to reasonable bounds
    return Math.round(Math.max(10, Math.min(baseTss, 500)));
  }

  /**
   * Recalculate TSS for all activities of a user
   * Optimized: fetches all data at once and batch updates
   * Does NOT update daily metrics (caller should run initializePMC after)
   */
  async recalculateAllTSS(userId: string): Promise<{ processed: number; updated: number }> {
    // Fetch all activities with full data needed for TSS calculation
    const activities = await prisma.activity.findMany({
      where: { userId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    const profile = activities[0]?.user?.profile;
    let updated = 0;
    const updates: Array<{ id: string; tss: number }> = [];

    for (const activity of activities) {
      let tss: number | null = null;

      // Calculate TSS based on sport type
      if (activity.sportType === 'BIKE' && activity.avgPower) {
        const normalizedPower = activity.avgPower;
        if (profile?.ftp && normalizedPower) {
          tss = metricsCalculator.calculateBikeTSS(
            activity.movingTime,
            normalizedPower,
            profile.ftp
          );
        }
      } else if (activity.sportType === 'RUN') {
        if (profile?.thresholdPace && activity.avgSpeed && activity.avgSpeed > 0) {
          const avgPace = 1000 / activity.avgSpeed / 60;
          const intensityFactor = profile.thresholdPace / avgPace;
          tss = metricsCalculator.calculateRunTSS(activity.movingTime, intensityFactor);
        } else if (profile?.lthr && activity.avgHeartRate) {
          tss = metricsCalculator.calculateHRBasedTSS(
            activity.movingTime,
            activity.avgHeartRate,
            profile.lthr
          );
        }
      } else if (activity.sportType === 'SWIM') {
        if (profile?.css && activity.avgSpeed && activity.avgSpeed > 0) {
          const intensityFactor = activity.avgSpeed / profile.css;
          tss = metricsCalculator.calculateSwimTSS(activity.movingTime, intensityFactor);
        }
      }

      // Fallback estimation if no TSS calculated
      if (tss === null) {
        tss = this.estimateTSS(activity);
      }

      // Only update if TSS changed
      if (activity.tss !== tss) {
        updates.push({ id: activity.id, tss });
        updated++;
      }
    }

    // Batch update in chunks
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map(({ id, tss }) =>
          prisma.activity.update({
            where: { id },
            data: { tss, processed: true },
          })
        )
      );
    }

    logger.info(`Recalculated TSS: ${activities.length} processed, ${updated} updated`);
    return { processed: activities.length, updated };
  }

  /**
   * Fetch and store activity streams
   */
  async fetchActivityStreams(
    activityId: string,
    userId: string,
    stravaActivityId: number
  ): Promise<void> {
    try {
      const streams = await stravaApiClient.getActivityStreams(userId, stravaActivityId);

      if (!streams || Object.keys(streams).length === 0) {
        logger.info(`No streams available for activity ${stravaActivityId}`);
        return;
      }

      const timeStream = streams.time?.data || [];
      const hrStream = streams.heartrate?.data || [];
      const powerStream = streams.watts?.data || [];
      const cadenceStream = streams.cadence?.data || [];
      const velocityStream = streams.velocity_smooth?.data || [];
      const altitudeStream = streams.altitude?.data || [];
      const latlngStream: LatLng[] = streams.latlng?.data || [];
      const tempStream = streams.temp?.data || [];

      // Create activity records in batches
      const batchSize = 500;
      const records = [];

      for (let i = 0; i < timeStream.length; i++) {
        const latlng = latlngStream[i];

        records.push({
          activityId,
          timestamp: timeStream[i],
          heartRate: hrStream[i] || null,
          power: powerStream[i] || null,
          cadence: cadenceStream[i] || null,
          speed: velocityStream[i] || null,
          altitude: altitudeStream[i] || null,
          latitude: latlng?.[0] || null,
          longitude: latlng?.[1] || null,
          temperature: tempStream[i] || null,
        });

        // Insert batch
        if (records.length >= batchSize) {
          await prisma.activityRecord.createMany({
            data: records,
          });
          records.length = 0;
        }
      }

      // Insert remaining records
      if (records.length > 0) {
        await prisma.activityRecord.createMany({
          data: records,
        });
      }

      // Mark activity as having streams
      await prisma.activity.update({
        where: { id: activityId },
        data: { hasStreams: true },
      });

      logger.info(`Stored ${timeStream.length} stream records for activity ${activityId}`);
    } catch (error) {
      logger.error(`Failed to fetch streams for activity ${activityId}:`, error);
    }
  }

  /**
   * Delete activity by Strava ID (for webhook delete events)
   */
  async deleteActivityByStravaId(stravaActivityId: string): Promise<void> {
    const activity = await prisma.activity.findUnique({
      where: { stravaId: stravaActivityId },
    });

    if (activity) {
      const { userId, startDate } = activity;

      await prisma.activity.delete({
        where: { id: activity.id },
      });

      // Recalculate daily metrics
      await pmcService.updateDailyMetrics(userId, startDate);

      logger.info(`Deleted activity ${stravaActivityId}`);
    }
  }
}

// Export singleton instance
export const activitySyncService = new ActivitySyncService();
export default activitySyncService;
