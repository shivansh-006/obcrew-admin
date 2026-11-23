'use client';

import { useAuthStore, AdminUser } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.message)) return body.message.join(', ');
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // no JSON body
  }
  return '';
}

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    let res: Response;
    try {
      res = await fetch(`${backendUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error('Cannot reach the server.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid email or password.');
      if (res.status === 429) throw new Error('Too many attempts. Please wait a minute.');
      const message = await readErrorMessage(res);
      throw new Error(message || `Sign in failed (${res.status}). Please try again.`);
    }

    const data = await res.json();
    if (!data?.accessToken) {
      throw new Error('Sign in failed. Please try again.');
    }

    const adminUser: AdminUser = {
      id: data.user?.id || 'admin-1',
      name: data.user?.name || email.split('@')[0],
      email: data.user?.email || email,
      role: data.user?.role || 'ADMIN',
      vendorId: data.user?.vendorId,
    };

    setAuth(adminUser, data.accessToken, data.refreshToken ?? null);
  };

  const handleLogout = async () => {
    // Best effort: tell the server to end the session. Errors are ignored.
    if (useAuthStore.getState().token) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          signal: controller.signal,
          redirectOnAuthFailure: false,
        });
      } catch {
        // ignore: backend down or slow
      } finally {
        clearTimeout(timer);
      }
    }

    logout();
    router.push('/login');
  };

  return {
    user,
    token,
    isAuthenticated,
    loginWithCredentials,
    logout: handleLogout,
  };
}