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
  FileSpreadsheet,
  Info,
  ArrowRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  useBillingSummaryQuery,
  usePendingCrewPayoutsQuery,
  usePendingVendorPayoutsQuery,
  useGlobalSettlementLedgerQuery,
  useVendorWalletSummaryQuery,
} from '@/hooks/useSettlements';
import {
  PayoutConfirmationModal,
  PayoutRecipient,
} from '@/components/settlements/PayoutConfirmationModal';
import { BackendPendingVendorPayout } from '@/types/settlements';
import { useQueryClient } from '@tanstack/react-query';

// Client-side bank account masking for privacy compliance (shows only last 4 digits)
function maskBankAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return 'Not provided';
  const clean = accountNumber.trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
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
  const billingSummaryQuery = useBillingSummaryQuery(selectedCycle);
  const pendingCrewPayoutsQuery = usePendingCrewPayoutsQuery();
  const pendingVendorsQuery = usePendingVendorPayoutsQuery();
  const globalLedgerQuery = useGlobalSettlementLedgerQuery();

  // Vendor wallet summary is only queried when authorized (e.g. VENDOR role)
  const isVendorRole = user?.role === 'VENDOR';
  const vendorWalletQuery = useVendorWalletSummaryQuery(isVendorRole);

  // Computed values
  const pendingCrews = pendingCrewPayoutsQuery.data?.crews ?? [];
  const pendingVendors = pendingVendorsQuery.data?.vendors ?? [];
  const totalPendingCrewAmount = useMemo(() => {
    return pendingCrews.reduce((acc, c) => acc + (c.pendingAmount || 0), 0);
  }, [pendingCrews]);
  const totalPendingVendorAmount = useMemo(() => {
    return pendingVendors.reduce((acc, v) => acc + (v.pendingAmount || 0), 0);
  }, [pendingVendors]);

  const globalLedgers = globalLedgerQuery.data ?? [];

  // Determine exportability
  const hasExportableData =
    activeTab === 'PENDING_PAYOUTS'
      ? pendingCrews.length > 0
      : activeTab === 'VENDOR_RETAINERS'
      ? pendingVendors.length > 0
      : globalLedgers.length > 0;

  // Manual Cache Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['settlements'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (activeTab === 'GLOBAL_LEDGER' && globalLedgers.length > 0) {
      const headers = [
        'Transaction ID',
        'Booking ID',
        'Date',
        'Trip Amount (INR)',
        'Crew Share (INR)',
        'Vendor Share (INR)',
        'Platform Commission (INR)',
        'Split Type',
        'Status',
      ];
      const rows = globalLedgers.map((item) => [
        item.id,
        item.bookingId,
        formatDateTime(item.createdAt),
        item.tripAmount,
        item.crewShare,
        item.vendorShare ?? 0,
        item.platformCommission,
        item.splitType,
        item.status,
      ]);
      exportToCSV(`OBCrew_Settled_Ledgers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else if (activeTab === 'VENDOR_RETAINERS' && pendingVendors.length > 0) {
      const headers = [
        'Vendor Profile ID',
        'Agency Name',
        'GSTIN',
        'City',
        'Contact Person',
        'Phone Number',
        'Email',
        'Pending Amount (INR)',
        'Pending Bookings Count',
      ];
      const rows = pendingVendors.map((v) => [
        v.vendorProfileId,
        v.agencyName,
        v.gstin || '-',
        v.city || '-',
        v.contactName || '-',
        v.phoneNumber || '-',
        v.email || '-',
        v.pendingAmount,
        v.pendingTripsCount,
      ]);
      exportToCSV(`OBCrew_Pending_Vendor_Retainers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else if (pendingCrews.length > 0) {
      const headers = [
        'Crew Profile ID',
        'Full Name',
        'Phone Number',
        'Email',
        'Bank Account (Masked)',
        'Pending Amount (INR)',
        'Pending Jobs Count',
      ];
      const rows = pendingCrews.map((c) => [
        c.crewProfileId,
        c.fullName,
        c.user?.phoneNumber || '-',
        c.user?.email || '-',
        maskBankAccount(c.bankAccountNumber),
        c.pendingAmount,
        c.pendingJobsCount,
      ]);
      exportToCSV(`OBCrew_Pending_Payouts_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  };

  // Open payout confirmation modal for a specific crew member
  const handleOpenCrewPayout = (crew: typeof pendingCrews[number]) => {
    setSelectedRecipient({
      type: 'CREW',
      id: crew.crewProfileId,
      name: crew.fullName,
      bankAccountMasked: maskBankAccount(crew.bankAccountNumber),
      pendingAmount: crew.pendingAmount,
      pendingJobsCount: crew.pendingJobsCount,
    });
    setIsModalOpen(true);
  };

  // Open payout confirmation modal for a specific vendor agency
  const handleOpenVendorPayout = (vendor: BackendPendingVendorPayout) => {
    setSelectedRecipient({
      type: 'VENDOR',
      id: vendor.vendorProfileId,
      name: vendor.agencyName,
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
            Tri-Party Wallet Ledgers & Payouts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated split accounting (85/15 direct freelance and 70/15/15 agency-linked drivers).
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
            <span>Export GST Settlement Sheet</span>
          </button>
        </div>
      </div>

      {/* Backend Integration Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="h-4 w-4 text-[#074139] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800">Live Backend Architecture Synchronization</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Connected to <code className="px-1 py-0.5 bg-white border rounded text-[10px] text-slate-700 font-mono">obpark-backend:3001</code>.
            Displaying live platform commission from <code className="text-[#074139] font-mono">GET /admin/billing/summary</code>, pending crew disbursals from <code className="text-[#074139] font-mono">GET /admin/crew/payouts/pending</code>, pending vendor retainers from <code className="text-[#074139] font-mono">GET /vendor/wallet/admin/pending</code>, and completed trip splits from <code className="text-[#074139] font-mono">GET /crew/wallet/ledger/all</code>.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Platform Net Commission */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Platform Net Commission (15%)</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ReceiptText className="h-3.5 w-3.5" />
            </div>
          </div>
          {billingSummaryQuery.isLoading ? (
            <div className="h-8 w-28 bg-slate-100 animate-pulse rounded my-2" />
          ) : billingSummaryQuery.isError ? (
            <div className="my-1 space-y-0.5">
              <p className="text-xs font-semibold text-red-600">Failed to load commission</p>
              <button
                onClick={() => billingSummaryQuery.refetch()}
                className="text-[10px] text-red-700 underline block"
              >
                Retry
              </button>
            </div>
          ) : billingSummaryQuery.data ? (
            <p className={`${microgrammaBold.className} text-2xl font-bold text-emerald-700`}>
              {formatCurrency(billingSummaryQuery.data.totalPlatformCommission)}
            </p>
          ) : (
            <div>
              <p className={`${microgrammaBold.className} text-xl font-bold text-slate-400`}>
                —
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                No commission data available
              </span>
            </div>
          )}
          <span className="text-[10px] text-slate-400 block">
            {billingSummaryQuery.data?.billingCycle
              ? `Billing Cycle: ${billingSummaryQuery.data.billingCycle}`
              : selectedCycle
              ? `Billing Cycle: ${selectedCycle}`
              : 'Current Cycle'}
          </span>
        </div>

        {/* Card 2: Crew Wallet Disbursals */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pending Crew Disbursals (70%–85%)</span>
            <div className="h-7 w-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          {pendingCrewPayoutsQuery.isLoading ? (
            <div className="h-8 w-32 bg-slate-100 animate-pulse rounded my-2" />
          ) : pendingCrewPayoutsQuery.isError ? (
            <div>
              <p className="text-sm font-semibold text-red-600">Failed to fetch</p>
              <span className="text-[10px] text-slate-400">Check server connection</span>
            </div>
          ) : (
            <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
              {formatCurrency(totalPendingCrewAmount)}
            </p>
          )}
          <span className="text-[10px] text-slate-400 block">
            {pendingCrewPayoutsQuery.data
              ? `${pendingCrewPayoutsQuery.data.total} crew member(s) awaiting payout`
              : 'Verified drivers & RSA mechanics'}
          </span>
        </div>

        {/* Card 3: Vendor Agency Retainers */}
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Vendor Agency Retainers (15%)</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          {pendingVendorsQuery.isLoading ? (
            <div className="h-8 w-28 bg-slate-100 animate-pulse rounded my-2" />
          ) : (
            <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
              {formatCurrency(
                billingSummaryQuery.data?.totalVendorRetainersPending ??
                  totalPendingVendorAmount
              )}
            </p>
          )}
          <span className="text-[10px] text-slate-400 block">
            {pendingVendors.length > 0
              ? `${pendingVendors.length} agency partner(s) awaiting retainer payout`
              : '15% agency partner payout pool'}
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
            Vendor Retainers ({pendingVendors.length})
          </button>
          <button
            onClick={() => setActiveTab('GLOBAL_LEDGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GLOBAL_LEDGER'
                ? 'bg-[#074139] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Settled Booking Ledgers ({globalLedgers.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {activeTab === 'PENDING_PAYOUTS'
            ? 'Endpoint: GET /admin/crew/payouts/pending'
            : activeTab === 'VENDOR_RETAINERS'
            ? 'Endpoint: GET /vendor/wallet/admin/pending'
            : 'Endpoint: GET /crew/wallet/ledger/all'}
        </span>
      </div>

      {/* Tab 1: Pending Crew Payouts Queue */}
      {activeTab === 'PENDING_PAYOUTS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className={`${microgrammaBold.className} text-xs font-bold text-slate-900`}>
                Actionable Crew Disbursal Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record manual bank transfer or UPI payments to mark pending earnings settled.
              </p>
            </div>
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
              {pendingCrews.map((crew) => (
                <div
                  key={crew.crewProfileId}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{crew.fullName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {crew.pendingJobsCount} job(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Phone: {crew.user?.phoneNumber || 'N/A'}</span>
                      <span>Email: {crew.user?.email || 'N/A'}</span>
                      <span className="font-mono text-slate-600">
                        Bank A/C: {maskBankAccount(crew.bankAccountNumber)}
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
                      <span>Record Payout</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Vendor Retainers Queue */}
      {activeTab === 'VENDOR_RETAINERS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className={`${microgrammaBold.className} text-xs font-bold text-slate-900`}>
                Actionable Vendor Retainer Disbursal Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Record manual bank transfer payouts to settle corporate vendor agency cut (15%).
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Pending: {formatCurrency(totalPendingVendorAmount)}
            </span>
          </div>

          {pendingVendorsQuery.isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-lg animate-pulse"
                >
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : pendingVendors.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`${microgrammaBold.className} text-xs font-bold text-slate-800`}>
                  All Vendor Retainers Settled
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  There are currently no unpaid agency earnings in the fleet vendor retainer queue.
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
                      <span className="text-xs font-bold text-slate-900">{vendor.agencyName}</span>
                      {vendor.city && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {vendor.city}{vendor.state ? `, ${vendor.state}` : ''}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                        {vendor.pendingTripsCount} booking(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {vendor.contactName && <span>Contact: {vendor.contactName}</span>}
                      {vendor.phoneNumber && <span>Phone: {vendor.phoneNumber}</span>}
                      {vendor.email && <span>Email: {vendor.email}</span>}
                      {vendor.gstin && (
                        <span className="font-mono text-slate-600">GSTIN: {vendor.gstin}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium uppercase">
                        Unpaid Retainer
                      </span>
                      <span className={`${microgrammaBold.className} text-sm font-bold text-indigo-700 block`}>
                        {formatCurrency(vendor.pendingAmount)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenVendorPayout(vendor)}
                      className="px-3.5 py-2 bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
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

      {/* Tab 3: Global Settled Ledgers */}
      {activeTab === 'GLOBAL_LEDGER' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Completed Trip Revenue Split Ledgers</span>
            <span className="text-[11px] text-slate-400">PDF Specification (85/15 vs 70/15/15)</span>
          </div>

          {globalLedgerQuery.isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg animate-pulse">
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : globalLedgers.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className={`${microgrammaBold.className} text-xs font-bold text-slate-800`}>
                  No Settled Trip Splits Recorded
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Real-time revenue split records for completed bookings (85/15 direct freelance or 70/15/15 agency-linked) are queried from <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">GET /crew/wallet/ledger/all</code>.
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Once bookings complete and earnings calculate, transactions populate here automatically.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('PENDING_PAYOUTS')}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                Switch to Pending Payouts Queue →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {globalLedgers.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">{t.bookingCode || t.payeeName || t.id}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {t.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {t.splitType}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Transaction: {t.id} · Booking: {t.bookingCode || t.bookingId} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`${microgrammaBold.className} text-xs text-slate-900 block`}>
                      {formatCurrency(t.tripAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Platform Fee: {formatCurrency(t.platformCommission)} · Crew: {formatCurrency(t.crewShare)}
                      {t.vendorShare && t.vendorShare > 0 ? ` · Agency: ${formatCurrency(t.vendorShare)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout Confirmation Modal Component */}
      <PayoutConfirmationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecipient(null);
        }}
        recipient={selectedRecipient}
      />
    </div>
  );
}
