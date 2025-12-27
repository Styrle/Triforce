import { prisma } from '../../config/database';

interface PlannedWeek {
  weekStart: Date;
  targetTSS: number;
  weekType: 'build' | 'recovery' | 'peak' | 'taper';
}

interface ForecastPoint {
  date: string;
  projectedCTL: number;
  projectedATL: number;
  projectedTSB: number;
  source: 'planned' | 'estimated' | 'decay';
}

interface RequiredTSSResult {
  weeklyTSS: number[];
  averageRampRate: number;
  achievable: boolean;
  warnings: string[];
}

// PMC time constants (in days)
const CTL_DAYS = 42;
const ATL_DAYS = 7;

export class ForecastService {
  /**
   * Project future CTL/ATL/TSB based on planned training
   */
  forecastFitness(
    currentCTL: number,
    currentATL: number,
    plannedWeeks: PlannedWeek[]
  ): ForecastPoint[] {
    const ctlDecay = Math.exp(-1 / CTL_DAYS);
    const atlDecay = Math.exp(-1 / ATL_DAYS);

    const forecast: ForecastPoint[] = [];
    let ctl = currentCTL;
    let atl = currentATL;

    for (const week of plannedWeeks) {
      const dailyTSS = week.targetTSS / 7;

      for (let day = 0; day < 7; day++) {
        const date = new Date(week.weekStart);
        date.setDate(date.getDate() + day);

        // Apply exponential weighted moving average
        ctl = ctl * ctlDecay + dailyTSS * (1 - ctlDecay);
        atl = atl * atlDecay + dailyTSS * (1 - atlDecay);

        forecast.push({
          date: date.toISOString().split('T')[0],
          projectedCTL: Math.round(ctl * 10) / 10,
          projectedATL: Math.round(atl * 10) / 10,
          projectedTSB: Math.round((ctl - atl) * 10) / 10,
          source: 'planned',
        });
      }
    }

    return forecast;
  }

  /**
   * Calculate required weekly TSS to reach target CTL by race day
   * Max recommended ramp rate: 5-7 CTL points/week
   */
  calculateRequiredTSS(
    currentCTL: number,
    targetCTL: number,
    weeksToRace: number
  ): RequiredTSSResult {
    const maxRampRate = 6;
    const ctlGap = targetCTL - currentCTL;
    const averageRampRate = ctlGap / weeksToRace;

    const warnings: string[] = [];
    if (averageRampRate > maxRampRate) {
      warnings.push(
        `Required ramp rate (${averageRampRate.toFixed(1)} CTL/week) exceeds recommended maximum (${maxRampRate} CTL/week)`
      );
    }
    if (averageRampRate > 8) {
      warnings.push('High injury risk at this ramp rate. Consider extending your timeline.');
    }

    const weeklyTSS: number[] = [];
    let projectedCTL = currentCTL;

    for (let week = 0; week < weeksToRace; week++) {
      const isRecoveryWeek = (week + 1) % 4 === 0;
      const weeksRemaining = weeksToRace - week;

      if (isRecoveryWeek) {
        // Recovery week: ~65% of normal load
        weeklyTSS.push(Math.round(projectedCTL * 7 * 0.65));
      } else {
        const remainingGap = targetCTL - projectedCTL;
        const targetRamp = Math.min(remainingGap / weeksRemaining, maxRampRate);
        const weekTSS = Math.round((projectedCTL + targetRamp) * 7);
        weeklyTSS.push(weekTSS);
        projectedCTL += targetRamp * 0.8; // ~80% of target ramp typically achieved
      }
    }

    return {
      weeklyTSS,
      averageRampRate: Math.round(averageRampRate * 10) / 10,
      achievable: averageRampRate <= maxRampRate,
      warnings,
    };
  }

  /**
   * Get forecast from user's active training plan
   */
  async getForecastFromPlan(userId: string): Promise<ForecastPoint[]> {
    const [metrics, plan] = await Promise.all([
      prisma.dailyMetrics.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
      prisma.trainingPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { planWeeks: { orderBy: { weekNumber: 'asc' } } },
      }),
    ]);

    if (!metrics) return [];

    const currentCTL = metrics.ctl || 50;
    const currentATL = metrics.atl || 50;

    // If no active plan, project with decay only
    if (!plan || plan.planWeeks.length === 0) {
      return this.projectDecay(currentCTL, currentATL, 28);
    }

    const plannedWeeks: PlannedWeek[] = plan.planWeeks.map((w) => ({
      weekStart: w.startDate,
      targetTSS: w.targetTss || 0,
      weekType: w.weekType === 'RECOVERY' ? 'recovery' : 'build',
    }));

    return this.forecastFitness(currentCTL, currentATL, plannedWeeks);
  }

  /**
   * Project CTL with no training (decay only)
   */
  projectDecay(currentCTL: number, currentATL: number, days: number): ForecastPoint[] {
    const forecast: ForecastPoint[] = [];
    const ctlDecay = Math.exp(-1 / CTL_DAYS);
    const atlDecay = Math.exp(-1 / ATL_DAYS);

    let ctl = currentCTL;
    let atl = currentATL;

    for (let day = 1; day <= days; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      ctl = ctl * ctlDecay;
      atl = atl * atlDecay;

      forecast.push({
        date: date.toISOString().split('T')[0],
        projectedCTL: Math.round(ctl * 10) / 10,
        projectedATL: Math.round(atl * 10) / 10,
        projectedTSB: Math.round((ctl - atl) * 10) / 10,
        source: 'decay',
      });
    }

    return forecast;
  }

  /**
   * Simulate taper for a race
   * Typical TSB target for race day: +10 to +25
   */
  async simulateTaper(
    userId: string,
    raceDate: Date,
    targetTSB: number = 15
  ): Promise<{ taperPlan: { date: string; suggestedTSS: number }[]; projectedTSBOnRaceDay: number }> {
    const metrics = await prisma.dailyMetrics.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    if (!metrics) {
      throw new Error('No fitness data available');
    }

    const currentCTL = metrics.ctl || 50;
    const currentATL = metrics.atl || 50;
    const today = new Date();
    const daysToRace = Math.ceil(
      (raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToRace < 7) {
      throw new Error('Need at least 7 days to race for taper planning');
    }

    const taperPlan: { date: string; suggestedTSS: number }[] = [];
    let ctl = currentCTL;
    let atl = currentATL;
    const ctlDecay = Math.exp(-1 / CTL_DAYS);
    const atlDecay = Math.exp(-1 / ATL_DAYS);

    // Typical taper: reduce volume 40-60% over 2-3 weeks
    for (let day = 1; day <= daysToRace; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);

      // Calculate TSS to achieve target TSB on race day
      // Start with higher volume, progressively reduce
      const daysRemaining = daysToRace - day;
      let dailyTSS: number;

      if (daysRemaining <= 3) {
        // Final days: minimal training
        dailyTSS = Math.round(currentCTL * 0.3);
      } else if (daysRemaining <= 7) {
        // Last week: 50% reduction
        dailyTSS = Math.round(currentCTL * 0.5);
      } else if (daysRemaining <= 14) {
        // Two weeks out: 30% reduction
        dailyTSS = Math.round(currentCTL * 0.7);
      } else {
        // Normal training before taper
        dailyTSS = Math.round(currentCTL);
      }

      taperPlan.push({
        date: date.toISOString().split('T')[0],
        suggestedTSS: dailyTSS,
      });

      // Update CTL/ATL for next iteration
      ctl = ctl * ctlDecay + dailyTSS * (1 - ctlDecay);
      atl = atl * atlDecay + dailyTSS * (1 - atlDecay);
    }

    return {
      taperPlan,
      projectedTSBOnRaceDay: Math.round((ctl - atl) * 10) / 10,
    };
  }

  /**
   * Project fitness with custom TSS modifications
   */
  async projectWithModifications(
    userId: string,
    modifications: { date: string; tss: number }[],
    daysAhead: number = 30
  ): Promise<ForecastPoint[]> {
    const metrics = await prisma.dailyMetrics.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    if (!metrics) return [];

    const currentCTL = metrics.ctl || 50;
    const currentATL = metrics.atl || 50;

    // Create a map of modifications by date
    const modMap = new Map(modifications.map((m) => [m.date, m.tss]));

    const forecast: ForecastPoint[] = [];
    let ctl = currentCTL;
    let atl = currentATL;
    const ctlDecay = Math.exp(-1 / CTL_DAYS);
    const atlDecay = Math.exp(-1 / ATL_DAYS);

    for (let day = 1; day <= daysAhead; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // Use modification if available, otherwise estimate based on current CTL
      const dailyTSS = modMap.get(dateStr) ?? Math.round(currentCTL);
      const source: 'planned' | 'estimated' = modMap.has(dateStr) ? 'planned' : 'estimated';

      ctl = ctl * ctlDecay + dailyTSS * (1 - ctlDecay);
      atl = atl * atlDecay + dailyTSS * (1 - atlDecay);

      forecast.push({
        date: dateStr,
        projectedCTL: Math.round(ctl * 10) / 10,
        projectedATL: Math.round(atl * 10) / 10,
        projectedTSB: Math.round((ctl - atl) * 10) / 10,
        source,
      });
    }

    return forecast;
  }
}

export const forecastService = new ForecastService();
export default forecastService;
