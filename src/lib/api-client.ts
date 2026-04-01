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
        return cachedToken;
    }

    const res = await fetch('/api/auth/token');
    if (!res.ok) {
        throw new Error('Failed to get authentication token');
    }

    const { token } = await res.json();
    cachedToken = token;

    // Cache token for 6 minutes (assuming JWT is 7d, but refresh frequently)
    tokenExpiryTime = Date.now() + 6 * 60 * 1000;

    return token;
}

/**
 * Make an authenticated API request with Bearer token
 * @param url - The API endpoint
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 */
export async function fetchWithAuth<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(url, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
}

/**
 * Clear the cached token (call on logout)
 */
export function clearTokenCache(): void {
    cachedToken = null;
    tokenExpiryTime = null;
}
