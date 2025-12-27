import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../services/api';
import type { SportType } from '../types';

// Types
export interface CalendarActivity {
  id: string;
  name: string;
  sportType: SportType;
  startDate: string;
  movingTime: number;
  distance: number | null;
  tss: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
}

export interface CalendarWorkout {
  id: string;
  name: string;
  sportType: SportType;
  scheduledDate: string;
  targetDuration: number | null;
  targetTss: number | null;
  status: 'PLANNED' | 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'MOVED';
  completedActivityId: string | null;
}

export interface CalendarMetrics {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  activityCount: number;
  totalDuration: number;
}

export interface CalendarDay {
  date: string;
  activities: CalendarActivity[];
  plannedWorkouts: CalendarWorkout[];
  metrics: CalendarMetrics | null;
}

export interface CalendarResponse {
  days: CalendarDay[];
  summary: {
    totalActivities: number;
    totalPlannedWorkouts: number;
    totalDuration: number;
    totalTss: number;
  };
}

export function useCalendarData(startDate: Date, endDate: Date, enabled = true) {
  return useQuery({
    queryKey: ['calendar', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<CalendarResponse> => {
      const response = await api.get('/analytics/calendar', {
        params: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
      });
      return response.data.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching a single day's data
export function useDayData(date: Date, enabled = true) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calendar-day', dateStr],
    queryFn: async (): Promise<CalendarDay> => {
      const response = await api.get('/analytics/calendar', {
        params: {
          start: dateStr,
          end: dateStr,
        },
      });
      return response.data.data.days[0] || {
        date: dateStr,
        activities: [],
        plannedWorkouts: [],
        metrics: null,
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook for upcoming workouts
export interface UpcomingWorkout {
  id: string;
  name: string;
  sportType: SportType;
  scheduledDate: string;
  targetDuration: number | null;
  targetTss: number | null;
  plan?: {
    id: string;
    name: string;
  };
}

export function useUpcomingWorkouts(days = 7, enabled = true) {
  return useQuery({
    queryKey: ['upcoming-workouts', days],
    queryFn: async (): Promise<UpcomingWorkout[]> => {
      const response = await api.get('/plans/workouts/upcoming', {
        params: { days },
      });
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export default useCalendarData;
