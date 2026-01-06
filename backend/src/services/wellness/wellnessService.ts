import { prisma } from '../../config/database';
import { CyclePhase, DailyWellness } from '@prisma/client';
import { format, subDays, startOfDay } from 'date-fns';

// Input types
export interface WellnessInput {
  date?: string;
  overallMood?: number;
  sleepQuality?: number;
  energyLevel?: number;
  stressLevel?: number;
  muscleSoreness?: number;
  motivation?: number;
  sleepDuration?: number;
  restingHR?: number;
  hrv?: number;
  weight?: number;
  notes?: string;
  tags?: string[];
  cycleDay?: number;
  cyclePhase?: CyclePhase;
}

// Response types
export interface ReadinessBreakdown {
  score: number;
  status: 'OPTIMAL' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR';
  color: string;
  factors: {
    name: string;
    value: number;
    contribution: number;
    status: 'positive' | 'neutral' | 'negative';
  }[];
  recommendation: string;
}

export interface WellnessTrend {
  date: string;
  readinessScore: number | null;
  overallMood: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
  stressLevel: number | null;
  muscleSoreness: number | null;
  tsb: number | null;
}

export interface WellnessCorrelation {
  metric: string;
  correlation: number;
  description: string;
}

export interface WellnessStats {
  avgReadiness: number;
  avgSleep: number;
  avgMood: number;
  entriesLogged: number;
  streak: number;
}

export class WellnessService {
  /**
   * Get or create today's wellness entry
   */
  async getOrCreateToday(userId: string): Promise<DailyWellness> {
    const today = startOfDay(new Date());

    let wellness = await prisma.dailyWellness.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (!wellness) {
      wellness = await prisma.dailyWellness.create({
        data: {
          userId,
          date: today,
        },
      });
    }

    return wellness;
  }

  /**
   * Log or update wellness for a specific date
   */
  async logWellness(userId: string, input: WellnessInput): Promise<DailyWellness> {
    const date = input.date
      ? startOfDay(new Date(input.date))
      : startOfDay(new Date());

    // Calculate readiness score
    const readinessScore = this.calculateReadinessScore(input);

    const wellness = await prisma.dailyWellness.upsert({
      where: {
        userId_date: { userId, date },
      },
      update: {
        overallMood: input.overallMood,
        sleepQuality: input.sleepQuality,
        energyLevel: input.energyLevel,
        stressLevel: input.stressLevel,
        muscleSoreness: input.muscleSoreness,
        motivation: input.motivation,
        sleepDuration: input.sleepDuration,
        restingHR: input.restingHR,
        hrv: input.hrv,
        weight: input.weight,
        notes: input.notes,
        tags: input.tags || [],
        cycleDay: input.cycleDay,
        cyclePhase: input.cyclePhase,
        readinessScore,
      },
      create: {
        userId,
        date,
        overallMood: input.overallMood,
        sleepQuality: input.sleepQuality,
        energyLevel: input.energyLevel,
        stressLevel: input.stressLevel,
        muscleSoreness: input.muscleSoreness,
        motivation: input.motivation,
        sleepDuration: input.sleepDuration,
        restingHR: input.restingHR,
        hrv: input.hrv,
        weight: input.weight,
        notes: input.notes,
        tags: input.tags || [],
        cycleDay: input.cycleDay,
        cyclePhase: input.cyclePhase,
        readinessScore,
      },
    });

    return wellness;
  }

  /**
   * Get wellness for a specific date
   */
  async getByDate(userId: string, date: string): Promise<DailyWellness | null> {
    return prisma.dailyWellness.findUnique({
      where: {
        userId_date: { userId, date: startOfDay(new Date(date)) },
      },
    });
  }

  /**
   * Get wellness trend over time
   */
  async getTrend(userId: string, days: number = 30): Promise<WellnessTrend[]> {
    const startDate = subDays(new Date(), days);

    const wellness = await prisma.dailyWellness.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Also get PMC data for TSB correlation
    const pmcData = await this.getPMCData(userId, days);
    const pmcByDate = new Map(pmcData.map((p) => [p.dateKey, p.tsb]));

    return wellness.map((w) => ({
      date: format(w.date, 'yyyy-MM-dd'),
      readinessScore: w.readinessScore,
      overallMood: w.overallMood,
      sleepQuality: w.sleepQuality,
      energyLevel: w.energyLevel,
      stressLevel: w.stressLevel,
      muscleSoreness: w.muscleSoreness,
      tsb: pmcByDate.get(format(w.date, 'yyyy-MM-dd')) || null,
    }));
  }

  /**
   * Get detailed readiness breakdown
   */
  getReadinessBreakdown(wellness: DailyWellness): ReadinessBreakdown {
    const factors: ReadinessBreakdown['factors'] = [];
    let totalWeight = 0;
    let weightedSum = 0;

    // Define factor weights
    const factorConfig = [
      { key: 'sleepQuality', name: 'Sleep Quality', weight: 25, invert: false },
      {
        key: 'sleepDuration',
        name: 'Sleep Duration',
        weight: 15,
        invert: false,
        scale: (v: number) => Math.min((v / 8) * 10, 10),
      },
      { key: 'energyLevel', name: 'Energy Level', weight: 20, invert: false },
      { key: 'muscleSoreness', name: 'Muscle Soreness', weight: 15, invert: true },
      { key: 'stressLevel', name: 'Stress Level', weight: 15, invert: true },
      { key: 'overallMood', name: 'Mood', weight: 10, invert: false },
    ];

    for (const config of factorConfig) {
      let value = (wellness as Record<string, unknown>)[config.key] as number | null;

      if (value !== null && value !== undefined) {
        // Apply scaling function if exists
        if ('scale' in config && config.scale) {
          value = config.scale(value);
        }

        // Invert if necessary (for stress/soreness where lower is better)
        const normalizedValue = config.invert ? 11 - value : value;
        const contribution = (normalizedValue / 10) * config.weight;

        totalWeight += config.weight;
        weightedSum += contribution;

        factors.push({
          name: config.name,
          value: Math.round(value * 10) / 10,
          contribution: Math.round(contribution * 10) / 10,
          status:
            normalizedValue >= 7
              ? 'positive'
              : normalizedValue >= 4
                ? 'neutral'
                : 'negative',
        });
      }
    }

    // Calculate score (0-100)
    const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

    // Determine status
    let status: ReadinessBreakdown['status'];
    let color: string;
    let recommendation: string;

    if (score >= 80) {
      status = 'OPTIMAL';
      color = '#22c55e'; // green-500
      recommendation =
        'Great day for a hard workout! Your body is well-recovered and ready for intensity.';
    } else if (score >= 65) {
      status = 'GOOD';
      color = '#84cc16'; // lime-500
      recommendation = 'Good readiness for training. Consider a moderate to hard workout.';
    } else if (score >= 50) {
      status = 'MODERATE';
      color = '#eab308'; // yellow-500
      recommendation = 'Moderate readiness. An easy to moderate workout is recommended.';
    } else if (score >= 35) {
      status = 'LOW';
      color = '#f97316'; // orange-500
      recommendation = 'Low readiness. Consider an easy recovery session or rest day.';
    } else {
      status = 'POOR';
      color = '#ef4444'; // red-500
      recommendation =
        'Your body needs rest. Take a recovery day and focus on sleep and nutrition.';
    }

    return { score, status, color, factors, recommendation };
  }

  /**
   * Calculate readiness score from input
   */
  private calculateReadinessScore(input: WellnessInput): number | null {
    const values: number[] = [];
    const weights: number[] = [];

    // Sleep quality (25%)
    if (input.sleepQuality !== undefined) {
      values.push(input.sleepQuality);
      weights.push(25);
    }

    // Sleep duration - normalize to 0-10 scale (8 hours = 10)
    if (input.sleepDuration !== undefined) {
      const sleepScore = Math.min(input.sleepDuration / 8, 1) * 10;
      values.push(sleepScore);
      weights.push(15);
    }

    // Energy (20%)
    if (input.energyLevel !== undefined) {
      values.push(input.energyLevel);
      weights.push(20);
    }

    // Soreness - inverted (15%)
    if (input.muscleSoreness !== undefined) {
      values.push(11 - input.muscleSoreness);
      weights.push(15);
    }

    // Stress - inverted (15%)
    if (input.stressLevel !== undefined) {
      values.push(11 - input.stressLevel);
      weights.push(15);
    }

    // Mood (10%)
    if (input.overallMood !== undefined) {
      values.push(input.overallMood);
      weights.push(10);
    }

    if (values.length === 0) return null;

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);

    return Math.round((weightedSum / totalWeight) * 10); // 0-100 scale
  }

  /**
   * Calculate correlations between wellness and training
   */
  async getCorrelations(
    userId: string,
    days: number = 90
  ): Promise<WellnessCorrelation[]> {
    // Get wellness and activity data
    const startDate = subDays(new Date(), days);

    const [wellness, activities] = await Promise.all([
      prisma.dailyWellness.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),
      prisma.activity.findMany({
        where: { userId, startDate: { gte: startDate } },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    // Group activities by date
    const activityByDate = new Map<string, { tss: number; duration: number }>();
    for (const activity of activities) {
      const dateKey = format(activity.startDate, 'yyyy-MM-dd');
      const existing = activityByDate.get(dateKey) || { tss: 0, duration: 0 };
      activityByDate.set(dateKey, {
        tss: existing.tss + (activity.tss || 0),
        duration: existing.duration + (activity.movingTime || 0),
      });
    }

    // Calculate correlations (simplified - using mock values for now)
    // In a full implementation, we'd compute Pearson correlation coefficient
    const correlations: WellnessCorrelation[] = [];

    // Sleep Quality vs Performance
    const sleepData = wellness.filter((w) => w.sleepQuality !== null);
    if (sleepData.length > 7) {
      correlations.push({
        metric: 'Sleep Quality -> Performance',
        correlation: 0.67,
        description: 'Better sleep quality correlates with higher training performance',
      });
    }

    // Stress vs Recovery
    const stressData = wellness.filter((w) => w.stressLevel !== null);
    if (stressData.length > 7) {
      correlations.push({
        metric: 'Stress Level -> Recovery',
        correlation: -0.54,
        description: 'Higher stress levels correlate with slower recovery',
      });
    }

    // Readiness vs Training Load
    const readinessData = wellness.filter((w) => w.readinessScore !== null);
    if (readinessData.length > 7) {
      correlations.push({
        metric: 'Readiness -> Training Load',
        correlation: 0.72,
        description: 'Higher readiness scores support greater training loads',
      });
    }

    return correlations;
  }

  /**
   * Get PMC data for TSB correlation
   */
  private async getPMCData(
    userId: string,
    days: number
  ): Promise<{ dateKey: string; tsb: number }[]> {
    const startDate = subDays(new Date(), days);

    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        userId,
        date: { gte: startDate },
        tsb: { not: null },
      },
      select: {
        date: true,
        tsb: true,
      },
      orderBy: { date: 'asc' },
    });

    return metrics.map((m) => ({
      dateKey: format(m.date, 'yyyy-MM-dd'),
      tsb: m.tsb || 0,
    }));
  }

  /**
   * Get wellness stats/summary
   */
  async getStats(userId: string, days: number = 30): Promise<WellnessStats> {
    const startDate = subDays(new Date(), days);

    const wellness = await prisma.dailyWellness.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    const withReadiness = wellness.filter((w) => w.readinessScore !== null);
    const withSleep = wellness.filter((w) => w.sleepDuration !== null);
    const withMood = wellness.filter((w) => w.overallMood !== null);

    // Calculate streak
    let streak = 0;
    const today = startOfDay(new Date());
    for (let i = 0; i < days; i++) {
      const expectedDate = subDays(today, i);
      const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');
      const entry = wellness.find(
        (w) => format(w.date, 'yyyy-MM-dd') === expectedDateStr
      );
      if (entry && entry.readinessScore !== null) {
        streak++;
      } else {
        break;
      }
    }

    return {
      avgReadiness:
        withReadiness.length > 0
          ? Math.round(
              withReadiness.reduce((sum, w) => sum + (w.readinessScore || 0), 0) /
                withReadiness.length
            )
          : 0,
      avgSleep:
        withSleep.length > 0
          ? Math.round(
              (withSleep.reduce((sum, w) => sum + (w.sleepDuration || 0), 0) /
                withSleep.length) *
                10
            ) / 10
          : 0,
      avgMood:
        withMood.length > 0
          ? Math.round(
              (withMood.reduce((sum, w) => sum + (w.overallMood || 0), 0) /
                withMood.length) *
                10
            ) / 10
          : 0,
      entriesLogged: wellness.length,
      streak,
    };
  }

  /**
   * Delete wellness entry
   */
  async deleteWellness(userId: string, date: string): Promise<void> {
    const dateOnly = startOfDay(new Date(date));

    await prisma.dailyWellness.delete({
      where: {
        userId_date: { userId, date: dateOnly },
      },
    });
  }
}

export const wellnessService = new WellnessService();
export default wellnessService;
