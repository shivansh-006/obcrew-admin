'use client';

import { Users, MapPin, Building2, AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import Link from 'next/link';

export default function DashboardPage() {
  const stats = [
    { label: 'Active Drivers', value: '42', change: '+12% from yesterday', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Roadside Mechanics', value: '18', change: '5 on active service', icon: MapPin, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Fleet Agencies', value: '7', change: '2 pending KYC', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Incident Reports', value: '3', change: 'Requires resolution', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#074139] to-[#0a5e52] text-white shadow-sm">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl md:text-2xl font-bold tracking-wide`}>
            OBCREW Command Overview
          </h1>
          <p className="text-xs text-[#95D0CC] mt-1">
            Real-time telemetry and dispatch status across ObPark chauffeur and roadside networks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/live-map"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5"
          >
            <span>Live Telemetry Radar</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/admin/crew"
            className="px-4 py-2 bg-[#95D0CC] text-[#074139] hover:bg-[#b0dedb] rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Verify Crew (5 Pending)
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <div className={`h-8 w-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
                  {s.value}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {s.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <h2 className={`${microgrammaBold.className} text-sm font-semibold text-slate-900 flex items-center justify-between`}>
            <span>Pending Crew KYC Reviews</span>
            <Link href="/admin/crew" className="text-xs text-[#074139] hover:underline font-normal">View all →</Link>
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Rajesh Sharma', role: 'CHAUFFEUR DRIVER', phone: '+91 98765 43210', status: 'DOCS_UPLOADED' },
              { name: 'Amit Verma', role: 'RSA MECHANIC', phone: '+91 91234 56789', status: 'PENDING_POLICE' },
              { name: 'Vikas Kumar', role: 'CHAUFFEUR DRIVER', phone: '+91 99887 76655', status: 'DOCS_UPLOADED' },
            ].map((crew, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{crew.name}</p>
                  <p className="text-[10px] text-slate-400">{crew.role} · {crew.phone}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {crew.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <h2 className={`${microgrammaBold.className} text-sm font-semibold text-slate-900 flex items-center justify-between`}>
            <span>Recent Tri-Party Wallet Settled</span>
            <Link href="/admin/settlements" className="text-xs text-[#074139] hover:underline font-normal">Ledgers →</Link>
          </h2>
          <div className="space-y-3">
            {[
              { trip: 'BK-9021', type: 'CHAUFFEUR (4 hrs)', total: '₹1,200', split: 'Driver ₹840 · Vendor ₹180 · ObPark ₹180' },
              { trip: 'BK-9022', type: 'MECHANIC RSA (Battery Jump)', total: '₹850', split: 'Mechanic ₹722.5 · ObPark ₹127.5 (85/15)' },
              { trip: 'BK-9023', type: 'CHAUFFEUR (Outstation)', total: '₹2,800', split: 'Driver ₹2,380 · ObPark ₹420 (Freelance 85/15)' },
            ].map((settle, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{settle.trip} · {settle.type}</span>
                  <span className={`${microgrammaBold.className} text-xs text-emerald-700`}>{settle.total}</span>
                </div>
                <p className="text-[10px] text-slate-500">{settle.split}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
