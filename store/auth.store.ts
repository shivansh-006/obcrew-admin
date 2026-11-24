import { create } from 'zustand';

export type PlatformRole =
  | 'ADMIN_OBCREW'
  | 'SUPER_ADMIN_OBCREW'
  | 'ADMIN_OBPARK'
  | 'SUPER_ADMIN_OBPARK'
  | 'ADMIN'
  | 'SUPERADMIN';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  phoneNumber?: string | null;
  vendorId?: string | null;
}

export const AUTH_STORAGE_KEYS = {
  token: 'obcrew_token',
  refreshToken: 'obcrew_refresh_token',
  user: 'obcrew_user',
} as const;

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string, refreshToken?: string | null) => void;
  setTokens: (token: string, refreshToken?: string | null) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

function read(key: string): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

function readUser(): AdminUser | null {
  if (typeof window === 'undefined' || !localStorage.getItem(AUTH_STORAGE_KEYS.token)) return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

function writeTokens(token: string, refreshToken: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
  if (refreshToken) localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  else localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readUser(),
  token: read(AUTH_STORAGE_KEYS.token),
  refreshToken: read(AUTH_STORAGE_KEYS.refreshToken),
  isAuthenticated: !!read(AUTH_STORAGE_KEYS.token),

  setAuth: (user, token, refreshToken = null) => {
    writeTokens(token, refreshToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    }
    set({ user, token, refreshToken, isAuthenticated: true });
  },

  setTokens: (token, refreshToken = null) => {
    writeTokens(token, refreshToken);
    set({ token, refreshToken, isAuthenticated: true });
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    }
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEYS.token);
      localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
