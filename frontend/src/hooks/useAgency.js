import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const PROFILE_KEY = ['agency', 'profile'];
const AGENTS_KEY = ['agency', 'agents'];

export function useAgencyProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      const { data } = await api.get('/agency/profile');
      return data.profile;
    },
  });
}

export function useUpdateAgencyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put('/agency/profile', payload);
      return data.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/agency/agents');
      return data.agents || [];
    },
  });
}

export function useAddAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/agency/agents', payload);
      return data.agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/agency/agents/${id}`, payload);
      return data.agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}

export function useRemoveAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/agency/agents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}

export function useBulkUpdateListings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyIds, status }) => {
      const { data } = await api.patch('/agency/listings/bulk-status', {
        propertyIds,
        status,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'mine'] });
    },
  });
}

export function useBulkDeleteListings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (propertyIds) => {
      const { data } = await api.delete('/agency/listings/bulk', {
        data: { propertyIds },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'mine'] });
    },
  });
}
