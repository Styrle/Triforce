import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Running dynamics metrics
 */
export interface RunningDynamicsMetrics {
  avgGCT: number | null; // Ground Contact Time (ms)
  avgVO: number | null; // Vertical Oscillation (cm)
  avgStrideLength: number | null; // meters
  avgCadence: number | null; // steps per minute
  verticalRatio: number | null; // VO / stride length (%)
  gctBalance: number | null; // L/R balance (% left)
}

/**
 * Benchmark rating
 */
export type BenchmarkRating = 'elite' | 'good' | 'average' | 'needs_improvement';

/**
 * Benchmark result for a metric
 */
export interface Benchmark {
  metric: string;
  value: number | null;
  unit: string;
  rating: BenchmarkRating;
  eliteRange: string;
  goodRange: string;
  description: string;
}

/**
 * Full dynamics analysis
 */
export interface DynamicsAnalysis {
  metrics: RunningDynamicsMetrics;
  benchmarks: Benchmark[];
  recommendations: string[];
  overallScore: number; // 0-100
  formRating: 'excellent' | 'good' | 'average' | 'poor';
}

/**
 * Running Dynamics Service
 * Analyzes running form metrics and provides benchmarks/recommendations
 */
export class RunningDynamicsService {
  /**
   * Benchmark thresholds for running dynamics
   */
  private benchmarks = {
    gct: {
      elite: 200,
      good: 240,
      average: 280,
    },
    vo: {
      elite: 6.5,
      good: 8.5,
      average: 10.0,
    },
    cadence: {
      elite: 185,
      good: 175,
      average: 165,
    },
    verticalRatio: {
      elite: 6.0,
      good: 8.0,
      average: 10.0,
    },
    strideLength: {
      // Relative to height - expressed as percentage
      elite: 130, // 130% of height
      good: 115,
      average: 100,
    },
  };

  /**
   * Analyze running dynamics from activity records
   */
  async analyzeRunningDynamics(activityId: string): Promise<DynamicsAnalysis | null> {
    try {
      const records = await prisma.activityRecord.findMany({
        where: { activityId },
        select: {
          groundContactTime: true,
          verticalOscillation: true,
          strideLength: true,
          cadence: true,
          speed: true,
        },
      });

      if (records.length === 0) {
        return null;
      }

      // Calculate averages
      const validGCT = records.filter((r) => r.groundContactTime).map((r) => r.groundContactTime!);
      const validVO = records.filter((r) => r.verticalOscillation).map((r) => r.verticalOscillation!);
      const validStride = records.filter((r) => r.strideLength).map((r) => r.strideLength!);
      const validCadence = records.filter((r) => r.cadence).map((r) => r.cadence!);

      const avg = (arr: number[]): number | null =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const metrics: RunningDynamicsMetrics = {
        avgGCT: validGCT.length > 0 ? Math.round(avg(validGCT)!) : null,
        avgVO: validVO.length > 0 ? Math.round(avg(validVO)! * 10) / 10 : null,
        avgStrideLength: validStride.length > 0 ? Math.round(avg(validStride)! * 100) / 100 : null,
        avgCadence: validCadence.length > 0 ? Math.round(avg(validCadence)!) : null,
        verticalRatio: null,
        gctBalance: null,
      };

      // Calculate vertical ratio if both metrics available
      if (metrics.avgVO && metrics.avgStrideLength && metrics.avgStrideLength > 0) {
        // VO is in cm, stride is in m, so convert stride to cm
        metrics.verticalRatio =
          Math.round((metrics.avgVO / (metrics.avgStrideLength * 100)) * 1000) / 10;
      }

      // Get benchmarks
      const benchmarks = this.getBenchmarks(metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, benchmarks);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(benchmarks);

      let formRating: DynamicsAnalysis['formRating'];
      if (overallScore >= 85) formRating = 'excellent';
      else if (overallScore >= 70) formRating = 'good';
      else if (overallScore >= 50) formRating = 'average';
      else formRating = 'poor';

      return {
        metrics,
        benchmarks,
        recommendations,
        overallScore,
        formRating,
      };
    } catch (error) {
      logger.error(`Failed to analyze running dynamics for activity ${activityId}:`, error);
      return null;
    }
  }

  /**
   * Get benchmarks for running dynamics metrics
   */
  getBenchmarks(metrics: RunningDynamicsMetrics): Benchmark[] {
    const benchmarks: Benchmark[] = [];

    // Ground Contact Time
    if (metrics.avgGCT !== null) {
      let rating: BenchmarkRating;
      if (metrics.avgGCT <= this.benchmarks.gct.elite) rating = 'elite';
      else if (metrics.avgGCT <= this.benchmarks.gct.good) rating = 'good';
      else if (metrics.avgGCT <= this.benchmarks.gct.average) rating = 'average';
      else rating = 'needs_improvement';

      benchmarks.push({
        metric: 'Ground Contact Time',
        value: metrics.avgGCT,
        unit: 'ms',
        rating,
        eliteRange: `<${this.benchmarks.gct.elite}ms`,
        goodRange: `${this.benchmarks.gct.elite}-${this.benchmarks.gct.good}ms`,
        description: 'Time your foot spends on the ground. Lower is generally better.',
      });
    }

    // Vertical Oscillation
    if (metrics.avgVO !== null) {
      let rating: BenchmarkRating;
      if (metrics.avgVO <= this.benchmarks.vo.elite) rating = 'elite';
      else if (metrics.avgVO <= this.benchmarks.vo.good) rating = 'good';
      else if (metrics.avgVO <= this.benchmarks.vo.average) rating = 'average';
      else rating = 'needs_improvement';

      benchmarks.push({
        metric: 'Vertical Oscillation',
        value: metrics.avgVO,
        unit: 'cm',
        rating,
        eliteRange: `<${this.benchmarks.vo.elite}cm`,
        goodRange: `${this.benchmarks.vo.elite}-${this.benchmarks.vo.good}cm`,
        description: 'Vertical bounce per step. Less bounce = more efficient.',
      });
    }

    // Cadence
    if (metrics.avgCadence !== null) {
      let rating: BenchmarkRating;
      if (metrics.avgCadence >= this.benchmarks.cadence.elite) rating = 'elite';
      else if (metrics.avgCadence >= this.benchmarks.cadence.good) rating = 'good';
      else if (metrics.avgCadence >= this.benchmarks.cadence.average) rating = 'average';
      else rating = 'needs_improvement';

      benchmarks.push({
        metric: 'Cadence',
        value: metrics.avgCadence,
        unit: 'spm',
        rating,
        eliteRange: `>${this.benchmarks.cadence.elite}spm`,
        goodRange: `${this.benchmarks.cadence.good}-${this.benchmarks.cadence.elite}spm`,
        description: 'Steps per minute. Higher cadence often indicates efficient running.',
      });
    }

    // Vertical Ratio
    if (metrics.verticalRatio !== null) {
      let rating: BenchmarkRating;
      if (metrics.verticalRatio <= this.benchmarks.verticalRatio.elite) rating = 'elite';
      else if (metrics.verticalRatio <= this.benchmarks.verticalRatio.good) rating = 'good';
      else if (metrics.verticalRatio <= this.benchmarks.verticalRatio.average) rating = 'average';
      else rating = 'needs_improvement';

      benchmarks.push({
        metric: 'Vertical Ratio',
        value: metrics.verticalRatio,
        unit: '%',
        rating,
        eliteRange: `<${this.benchmarks.verticalRatio.elite}%`,
        goodRange: `${this.benchmarks.verticalRatio.elite}-${this.benchmarks.verticalRatio.good}%`,
        description: 'Ratio of vertical oscillation to stride length. Lower = more efficient.',
      });
    }

    // Stride Length
    if (metrics.avgStrideLength !== null) {
      // For stride length, we provide context but don't rate directly
      // since optimal stride is highly individual
      benchmarks.push({
        metric: 'Stride Length',
        value: Math.round(metrics.avgStrideLength * 100), // Convert to cm
        unit: 'cm',
        rating: 'good', // Neutral rating
        eliteRange: 'Varies by height/speed',
        goodRange: 'Varies by height/speed',
        description: 'Distance covered per step. Optimal length varies by individual.',
      });
    }

    return benchmarks;
  }

  /**
   * Generate recommendations based on metrics and benchmarks
   */
  generateRecommendations(metrics: RunningDynamicsMetrics, benchmarks: Benchmark[]): string[] {
    const recommendations: string[] = [];

    // Find issues to address
    const issues = benchmarks.filter((b) => b.rating === 'needs_improvement' || b.rating === 'average');

    for (const issue of issues) {
      switch (issue.metric) {
        case 'Ground Contact Time':
          if (issue.rating === 'needs_improvement') {
            recommendations.push(
              'Focus on quick, light foot strikes. Try drills like high knees and butt kicks.'
            );
            recommendations.push(
              'Strengthen your glutes and calves to improve push-off efficiency.'
            );
          } else {
            recommendations.push(
              'Your ground contact time is average. Consider cadence drills to improve.'
            );
          }
          break;

        case 'Vertical Oscillation':
          if (issue.rating === 'needs_improvement') {
            recommendations.push(
              'You may be bouncing too much. Focus on running "quiet" and low to the ground.'
            );
            recommendations.push(
              'Hip and core stability exercises can help reduce excessive vertical movement.'
            );
          } else {
            recommendations.push(
              'Work on engaging your core to minimize vertical bounce.'
            );
          }
          break;

        case 'Cadence':
          if (metrics.avgCadence && metrics.avgCadence < 165) {
            recommendations.push(
              'Your cadence is low. Try increasing by 5% using a metronome or music with a faster beat.'
            );
            recommendations.push(
              'Higher cadence can reduce impact forces and improve efficiency.'
            );
          } else if (metrics.avgCadence && metrics.avgCadence < 175) {
            recommendations.push(
              'Gradually work on increasing your cadence. Aim for 180 spm over time.'
            );
          }
          break;

        case 'Vertical Ratio':
          if (issue.rating === 'needs_improvement') {
            recommendations.push(
              'Your vertical ratio suggests inefficient running form. Focus on forward propulsion.'
            );
            recommendations.push(
              'Practice running with a slight forward lean from the ankles.'
            );
          }
          break;
      }
    }

    // General recommendations if form is good
    if (recommendations.length === 0) {
      recommendations.push(
        'Your running form metrics look good! Maintain with regular form drills.'
      );
      recommendations.push(
        'Consider strides and running drills 2-3 times per week to maintain efficiency.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate overall running form score (0-100)
   */
  private calculateOverallScore(benchmarks: Benchmark[]): number {
    const scorableMetrics = benchmarks.filter((b) => b.metric !== 'Stride Length');

    if (scorableMetrics.length === 0) return 50;

    const ratingScores: Record<BenchmarkRating, number> = {
      elite: 100,
      good: 75,
      average: 50,
      needs_improvement: 25,
    };

    const totalScore = scorableMetrics.reduce((sum, b) => sum + ratingScores[b.rating], 0);
    return Math.round(totalScore / scorableMetrics.length);
  }

  /**
   * Get running dynamics trend over multiple activities
   */
  async getRunningDynamicsTrend(
    userId: string,
    days: number = 90
  ): Promise<{
    trend: Array<{
      date: Date;
      activityId: string;
      gct: number | null;
      vo: number | null;
      cadence: number | null;
      verticalRatio: number | null;
    }>;
    averages: RunningDynamicsMetrics;
    improvement: { metric: string; changePercent: number }[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await prisma.activity.findMany({
        where: {
          userId,
          sportType: 'RUN',
          startDate: { gte: startDate },
        },
        include: {
          metrics: {
            select: {
              avgGCT: true,
              avgVO: true,
              avgStrideLength: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      });

      const trend: Array<{
        date: Date;
        activityId: string;
        gct: number | null;
        vo: number | null;
        cadence: number | null;
        verticalRatio: number | null;
      }> = [];

      for (const activity of activities) {
        trend.push({
          date: activity.startDate,
          activityId: activity.id,
          gct: activity.metrics?.avgGCT || null,
          vo: activity.metrics?.avgVO || null,
          cadence: activity.avgCadence,
          verticalRatio:
            activity.metrics?.avgGCT && activity.metrics?.avgVO && activity.metrics?.avgStrideLength
              ? Math.round(
                  (activity.metrics.avgVO / (activity.metrics.avgStrideLength * 100)) * 1000
                ) / 10
              : null,
        });
      }

      // Calculate averages
      const validGCT = trend.filter((t) => t.gct !== null).map((t) => t.gct!);
      const validVO = trend.filter((t) => t.vo !== null).map((t) => t.vo!);
      const validCadence = trend.filter((t) => t.cadence !== null).map((t) => t.cadence!);

      const avg = (arr: number[]): number | null =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const averages: RunningDynamicsMetrics = {
        avgGCT: avg(validGCT) ? Math.round(avg(validGCT)!) : null,
        avgVO: avg(validVO) ? Math.round(avg(validVO)! * 10) / 10 : null,
        avgStrideLength: null,
        avgCadence: avg(validCadence) ? Math.round(avg(validCadence)!) : null,
        verticalRatio: null,
        gctBalance: null,
      };

      // Calculate improvement (compare first quarter to last quarter)
      const improvement: { metric: string; changePercent: number }[] = [];
      const quarterCount = Math.floor(trend.length / 4);

      if (quarterCount >= 2) {
        const firstQuarter = trend.slice(0, quarterCount);
        const lastQuarter = trend.slice(-quarterCount);

        const metrics = ['gct', 'vo', 'cadence'] as const;
        const metricNames: Record<string, string> = {
          gct: 'Ground Contact Time',
          vo: 'Vertical Oscillation',
          cadence: 'Cadence',
        };

        for (const metric of metrics) {
          const firstValues = firstQuarter.filter((t) => t[metric] !== null).map((t) => t[metric]!);
          const lastValues = lastQuarter.filter((t) => t[metric] !== null).map((t) => t[metric]!);

          if (firstValues.length > 0 && lastValues.length > 0) {
            const firstAvg = firstValues.reduce((a, b) => a + b, 0) / firstValues.length;
            const lastAvg = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;

            let changePercent = ((lastAvg - firstAvg) / firstAvg) * 100;

            // For GCT and VO, negative change (decrease) is improvement
            // For Cadence, positive change (increase) is improvement
            if (metric === 'cadence') {
              // Keep positive = improvement
            } else {
              changePercent = -changePercent; // Flip so negative becomes positive improvement
            }

            improvement.push({
              metric: metricNames[metric],
              changePercent: Math.round(changePercent * 10) / 10,
            });
          }
        }
      }

      return { trend, averages, improvement };
    } catch (error) {
      logger.error(`Failed to get running dynamics trend for user ${userId}:`, error);
      return { trend: [], averages: {} as RunningDynamicsMetrics, improvement: [] };
    }
  }
}

// Export singleton instance
export const runningDynamicsService = new RunningDynamicsService();
export default runningDynamicsService;
