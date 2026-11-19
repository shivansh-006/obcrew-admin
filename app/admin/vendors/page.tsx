'use client';

import { useState } from 'react';
import { Building2, CheckCircle, Clock, Plus, ShieldCheck, Users } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([
    {
      id: 'vendor-01',
      agencyName: 'Apex Chauffeur Services Pvt Ltd',
      contactPerson: 'Vikram Malhotra',
      email: 'operations@apexchauffeur.in',
      phone: '+91 98100 12345',
      gstin: '07AAAAA0000A1Z5',
      driversCount: 14,
      status: 'VERIFIED',
    },
    {
      id: 'vendor-02',
      agencyName: 'RapidFix Garage & RSA Services',
      contactPerson: 'Suresh Raina',
      email: 'suresh@rapidfix.in',
      phone: '+91 98200 54321',
      gstin: '27BBBBB1111B2Z6',
      driversCount: 6,
      status: 'PENDING_APPROVAL',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Fleet Agency Vendors (Phase 7)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate agency partnerships, company KYC, and tri-party commission splits.
          </p>
        </div>

        <button className="px-4 py-2 bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          <span>Onboard New Agency</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vendors.map((v) => (
          <div key={v.id} className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>{v.agencyName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contact: {v.contactPerson} · {v.phone}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                v.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">GSTIN</span>
                <span className="font-mono text-slate-700">{v.gstin}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Fleet</span>
                <span className="font-bold text-slate-800">{v.driversCount} Drivers / Mechanics</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px]">Commission: 70/15/15 Tri-Party</span>
              <button className="text-[#074139] font-bold hover:underline">
                Manage Fleet & Ledgers →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
