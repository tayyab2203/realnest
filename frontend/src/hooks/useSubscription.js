import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const PLANS_KEY = ['subscription', 'plans'];
const ME_KEY = ['subscription', 'me'];
const TRANSACTIONS_KEY = ['subscription', 'transactions'];

// Public list of available plans (used by SubscriptionPlans page).
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/subscription/plans');
      return data.plans || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// The current user's plan / status / usage. The backend lazily expires
// stale subscriptions, so this is always fresh on read.
//
// Pass `{ enabled: false }` (or rely on the default check below) to skip
// the request for unauthenticated visitors.
export function useMySubscription(options = {}) {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const { data } = await api.get('/subscription/me');
      return data.subscription;
    },
    retry: false,
    ...options,
  });
}

export function useMySubscriptionTransactions(options = {}) {
  return useQuery({
    queryKey: TRANSACTIONS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/subscription/transactions');
      return data.transactions || [];
    },
    retry: false,
    ...options,
  });
}

const buildUpgradeMutation = (path) => () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, paidAmount }) => {
      const { data } = await api.post(path, { transactionId, paidAmount });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['seller', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
};

export const useUpgradeToPro = buildUpgradeMutation('/subscription/upgrade/pro');
export const useUpgradeToAgency = buildUpgradeMutation('/subscription/upgrade/agency');

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/subscription/cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
