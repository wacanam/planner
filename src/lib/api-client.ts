/**
 * Axios-based API client with:
 * - Request interceptor that injects Bearer token automatically
 * - Typed response generics (axios<T> style)
 * - Consistent error handling
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 30_000) {
    return cachedToken;
  }
  const res = await axios.get<{ token: string }>('/api/auth/token');
  cachedToken = res.data.token;
  tokenExpiryTime = Date.now() + 6 * 60 * 1000; // cache 6 min
  return cachedToken;
}

export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiryTime = null;
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject Bearer token on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — normalise errors
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data as { error?: string } | undefined;
      const msg = body?.error ?? `HTTP ${status ?? 'unknown'}`;

      if (status === 401) {
        clearTokenCache();
        throw new Error(`Authentication failed — please refresh the page`);
      }

      throw new Error(msg);
    }
    throw error;
  }
);

// ─── Typed helpers ─────────────────────────────────────────────────────────────

/** GET  /api/... */
export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.get<T>(url, config);
}

/** POST /api/... */
export function apiPost<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.post<T>(url, data, config);
}

/** PATCH /api/... */
export function apiPatch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.patch<T>(url, data, config);
}

/** PUT /api/... */
export function apiPut<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.put<T>(url, data, config);
}

/** DELETE /api/... */
export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.delete<T>(url, config);
}


