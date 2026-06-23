import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useDocument(documentId) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/${documentId}`);
      return data.document;
    },
    enabled: !!documentId,
  });
}

export function useSellerDocuments(sellerId) {
  return useQuery({
    queryKey: ['documents', 'seller', sellerId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/seller/${sellerId}`);
      return data.documents;
    },
    enabled: !!sellerId,
  });
}

export function useBuyerDocuments(buyerId) {
  return useQuery({
    queryKey: ['documents', 'buyer', buyerId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/buyer/${buyerId}`);
      return data.documents;
    },
    enabled: !!buyerId,
  });
}

export function useSearchBuyers() {
  return useMutation({
    mutationFn: async (q) => {
      const { data } = await api.get('/documents/buyers/search', { params: { q } });
      return data.buyers;
    },
  });
}

export function useGenerateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/documents/generate', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      if (variables?.propertyId) {
        qc.invalidateQueries({ queryKey: ['purchase-intent', variables.propertyId] });
        qc.invalidateQueries({ queryKey: ['document-for-checkout', variables.propertyId] });
      }
      qc.invalidateQueries({ queryKey: ['buyer-purchase-intents'] });
      qc.invalidateQueries({ queryKey: ['seller-purchase-intents'] });
    },
  });
}

export function useRemindBuyer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId) => {
      const { data } = await api.post(`/documents/${documentId}/remind`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/** Sale deed or rent agreement for this listing (buyer checkout). */
export function useDocumentForCheckout(propertyId) {
  return useQuery({
    queryKey: ['document-for-checkout', propertyId],
    queryFn: async () => {
      const { data } = await api.get(`/documents/for-purchase/${propertyId}`);
      return data;
    },
    enabled: !!propertyId,
  });
}

/** @deprecated alias — use useDocumentForCheckout */
export const useDocumentForPurchase = useDocumentForCheckout;

export function usePurchaseIntentForProperty(propertyId, options = {}) {
  return useQuery({
    queryKey: ['purchase-intent', propertyId],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-intents/for-property/${propertyId}`);
      return data.intent;
    },
    enabled: !!propertyId && (options.enabled ?? true),
  });
}

export function useCreatePurchaseIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId) => {
      const { data } = await api.post('/purchase-intents', { propertyId });
      return data.intent;
    },
    onSuccess: (_, propertyId) => {
      qc.invalidateQueries({ queryKey: ['purchase-intent', propertyId] });
      qc.invalidateQueries({ queryKey: ['buyer-purchase-intents'] });
      qc.invalidateQueries({ queryKey: ['seller-purchase-intents'] });
    },
  });
}

export function useSellerPurchaseIntents(enabled = true) {
  return useQuery({
    queryKey: ['seller-purchase-intents'],
    queryFn: async () => {
      const { data } = await api.get('/purchase-intents/seller');
      return data.intents;
    },
    enabled,
  });
}

export function useBuyerPurchaseIntents(enabled = true) {
  return useQuery({
    queryKey: ['buyer-purchase-intents'],
    queryFn: async () => {
      const { data } = await api.get('/purchase-intents/buyer');
      return data.intents;
    },
    enabled,
  });
}

export function useNotifyBuyerReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId) => {
      const { data } = await api.post(`/documents/${documentId}/notify-buyer-ready`);
      return data.document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['buyer-purchase-intents'] });
      qc.invalidateQueries({ queryKey: ['seller-purchase-intents'] });
    },
  });
}

export function useSaleInstallments(propertyId) {
  return useQuery({
    queryKey: ['sale-installments', propertyId],
    queryFn: async () => {
      const { data } = await api.get(`/sale-installments/property/${propertyId}`);
      return data;
    },
    enabled: !!propertyId,
  });
}

export function useStartInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (installmentId) => {
      const { data } = await api.post(`/sale-installments/${installmentId}/start-payment`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-installments'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
