import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CustomExercise, CustomExerciseInput } from '../types/exercise';

export function useCustomExercises(enabled = true) {
  return useQuery({
    queryKey: ['custom-exercises'],
    queryFn: async (): Promise<CustomExercise[]> => {
      const response = await api.get('/exercises');
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCombinedExercises(enabled = true) {
  return useQuery({
    queryKey: ['combined-exercises'],
    queryFn: async () => {
      const response = await api.get('/exercises/combined');
      return response.data.data as {
        predefined: string[];
        custom: CustomExercise[];
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomExerciseInput): Promise<CustomExercise> => {
      const response = await api.post('/exercises', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['combined-exercises'] });
    },
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CustomExerciseInput & { id: string }): Promise<CustomExercise> => {
      const response = await api.put(`/exercises/${id}`, input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['combined-exercises'] });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['combined-exercises'] });
    },
  });
}
