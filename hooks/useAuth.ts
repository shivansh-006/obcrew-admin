'use client';

import { useAuthStore, AdminUser } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          : 'The email or password was not accepted.';
      throw new Error(message);
    }

    if (!data || typeof data !== 'object') {
      throw new Error('The authentication service returned an invalid response.');
    }

    const authData = data as {
      user?: Partial<AdminUser>;
      accessToken?: unknown;
      token?: unknown;
    };
    const token = authData.accessToken ?? authData.token;
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('The authentication service did not return an access token.');
    }

    const adminUser: AdminUser = {
      id: authData.user?.id || 'admin-1',
      name: authData.user?.name || email.split('@')[0],
      email: authData.user?.email || email,
      role: authData.user?.role || 'ADMIN',
      vendorId: authData.user?.vendorId,
    };

    setAuth(adminUser, token);
  };

  const handleLogout = () => {
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
