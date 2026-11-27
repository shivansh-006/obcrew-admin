import { AUTH_STORAGE_KEYS, useAuthStore } from '@/store/auth.store';

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type QueryValue = string | number | boolean | undefined | null;

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** On 401, refresh the access token once and retry once. Default: true */
  retryOnUnauthorized?: boolean;
  /** If the refresh fails, clear the session and go to /login?expired=1. Default: true */
  redirectOnAuthFailure?: boolean;
}

export class NetworkError extends Error {
  constructor() {
    super('Cannot reach the server. Check that the backend is running.');
    this.name = 'NetworkError';
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, BACKEND_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function send(path: string, options: ApiFetchOptions, token: string | null): Promise<Response> {
  const { method = 'GET', body, query, signal } = options;
  try {
    return await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new NetworkError();
  }
}

// ---------- Token refresh (one at a time) ----------

let refreshInFlight: Promise<string | null> | null = null;

async function runWithLock<T>(task: () => Promise<T>): Promise<T> {
  // Browser lock so only one tab refreshes at a time; fall back to this tab only
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('obcrew-auth-refresh', () => task());
  }
  return task();
}

async function doRefresh(failedToken: string | null): Promise<string | null> {
  const { setTokens } = useAuthStore.getState();

  // Another request or tab may already have refreshed while we waited
  const latestToken = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  if (latestToken && latestToken !== failedToken) {
    setTokens(latestToken, localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken));
    return latestToken;
  }

  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  let res: Response;
  try {
    res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    // Without browser locks, another tab may have used the token first: use its result
    const nowToken = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    const nowRefresh = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
    if (nowToken && nowRefresh && nowRefresh !== refreshToken) {
      setTokens(nowToken, nowRefresh);
      return nowToken;
    }
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!data?.accessToken) return null;

  setTokens(data.accessToken, data.refreshToken ?? null);
  return data.accessToken as string;
}

function refreshAccessToken(failedToken: string | null): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = runWithLock(() => doRefresh(failedToken)).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

let sessionEnding = false;

function endSession() {
  if (sessionEnding || typeof window === 'undefined') return;
  sessionEnding = true;
  const next = window.location.pathname + window.location.search;
  const onLogin = window.location.pathname.startsWith('/login');
  useAuthStore.getState().logout();
  if (!onLogin) {
    window.location.replace(`/login?expired=1&next=${encodeURIComponent(next)}`);
  }
}

// ---------- Public helper ----------

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { retryOnUnauthorized = true, redirectOnAuthFailure = true } = options;
  const token = useAuthStore.getState().token;

  const res = await send(path, options, token);
  if (res.status !== 401 || !retryOnUnauthorized) return res;

  const newToken = await refreshAccessToken(token);
  if (!newToken) {
    if (redirectOnAuthFailure) endSession();
    return res;
  }

  // Retry the original request once with the new token
  return send(path, options, newToken);
}