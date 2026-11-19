'use client';

import { useState } from 'react';
import { Users, CheckCircle2, XCircle, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';

interface PendingCrew {
  id: string;
  name: string;
  role: 'DRIVER' | 'MECHANIC';
  onboardingType: 'FREELANCE' | 'VENDOR_AFFILIATED';
  phoneNumber: string;
  createdAt: string;
  documents: { type: string; url: string; verified: boolean }[];
}

export default function CrewVerificationPage() {
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'DRIVER' | 'MECHANIC'>('ALL');

  const [crewList, setCrewList] = useState<PendingCrew[]>([
    {
      id: 'crew-001',
      name: 'Rameshwar Pal',
      role: 'DRIVER',
      onboardingType: 'FREELANCE',
      phoneNumber: '+91 98111 22334',
      createdAt: '2026-11-19T08:30:00Z',
      documents: [
        { type: 'AADHAR_FRONT', url: '#', verified: true },
        { type: 'DRIVING_LICENSE', url: '#', verified: false },
        { type: 'POLICE_VERIFICATION', url: '#', verified: false },
      ],
    },
    {
      id: 'crew-002',
      name: 'Mohit Saini (Saini Motors)',
      role: 'MECHANIC',
      onboardingType: 'VENDOR_AFFILIATED',
      phoneNumber: '+91 99222 33445',
      createdAt: '2026-11-19T09:15:00Z',
      documents: [
        { type: 'AADHAR_FRONT', url: '#', verified: true },
        { type: 'MECHANIC_CERTIFICATE', url: '#', verified: true },
        { type: 'SHOP_ESTABLISHMENT_LICENSE', url: '#', verified: false },
      ],
    },
  ]);

  const handleVerify = (id: string, action: 'APPROVE' | 'REJECT') => {
    // API wiring: PATCH /admin/crew/:id/verify
    alert(`${action} triggered for ${id}. Connects to PATCH /admin/crew/${id}/verify`);
  };

  const filtered = selectedRole === 'ALL' ? crewList : crewList.filter((c) => c.role === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Crew KYC Verification Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review government IDs, background checks, and certifications before unlocking dispatch.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
          {(['ALL', 'DRIVER', 'MECHANIC'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedRole === r
                  ? 'bg-[#074139] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Pending Review Pipeline ({filtered.length})</span>
          <span className="text-[11px] text-slate-400">Endpoint: GET /admin/crew/pending</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((crew) => (
            <div key={crew.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{crew.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    crew.role === 'DRIVER' ? 'bg-cyan-50 text-cyan-800 border border-cyan-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {crew.role}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {crew.onboardingType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Phone: {crew.phoneNumber} · ID: {crew.id}</p>

                {/* Document badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {crew.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors"
                    >
                      <FileText className="h-3 w-3 text-slate-500" />
                      <span>{doc.type}</span>
                      <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => handleVerify(crew.id, 'APPROVE')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verify & Activate</span>
                </button>
                <button
                  onClick={() => handleVerify(crew.id, 'REJECT')}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
