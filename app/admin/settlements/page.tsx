'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  RefreshCw,
  AlertCircle,
  Wallet,
  Building2,
  Users,
  ReceiptText,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  usePendingCrewPayoutsQuery,
  usePendingVendorPayoutsQuery,
  useGlobalSettlementLedgerQuery,
  useBillingSummaryQuery,
} from '@/hooks/useSettlements';
import {
  PayoutConfirmationModal,
  PayoutRecipient,
} from '@/components/settlements/PayoutConfirmationModal';
import { BackendPendingVendorPayout, PendingCrewPayout } from '@/types/settlements';
import { useQueryClient } from '@tanstack/react-query';

function maskBankAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return 'Not provided';
  const clean = accountNumber.trim();
  if (clean.length <= 4) return '••••';
  return `•••• •••• ${clean.slice(-4)}`;
}

export default function SettlementsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Active Tab: Pending Crew Payouts vs Vendor Retainers vs Global Settled Ledger
  const [activeTab, setActiveTab] = useState<'PENDING_PAYOUTS' | 'VENDOR_RETAINERS' | 'GLOBAL_LEDGER'>('PENDING_PAYOUTS');

  // Payout Modal State
  const [selectedRecipient, setSelectedRecipient] = useState<PayoutRecipient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Selected Billing Cycle (defaults to current month YYYY-MM e.g. "2026-11")
  const [selectedCycle, setSelectedCycle] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Queries
  const pendingCrewPayoutsQuery = usePendingCrewPayoutsQuery();
  const billingSummaryQuery = useBillingSummaryQuery(selectedCycle, false); // Capability gap flag
  const pendingVendorsQuery = usePendingVendorPayoutsQuery(false); // Capability gap flag
  const globalLedgerQuery = useGlobalSettlementLedgerQuery(false); // Capability gap flag

  // Computed values
  const pendingCrews: PendingCrewPayout[] = pendingCrewPayoutsQuery.data?.crews ?? [];

  const totalPendingCrewAmount = useMemo(() => {
    return pendingCrews.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
  }, [pendingCrews]);

  // Determine exportability
  const hasExportableData = pendingCrews.length > 0;

  // Manual Cache Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['settlements'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (pendingCrews.length > 0) {
      const headers = [
        'Crew Profile ID',
        'Full Name',
        'Phone Number',
        'Email',
        'Bank Account (Masked)',
        'Pending Amount (INR)',
        'Pending Jobs Count',
      ];
      const rows = pendingCrews.map((c: any) => [
        c.crewProfileId,
        c.fullName || 'Unknown',
        c.phoneNumber || c.user?.phoneNumber || 'N/A',
        c.email || c.user?.email || 'N/A',
        c.bankAccountMasked || maskBankAccount(c.bankAccountNumber),
        c.pendingAmount,
        c.pendingJobs ?? c.pendingJobsCount ?? 0,
      ]);
      exportToCSV(
        `OBCrew_Pending_Payouts_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    }
  };

  // Open payout confirmation modal for a specific crew member
  const handleOpenCrewPayout = (crew: any) => {
    setSelectedRecipient({
      type: 'CREW',
      id: crew.crewProfileId,
      name: crew.fullName || 'Crew Partner',
      bankAccountMasked: crew.bankAccountMasked || maskBankAccount(crew.bankAccountNumber),
      pendingAmount: crew.pendingAmount,
      pendingJobsCount: crew.pendingJobs ?? crew.pendingJobsCount ?? 0,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Settlement Ledgers & Disbursals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative payout settlement registry for verified chauffeurs, mechanics, and corporate fleet retainers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Billing Cycle Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <label htmlFor="billing-cycle" className="text-[11px] font-semibold text-slate-600">
              Cycle:
            </label>
            <input
              id="billing-cycle"
              type="month"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh financial data"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!hasExportableData}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Settlement Sheet</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Platform Commission Split Model */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Platform Fee Commission Model</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ReceiptText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className={`${microgrammaBold.className} text-xl font-bold text-emerald-700`}>
              15% Platform Split
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Freelance: 85% Crew / 15% Platform · Tri-Party: 70% Crew / 15% Agency / 15% Platform
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Cycle: {selectedCycle}
          </span>
        </div>

        {/* Card 2: Crew Wallet Disbursals */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pending Crew Disbursals</span>
            <div className="h-7 w-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          {pendingCrewPayoutsQuery.isLoading ? (
            <div className="h-8 w-32 bg-slate-100 animate-pulse rounded my-2" />
          ) : pendingCrewPayoutsQuery.isError ? (
            <div>
              <p className="text-xs font-semibold text-red-600">Failed to fetch</p>
              <span className="text-[10px] text-slate-400">Backend connectivity error</span>
            </div>
          ) : (
            <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
              {formatCurrency(totalPendingCrewAmount)}
            </p>
          )}
          <span className="text-[10px] text-slate-400 block">
            {pendingCrewPayoutsQuery.data
              ? `${pendingCrewPayoutsQuery.data.total} partner(s) awaiting payout in queue`
              : 'GET /admin/crew/payouts/pending'}
          </span>
        </div>

        {/* Card 3: Agency Retainer Settlement Protocol */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Agency Retainer Protocol</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className={`${microgrammaBold.className} text-xl font-bold text-slate-900`}>
              OBPARK Admin
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Settlement endpoint: POST /vendor/wallet/admin/settle/:id
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Requires ADMIN_OBPARK or SUPER_ADMIN_OBPARK role
          </span>
        </div>
      </div>

      {/* Tabs Selection Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PENDING_PAYOUTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING_PAYOUTS'
                ? 'bg-[#074139] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Pending Crew Payouts ({pendingCrews.length})
          </button>
          <button
            onClick={() => setActiveTab('VENDOR_RETAINERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'VENDOR_RETAINERS'
                ? 'bg-[#074139] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Agency Retainers
          </button>
          <button
            onClick={() => setActiveTab('GLOBAL_LEDGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GLOBAL_LEDGER'
                ? 'bg-[#074139] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Booking Split Ledgers
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
          {activeTab === 'PENDING_PAYOUTS'
            ? 'GET /admin/crew/payouts/pending'
            : activeTab === 'VENDOR_RETAINERS'
            ? 'Capability Gap: GET /vendor/wallet/admin/pending'
            : 'Capability Gap: GET /crew/wallet/ledger/all'}
        </span>
      </div>

      {/* Tab 1: Pending Crew Payouts Queue (Active & Verified) */}
      {activeTab === 'PENDING_PAYOUTS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className={`${microgrammaBold.className} text-xs font-bold text-slate-900`}>
                Actionable Crew Disbursal Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record an externally executed bank transfer or UPI payment to settle pending driver/mechanic earnings.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Total: {formatCurrency(totalPendingCrewAmount)}
            </span>
          </div>

          {pendingCrewPayoutsQuery.isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-60 bg-slate-50 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : pendingCrewPayoutsQuery.isError ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Failed to Load Crew Payouts</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {pendingCrewPayoutsQuery.error.message || 'Unable to connect to obpark-backend on port 3001.'}
                </p>
              </div>
              <button
                onClick={() => pendingCrewPayoutsQuery.refetch()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : pendingCrews.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className={`${microgrammaBold.className} text-xs font-bold text-slate-800`}>
                  All Crew Earnings Settled
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  There are currently no unpaid earnings in the driver and mechanic payout queue.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingCrews.map((crew: any) => (
                <div
                  key={crew.crewProfileId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {crew.fullName || 'Crew Partner'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {crew.pendingJobs ?? crew.pendingJobsCount ?? 0} job(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Phone: {crew.phoneNumber || crew.user?.phoneNumber || 'N/A'}</span>
                      <span>Email: {crew.email || crew.user?.email || 'N/A'}</span>
                      <span className="font-mono text-slate-600">
                        Bank A/C: {crew.bankAccountMasked || maskBankAccount(crew.bankAccountNumber)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium uppercase">
                        Unpaid Net
                      </span>
                      <span className={`${microgrammaBold.className} text-sm font-bold text-emerald-700 block`}>
                        {formatCurrency(crew.pendingAmount)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenCrewPayout(crew)}
                      className="px-3.5 py-2 bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Record Disbursal</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Vendor Retainers (Capability Gap Notice) */}
      {activeTab === 'VENDOR_RETAINERS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
              Backend Capability Gap: Pending Vendor Retainers Endpoint
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The endpoint <code className="text-[#074139] font-mono px-1 py-0.5 bg-slate-100 rounded">GET /vendor/wallet/admin/pending</code> is not currently registered in the authoritative backend (<code className="font-mono text-[11px]">obpark-backend:integration/final-all</code>).
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vendor agency settlements are executed via <code className="text-[#074139] font-mono">POST /vendor/wallet/admin/settle/:vendorProfileId</code> under <code className="font-semibold text-slate-700">ADMIN_OBPARK</code> or <code className="font-semibold text-slate-700">SUPER_ADMIN_OBPARK</code> authorization.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Global Settled Ledgers (Capability Gap Notice) */}
      {activeTab === 'GLOBAL_LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
            <ReceiptText className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
              Backend Capability Gap: Global Ledger Aggregate Endpoint
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The endpoint <code className="text-[#074139] font-mono px-1 py-0.5 bg-slate-100 rounded">GET /crew/wallet/ledger/all</code> is not currently implemented in the authoritative backend (<code className="font-mono text-[11px]">obpark-backend:integration/final-all</code>).
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Per-trip revenue splits are recorded atomically in the database upon booking completion into <code className="font-mono">CrewEarning</code> (85% freelance or 70% tri-party) and <code className="font-mono">VendorEarning</code> (15%). Aggregate listing endpoints will be introduced in future backend revisions.
            </p>
          </div>
        </div>
      )}

      {/* External Payout Confirmation Modal */}
      {isModalOpen && selectedRecipient && (
        <PayoutConfirmationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecipient(null);
          }}
          recipient={selectedRecipient}
        />
      )}
    </div>
  );
}
