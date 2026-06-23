import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useSoldProperties(enabled = true) {
  return useQuery({
    queryKey: ['seller', 'sold-properties'],
    queryFn: async () => {
      const { data } = await api.get('/seller/sold-properties');
      return data.properties;
    },
    enabled,
  });
}
