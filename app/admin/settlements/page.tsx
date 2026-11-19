'use client';

import { Wallet, ArrowDownRight, ArrowUpRight, DollarSign, Download } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';

export default function SettlementsPage() {
  const transactions = [
    { id: 'TXN-8801', tripId: 'BK-1092', payee: 'Driver: Rameshwar Pal', amount: '₹1,020.00', platformFee: '₹180.00', status: 'SETTLED', date: 'Today, 10:14 AM' },
    { id: 'TXN-8802', tripId: 'BK-1093', payee: 'Agency: Apex Chauffeur (15%)', amount: '₹360.00', platformFee: '₹360.00', status: 'SETTLED', date: 'Today, 09:40 AM' },
    { id: 'TXN-8803', tripId: 'BK-1094', payee: 'Mechanic: Mohit Saini', amount: '₹1,275.00', platformFee: '₹225.00', status: 'SETTLED', date: 'Yesterday' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Tri-Party Wallet Ledgers & Payouts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated split accounting (85/15 direct freelance and 70/15/15 agency-linked drivers).
          </p>
        </div>

        <button className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
          <Download className="h-3.5 w-3.5" />
          <span>Export GST Settlement Sheet</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Platform Net Commission (15%)</span>
          <p className={`${microgrammaBold.className} text-2xl font-bold text-emerald-700 mt-2`}>₹84,250</p>
          <span className="text-[10px] text-slate-400">Current billing cycle</span>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Crew Wallet Disbursals</span>
          <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900 mt-2`}>₹3,92,400</p>
          <span className="text-[10px] text-slate-400">85% to verified drivers & mechanics</span>
        </div>
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Vendor Agency Retainers</span>
          <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900 mt-2`}>₹62,100</p>
          <span className="text-[10px] text-slate-400">15% fleet partner payout pool</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Recent Automatic Payout Ledger</span>
          <span className="text-[11px] text-slate-400">Module 11 & Module 19b APIs</span>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">{t.payee}</p>
                <p className="text-[10px] text-slate-400">{t.id} · Booking: {t.tripId} · {t.date}</p>
              </div>
              <div className="text-right">
                <span className={`${microgrammaBold.className} text-xs text-slate-900 block`}>{t.amount}</span>
                <span className="text-[10px] text-slate-400">Platform Split: {t.platformFee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
