'use client';

import { useAuthStore, AdminUser, PlatformRole } from '@/store/auth.store';
import { BACKEND_BASE_URL } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, token, refreshToken, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore();

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    let response: Response;
    try {
      response = await fetch(`${BACKEND_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (networkErr) {
      console.warn('Unable to reach the admin authentication service.', networkErr);
      throw new Error('Unable to reach the authentication service. Check the backend connection and try again.');
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Invalid email or password.';
      throw new Error(message);
    }

    if (!data || typeof data !== 'object') {
      throw new Error('The authentication service returned an invalid response.');
    }

    const authData = data as {
      user?: {
        id?: string;
        email?: string;
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
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || email.split('@')[0];

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
    const currentToken = token;
    storeLogout();
    if (currentToken) {
      try {
        await fetch(`${BACKEND_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        // Revocation best effort
      }
    }
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
