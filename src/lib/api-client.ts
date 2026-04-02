/**
 * API client utility that automatically includes the Bearer token from the session.
 * Built on axios with a request interceptor for auth. External API is unchanged:
 * fetchWithAuth(url, options?) returns parsed JSON just like before.
 */

import axios, { type AxiosRequestConfig } from 'axios';

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Get a fresh token from the session
 */
async function getToken(): Promise<string> {
  // Return cached token if still valid (with 30s buffer)
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 30000) {
    console.log('[getToken] Returning cached token');
    return cachedToken;
  }

  console.log('[getToken] Fetching new token from /api/auth/token');
  const res = await axios.get<{ token: string }>('/api/auth/token');
  const { token } = res.data;
  cachedToken = token;

  // Cache token for 6 minutes
  tokenExpiryTime = Date.now() + 6 * 60 * 1000;

  console.log('[getToken] New token generated and cached');
  return token;
}

// Axios instance shared for all API calls
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token before every request
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Map a RequestInit-style options object to AxiosRequestConfig.
 * This keeps the external call-sites unchanged.
 */
function toAxiosConfig(options: RequestInit): AxiosRequestConfig {
  const config: AxiosRequestConfig = {};
  if (options.method) config.method = options.method as AxiosRequestConfig['method'];
  if (options.body) {
    config.data =
      typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  }
  if (options.headers) {
    config.headers = options.headers as Record<string, string>;
  }
  return config;
}

/**
 * Make an authenticated API request with Bearer token.
 * Keeps the same external signature as the original fetch-based implementation.
 *
 * @param url - The API endpoint
 * @param options - Fetch-compatible options (method, body, headers, etc.)
 * @returns Parsed JSON response
 */
export async function fetchWithAuth<T = Record<string, unknown>>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const config = toAxiosConfig(options);
    const response = await apiClient.request<T>({ url, ...config });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body = error.response?.data as
        | { error?: string | { message?: string } }
        | undefined;

      const errorData = body?.error;
      const errorMsg =
        (typeof errorData === 'string'
          ? errorData
          : (errorData as { message?: string } | undefined)?.message) ??
        `HTTP ${status ?? 'unknown'}`;

      if (status === 401) {
        clearTokenCache();
        throw new Error(
          `Authentication failed (${errorMsg}) - please try refreshing the page`
        );
      }

      throw new Error(errorMsg);
    }
    if (error instanceof Error) throw error;
    throw new Error('Failed to complete API request');
  }
}

/**
 * Clear the cached token (call on logout)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiryTime = null;
}
