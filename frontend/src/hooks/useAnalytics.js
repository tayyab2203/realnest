import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useSellerAnalytics(options = {}) {
  return useQuery({
    queryKey: ['seller', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/seller');
      return data.analytics;
    },
    ...options,
  });
}
