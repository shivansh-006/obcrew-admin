'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, setAuth } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('obcrew_token');

    if (!token) {
      localStorage.removeItem('obcrew_token');
      localStorage.removeItem('obcrew_refresh_token');
      localStorage.removeItem('obcrew_user');
      const target = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${target}`);
      return;
    }

    // Hydrate store if user missing
    if (!user) {
      try {
        const stored = localStorage.getItem('obcrew_user');
        const refreshToken = localStorage.getItem('obcrew_refresh_token');
        if (stored) {
          const parsedUser = JSON.parse(stored);
          setAuth(parsedUser, token, refreshToken);
        }
      } catch {
        // Continue
      }
    }

    setIsLoaded(true);
  }, [router, pathname, user, setAuth]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-[#074139] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Operations Hub…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <aside className="w-64 h-screen sticky top-0 hidden md:block shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
