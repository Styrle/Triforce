import { prisma } from '../../config/database';
import { metricsCalculator } from '../metrics/calculator';
import { pmcService } from '../metrics/pmcService';
import { logger } from '../../utils/logger';
import { SportType } from '@prisma/client';

// Note: In production, install 'fit-file-parser' package
// npm install fit-file-parser

interface FitRecord {
  timestamp: Date;
  heart_rate?: number;
  power?: number;
  cadence?: number;
  speed?: number;
  altitude?: number;
  position_lat?: number;
  position_long?: number;
  temperature?: number;
  stance_time?: number; // Ground contact time
  vertical_oscillation?: number;
  step_length?: number;
}

interface FitLap {
  start_time: Date;
  total_elapsed_time: number;
  total_timer_time: number;
  total_distance: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power?: number;
  max_power?: number;
  avg_speed?: number;
  avg_cadence?: number;
}

interface FitSession {
  sport: string;
  sub_sport?: string;
  start_time: Date;
  total_elapsed_time: number;
  total_timer_time: number;
  total_distance?: number;
  total_ascent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cadence?: number;
  training_stress_score?: number;
  intensity_factor?: number;
}

interface ParsedFitFile {
  session: FitSession;
  records: FitRecord[];
  laps: FitLap[];
}

export class FitFileParserService {
  /**
   * Map FIT sport type to our SportType
   */
  private mapSportType(fitSport: string): SportType {
    const sportMap: Record<string, SportType> = {
      cycling: 'BIKE',
      running: 'RUN',
      swimming: 'SWIM',
      lap_swimming: 'SWIM',
      open_water: 'SWIM',
      training: 'STRENGTH',
      fitness_equipment: 'STRENGTH',
      weight_training: 'STRENGTH',
    };

    return sportMap[fitSport.toLowerCase()] || 'OTHER';
  }

  /**
   * Parse FIT file buffer
   * Uses fit-file-parser library
   */
  async parseFitFile(buffer: Buffer): Promise<ParsedFitFile> {
    // Dynamic import to handle if package is not installed
    try {
      const FitParser = (await import('fit-file-parser')).default;

      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({
          force: true,
          speedUnit: 'm/s',
          lengthUnit: 'm',
          temperatureUnit: 'celsius',
          elapsedRecordField: true,
          mode: 'cascade',
        });

        fitParser.parse(buffer, (error: Error | null, data: any) => {
          if (error) {
            reject(error);
            return;
          }

          // Extract session data
          const session = data.activity?.sessions?.[0] || data.sessions?.[0];
          if (!session) {
            reject(new Error('No session found in FIT file'));
            return;
          }

          // Extract records
          const records: FitRecord[] = (data.records || []).map((r: any) => ({
            timestamp: new Date(r.timestamp),
            heart_rate: r.heart_rate,
            power: r.power,
            cadence: r.cadence,
            speed: r.speed,
            altitude: r.altitude,
            position_lat: r.position_lat,
            position_long: r.position_long,
            temperature: r.temperature,
            stance_time: r.stance_time,
            vertical_oscillation: r.vertical_oscillation,
            step_length: r.step_length,
          }));

          // Extract laps
          const laps: FitLap[] = (session.laps || []).map((l: any) => ({
            start_time: new Date(l.start_time),
            total_elapsed_time: l.total_elapsed_time,
            total_timer_time: l.total_timer_time,
            total_distance: l.total_distance,
            avg_heart_rate: l.avg_heart_rate,
            max_heart_rate: l.max_heart_rate,
            avg_power: l.avg_power,
            max_power: l.max_power,
            avg_speed: l.avg_speed,
            avg_cadence: l.avg_cadence,
          }));

          resolve({
            session: {
              sport: session.sport,
              sub_sport: session.sub_sport,
              start_time: new Date(session.start_time),
              total_elapsed_time: session.total_elapsed_time,
              total_timer_time: session.total_timer_time,
              total_distance: session.total_distance,
              total_ascent: session.total_ascent,
              avg_heart_rate: session.avg_heart_rate,
              max_heart_rate: session.max_heart_rate,
              avg_power: session.avg_power,
              max_power: session.max_power,
              normalized_power: session.normalized_power,
              avg_speed: session.avg_speed,
              max_speed: session.max_speed,
              avg_cadence: session.avg_cadence,
              training_stress_score: session.training_stress_score,
              intensity_factor: session.intensity_factor,
            },
            records,
            laps,
          });
        });
      });
    } catch {
      throw new Error(
        'FIT file parsing not available. Install fit-file-parser: npm install fit-file-parser'
      );
    }
  }

  /**
   * Import FIT file for a user
   */
  async importFitFile(
    userId: string,
    buffer: Buffer,
    fileName: string
  ): Promise<string> {
    try {
      // Parse the FIT file
      const parsed = await this.parseFitFile(buffer);
      const { session, records, laps } = parsed;

      const sportType = this.mapSportType(session.sport);

      // Check for duplicate based on start time
      const existing = await prisma.activity.findFirst({
        where: {
          userId,
          startDate: session.start_time,
          sportType,
        },
      });

      if (existing) {
        logger.info(`Activity already exists for ${session.start_time}`);
        return existing.id;
      }

      // Calculate NP from records if not in session
      let normalizedPower = session.normalized_power;
      if (!normalizedPower && session.avg_power && records.length > 0) {
        const powerData = records.map((r) => r.power || 0).filter((p) => p > 0);
        if (powerData.length > 0) {
          normalizedPower = metricsCalculator.calculateNormalizedPower(powerData);
        }
      }

      // Create activity
      const activity = await prisma.activity.create({
        data: {
          userId,
          name: fileName.replace(/\.fit$/i, ''),
          sportType,
          startDate: session.start_time,
          elapsedTime: Math.round(session.total_elapsed_time),
          movingTime: Math.round(session.total_timer_time),
          distance: session.total_distance || null,
          totalElevation: session.total_ascent || null,
          avgHeartRate: session.avg_heart_rate
            ? Math.round(session.avg_heart_rate)
            : null,
          maxHeartRate: session.max_heart_rate
            ? Math.round(session.max_heart_rate)
            : null,
          avgPower: session.avg_power ? Math.round(session.avg_power) : null,
          maxPower: session.max_power ? Math.round(session.max_power) : null,
          normalizedPower: normalizedPower ? Math.round(normalizedPower) : null,
          avgSpeed: session.avg_speed || null,
          maxSpeed: session.max_speed || null,
          avgCadence: session.avg_cadence
            ? Math.round(session.avg_cadence)
            : null,
          tss: session.training_stress_score || null,
          intensityFactor: session.intensity_factor || null,
          isManual: false,
          hasStreams: records.length > 0,
          processed: false,
        },
      });

      // Store records (streams) in batches
      if (records.length > 0) {
        const startTimestamp = session.start_time.getTime();
        const batchSize = 500;

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize).map((r) => ({
            activityId: activity.id,
            timestamp: Math.round((r.timestamp.getTime() - startTimestamp) / 1000),
            heartRate: r.heart_rate ? Math.round(r.heart_rate) : null,
            power: r.power ? Math.round(r.power) : null,
            cadence: r.cadence ? Math.round(r.cadence) : null,
            speed: r.speed || null,
            altitude: r.altitude || null,
            latitude: r.position_lat || null,
            longitude: r.position_long || null,
            temperature: r.temperature || null,
            groundContactTime: r.stance_time ? Math.round(r.stance_time) : null,
            verticalOscillation: r.vertical_oscillation || null,
            strideLength: r.step_length || null,
          }));

          await prisma.activityRecord.createMany({
            data: batch,
          });
        }
      }

      // Store laps
      if (laps.length > 0) {
        await prisma.activityLap.createMany({
          data: laps.map((lap, index) => ({
            activityId: activity.id,
            lapIndex: index,
            startTime: lap.start_time,
            elapsedTime: Math.round(lap.total_elapsed_time),
            movingTime: Math.round(lap.total_timer_time),
            distance: lap.total_distance || null,
            avgHeartRate: lap.avg_heart_rate
              ? Math.round(lap.avg_heart_rate)
              : null,
            maxHeartRate: lap.max_heart_rate
              ? Math.round(lap.max_heart_rate)
              : null,
            avgPower: lap.avg_power ? Math.round(lap.avg_power) : null,
            maxPower: lap.max_power ? Math.round(lap.max_power) : null,
            avgSpeed: lap.avg_speed || null,
            avgCadence: lap.avg_cadence ? Math.round(lap.avg_cadence) : null,
          })),
        });
      }

      // Process activity for additional metrics
      await this.processActivity(activity.id, userId);

      logger.info(`Imported FIT file as activity ${activity.id}`);
      return activity.id;
    } catch (error) {
      logger.error('Failed to import FIT file:', error);
      throw error;
    }
  }

  /**
   * Process imported activity to calculate additional metrics
   */
  private async processActivity(activityId: string, userId: string): Promise<void> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          user: {
            include: { profile: true },
          },
        },
      });

      if (!activity) return;

      const profile = activity.user.profile;
      let tss = activity.tss;
      let intensityFactor = activity.intensityFactor;

      // Calculate TSS if not provided in FIT file
      if (!tss) {
        if (activity.sportType === 'BIKE' && activity.normalizedPower && profile?.ftp) {
          tss = metricsCalculator.calculateBikeTSS(
            activity.movingTime,
            activity.normalizedPower,
            profile.ftp
          );
          intensityFactor = activity.normalizedPower / profile.ftp;
        } else if (activity.sportType === 'RUN' && activity.avgSpeed && profile?.thresholdPace) {
          const avgPace = 1000 / activity.avgSpeed / 60;
          intensityFactor = profile.thresholdPace / avgPace;
          tss = metricsCalculator.calculateRunTSS(activity.movingTime, intensityFactor);
        } else if (activity.sportType === 'SWIM' && activity.avgSpeed && profile?.css) {
          intensityFactor = activity.avgSpeed / profile.css;
          tss = metricsCalculator.calculateSwimTSS(activity.movingTime, intensityFactor);
        } else if (activity.avgHeartRate && profile?.lthr) {
          tss = metricsCalculator.calculateHRBasedTSS(
            activity.movingTime,
            activity.avgHeartRate,
            profile.lthr
          );
        }
      }

      // Calculate EF
      let efficiencyFactor: number | null = null;
      if (activity.avgHeartRate && activity.avgHeartRate > 0) {
        if (activity.sportType === 'BIKE' && activity.normalizedPower) {
          efficiencyFactor = activity.normalizedPower / activity.avgHeartRate;
        } else if (activity.sportType === 'RUN' && activity.avgSpeed) {
          efficiencyFactor = (activity.avgSpeed * 60) / activity.avgHeartRate;
        }
      }

      // Calculate decoupling if we have streams
      let decoupling: number | null = null;
      if (activity.hasStreams) {
        decoupling = await metricsCalculator.calculateDecoupling(activityId);
      }

      // Update activity
      await prisma.activity.update({
        where: { id: activityId },
        data: {
          tss,
          intensityFactor,
          efficiencyFactor,
          decoupling,
          processed: true,
        },
      });

      // Update daily metrics
      await pmcService.updateDailyMetrics(userId, activity.startDate);
    } catch (error) {
      logger.error(`Failed to process activity ${activityId}:`, error);
    }
  }
}

// Export singleton instance
export const fitFileParserService = new FitFileParserService();
export default fitFileParserService;
