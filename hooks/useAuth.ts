'use client';

import { useAuthStore, AdminUser, PlatformRole, AUTH_STORAGE_KEYS } from '@/store/auth.store';
import { BACKEND_BASE_URL } from '@/lib/api/client';
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
  const { user, token, refreshToken, isAuthenticated, setAuth, logout } = useAuthStore();

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error('Unable to reach the authentication service. Check the backend connection and try again.');
    }

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid email or password.');
      if (res.status === 429) throw new Error('Too many attempts. Please wait a minute.');
      const message = await readErrorMessage(res);
      throw new Error(message || `Sign in failed (${res.status}). Please try again.`);
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      throw new Error('The authentication service returned an invalid response.');
    }

    const authData = data as {
      user?: {
        id?: string;
        email?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        role?: PlatformRole;
        vendorId?: string;
      };
      accessToken?: string;
      refreshToken?: string;
      token?: string;
    };

    const accessToken = authData.accessToken ?? authData.token;
    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new Error('The authentication service did not return an access token.');
    }

    const u = authData.user || {};
    const fullName =
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      email.split('@')[0];

    const adminUser: AdminUser = {
      id: u.id || 'admin-1',
      name: fullName,
      email: u.email || email,
      role: u.role || 'ADMIN_OBCREW',
      phoneNumber: u.phoneNumber,
      vendorId: u.vendorId,
    };

    setAuth(adminUser, accessToken, authData.refreshToken ?? null);
  };

  const handleLogout = async () => {
    const currentToken = useAuthStore.getState().token;
    if (currentToken) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          signal: controller.signal,
          redirectOnAuthFailure: false,
        });
      } catch {
        // Revocation best effort
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
    refreshToken,
    isAuthenticated,
    loginWithCredentials,
    logout: handleLogout,
  };
}
