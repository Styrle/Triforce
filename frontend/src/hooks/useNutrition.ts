import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  DailySummary,
  WeeklyNutritionSummary,
  DailyNutrition,
  LogFoodInput,
  MFPImportResult,
  NutritionTargets,
} from '../types';

// Fetch daily nutrition with entries
export function useDailyNutrition(date: string, enabled = true) {
  return useQuery({
    queryKey: ['nutrition', 'daily', date],
    queryFn: async (): Promise<DailySummary | null> => {
      const response = await api.get(`/nutrition/${date}`);
      return response.data.data;
    },
    enabled: enabled && !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Fetch weekly nutrition summary
export function useWeeklyNutrition(weekStart: string, enabled = true) {
  return useQuery({
    queryKey: ['nutrition', 'weekly', weekStart],
    queryFn: async (): Promise<WeeklyNutritionSummary> => {
      const response = await api.get('/nutrition/weekly', {
        params: { weekStart },
      });
      return response.data.data;
    },
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch nutrition for a date range
export function useNutritionRange(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ['nutrition', 'range', startDate, endDate],
    queryFn: async (): Promise<DailyNutrition[]> => {
      const response = await api.get('/nutrition/range', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}

// Log a food entry
export function useLogFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogFoodInput): Promise<DailySummary> => {
      const response = await api.post('/nutrition/log', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the daily query for the logged date
      const date = variables.date || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily', date] });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'weekly'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'range'] });
    },
  });
}

// Delete a nutrition entry
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string): Promise<void> => {
      await api.delete(`/nutrition/entry/${entryId}`);
    },
    onSuccess: () => {
      // Invalidate all nutrition queries
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    },
  });
}

// Import from MFP CSV
export function useImportMFP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<MFPImportResult> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/nutrition/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate all nutrition queries after import
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
    },
  });
}

// Set nutrition targets for a date
export function useSetTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      targets,
    }: {
      date: string;
      targets: NutritionTargets;
    }): Promise<DailyNutrition> => {
      const response = await api.put(`/nutrition/targets/${date}`, targets);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'daily', variables.date] });
    },
  });
}
