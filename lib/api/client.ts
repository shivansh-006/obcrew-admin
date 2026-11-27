import { useAuthStore } from '@/store/auth.store';

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export class ApiClientError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Reads access token from active Zustand auth store or falls back to localStorage.
 */
export function getAuthToken(): string | null {
  const storeToken = useAuthStore.getState().token;
  if (storeToken) return storeToken;

  if (typeof window !== 'undefined') {
    return localStorage.getItem('obcrew_token');
  }

  return null;
}

/**
 * Reads refresh token from active Zustand auth store or falls back to localStorage.
 */
export function getRefreshToken(): string | null {
  const storeRefreshToken = useAuthStore.getState().refreshToken;
  if (storeRefreshToken) return storeRefreshToken;

  if (typeof window !== 'undefined') {
    return localStorage.getItem('obcrew_refresh_token');
  }

  return null;
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Rotates the refresh token and updates the store with the new access token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        useAuthStore.getState().logout();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.token;
      const newRefreshToken = data.refreshToken;

      if (typeof newAccessToken === 'string' && newAccessToken.trim()) {
        useAuthStore.getState().setToken(newAccessToken);
        if (newRefreshToken && typeof window !== 'undefined') {
          localStorage.setItem('obcrew_refresh_token', newRefreshToken);
        }
        return newAccessToken;
      }

      useAuthStore.getState().logout();
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
}

/**
 * Reusable, authenticated fetch client for OBCREW Admin API calls.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, skipAuthRefresh, ...customConfig } = options;
  let token = getAuthToken();

  let url = `${BACKEND_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  });

  // Attempt automatic token refresh on 401
  if (response.status === 401 && !skipAuthRefresh && getRefreshToken()) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      const retryHeaders = {
        ...defaultHeaders,
        ...headers,
        Authorization: `Bearer ${freshToken}`,
      };
      response = await fetch(url, {
        headers: retryHeaders,
        ...customConfig,
      });
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage = errorBody;
    let parsedData: unknown = undefined;

    try {
      const json = JSON.parse(errorBody);
      parsedData = json;
      parsedMessage =
        Array.isArray(json.message)
          ? json.message.join(', ')
          : json.message || errorBody;
    } catch {
      // Retain plain text errorBody
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
    }

    throw new ApiClientError(
      response.status,
      parsedMessage || `API Request Failed with status ${response.status}`,
      parsedData
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return {} as T;
}
