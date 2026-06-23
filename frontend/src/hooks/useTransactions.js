import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useMyTransactions() {
  return useQuery({
    queryKey: ['transactions', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/mine');
      return data.transactions;
    },
  });
}

export function useMySales() {
  return useQuery({
    queryKey: ['transactions', 'sales'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/sales');
      return data.sales;
    },
  });
}

export function useTransaction(id) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data } = await api.get(`/transactions/${id}`);
      return data.transaction;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId) => {
      const { data } = await api.post('/transactions/create', { propertyId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useProcessTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, paymentMethod }) => {
      const { data } = await api.post('/transactions/process', { transactionId, paymentMethod });
      return data.transaction;
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (transaction?.id) {
        queryClient.invalidateQueries({ queryKey: ['transaction', transaction.id] });
      }
      if (transaction?.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['property', transaction.propertyId] });
        queryClient.invalidateQueries({ queryKey: ['sale-installments', transaction.propertyId] });
      }
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
