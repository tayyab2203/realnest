import axios from 'axios';
import { supabase } from './supabase';

const API_TARGET = 'http://127.0.0.1:5000';

/** Same-origin /api when Vite proxies to the backend (dev + preview). */
export function getApiBaseUrl() {
  if (import.meta.env.DEV) return '/api';

  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if (port === '4173' || port === '5173') return '/api';
    if (
      (hostname === 'localhost' || hostname === '127.0.0.1')
      && !import.meta.env.VITE_API_URL
    ) {
      return '/api';
    }
  }

  return import.meta.env.VITE_API_URL || '/api';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const base = getApiBaseUrl();
      const hint =
        base === '/api'
          ? `Cannot reach the API at ${API_TARGET}. Open a second terminal and run: cd backend && npm run dev`
          : `Cannot reach the API at ${base}. Check that the backend is running.`;
      return Promise.reject(new Error(hint));
    }
    const message = error.response?.data?.error || error.message;
    return Promise.reject(new Error(message));
  }
);

export default api;
