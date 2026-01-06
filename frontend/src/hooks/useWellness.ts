import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  DailyWellness,
  WellnessInput,
  WellnessTrend,
  WellnessCorrelation,
  WellnessStats,
} from '../types';

// Fetch today's wellness
export function useTodayWellness() {
  return useQuery({
    queryKey: ['wellness', 'today'],
    queryFn: async (): Promise<DailyWellness> => {
      const response = await api.get('/wellness/today');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch wellness by date
export function useWellnessByDate(date: string, enabled = true) {
  return useQuery({
    queryKey: ['wellness', date],
    queryFn: async (): Promise<DailyWellness | null> => {
      const response = await api.get(`/wellness/${date}`);
      return response.data.data;
    },
    enabled: enabled && !!date,
    staleTime: 2 * 60 * 1000,
  });
}

// Log/update wellness
export function useLogWellness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WellnessInput): Promise<DailyWellness> => {
      const response = await api.post('/wellness', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['wellness', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['wellness', 'trend'] });
      queryClient.invalidateQueries({ queryKey: ['wellness', 'stats'] });
      if (variables.date) {
        queryClient.invalidateQueries({ queryKey: ['wellness', variables.date] });
      }
    },
  });
}

// Delete wellness entry
export function useDeleteWellness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string): Promise<void> => {
      await api.delete(`/wellness/${date}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness'] });
    },
  });
}

// Fetch wellness trend
export function useWellnessTrend(days: number = 30, enabled = true) {
  return useQuery({
    queryKey: ['wellness', 'trend', days],
    queryFn: async (): Promise<WellnessTrend[]> => {
      const response = await api.get(`/wellness/trend/${days}`);
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch wellness stats
export function useWellnessStats(days: number = 30, enabled = true) {
  return useQuery({
    queryKey: ['wellness', 'stats', days],
    queryFn: async (): Promise<WellnessStats> => {
      const response = await api.get(`/wellness/stats/${days}`);
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch wellness correlations
export function useWellnessCorrelations(days: number = 90, enabled = true) {
  return useQuery({
    queryKey: ['wellness', 'correlations', days],
    queryFn: async (): Promise<WellnessCorrelation[]> => {
      const response = await api.get(`/wellness/correlations/${days}`);
      return response.data.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
