'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  Wallet,
  AlertTriangle,
  LogOut,
  Radio,
  ChevronRight,
  X,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { useAuth } from '@/hooks/useAuth';

const NAV_GROUPS = [
  {
    label: 'Command Central',
    items: [
      { href: '/admin', label: 'Operations Hub', icon: LayoutDashboard, exact: true },
      { href: '/admin/live-map', label: 'Spatial Telemetry', icon: MapPin },
    ],
  },
  {
    label: 'Workforce Management',
    items: [
      { href: '/admin/crew', label: 'Crew KYC Verification', icon: Users },
      { href: '/admin/vendors', label: 'Fleet Agency Vendors', icon: Building2 },
    ],
  },
  {
    label: 'Financials & Quality',
    items: [
      { href: '/admin/settlements', label: 'Tri-Party Ledgers', icon: Wallet },
      { href: '/admin/incidents', label: 'Quality & Disputes', icon: AlertTriangle },
    ],
  },
];

export function Sidebar({ onNavigate, className = '' }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'O';
  const userDisplayName = user?.name || 'Operations Lead';
  const userRole = user?.role || 'Admin';

  return (
    <aside className={`flex h-full w-64 lg:w-72 shrink-0 flex-col bg-white border-r border-slate-200/80 shadow-[1px_0_12px_rgba(0,0,0,0.02)] select-none ${className}`}>
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div>
            <span className={`${microgrammaBold.className} text-lg font-bold text-[#074139] tracking-wider block leading-none`}>
              OBCREW
            </span>
          </div>
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close menu"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                    ? 'bg-[#074139] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#95D0CC]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-[#95D0CC]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[#074139] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{userDisplayName}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
