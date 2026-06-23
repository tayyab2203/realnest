import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useRecommendations(limit = 12) {
  return useQuery({
    queryKey: ['recommendations', limit],
    queryFn: async () => {
      const { data } = await api.get(`/recommendations?limit=${limit}`);
      return data.recommendations;
    },
    staleTime: 5 * 60 * 1000,
  });
}
