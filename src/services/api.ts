import axios from 'axios';

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (inMemoryCsrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = inMemoryCsrfToken;
  }
  return config;
});

export function extractApiError(error: unknown, fallback = 'Terjadi kesalahan pada server'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string; details?: Record<string, string[]> }; message?: string }
      | undefined;
    if (data?.error?.details) {
      const firstField = Object.values(data.error.details)[0];
      if (Array.isArray(firstField) && firstField[0]) {
        return firstField[0];
      }
    }
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
