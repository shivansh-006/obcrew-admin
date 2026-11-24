import { create } from 'zustand';

export type PlatformRole =
  | 'ADMIN_OBCREW'
  | 'ADMIN_OBPARK'
  | 'SUPER_ADMIN_OBCREW'
  | 'SUPER_ADMIN_OBPARK'
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'OPS_MANAGER'
  | 'VENDOR'
  | 'DRIVER'
  | 'MECHANIC'
  | 'CUSTOMER';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  phoneNumber?: string | null;
  vendorId?: string | null;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string, refreshToken?: string | null) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('obcrew_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('obcrew_token');
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('obcrew_refresh_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  isAuthenticated: !!getStoredToken(),

  setAuth: (user, token, refreshToken = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('obcrew_token', token);
      localStorage.setItem('obcrew_user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('obcrew_refresh_token', refreshToken);
      }
    }
    set({
      user,
      token,
      refreshToken: refreshToken || getStoredRefreshToken(),
      isAuthenticated: true,
    });
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('obcrew_token', token);
    }
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('obcrew_token');
      localStorage.removeItem('obcrew_refresh_token');
      localStorage.removeItem('obcrew_user');
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
