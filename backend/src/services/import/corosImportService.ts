import { prisma } from '../../config/database';
import { pmcService } from '../metrics/pmcService';
import { metricsCalculator } from '../metrics/calculator';
import { logger } from '../../utils/logger';
import { SportType } from '@prisma/client';

/**
 * COROS Activity structure from CSV export
 */
interface CorosActivity {
  id: string;
  name: string;
  sportType: SportType;
  startTime: Date;
  duration: number;
  distance: number;
  calories: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPace?: number;
  avgPower?: number;
  trainingLoad?: number;
}

/**
 * Import result statistics
 */
interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * COROS Import Service
 *
 * Handles importing activities from COROS devices via:
 * - CSV export from COROS Training Hub
 * - FIT files (handled by existing FIT parser)
 *
 * Note: COROS doesn't have a public API, so import is done via file export
 */
export class CorosImportService {
  /**
   * Sport type mapping from COROS naming to internal types
   */
  private sportTypeMap: Record<string, SportType> = {
    // Running
    'running': 'RUN',
    'outdoor run': 'RUN',
    'indoor run': 'RUN',
    'run': 'RUN',
    'trail run': 'RUN',
    'trail running': 'RUN',
    'treadmill': 'RUN',
    'track run': 'RUN',

    // Cycling
    'cycling': 'BIKE',
    'outdoor cycling': 'BIKE',
    'indoor cycling': 'BIKE',
    'bike': 'BIKE',
    'ride': 'BIKE',
    'road bike': 'BIKE',
    'mountain bike': 'BIKE',
    'gravel bike': 'BIKE',
    'virtual bike': 'BIKE',
    'indoor bike': 'BIKE',

    // Swimming
    'swimming': 'SWIM',
    'pool swimming': 'SWIM',
    'pool swim': 'SWIM',
    'open water': 'SWIM',
    'open water swimming': 'SWIM',
    'swim': 'SWIM',

    // Strength
    'strength': 'STRENGTH',
    'strength training': 'STRENGTH',
    'gym': 'STRENGTH',
    'weight training': 'STRENGTH',
    'functional training': 'STRENGTH',

    // Other activities
    'walking': 'OTHER',
    'hiking': 'OTHER',
    'triathlon': 'OTHER',
    'multisport': 'OTHER',
    'yoga': 'OTHER',
    'other': 'OTHER',
  };

  /**
   * Parse COROS CSV export file
   *
   * COROS Training Hub exports activities in CSV format with columns like:
   * Date, Activity Type, Duration, Distance, Calories, Avg HR, Max HR, etc.
   */
  async importFromCSV(userId: string, csvContent: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      // Parse headers (handle potential BOM and various delimiters)
      const rawHeaders = lines[0].replace(/^\uFEFF/, ''); // Remove BOM if present
      const delimiter = rawHeaders.includes('\t') ? '\t' : ',';
      const headers = rawHeaders.split(delimiter).map(h =>
        h.trim().toLowerCase().replace(/['"]/g, '')
      );

      logger.debug(`COROS CSV headers: ${headers.join(', ')}`);

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = this.parseCSVLine(line, delimiter);
          const row = this.createRowObject(headers, values);

          const activity = this.parseCorosCSVRow(row);

          // Check for duplicate based on start time and sport type
          const existing = await prisma.activity.findFirst({
            where: {
              userId,
              startDate: activity.startTime,
              sportType: activity.sportType,
            },
          });

          if (existing) {
            result.skipped++;
            continue;
          }

          // Create the activity
          const created = await prisma.activity.create({
            data: {
              userId,
              name: activity.name,
              sportType: activity.sportType,
              startDate: activity.startTime,
              movingTime: activity.duration,
              elapsedTime: activity.duration,
              distance: activity.distance || null,
              avgHeartRate: activity.avgHeartRate || null,
              maxHeartRate: activity.maxHeartRate || null,
              avgSpeed: activity.distance && activity.duration > 0
                ? activity.distance / activity.duration
                : null,
              avgPower: activity.avgPower || null,
              isManual: false,
              processed: false,
            },
          });

          // Calculate TSS and update daily metrics
          await this.processImportedActivity(created.id, userId);

          result.imported++;
        } catch (rowError) {
          const errorMsg = `Row ${i}: ${(rowError as Error).message}`;
          result.errors.push(errorMsg);
          logger.warn(`COROS import error: ${errorMsg}`);
        }
      }

      logger.info(`COROS import complete: ${result.imported} imported, ${result.skipped} skipped`);
      return result;
    } catch (error) {
      logger.error('COROS CSV import failed:', error);
      throw error;
    }
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Create row object from headers and values
   */
  private createRowObject(headers: string[], values: string[]): Record<string, string> {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/^["']|["']$/g, '') || '';
    });
    return row;
  }

  /**
   * Parse a single COROS CSV row into activity structure
   */
  private parseCorosCSVRow(row: Record<string, string>): CorosActivity {
    // Try various column names COROS might use
    const sportRaw = row['sport'] || row['activity type'] || row['type'] || row['workout type'] || 'run';
    const sport = sportRaw.toLowerCase();
    const sportType = this.sportTypeMap[sport] || 'OTHER';

    // Parse date/time
    const dateStr = row['date'] || row['start time'] || row['activity date'];
    const timeStr = row['time'] || row['start time'];
    let startTime: Date;

    if (dateStr) {
      // Try various date formats
      const dateValue = dateStr.includes('T')
        ? new Date(dateStr)
        : new Date(`${dateStr}${timeStr ? ' ' + timeStr : ''}`);

      if (isNaN(dateValue.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
      startTime = dateValue;
    } else {
      throw new Error('No date found in row');
    }

    // Parse duration
    const durationStr = row['duration'] || row['time'] || row['elapsed time'] || row['total time'] || '0';
    const duration = this.parseDuration(durationStr);

    // Parse distance (convert km to meters if needed)
    let distance = 0;
    const distanceStr = row['distance'] || row['total distance'];
    if (distanceStr) {
      const distNum = parseFloat(distanceStr.replace(/[^\d.]/g, ''));
      // COROS typically exports in km, convert to meters
      distance = distanceStr.toLowerCase().includes('mi')
        ? distNum * 1609.34
        : distNum * 1000;
    }

    // Parse optional fields
    const avgHrStr = row['avg hr'] || row['avg heart rate'] || row['average hr'];
    const maxHrStr = row['max hr'] || row['max heart rate'] || row['maximum hr'];
    const caloriesStr = row['calories'] || row['kcal'];
    const avgPowerStr = row['avg power'] || row['average power'];
    const trainingLoadStr = row['training load'] || row['load'];

    return {
      id: row['id'] || `coros-${startTime.getTime()}`,
      name: row['name'] || row['title'] || this.generateActivityName(sportType),
      sportType,
      startTime,
      duration,
      distance,
      calories: caloriesStr ? parseInt(caloriesStr) : 0,
      avgHeartRate: avgHrStr ? parseInt(avgHrStr) : undefined,
      maxHeartRate: maxHrStr ? parseInt(maxHrStr) : undefined,
      avgPower: avgPowerStr ? parseInt(avgPowerStr) : undefined,
      trainingLoad: trainingLoadStr ? parseInt(trainingLoadStr) : undefined,
    };
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(duration: string): number {
    if (!duration || duration === '0') return 0;

    // If it's just a number, assume seconds
    if (/^\d+$/.test(duration)) {
      return parseInt(duration);
    }

    // Handle HH:MM:SS or MM:SS format
    const parts = duration.split(':').map(p => parseInt(p.trim()));

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    // Try parsing as decimal hours or minutes
    const num = parseFloat(duration);
    if (!isNaN(num)) {
      // Assume minutes if under 10, hours if over
      return num < 10 ? num * 3600 : num * 60;
    }

    return 0;
  }

  /**
   * Generate activity name from sport type
   */
  private generateActivityName(sportType: SportType): string {
    const names: Record<SportType, string> = {
      SWIM: 'Swim',
      BIKE: 'Ride',
      RUN: 'Run',
      STRENGTH: 'Strength Training',
      OTHER: 'Activity',
    };
    return names[sportType] || 'Activity';
  }

  /**
   * Process imported activity to calculate metrics
   */
  private async processImportedActivity(activityId: string, userId: string): Promise<void> {
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
      let tss: number | null = null;
      let intensityFactor: number | null = null;

      // Calculate TSS based on available data
      if (activity.avgHeartRate && profile?.lthr) {
        tss = metricsCalculator.calculateHRBasedTSS(
          activity.movingTime,
          activity.avgHeartRate,
          profile.lthr
        );
      } else if (activity.sportType === 'BIKE' && activity.avgPower && profile?.ftp) {
        // Estimate NP as slightly higher than avg power
        const estimatedNP = activity.avgPower * 1.05;
        intensityFactor = estimatedNP / profile.ftp;
        tss = metricsCalculator.calculateBikeTSS(activity.movingTime, estimatedNP, profile.ftp);
      } else if (activity.sportType === 'RUN' && activity.avgSpeed && profile?.thresholdPace) {
        intensityFactor = activity.avgSpeed / profile.thresholdPace;
        tss = metricsCalculator.calculateRunTSS(activity.movingTime, intensityFactor);
      } else if (activity.sportType === 'SWIM' && activity.avgSpeed && profile?.css) {
        intensityFactor = activity.avgSpeed / profile.css;
        tss = metricsCalculator.calculateSwimTSS(activity.movingTime, intensityFactor);
      }

      // Update activity with calculated metrics
      if (tss !== null) {
        await prisma.activity.update({
          where: { id: activityId },
          data: {
            tss,
            intensityFactor,
            processed: true,
          },
        });

        // Update daily metrics
        await pmcService.updateDailyMetrics(userId, activity.startDate);
      }
    } catch (error) {
      logger.error(`Failed to process imported activity ${activityId}:`, error);
    }
  }

  /**
   * Get import statistics for a user
   */
  async getImportStats(userId: string): Promise<{
    totalActivities: number;
    bySource: { strava: number; manual: number; upload: number };
    lastActivity: Date | null;
  }> {
    const [total, stravaCount, manualCount, lastActivity] = await Promise.all([
      prisma.activity.count({ where: { userId } }),
      prisma.activity.count({ where: { userId, stravaId: { not: null } } }),
      prisma.activity.count({ where: { userId, isManual: true } }),
      prisma.activity.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalActivities: total,
      bySource: {
        strava: stravaCount,
        manual: manualCount,
        upload: total - stravaCount - manualCount, // FIT/CSV uploads
      },
      lastActivity: lastActivity?.createdAt || null,
    };
  }
}

// Export singleton instance
export const corosImportService = new CorosImportService();
export default corosImportService;
