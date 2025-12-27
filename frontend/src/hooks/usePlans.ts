import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  TrainingPlan,
  PlannedWorkout,
  WorkoutTemplate,
  CreatePlanInput,
  PlanComplianceMetrics,
  PlanStatus,
  SportType,
} from '../types';

// Fetch all user plans
export function usePlans(status?: PlanStatus) {
  return useQuery({
    queryKey: ['plans', status],
    queryFn: async (): Promise<TrainingPlan[]> => {
      const response = await api.get('/plans', {
        params: status ? { status } : undefined,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch a single plan with details
export function usePlan(planId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async (): Promise<TrainingPlan> => {
      const response = await api.get(`/plans/${planId}`);
      return response.data.data;
    },
    enabled: !!planId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// Create a new plan
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePlanInput): Promise<TrainingPlan> => {
      const response = await api.post('/plans', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

// Update a plan
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      updates,
    }: {
      planId: string;
      updates: Partial<TrainingPlan>;
    }): Promise<TrainingPlan> => {
      const response = await api.put(`/plans/${planId}`, updates);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan', variables.planId] });
    },
  });
}

// Delete a plan
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      await api.delete(`/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

// Fetch plan compliance
export function usePlanCompliance(planId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['plan-compliance', planId],
    queryFn: async (): Promise<PlanComplianceMetrics> => {
      const response = await api.get(`/plans/${planId}/compliance`);
      return response.data.data;
    },
    enabled: !!planId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch upcoming workouts
export function useUpcomingWorkouts(days = 7, enabled = true) {
  return useQuery({
    queryKey: ['upcoming-workouts', days],
    queryFn: async (): Promise<PlannedWorkout[]> => {
      const response = await api.get('/plans/workouts/upcoming', {
        params: { days },
      });
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch compliance summary
export function useComplianceSummary(enabled = true) {
  return useQuery({
    queryKey: ['compliance-summary'],
    queryFn: async () => {
      const response = await api.get('/plans/compliance/summary');
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Update a planned workout
export function useUpdateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      updates,
    }: {
      workoutId: string;
      updates: Partial<PlannedWorkout>;
    }): Promise<PlannedWorkout> => {
      const response = await api.put(`/plans/workouts/${workoutId}`, updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

// Mark workout as completed
export function useCompleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      activityId,
    }: {
      workoutId: string;
      activityId?: string;
    }): Promise<void> => {
      await api.post(`/plans/workouts/${workoutId}/complete`, { activityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['plan-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

// Mark workout as skipped
export function useSkipWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      reason,
    }: {
      workoutId: string;
      reason?: string;
    }): Promise<void> => {
      await api.post(`/plans/workouts/${workoutId}/skip`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['plan-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

// Match activities to workouts
export function useMatchActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const response = await api.post(`/plans/${planId}/match-activities`);
      return response.data.data;
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plan-compliance', planId] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

// Fetch workout templates
export function useWorkoutTemplates(
  filters?: {
    sportType?: SportType;
    category?: string;
    includePublic?: boolean;
  },
  enabled = true
) {
  return useQuery({
    queryKey: ['workout-templates', filters],
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const response = await api.get('/plans/templates', {
        params: filters,
      });
      return response.data.data;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

// Create a workout template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<WorkoutTemplate>): Promise<WorkoutTemplate> => {
      const response = await api.post('/plans/templates', template);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}

// Delete a workout template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      await api.delete(`/plans/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}
