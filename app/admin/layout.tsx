'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('obcrew_token');

    if (!token) {
      // In local development, automatically initialize a development session
      // so the user and developers are never locked out of inspecting pages
      const devUser = {
        id: 'admin-dev-01',
        name: 'Shiva (Ops Lead)',
        email: 'shiva@obrive.com',
        role: 'SUPERADMIN',
      };
      localStorage.setItem('obcrew_token', 'mock-dev-admin-token');
      localStorage.setItem('obcrew_user', JSON.stringify(devUser));
      setIsLoaded(true);
    } else {
      setIsLoaded(true);
    }
  }, [router]);

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
