'use client';

import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';

export default function IncidentsPage() {
  const incidents = [
    { id: 'INC-101', bookingId: 'BK-501', reportedBy: 'Customer: Ananya Gupta', crew: 'Rameshwar Pal (Driver)', category: 'RUDE_BEHAVIOR', severity: 'MEDIUM', status: 'OPEN', description: 'Driver took an unapproved alternate route and requested extra cash.' },
    { id: 'INC-102', bookingId: 'BK-704', reportedBy: 'Driver: Rajesh Sharma', crew: 'Customer: Sunil Rawat', category: 'DAMAGE_DISPUTE', severity: 'HIGH', status: 'UNDER_INVESTIGATION', description: 'Customer claims scratch occurred during chauffeur parking.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
          Quality & Incident Disputes (Module 12)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review customer incident complaints, crew rating disputes, and adjudicate penalty strikes.
        </p>
      </div>

      <div className="space-y-4">
        {incidents.map((inc) => (
          <div key={inc.id} className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">{inc.id} · Booking: {inc.bookingId}</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{inc.category.replace('_', ' ')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Reported by: {inc.reportedBy} vs {inc.crew}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                inc.severity === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {inc.severity} SEVERITY
              </span>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
              "{inc.description}"
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Status: {inc.status}</span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
                  Resolve & Close
                </button>
                <button className="px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
                  Issue Strike
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
