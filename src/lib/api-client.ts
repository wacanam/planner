/**
 * Axios-based API client with:
 * - Request interceptor that injects Bearer token automatically
 * - Typed response generics — T is the payload, envelope unwrapped automatically
 * - Consistent error handling via response interceptor
 */

import axios, { type AxiosRequestConfig } from 'axios';

// ─── Standard API envelope ────────────────────────────────────────────────────

/** All API routes return { data: T } (envelope). Helpers unwrap automatically. */
export type ApiResponse<T> = { data: T; [key: string]: unknown };

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 30_000) {
    return cachedToken;
  }
  const res = await axios.get<{ token: string }>('/api/auth/token');
  cachedToken = res.data.token;
  tokenExpiryTime = Date.now() + 6 * 60 * 1000;
  return cachedToken;
}

export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiryTime = null;
}

// ─── Internal axios instance ──────────────────────────────────────────────────

const _axiosInstance = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — inject Bearer token
_axiosInstance.interceptors.request.use(async (config) => {
  const token = await getToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — normalise errors
_axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data as { error?: string } | undefined;
      const msg = body?.error ?? `HTTP ${status ?? 'unknown'}`;
      if (status === 401) {
        clearTokenCache();
        throw new Error('Authentication failed — please refresh the page');
      }
      throw new Error(msg);
    }
    throw error;
  }
);

// ─── Typed API client — T is the payload type, envelope unwrapped automatically
//
// Usage:
//   const users = await apiClient.get<User[]>('/api/congregations/123/members');
//   const territory = await apiClient.post<Territory>('/api/territories', { name, number });

export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await _axiosInstance.get<ApiResponse<T>>(url, config);
    return res.data.data;
  },
  post: async <T = void, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await _axiosInstance.post<ApiResponse<T>>(url, data, config);
    return res.data.data;
  },
  patch: async <T = void, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await _axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return res.data.data;
  },
  put: async <T = void, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const res = await _axiosInstance.put<ApiResponse<T>>(url, data, config);
    return res.data.data;
  },
  delete: async <T = void>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await _axiosInstance.delete<ApiResponse<T>>(url, config);
    return res.data.data;
  },
};
