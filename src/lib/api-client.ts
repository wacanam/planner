/**
 * API client utility that automatically includes the Bearer token from the session
 * Simplifies authenticated API requests throughout the app
 */

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
  const res = await fetch('/api/auth/token');

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error('[getToken] Token endpoint returned:', res.status, error);
    throw new Error(`Failed to get authentication token: ${res.status}`);
  }

  const { token } = await res.json();
  cachedToken = token;

  // Cache token for 6 minutes (assuming JWT is 7d, but refresh frequently)
  tokenExpiryTime = Date.now() + 6 * 60 * 1000;

  console.log('[getToken] New token generated and cached');
  return token;
}

/**
 * Make an authenticated API request with Bearer token
 * @param url - The API endpoint
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 */
export async function fetchWithAuth<T = Record<string, unknown>>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const token = await getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      const errorData = error.error;
      const errorMsg =
        (typeof errorData === 'string' ? errorData : errorData?.message) || `HTTP ${res.status}`;

      if (res.status === 401) {
        // Clear token cache and provide helpful message
        clearTokenCache();
        throw new Error(`Authentication failed (${errorMsg}) - please try refreshing the page`);
      }

      throw new Error(errorMsg);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
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
