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
  ChevronLeft,
  ChevronRight,
  Filter,
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
import {
  BackendPendingVendorPayout,
  PendingCrewPayout,
  LedgerTransaction,
  GlobalLedgerQueryFilters,
} from '@/types/settlements';
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

  // Global Ledger Filters & Pagination State
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerLimit, setLedgerLimit] = useState<number>(20);
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');
  const [ledgerStatus, setLedgerStatus] = useState<'' | 'SETTLED' | 'PENDING'>('');

  const ledgerFilters: GlobalLedgerQueryFilters = useMemo(
    () => ({
      page: ledgerPage,
      limit: ledgerLimit,
      ...(ledgerStartDate ? { startDate: ledgerStartDate } : {}),
      ...(ledgerEndDate ? { endDate: ledgerEndDate } : {}),
      ...(ledgerStatus ? { status: ledgerStatus } : {}),
    }),
    [ledgerPage, ledgerLimit, ledgerStartDate, ledgerEndDate, ledgerStatus]
  );

  // Queries (all active against authoritative backend with PR #36 remediation)
  const pendingCrewPayoutsQuery = usePendingCrewPayoutsQuery();
  const billingSummaryQuery = useBillingSummaryQuery(selectedCycle, true);
  const pendingVendorsQuery = usePendingVendorPayoutsQuery(true);
  const globalLedgerQuery = useGlobalSettlementLedgerQuery(ledgerFilters, true);

  // Computed values
  const pendingCrews: PendingCrewPayout[] = pendingCrewPayoutsQuery.data?.crews ?? [];
  const pendingVendors: BackendPendingVendorPayout[] = pendingVendorsQuery.data?.vendors ?? [];
  const globalLedger: LedgerTransaction[] = globalLedgerQuery.data?.transactions ?? [];
  const totalLedgerRecords = globalLedgerQuery.data?.total ?? 0;
  const totalLedgerPages = globalLedgerQuery.data?.totalPages ?? 1;

  const totalPendingCrewAmount = useMemo(() => {
    return pendingCrews.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
  }, [pendingCrews]);

  const totalPendingVendorAmount = useMemo(() => {
    return pendingVendors.reduce((acc, v) => acc + (v.pendingAmount || 0), 0);
  }, [pendingVendors]);

  // Determine exportability
  const hasExportableData =
    (activeTab === 'PENDING_PAYOUTS' && pendingCrews.length > 0) ||
    (activeTab === 'VENDOR_RETAINERS' && pendingVendors.length > 0) ||
    (activeTab === 'GLOBAL_LEDGER' && globalLedger.length > 0);

  // Manual Cache Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['settlements'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // CSV Export Handler based on active tab
  const handleExportCSV = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (activeTab === 'PENDING_PAYOUTS' && pendingCrews.length > 0) {
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
      exportToCSV(`OBCrew_Pending_Payouts_${todayStr}.csv`, headers, rows);
    } else if (activeTab === 'VENDOR_RETAINERS' && pendingVendors.length > 0) {
      const headers = [
        'Vendor Profile ID',
        'Agency Name',
        'GSTIN',
        'Phone Number',
        'Email',
        'Pending Amount (INR)',
        'Pending Trips Count',
      ];
      const rows = pendingVendors.map((v) => [
        v.vendorProfileId,
        v.agencyName,
        v.gstin || 'N/A',
        v.phoneNumber || 'N/A',
        v.email || 'N/A',
        v.pendingAmount,
        v.pendingTripsCount,
      ]);
      exportToCSV(`OBPark_Pending_Vendor_Retainers_${todayStr}.csv`, headers, rows);
    } else if (activeTab === 'GLOBAL_LEDGER' && globalLedger.length > 0) {
      const headers = [
        'Transaction ID',
        'Booking Code',
        'Trip Amount (INR)',
        'Crew Share (INR)',
        'Vendor Share (INR)',
        'Platform Fee (INR)',
        'Split Type',
        'Status',
        'Created At',
      ];
      const rows = globalLedger.map((tx) => [
        tx.id,
        tx.bookingCode || tx.bookingId,
        tx.tripAmount,
        tx.crewShare,
        tx.vendorShare ?? 0,
        tx.platformCommission,
        tx.splitType,
        tx.status,
        tx.createdAt,
      ]);
      exportToCSV(`OBPlatform_Settlement_Ledger_${todayStr}.csv`, headers, rows);
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

  // Open payout confirmation modal for a specific vendor agency
  const handleOpenVendorPayout = (vendor: BackendPendingVendorPayout) => {
    setSelectedRecipient({
      type: 'VENDOR',
      id: vendor.vendorProfileId,
      name: vendor.agencyName,
      bankAccountMasked: vendor.bankAccountMasked || 'Direct Corporate Settlement',
      pendingAmount: vendor.pendingAmount,
      pendingJobsCount: vendor.pendingTripsCount,
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
            <span className="text-xs text-slate-500 font-medium">Platform Fee Commission ({selectedCycle})</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ReceiptText className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className={`${microgrammaBold.className} text-xl font-bold text-emerald-700`}>
              {billingSummaryQuery.data?.cycleCommission !== undefined
                ? formatCurrency(billingSummaryQuery.data.cycleCommission)
                : billingSummaryQuery.data?.totalPlatformCommission !== undefined
                  ? formatCurrency(billingSummaryQuery.data.totalPlatformCommission)
                  : '15% Platform Split'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500">
                All-Time:{' '}
                <strong className="text-slate-700">
                  {billingSummaryQuery.data?.allTimePlatformCommission !== undefined
                    ? formatCurrency(billingSummaryQuery.data.allTimePlatformCommission)
                    : '—'}
                </strong>
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Freelance: 85% Crew / 15% Platform · Tri-Party: 70% Crew / 15% Agency / 15% Platform
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            GET /admin/billing/summary · Cycle: {selectedCycle}
            {billingSummaryQuery.data?.cycleStartDate && billingSummaryQuery.data?.cycleEndDate && (
              <span> ({billingSummaryQuery.data.cycleStartDate.slice(0, 10)} to {billingSummaryQuery.data.cycleEndDate.slice(0, 10)})</span>
            )}
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
            <div>
              <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
                {formatCurrency(totalPendingCrewAmount)}
              </p>
              {billingSummaryQuery.data?.cycleCrewPayoutsPending !== undefined && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Cycle Pending: {formatCurrency(billingSummaryQuery.data.cycleCrewPayoutsPending)}
                </span>
              )}
            </div>
          )}
          <span className="text-[10px] text-slate-400 block font-mono">
            GET /admin/crew/payouts/pending · {pendingCrews.length} partner(s) in queue
          </span>
        </div>

        {/* Card 3: Agency Retainer Settlement Protocol */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pending Agency Retainers</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          {pendingVendorsQuery.isLoading ? (
            <div className="h-8 w-32 bg-slate-100 animate-pulse rounded my-2" />
          ) : pendingVendorsQuery.isError ? (
            <div>
              <p className="text-xs font-semibold text-red-600">Failed to fetch</p>
              <span className="text-[10px] text-slate-400">Requires ADMIN_OBPARK</span>
            </div>
          ) : (
            <div>
              <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
                {formatCurrency(totalPendingVendorAmount)}
              </p>
              {billingSummaryQuery.data?.cycleVendorRetainersPending !== undefined && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Cycle Pending: {formatCurrency(billingSummaryQuery.data.cycleVendorRetainersPending)}
                </span>
              )}
            </div>
          )}
          <span className="text-[10px] text-slate-400 block font-mono">
            GET /vendor/wallet/admin/pending · {pendingVendors.length} agency(ies)
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
            Agency Retainers ({pendingVendors.length})
          </button>
          <button
            onClick={() => setActiveTab('GLOBAL_LEDGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GLOBAL_LEDGER'
                ? 'bg-[#074139] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Booking Split Ledgers ({globalLedger.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
          {activeTab === 'PENDING_PAYOUTS'
            ? 'GET /admin/crew/payouts/pending'
            : activeTab === 'VENDOR_RETAINERS'
            ? 'GET /vendor/wallet/admin/pending'
            : 'GET /crew/wallet/ledger/all'}
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

      {/* Tab 2: Vendor Agency Retainers Disbursal Queue */}
      {activeTab === 'VENDOR_RETAINERS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className={`${microgrammaBold.className} text-xs font-bold text-slate-900`}>
                Corporate Agency Retainers Disbursal Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record bank transfers for aggregated 15% agency fleet commissions. (Requires ADMIN_OBPARK).
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Total: {formatCurrency(totalPendingVendorAmount)}
            </span>
          </div>

          {pendingVendorsQuery.isLoading ? (
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
          ) : pendingVendorsQuery.isError ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Failed to Load Vendor Retainers</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {pendingVendorsQuery.error.message || 'Vendor retainer endpoints require ADMIN_OBPARK authorization.'}
                </p>
              </div>
              <button
                onClick={() => pendingVendorsQuery.refetch()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : pendingVendors.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`${microgrammaBold.className} text-xs font-bold text-slate-800`}>
                  All Agency Retainers Disbursed
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  There are no pending balances awaiting payout to corporate agency partners.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingVendors.map((vendor) => (
                <div
                  key={vendor.vendorProfileId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {vendor.agencyName}
                      </span>
                      {vendor.tradeName && vendor.tradeName !== vendor.agencyName && (
                        <span className="text-[11px] text-slate-400">
                          ({vendor.tradeName})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {vendor.pendingTripsCount} trip(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-mono">GSTIN: {vendor.gstin || 'N/A'}</span>
                      {vendor.city && <span>Location: {vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</span>}
                      {vendor.phoneNumber && <span>Phone: {vendor.phoneNumber}</span>}
                      {vendor.email && <span>Email: {vendor.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium uppercase">
                        Pending Retainer
                      </span>
                      <span className={`${microgrammaBold.className} text-sm font-bold text-indigo-700 block`}>
                        {formatCurrency(vendor.pendingAmount)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenVendorPayout(vendor)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Settle Retainer</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Global Settled Ledgers Table */}
      {activeTab === 'GLOBAL_LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className={`${microgrammaBold.className} text-xs font-bold text-slate-900`}>
                Global Booking Commission Splits Ledger
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Real-time transaction splits (85/15 freelance or 70/15/15 tri-party) verified across the entire platform.
              </p>
            </div>

            {/* Ledger Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <span className="text-[10px] font-semibold text-slate-500">From:</span>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => {
                    setLedgerStartDate(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="bg-transparent text-[11px] text-slate-700 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <span className="text-[10px] font-semibold text-slate-500">To:</span>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => {
                    setLedgerEndDate(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="bg-transparent text-[11px] text-slate-700 outline-none cursor-pointer"
                />
              </div>

              <select
                value={ledgerStatus}
                onChange={(e) => {
                  setLedgerStatus(e.target.value as '' | 'SETTLED' | 'PENDING');
                  setLedgerPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="SETTLED">SETTLED</option>
                <option value="PENDING">PENDING</option>
              </select>

              {(ledgerStartDate || ledgerEndDate || ledgerStatus) && (
                <button
                  onClick={() => {
                    setLedgerStartDate('');
                    setLedgerEndDate('');
                    setLedgerStatus('');
                    setLedgerPage(1);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline px-1"
                >
                  Reset
                </button>
              )}

              <span className="text-[11px] text-slate-400 font-mono ml-1">
                {totalLedgerRecords} record{totalLedgerRecords !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {globalLedgerQuery.isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : globalLedgerQuery.isError ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Failed to Load Global Ledgers</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {globalLedgerQuery.error.message || 'Unable to fetch global settlement ledger.'}
                </p>
              </div>
              <button
                onClick={() => globalLedgerQuery.refetch()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : globalLedger.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <p className={`${microgrammaBold.className} text-xs font-bold text-slate-800`}>
                  No Ledger Transactions Found
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Completed bookings will atomically record commission distributions in this ledger.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Booking Code</th>
                      <th className="py-2.5 px-3">Split Model</th>
                      <th className="py-2.5 px-3 text-right">Gross Trip</th>
                      <th className="py-2.5 px-3 text-right">Crew Share</th>
                      <th className="py-2.5 px-3 text-right">Vendor Share</th>
                      <th className="py-2.5 px-3 text-right">Platform Fee</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {globalLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                          {tx.bookingCode || tx.bookingId.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.splitType === 'TRI_PARTY_70_15_15'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {tx.splitType === 'TRI_PARTY_70_15_15' ? '70/15/15 Tri-Party' : '85/15 Direct'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                          {formatCurrency(tx.tripAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                          {formatCurrency(tx.crewShare)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-indigo-700">
                          {tx.vendorShare ? formatCurrency(tx.vendorShare) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatCurrency(tx.platformCommission)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.status === 'SETTLED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                          {formatDateTime(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing {totalLedgerRecords > 0 ? (ledgerPage - 1) * ledgerLimit + 1 : 0} to{' '}
                  {Math.min(ledgerPage * ledgerLimit, totalLedgerRecords)} of {totalLedgerRecords} transactions
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    disabled={ledgerPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="font-medium text-slate-700">
                    Page {ledgerPage} of {totalLedgerPages}
                  </span>

                  <button
                    onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                    disabled={ledgerPage >= totalLedgerPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
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
