import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useArchivedProperties(enabled = true) {
  return useQuery({
    queryKey: ['seller', 'archived-properties'],
    queryFn: async () => {
      const { data } = await api.get('/seller/archived-properties');
      return data.properties;
    },
    enabled,
  });
}

export function useArchiveProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId) => {
      const { data } = await api.patch(`/properties/${propertyId}/archive`);
      return data.property;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties', 'mine'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['seller', 'archived-properties'] });
    },
  });
}
