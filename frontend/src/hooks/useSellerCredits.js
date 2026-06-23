import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const BOOST_COSTS = {
  HOT: 1,
  PREMIUM: 2,
  PLATINUM: 3,
};

export const VERIFICATION_COST = 10;

export const PKR_PER_CREDIT = 1000;

export const RENEW_LISTING_COST = 1;

const CREDITS_KEY = ['seller', 'credits'];
const NOTIFICATIONS_KEY = ['seller', 'notifications'];

export function useCreditsBalance() {
  return useQuery({
    queryKey: CREDITS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/seller/credits/balance');
      return data;
    },
  });
}

export function usePurchaseCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ creditsAmount, transactionId, sellerId }) => {
      const { data } = await api.post('/seller/credits/purchase', {
        sellerId,
        creditsAmount,
        transactionId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
    },
  });
}

export function useSpendCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, description, propertyId, sellerId }) => {
      const { data } = await api.post('/seller/credits/spend', {
        sellerId,
        amount,
        description,
        propertyId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
    },
  });
}

export function useBoostListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, boostType, sellerId }) => {
      const { data } = await api.post('/seller/listings/boost', {
        sellerId,
        propertyId,
        boostType,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useVerifySellerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/seller/profile/verify', {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
    },
  });
}

export function useRunExpiryChecks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/seller/boosts/expire', {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useRenewListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId }) => {
      const { data } = await api.post('/seller/listings/renew', { propertyId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDITS_KEY });
      queryClient.invalidateQueries({ queryKey: ['properties', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useSellerNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/seller/notifications');
      return data.notifications || [];
    },
  });
}
