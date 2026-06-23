import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useProperties(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.append(key, value);
    }
  });

  return useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      const { data } = await api.get(`/properties?${params.toString()}`);
      return data;
    },
  });
}

export function useProperty(id) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const { data } = await api.get(`/properties/${id}`);
      return data.property;
    },
    enabled: !!id,
  });
}

export function useFeaturedProperties() {
  return useQuery({
    queryKey: ['properties', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/properties/featured');
      return data.properties;
    },
  });
}

export function useMyProperties() {
  return useQuery({
    queryKey: ['properties', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/properties/mine');
      return data.properties;
    },
  });
}
