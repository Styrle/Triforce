import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { ZoneDefinition } from '../../types';

/**
 * CSS calculation result
 */
export interface CSSResult {
  css: number; // m/s
  cssPace100m: number; // seconds per 100m
  cssPaceFormatted: string; // e.g., "1:45"
  estimatedT750: number; // seconds
  estimatedT1500: number; // seconds
}

/**
 * CSS estimate from historical data
 */
export interface CSSEstimate {
  css: number;
  cssPace100m: number;
  cssPaceFormatted: string;
  confidence: number;
  basedOn: string;
  swimCount: number;
}

/**
 * Swim zone definition
 */
export interface SwimZone extends ZoneDefinition {
  paceMin: string; // Formatted pace (e.g., "1:45")
  paceMax: string;
}

/**
 * CSS Calculator Service
 * Critical Swim Speed calculations and swim zone management
 */
export class CSSService {
  /**
   * Format seconds to pace string (e.g., "1:45")
   */
  formatPace(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parse pace string to seconds (e.g., "1:45" -> 105)
   */
  parsePace(pace: string): number {
    const parts = pace.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return mins * 60 + secs;
  }

  /**
   * Calculate CSS (Critical Swim Speed) from 400m and 200m time trials
   *
   * CSS = (D2 - D1) / (T2 - T1)
   * Where D2 = 400m, D1 = 200m, T2/T1 = times in seconds
   *
   * @param t400Seconds - Time for 400m in seconds
   * @param t200Seconds - Time for 200m in seconds
   */
  calculateCSS(t400Seconds: number, t200Seconds: number): CSSResult {
    if (t400Seconds <= 0 || t200Seconds <= 0) {
      throw new Error('Times must be positive numbers');
    }

    if (t400Seconds <= t200Seconds) {
      throw new Error('400m time must be greater than 200m time');
    }

    // CSS formula: (D2 - D1) / (T2 - T1)
    const d2 = 400; // meters
    const d1 = 200; // meters
    const css = (d2 - d1) / (t400Seconds - t200Seconds); // m/s

    // Calculate pace per 100m
    const cssPace100m = 100 / css; // seconds per 100m

    // Estimate times for common distances using CSS pace
    // These are estimates - actual race times will be faster due to anaerobic contribution
    const estimatedT750 = (750 / css) * 1.02; // Add 2% for pacing/turns
    const estimatedT1500 = (1500 / css) * 1.03; // Add 3% for longer distance

    return {
      css: Math.round(css * 1000) / 1000,
      cssPace100m: Math.round(cssPace100m * 10) / 10,
      cssPaceFormatted: this.formatPace(cssPace100m),
      estimatedT750: Math.round(estimatedT750),
      estimatedT1500: Math.round(estimatedT1500),
    };
  }

  /**
   * Estimate CSS from user's swim history
   * Uses average of best paced swims between 400-1500m
   */
  async estimateCSSFromHistory(userId: string): Promise<CSSEstimate | null> {
    try {
      // Look for swim activities in the last 90 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const swims = await prisma.activity.findMany({
        where: {
          userId,
          sportType: 'SWIM',
          startDate: { gte: startDate },
          distance: { gte: 400, lte: 1500 },
          avgSpeed: { gt: 0 },
        },
        orderBy: { avgSpeed: 'desc' },
        take: 10,
      });

      if (swims.length === 0) {
        return null;
      }

      // Use the best (fastest) swim pace as basis
      const bestSwim = swims[0];
      if (!bestSwim.avgSpeed) return null;

      // CSS is typically 90-95% of best 400-1500m pace
      // Use 93% as middle estimate
      const estimatedCSS = bestSwim.avgSpeed * 0.93;
      const cssPace100m = 100 / estimatedCSS;

      let confidence = 0.5;
      let basedOn = 'single swim';

      if (swims.length >= 5) {
        confidence = 0.7;
        basedOn = `${swims.length} swims`;
      } else if (swims.length >= 3) {
        confidence = 0.6;
        basedOn = `${swims.length} swims`;
      }

      // If we have multiple swims, average top 3
      if (swims.length >= 3) {
        const top3Speeds = swims.slice(0, 3).map((s) => s.avgSpeed || 0);
        const avgBestSpeed = top3Speeds.reduce((a, b) => a + b, 0) / top3Speeds.length;
        const refinedCSS = avgBestSpeed * 0.93;
        return {
          css: Math.round(refinedCSS * 1000) / 1000,
          cssPace100m: Math.round((100 / refinedCSS) * 10) / 10,
          cssPaceFormatted: this.formatPace(100 / refinedCSS),
          confidence,
          basedOn,
          swimCount: swims.length,
        };
      }

      return {
        css: Math.round(estimatedCSS * 1000) / 1000,
        cssPace100m: Math.round(cssPace100m * 10) / 10,
        cssPaceFormatted: this.formatPace(cssPace100m),
        confidence,
        basedOn,
        swimCount: swims.length,
      };
    } catch (error) {
      logger.error(`Failed to estimate CSS for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Calculate swim zones from CSS pace
   *
   * Zone 1 (Recovery): 115-125% CSS pace (slower)
   * Zone 2 (Endurance): 105-115% CSS pace
   * Zone 3 (Tempo): 95-105% CSS pace (CSS pace is in this zone)
   * Zone 4 (Threshold): 90-95% CSS pace (faster)
   * Zone 5 (VO2max): 80-90% CSS pace (much faster)
   *
   * Note: Lower percentage = faster pace (more seconds per 100m)
   * We express zones in m/s for consistency with other metrics
   *
   * @param cssPace100m - CSS pace in seconds per 100m
   */
  calculateSwimZones(cssPace100m: number): SwimZone[] {
    if (cssPace100m <= 0) {
      throw new Error('CSS pace must be a positive number');
    }

    const css = 100 / cssPace100m; // Convert to m/s

    // Zone percentages are relative to CSS speed
    // Lower percentage = slower speed = higher pace (more seconds)
    return [
      {
        zone: 1,
        name: 'Recovery',
        min: Math.round(css * 0.75 * 100) / 100,
        max: Math.round(css * 0.85 * 100) / 100,
        description: 'Easy swimming, drills, warmup/cooldown',
        paceMin: this.formatPace(100 / (css * 0.85)),
        paceMax: this.formatPace(100 / (css * 0.75)),
      },
      {
        zone: 2,
        name: 'Endurance',
        min: Math.round(css * 0.85 * 100) / 100,
        max: Math.round(css * 0.93 * 100) / 100,
        description: 'Aerobic base, long distance sets',
        paceMin: this.formatPace(100 / (css * 0.93)),
        paceMax: this.formatPace(100 / (css * 0.85)),
      },
      {
        zone: 3,
        name: 'Tempo',
        min: Math.round(css * 0.93 * 100) / 100,
        max: Math.round(css * 1.0 * 100) / 100,
        description: 'Tempo efforts, race pace simulation',
        paceMin: this.formatPace(100 / css),
        paceMax: this.formatPace(100 / (css * 0.93)),
      },
      {
        zone: 4,
        name: 'Threshold',
        min: Math.round(css * 1.0 * 100) / 100,
        max: Math.round(css * 1.05 * 100) / 100,
        description: 'CSS intervals, threshold training',
        paceMin: this.formatPace(100 / (css * 1.05)),
        paceMax: this.formatPace(100 / css),
      },
      {
        zone: 5,
        name: 'VO2max',
        min: Math.round(css * 1.05 * 100) / 100,
        max: Math.round(css * 1.20 * 100) / 100,
        description: 'High intensity, sprint work',
        paceMin: this.formatPace(100 / (css * 1.20)),
        paceMax: this.formatPace(100 / (css * 1.05)),
      },
    ];
  }

  /**
   * Update user's CSS in their profile
   */
  async updateUserCSS(userId: string, css: number): Promise<void> {
    try {
      await prisma.athleteProfile.upsert({
        where: { userId },
        update: { css },
        create: {
          userId,
          css,
        },
      });

      logger.info(`Updated CSS for user ${userId}: ${css} m/s`);
    } catch (error) {
      logger.error(`Failed to update CSS for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate training paces from CSS
   */
  getTrainingPaces(css: number): {
    recovery: { speed: number; pace: string };
    endurance: { speed: number; pace: string };
    tempo: { speed: number; pace: string };
    threshold: { speed: number; pace: string };
    interval: { speed: number; pace: string };
    sprint: { speed: number; pace: string };
  } {
    return {
      recovery: {
        speed: Math.round(css * 0.80 * 1000) / 1000,
        pace: this.formatPace(100 / (css * 0.80)),
      },
      endurance: {
        speed: Math.round(css * 0.88 * 1000) / 1000,
        pace: this.formatPace(100 / (css * 0.88)),
      },
      tempo: {
        speed: Math.round(css * 0.95 * 1000) / 1000,
        pace: this.formatPace(100 / (css * 0.95)),
      },
      threshold: {
        speed: Math.round(css * 1.0 * 1000) / 1000,
        pace: this.formatPace(100 / css),
      },
      interval: {
        speed: Math.round(css * 1.05 * 1000) / 1000,
        pace: this.formatPace(100 / (css * 1.05)),
      },
      sprint: {
        speed: Math.round(css * 1.15 * 1000) / 1000,
        pace: this.formatPace(100 / (css * 1.15)),
      },
    };
  }

  /**
   * Predict race times from CSS
   */
  predictRaceTimes(css: number): {
    t400: { time: number; formatted: string };
    t750: { time: number; formatted: string };
    t1500: { time: number; formatted: string };
    t1900: { time: number; formatted: string };
    t3800: { time: number; formatted: string };
  } {
    // Race predictions use CSS with adjustments for distance
    // Shorter = can go faster than CSS, Longer = slower than CSS
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hours}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const t400 = 400 / (css * 1.03); // Can go 3% faster than CSS for 400m
    const t750 = 750 / css; // CSS pace for 750m (half-IM swim)
    const t1500 = 1500 / (css * 0.98); // 2% slower than CSS for 1500m
    const t1900 = 1900 / (css * 0.97); // 3% slower for Olympic swim
    const t3800 = 3800 / (css * 0.95); // 5% slower for full IM swim

    return {
      t400: { time: Math.round(t400), formatted: formatTime(t400) },
      t750: { time: Math.round(t750), formatted: formatTime(t750) },
      t1500: { time: Math.round(t1500), formatted: formatTime(t1500) },
      t1900: { time: Math.round(t1900), formatted: formatTime(t1900) },
      t3800: { time: Math.round(t3800), formatted: formatTime(t3800) },
    };
  }
}

// Export singleton instance
export const cssService = new CSSService();
export default cssService;
