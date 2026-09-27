import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

export const TOKEN_STORAGE_KEY = 'fbclone.token';

/**
 * Empty base URL is the normal case: the Vite dev proxy and the production
 * nginx config both serve /api from the same origin as the app.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* private browsing / blocked storage - the in-memory session still works */
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** A 401 on anything other than the login call means the token died - bounce to sign-in. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    if (status === 401 && !url.includes('/api/auth/')) {
      setStoredToken(null);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Pulls the server's message out of an axios error, with a readable fallback. */
export function toErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) return apiError.message;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond';
    if (!error.response) return 'Cannot reach the server. Is the backend running?';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
