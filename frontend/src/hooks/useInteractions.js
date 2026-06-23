import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useSavedProperties() {
  return useQuery({
    queryKey: ['saved-properties'],
    queryFn: async () => {
      const { data } = await api.get('/interactions/saved');
      return data.saved;
    },
  });
}

export function useUserInteractions(type) {
  return useQuery({
    queryKey: ['interactions', type],
    queryFn: async () => {
      const params = type ? `?type=${type}` : '';
      const { data } = await api.get(`/interactions/mine${params}`);
      return data.interactions;
    },
  });
}

export function useTrackView() {
  return useMutation({
    mutationFn: (propertyId) =>
      api.post('/interactions/track', { propertyId, interactionType: 'VIEW' }),
  });
}

export function useLikeProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId) =>
      api.post('/interactions/track', { propertyId, interactionType: 'LIKE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useUnlikeProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId) =>
      api.delete('/interactions/track', { data: { propertyId, interactionType: 'LIKE' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId) =>
      api.post('/interactions/save', { propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export function useUnsaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId) =>
      api.delete(`/interactions/save/${propertyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    },
  });
}
