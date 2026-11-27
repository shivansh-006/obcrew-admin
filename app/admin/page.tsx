'use client';

import { Component, type ReactNode } from 'react';

import { Users, MapPin, Building2, AlertTriangle, ArrowUpRight, TrendingUp, RefreshCw } from 'lucide-react';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { microgrammaBold } from '@/lib/fonts';
import Link from 'next/link';
import {
  getCrewCount,
  getCrewSurveillance,
  getNewestPendingCrew,
  type CrewSurveillanceItem,
  type ServiceType,
} from '@/lib/crew-api';
import { fetchIncidents } from '@/lib/api/incidents';
import { apiClient } from '@/lib/api/client';
import { fetchGlobalSettlementLedger } from '@/lib/api/settlements';
import { formatCurrency } from '@/lib/utils';

// Dashboard auto-refresh interval (guide: every 30 seconds)
const REFRESH_INTERVAL = 30_000;

const SERVICE_LABEL: Record<ServiceType, string> = {
  DRIVER: 'CHAUFFEUR DRIVER',
  MECHANIC: 'RSA MECHANIC',
};

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isNaN(status) ? undefined : status;
  }
  return undefined;
}

function errorText(error: unknown): string {
  const status = errorStatus(error);
  if (status === 403) return 'No access';
  if (status === 0) return 'Server unreachable';
  return "Couldn't load";
}

/** Keeps one broken section from crashing the whole dashboard. */
class SectionBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm text-xs text-red-600">
          {this.props.label} could not be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}

function liveSummary(items: CrewSurveillanceItem[] | undefined, serviceType: ServiceType) {
  const crew = (items ?? []).filter((c) => c.serviceType === serviceType);
  const online = crew.filter((c) => c.isOnline).length;
  const onTrip = crew.filter((c) => c.liveStatus === 'ON_TRIP').length;
  return `${online} online · ${onTrip} on trip`;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const isRefreshing = useIsFetching({ queryKey: ['dashboard'] }) > 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const pendingCrewQuery = useQuery({
    queryKey: ['dashboard', 'pending-crew'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: () => getNewestPendingCrew(3),
  });

  const driversQuery = useQuery({
    queryKey: ['dashboard', 'crew-count', 'DRIVER'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: () => getCrewCount('DRIVER'),
  });

  const mechanicsQuery = useQuery({
    queryKey: ['dashboard', 'crew-count', 'MECHANIC'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: () => getCrewCount('MECHANIC'),
  });

  const liveCrewQuery = useQuery({
    queryKey: ['dashboard', 'surveillance'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: getCrewSurveillance,
  });

  const pendingVendorsQuery = useQuery({
    queryKey: ['dashboard', 'pending-vendors'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: async () => {
      const vendors = await apiClient<unknown[]>('/admin/vendors/pending');
      return Array.isArray(vendors) ? vendors.length : 0;
    },
  });

  const openIncidentsQuery = useQuery({
    queryKey: ['dashboard', 'open-incidents'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: async () => {
      const res = await fetchIncidents({ status: 'OPEN', limit: 1 });
      return res?.total ?? 0;
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ['dashboard', 'ledger'],
    refetchInterval: REFRESH_INTERVAL,
    queryFn: () => fetchGlobalSettlementLedger({ limit: 3 }),
  });

  const liveSubtitle = (serviceType: ServiceType) =>
    liveCrewQuery.isError ? 'Live status unavailable' : liveSummary(liveCrewQuery.data?.data, serviceType);

  const stats = [
    {
      label: 'Active Drivers',
      href: '/admin/crew',
      value: driversQuery.data,
      error: driversQuery.error,
      retry: () => driversQuery.refetch(),
      valueLoading: driversQuery.isPending,
      valueError: driversQuery.isError,
      change: liveSubtitle('DRIVER'),
      changeLoading: liveCrewQuery.isPending,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Roadside Mechanics',
      href: '/admin/crew',
      value: mechanicsQuery.data,
      error: mechanicsQuery.error,
      retry: () => mechanicsQuery.refetch(),
      valueLoading: mechanicsQuery.isPending,
      valueError: mechanicsQuery.isError,
      change: liveSubtitle('MECHANIC'),
      changeLoading: liveCrewQuery.isPending,
      icon: MapPin,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      label: 'Fleet Agencies',
      href: '/admin/vendors',
      value: pendingVendorsQuery.data,
      error: pendingVendorsQuery.error,
      retry: () => pendingVendorsQuery.refetch(),
      valueLoading: pendingVendorsQuery.isPending,
      valueError: pendingVendorsQuery.isError,
      change: 'Pending verification',
      changeLoading: false,
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Pending Incident Reports',
      href: '/admin/incidents',
      value: openIncidentsQuery.data,
      error: openIncidentsQuery.error,
      retry: () => openIncidentsQuery.refetch(),
      valueLoading: openIncidentsQuery.isPending,
      valueError: openIncidentsQuery.isError,
      change: 'Requires resolution',
      changeLoading: false,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const pendingTotal = pendingCrewQuery.data?.total;

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
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh metrics"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh Metrics'}</span>
          </button>
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
            {pendingTotal !== undefined ? `Verify Crew (${pendingTotal} Pending)` : 'Verify Crew'}
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const header = (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`h-8 w-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          );

          if (s.valueError) {
            return (
              <div key={s.label} className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                {header}
                <div className="mt-3">
                  <span className={`${microgrammaBold.className} text-2xl font-bold text-slate-300`}>—</span>
                  <p className="text-[11px] text-red-600 mt-1">
                    {errorText(s.error)} ·{' '}
                    <button type="button" onClick={s.retry} className="font-semibold underline">
                      Retry
                    </button>
                  </p>
                </div>
              </div>
            );
          }

          return (
            <SectionBoundary key={s.label} label={s.label}>
              <Link
                href={s.href}
                className="block p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:border-[#074139]/30 hover:shadow-md transition-all"
              >
                {header}
                <div className="mt-3">
                  {s.valueLoading ? (
                    <div className="h-8 w-14 rounded bg-slate-100 animate-pulse" />
                  ) : (
                    <span className={`${microgrammaBold.className} text-2xl font-bold text-slate-900`}>
                      {s.value ?? 0}
                    </span>
                  )}
                  {s.changeLoading ? (
                    <div className="h-3 w-28 mt-2 rounded bg-slate-100 animate-pulse" />
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      {s.change}
                    </p>
                  )}
                </div>
              </Link>
            </SectionBoundary>
          );
        })}
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary label="Pending Crew KYC Reviews">
          <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h2
              className={`${microgrammaBold.className} text-sm font-semibold text-slate-900 flex items-center justify-between`}
            >
              <span>Pending Crew KYC Reviews</span>
              <Link href="/admin/crew" className="text-xs text-[#074139] hover:underline font-normal">
                View all →
              </Link>
            </h2>
            {pendingCrewQuery.isPending ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[58px] rounded-lg border border-slate-100 bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : pendingCrewQuery.isError ? (
              <p className="py-4 text-center text-xs text-red-600">
                {errorText(pendingCrewQuery.error)} pending reviews ·{' '}
                <button type="button" onClick={() => pendingCrewQuery.refetch()} className="font-semibold underline">
                  Retry
                </button>
              </p>
            ) : pendingCrewQuery.data.data.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">No crew waiting for review.</p>
            ) : (
              <div className="space-y-3">
                {pendingCrewQuery.data.data.map((crew) => {
                  const accepted = crew.documents.filter((d) => d.status === 'ACCEPTED').length;
                  const submitted = timeAgo(crew.submittedAt);
                  return (
                    <Link
                      key={crew.id}
                      href={`/admin/crew/${crew.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {crew.fullName || 'Unnamed crew'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {SERVICE_LABEL[crew.serviceType]} · {crew.user?.phoneNumber || '-'}
                          {submitted ? ` · ${submitted}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {accepted}/{crew.documents.length} DOCS ACCEPTED
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </SectionBoundary>

        <SectionBoundary label="Recent Tri-Party Wallet Settled">
          <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h2
              className={`${microgrammaBold.className} text-sm font-semibold text-slate-900 flex items-center justify-between`}
            >
              <span>Recent Tri-Party Wallet Settled</span>
              <Link href="/admin/settlements" className="text-xs text-[#074139] hover:underline font-normal">
                Ledgers →
              </Link>
            </h2>
            {ledgerQuery.isPending ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[58px] rounded-lg border border-slate-100 bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : ledgerQuery.isError ? (
              <p className="py-4 text-center text-xs text-red-600">
                {errorText(ledgerQuery.error)} recent settlements ·{' '}
                <button type="button" onClick={() => ledgerQuery.refetch()} className="font-semibold underline">
                  Retry
                </button>
              </p>
            ) : (ledgerQuery.data?.transactions ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">No settlements yet.</p>
            ) : (
              <div className="space-y-3">
                {(ledgerQuery.data?.transactions ?? []).map((tx) => {
                  const triParty = tx.splitType === 'TRI_PARTY_70_15_15';
                  return (
                    <div key={tx.id} className="p-3 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-800">
                          {tx.bookingCode || tx.bookingId.slice(0, 8)} ·{' '}
                          {triParty ? '70/15/15 TRI-PARTY' : '85/15 DIRECT'}
                        </span>
                        <span className={`${microgrammaBold.className} text-xs text-emerald-700`}>
                          {formatCurrency(tx.tripAmount)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Crew {formatCurrency(tx.crewShare)}
                        {triParty ? ` · Agency ${formatCurrency(tx.vendorShare ?? 0)}` : ''}
                        {` · ObPark ${formatCurrency(tx.platformCommission)} · ${tx.status}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionBoundary>
      </div>
    </div>
  );
}