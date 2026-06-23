import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useRecordOfflineSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/transactions/offline-sale', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'sales'] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'sold-properties'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'seller'] });
    },
  });
}
