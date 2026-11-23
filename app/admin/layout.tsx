'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const [isLoaded, setIsLoaded] = useState(false);
  const firstCheck = useRef(true);

  useEffect(() => {
    if (!token) {
      // First visit without a token: remember the page so login can return to it.
      // Token lost later (logout): just go to the login page.
      const target = firstCheck.current
        ? `/login?next=${encodeURIComponent(pathname + window.location.search)}`
        : '/login';
      firstCheck.current = false;
      setIsLoaded(false);
      router.replace(target);
      return;
    }

    firstCheck.current = false;
    setIsLoaded(true);
  }, [token, pathname, router]);

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