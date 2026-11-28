'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, AUTH_STORAGE_KEYS } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, token, setAuth } = useAuthStore();
  const firstCheck = useRef(true);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEYS.token) : null;
    const effectiveToken = token || storedToken;

    if (!effectiveToken) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEYS.token);
        localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
        localStorage.removeItem(AUTH_STORAGE_KEYS.user);
      }
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const target = firstCheck.current && pathname
        ? `/login?next=${encodeURIComponent(pathname + search)}`
        : '/login';
      firstCheck.current = false;
      setIsLoaded(false);
      router.replace(target);
      return;
    }

    // Hydrate store if user missing
    if (!user && typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);
        const storedRefresh = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setAuth(parsed, effectiveToken, storedRefresh);
        }
      } catch {
        // Continue
      }
    }

    firstCheck.current = false;
    setIsLoaded(true);
  }, [router, pathname, token, user, setAuth]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside className = "w-64 shrink-0 h-full hidden md:block">
        <Sidebar />
      </aside>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
