const STORAGE_KEY = 'realnest_mock_transactions';

export function appendMockTransaction(record) {
  if (typeof window === 'undefined') return;
  try {
    const prev = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    const next = Array.isArray(prev) ? [...prev, record] : [record];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-50)));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([record]));
  }
}

export function readMockTransactions() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
