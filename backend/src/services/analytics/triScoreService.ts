import { prisma } from '../../config/database';
import { SportType } from '@prisma/client';

interface SportScore {
  score: number;
  trend: number;
  weeklyHours: number;
  weeklyTss: number;
  activityCount: number;
}

interface TriScore {
  overall: number;
  overallTrend: number;
  swim: SportScore;
  bike: SportScore;
  run: SportScore;
  strength: SportScore;
  balance: {
    balanced: boolean;
    balanceScore: number;
    weakest: string;
    strongest: string;
    recommendations: string[];
  };
  fitness: {
    ctl: number;
    atl: number;
    tsb: number;
    rampRate: number;
    fitnessLevel: string;
  };
  lastUpdated: Date;
}

interface ActivityData {
  sportType: SportType;
  tss: number | null;
  movingTime: number;
}

// Sport-specific scoring weights for triathlon focus
const SPORT_WEIGHTS = {
  SWIM: 0.2,
  BIKE: 0.35,
  RUN: 0.3,
  STRENGTH: 0.15,
};

// TSS per hour benchmarks for scoring
const TSS_BENCHMARKS: Record<string, { low: number; medium: number; high: number }> = {
  SWIM: { low: 40, medium: 60, high: 80 },
  BIKE: { low: 50, medium: 70, high: 90 },
  RUN: { low: 60, medium: 80, high: 100 },
  STRENGTH: { low: 30, medium: 50, high: 70 },
};

export class TriScoreService {
  /**
   * Calculate comprehensive Tri-Score for a user
   */
  async calculateTriScore(userId: string): Promise<TriScore> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get recent and previous period activities
    const [recentActivities, previousActivities, latestMetrics] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId,
          startDate: { gte: thirtyDaysAgo },
        },
        select: {
          sportType: true,
          tss: true,
          movingTime: true,
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          startDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        select: {
          sportType: true,
          tss: true,
          movingTime: true,
        },
      }),
      prisma.dailyMetrics.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
    ]);

    // Calculate sport-specific scores
    const swimScore = this.calculateSportScore(
      recentActivities as ActivityData[],
      previousActivities as ActivityData[],
      'SWIM'
    );
    const bikeScore = this.calculateSportScore(
      recentActivities as ActivityData[],
      previousActivities as ActivityData[],
      'BIKE'
    );
    const runScore = this.calculateSportScore(
      recentActivities as ActivityData[],
      previousActivities as ActivityData[],
      'RUN'
    );
    const strengthScore = this.calculateSportScore(
      recentActivities as ActivityData[],
      previousActivities as ActivityData[],
      'STRENGTH'
    );

    // Calculate overall score with weights
    const overall = Math.round(
      swimScore.score * SPORT_WEIGHTS.SWIM +
        bikeScore.score * SPORT_WEIGHTS.BIKE +
        runScore.score * SPORT_WEIGHTS.RUN +
        strengthScore.score * SPORT_WEIGHTS.STRENGTH
    );

    const previousOverall = Math.round(
      (swimScore.score - swimScore.trend) * SPORT_WEIGHTS.SWIM +
        (bikeScore.score - bikeScore.trend) * SPORT_WEIGHTS.BIKE +
        (runScore.score - runScore.trend) * SPORT_WEIGHTS.RUN +
        (strengthScore.score - strengthScore.trend) * SPORT_WEIGHTS.STRENGTH
    );

    // Calculate balance metrics
    const balance = this.calculateBalance(swimScore, bikeScore, runScore, strengthScore);

    // Get fitness metrics
    const fitness = this.getFitnessMetrics(latestMetrics);

    return {
      overall,
      overallTrend: overall - previousOverall,
      swim: swimScore,
      bike: bikeScore,
      run: runScore,
      strength: strengthScore,
      balance,
      fitness,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate score for a specific sport
   */
  private calculateSportScore(
    recentActivities: ActivityData[],
    previousActivities: ActivityData[],
    sport: SportType
  ): SportScore {
    const recent = recentActivities.filter((a) => a.sportType === sport);
    const previous = previousActivities.filter((a) => a.sportType === sport);

    // Calculate current period metrics
    const weeklyTss = recent.reduce((sum, a) => sum + (a.tss || 0), 0) / 4.29; // ~30 days / 7
    const weeklyHours = recent.reduce((sum, a) => sum + a.movingTime, 0) / 3600 / 4.29;
    const activityCount = recent.length;

    // Calculate previous period metrics
    const prevWeeklyTss = previous.reduce((sum, a) => sum + (a.tss || 0), 0) / 4.29;
    const prevWeeklyHours = previous.reduce((sum, a) => sum + a.movingTime, 0) / 3600 / 4.29;

    // Calculate score based on TSS and volume
    const currentScore = this.calculateScoreFromMetrics(sport, weeklyTss, weeklyHours);
    const previousScore = this.calculateScoreFromMetrics(sport, prevWeeklyTss, prevWeeklyHours);

    return {
      score: Math.round(currentScore),
      trend: Math.round(currentScore - previousScore),
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      weeklyTss: Math.round(weeklyTss),
      activityCount,
    };
  }

  /**
   * Calculate score from TSS and hours
   */
  private calculateScoreFromMetrics(sport: SportType, weeklyTss: number, weeklyHours: number): number {
    const benchmark = TSS_BENCHMARKS[sport] || TSS_BENCHMARKS.BIKE;

    // Volume score (0-50 points based on weekly hours)
    let volumeScore = 0;
    if (sport === 'SWIM') {
      volumeScore = Math.min(50, weeklyHours * 15); // ~3.3 hours for max
    } else if (sport === 'BIKE') {
      volumeScore = Math.min(50, weeklyHours * 7.5); // ~6.7 hours for max
    } else if (sport === 'RUN') {
      volumeScore = Math.min(50, weeklyHours * 10); // ~5 hours for max
    } else {
      volumeScore = Math.min(50, weeklyHours * 25); // ~2 hours for max
    }

    // Intensity score (0-50 points based on TSS/hour ratio)
    const tssPerHour = weeklyHours > 0 ? weeklyTss / weeklyHours : 0;
    let intensityScore = 0;
    if (tssPerHour >= benchmark.high) {
      intensityScore = 50;
    } else if (tssPerHour >= benchmark.medium) {
      intensityScore = 30 + ((tssPerHour - benchmark.medium) / (benchmark.high - benchmark.medium)) * 20;
    } else if (tssPerHour >= benchmark.low) {
      intensityScore = 10 + ((tssPerHour - benchmark.low) / (benchmark.medium - benchmark.low)) * 20;
    } else if (tssPerHour > 0) {
      intensityScore = (tssPerHour / benchmark.low) * 10;
    }

    return Math.min(100, volumeScore + intensityScore);
  }

  /**
   * Calculate balance metrics
   */
  private calculateBalance(
    swim: SportScore,
    bike: SportScore,
    run: SportScore,
    strength: SportScore
  ): {
    balanced: boolean;
    balanceScore: number;
    weakest: string;
    strongest: string;
    recommendations: string[];
  } {
    const scores = [
      { name: 'Swim', score: swim.score, weight: SPORT_WEIGHTS.SWIM },
      { name: 'Bike', score: bike.score, weight: SPORT_WEIGHTS.BIKE },
      { name: 'Run', score: run.score, weight: SPORT_WEIGHTS.RUN },
      { name: 'Strength', score: strength.score, weight: SPORT_WEIGHTS.STRENGTH },
    ].sort((a, b) => a.score - b.score);

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const maxDeviation = Math.max(...scores.map((s) => Math.abs(s.score - avgScore)));

    // Balance score: 100 = perfect balance, 0 = very imbalanced
    const balanceScore = Math.max(0, Math.round(100 - maxDeviation * 2));

    const recommendations: string[] = [];

    // Generate recommendations based on imbalances
    if (scores[0].score < avgScore * 0.7) {
      recommendations.push(`Focus on ${scores[0].name.toLowerCase()} training to improve balance`);
    }

    if (swim.score < 40 && bike.score > 60 && run.score > 60) {
      recommendations.push('Prioritize swim technique and volume for triathlon readiness');
    }

    if (strength.score < 30) {
      recommendations.push('Add strength training to prevent injuries and improve power');
    }

    if (balanceScore < 50) {
      recommendations.push('Work on balancing training across all disciplines');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great balance! Maintain consistent training across all sports');
    }

    return {
      balanced: balanceScore >= 70,
      balanceScore,
      weakest: scores[0].name,
      strongest: scores[scores.length - 1].name,
      recommendations,
    };
  }

  /**
   * Get fitness metrics from daily metrics
   */
  private getFitnessMetrics(metrics: {
    ctl: number | null;
    atl: number | null;
    tsb: number | null;
    rampRate: number | null;
  } | null): {
    ctl: number;
    atl: number;
    tsb: number;
    rampRate: number;
    fitnessLevel: string;
  } {
    const ctl = metrics?.ctl || 0;
    const atl = metrics?.atl || 0;
    const tsb = metrics?.tsb || 0;
    const rampRate = metrics?.rampRate || 0;

    // Determine fitness level based on CTL
    let fitnessLevel: string;
    if (ctl >= 100) {
      fitnessLevel = 'Elite';
    } else if (ctl >= 75) {
      fitnessLevel = 'Advanced';
    } else if (ctl >= 50) {
      fitnessLevel = 'Intermediate';
    } else if (ctl >= 25) {
      fitnessLevel = 'Developing';
    } else {
      fitnessLevel = 'Beginner';
    }

    return {
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
      rampRate: Math.round(rampRate * 10) / 10,
      fitnessLevel,
    };
  }

  /**
   * Get Tri-Score breakdown by week
   */
  async getTriScoreHistory(
    userId: string,
    weeks: number = 12
  ): Promise<{ week: string; overall: number; swim: number; bike: number; run: number }[]> {
    const now = new Date();
    const history: { week: string; overall: number; swim: number; bike: number; run: number }[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          startDate: { gte: weekStart, lt: weekEnd },
        },
        select: {
          sportType: true,
          tss: true,
          movingTime: true,
        },
      });

      const getWeeklyScore = (sport: SportType) => {
        const sportActivities = activities.filter((a) => a.sportType === sport);
        const tss = sportActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
        const hours = sportActivities.reduce((sum, a) => sum + a.movingTime, 0) / 3600;
        return Math.round(this.calculateScoreFromMetrics(sport, tss, hours));
      };

      const swimScore = getWeeklyScore('SWIM');
      const bikeScore = getWeeklyScore('BIKE');
      const runScore = getWeeklyScore('RUN');

      history.push({
        week: weekStart.toISOString().split('T')[0],
        overall: Math.round(
          swimScore * SPORT_WEIGHTS.SWIM +
            bikeScore * SPORT_WEIGHTS.BIKE +
            runScore * SPORT_WEIGHTS.RUN
        ),
        swim: swimScore,
        bike: bikeScore,
        run: runScore,
      });
    }

    return history.reverse();
  }

  /**
   * Get dashboard summary metrics
   */
  async getDashboardSummary(userId: string): Promise<{
    triScore: number;
    triScoreTrend: number;
    fitnessLevel: string;
    ctl: number;
    tsb: number;
    weeklyHours: number;
    weeklyTss: number;
    streak: number;
  }> {
    const triScore = await this.calculateTriScore(userId);

    // Calculate streak
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        startDate: { gte: thirtyDaysAgo },
      },
      select: { startDate: true },
      orderBy: { startDate: 'desc' },
    });

    let streak = 0;
    const activityDates = new Set(
      activities.map((a) => a.startDate.toISOString().split('T')[0])
    );

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (activityDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    const weeklyHours =
      triScore.swim.weeklyHours +
      triScore.bike.weeklyHours +
      triScore.run.weeklyHours +
      triScore.strength.weeklyHours;

    const weeklyTss =
      triScore.swim.weeklyTss +
      triScore.bike.weeklyTss +
      triScore.run.weeklyTss +
      triScore.strength.weeklyTss;

    return {
      triScore: triScore.overall,
      triScoreTrend: triScore.overallTrend,
      fitnessLevel: triScore.fitness.fitnessLevel,
      ctl: triScore.fitness.ctl,
      tsb: triScore.fitness.tsb,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      weeklyTss: Math.round(weeklyTss),
      streak,
    };
  }
}

export const triScoreService = new TriScoreService();
export default triScoreService;
