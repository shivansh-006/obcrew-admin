import { create } from 'zustand';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'OPS_MANAGER' | 'VENDOR';
  vendorId?: string;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('obcrew_token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('obcrew_token') : false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('obcrew_token', token);
      localStorage.setItem('obcrew_user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('obcrew_token');
      localStorage.removeItem('obcrew_user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
