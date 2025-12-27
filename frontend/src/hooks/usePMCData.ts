import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Types
export interface PMCDataPoint {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rampRate: number | null;
}

export interface PMCProjection {
  date: string;
  projectedTss: number;
  projectedCtl: number;
  projectedAtl: number;
  projectedTsb: number;
}

export interface PMCResponse {
  history: PMCDataPoint[];
  projections: PMCProjection[];
  current: PMCDataPoint | null;
}

interface UsePMCDataOptions {
  days?: number;
  enabled?: boolean;
}

export function usePMCData({ days = 90, enabled = true }: UsePMCDataOptions = {}) {
  return useQuery({
    queryKey: ['pmc', days],
    queryFn: async (): Promise<PMCResponse> => {
      const response = await api.get('/analytics/pmc', { params: { days } });
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for dashboard summary
export interface DashboardSummary {
  triScore: number;
  triScoreTrend: number;
  fitnessLevel: string;
  ctl: number;
  tsb: number;
  weeklyHours: number;
  weeklyTss: number;
  streak: number;
}

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      const response = await api.get('/analytics/dashboard');
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook for Tri-Score
export interface SportScore {
  score: number;
  trend: number;
  weeklyHours: number;
  weeklyTss: number;
  activityCount: number;
}

export interface TriScoreData {
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
  lastUpdated: string;
}

export function useTriScore(enabled = true) {
  return useQuery({
    queryKey: ['tri-score'],
    queryFn: async (): Promise<TriScoreData> => {
      const response = await api.get('/analytics/tri-score');
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook for week summary
export interface WeekSummarySport {
  plannedDuration: number;
  actualDuration: number;
  plannedTss: number;
  actualTss: number;
  plannedCount: number;
  completedCount: number;
}

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  bySport: Record<string, WeekSummarySport>;
  totals: {
    plannedDuration: number;
    actualDuration: number;
    plannedTss: number;
    actualTss: number;
    activityCount: number;
    compliance: number;
  };
}

export function useWeekSummary(weekStart?: string, enabled = true) {
  return useQuery({
    queryKey: ['week-summary', weekStart],
    queryFn: async (): Promise<WeekSummary> => {
      const response = await api.get('/analytics/week-summary', {
        params: weekStart ? { weekStart } : undefined,
      });
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export default usePMCData;
