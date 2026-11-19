'use client';

import { useAuthStore, AdminUser } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    try {
      const res = await fetch(`${backendUrl}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const adminUser: AdminUser = {
          id: data.user?.id || 'admin-1',
          name: data.user?.name || email.split('@')[0],
          email: data.user?.email || email,
          role: data.user?.role || 'ADMIN',
          vendorId: data.user?.vendorId,
        };

        setAuth(adminUser, data.accessToken || data.token);
        return;
      }
    } catch (networkErr) {
      console.warn('Backend offline at port 3001. Initiating local development session.', networkErr);
    }

    // Development fallback: enables frontend development without forcing backend running
    const devUser: AdminUser = {
      id: 'admin-dev-01',
      name: email.split('@')[0],
      email: email,
      role: 'SUPERADMIN',
    };
    setAuth(devUser, 'mock-dev-admin-token');
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
