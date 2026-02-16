import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  WorkoutSession,
  WorkoutSessionInput,
  PersonalBest,
  VolumeAnalytics,
  PercentageTraining,
  RPEPrescription,
  RepRangeEntry,
} from '../types/workout';

// Fetch paginated workout sessions
export function useWorkoutSessions(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['workouts', 'sessions', params],
    queryFn: async (): Promise<{ sessions: WorkoutSession[]; total: number }> => {
      const response = await api.get('/workouts', { params });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch a single workout session
export function useWorkoutSession(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['workouts', 'session', sessionId],
    queryFn: async (): Promise<WorkoutSession> => {
      const response = await api.get(`/workouts/${sessionId}`);
      return response.data.data;
    },
    enabled: !!sessionId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch personal bests
export function usePersonalBests(liftTypes?: string[]) {
  return useQuery({
    queryKey: ['workouts', 'pbs', liftTypes],
    queryFn: async (): Promise<PersonalBest[]> => {
      const response = await api.get('/workouts/analytics/pbs', {
        params: liftTypes ? { liftTypes: liftTypes.join(',') } : undefined,
      });
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch volume analytics
export function useVolumeAnalytics(period: 'day' | 'week' | 'month' = 'week', startDate?: string) {
  return useQuery({
    queryKey: ['workouts', 'volume', period, startDate],
    queryFn: async (): Promise<VolumeAnalytics> => {
      const response = await api.get('/workouts/analytics/volume', {
        params: { period, startDate },
      });
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Create a workout session
export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkoutSessionInput): Promise<WorkoutSession> => {
      const response = await api.post('/workouts', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      // Cross-cache invalidation: backend creates LiftRecord entries
      queryClient.invalidateQueries({ queryKey: ['strength-lifts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts-all'] });
      queryClient.invalidateQueries({ queryKey: ['strength-profile'] });
      queryClient.invalidateQueries({ queryKey: ['muscle-analysis'] });
    },
  });
}

// Update a workout session
export function useUpdateWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: Partial<WorkoutSessionInput>;
    }): Promise<WorkoutSession> => {
      const response = await api.put(`/workouts/${sessionId}`, updates);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts-all'] });
      queryClient.invalidateQueries({ queryKey: ['strength-profile'] });
      queryClient.invalidateQueries({ queryKey: ['muscle-analysis'] });
    },
  });
}

// Delete a workout session
export function useDeleteWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      await api.delete(`/workouts/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts-all'] });
      queryClient.invalidateQueries({ queryKey: ['strength-profile'] });
      queryClient.invalidateQueries({ queryKey: ['muscle-analysis'] });
    },
  });
}

// Calculate percentage-based training
export function useCalculatePercentage() {
  return useMutation({
    mutationFn: async (input: {
      inputMax: number;
      percentage: number;
    }): Promise<PercentageTraining> => {
      const response = await api.post('/workouts/calculate/percentage', input);
      return response.data.data;
    },
  });
}

// Calculate RPE prescription
export function useCalculateRPE() {
  return useMutation({
    mutationFn: async (input: {
      known1RM: number;
      targetRPE: number;
      targetReps: number;
    }): Promise<RPEPrescription> => {
      const response = await api.post('/workouts/calculate/rpe', input);
      return response.data.data;
    },
  });
}

// Fetch rep range chart
export function useRepRangeChart(oneRM: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['workouts', 'rep-ranges', oneRM],
    queryFn: async (): Promise<RepRangeEntry[]> => {
      const response = await api.get(`/workouts/calculate/rep-ranges/${oneRM}`);
      return response.data.data;
    },
    enabled: !!oneRM && oneRM > 0 && enabled,
    staleTime: 30 * 60 * 1000,
  });
}
