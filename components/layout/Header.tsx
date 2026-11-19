'use client';

import { Bell, Search, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b border-slate-200/80 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 w-72">
        <div className="relative w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search crew, booking ID, or vendor…"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#074139] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Core Monolith Connected</span>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>
    </header>
  );
}
