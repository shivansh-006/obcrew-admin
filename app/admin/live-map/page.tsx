'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Radio, RefreshCw, Users, BriefcaseBusiness } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';
import { useAuthStore } from '@/store/auth.store';
import { useSpatialTelemetryStore } from '@/store/useSpatialTelemetryStore';
import { fetchActiveDispatches } from '@/services/spatial-telemetry.service';
import type { CrewFilter } from '@/types/spatial-telemetry';
import { MapControls, MapEmpty } from '@/components/map/MapControls';
import { CrewDetailsDrawer } from '@/components/map/CrewDetailsDrawer';

const SpatialMap = dynamic(() => import('@/components/map/SpatialMap'), { ssr: false, loading: () => <div className="h-full min-h-[420px] animate-pulse bg-slate-100" /> });
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: 1 } } });

export default function LiveMapPage() {
  return <QueryClientProvider client={queryClient}><LiveMapDashboard /></QueryClientProvider>;
}

function LiveMapDashboard() {
  useAdminSurveillance();
  const token = useAuthStore((state) => state.token);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const crewLocations = useSpatialTelemetryStore((state) => state.crewLocations);
  const selectedCrewId = useSpatialTelemetryStore((state) => state.selectedCrewId);
  const connection = useSpatialTelemetryStore((state) => state.connectionStatus);
  const selectCrew = useSpatialTelemetryStore((state) => state.selectCrew);
  const [filter, setFilter] = useState<CrewFilter>('ALL');
  const [radiusVisible, setRadiusVisible] = useState(false);
  const [page, setPage] = useState(1);
  const dispatchQuery = useQuery({ queryKey: ['admin-active-dispatches', page], queryFn: () => fetchActiveDispatches(token as string, page, 50), enabled: !!token && authenticated && token !== 'mock-dev-admin-token', refetchInterval: 60_000 });
  const crew = useMemo(() => Object.values(crewLocations).filter((person) => filter === 'ALL' || person.role === filter || person.status === filter), [crewLocations, filter]);
  const selectedCrew = selectedCrewId ? crewLocations[selectedCrewId] : undefined;
  const dispatch = dispatchQuery.data?.data.find((item) => item.assignedCrew?.id === selectedCrewId);
  const statusText = connection === 'connected' ? 'Connected' : connection === 'connecting' ? 'Connecting' : connection === 'reconnecting' ? 'Reconnecting' : connection === 'error' ? 'Authentication error' : 'Disconnected';
  const statusStyle = connection === 'connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : connection === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800';
  const authUnavailable = !authenticated || !token || token === 'mock-dev-admin-token';

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className={`${microgrammaBold.className} text-xl font-bold tracking-wide text-slate-900`}>Live Fleet Surveillance</h1><p className="mt-1 text-sm text-slate-500">Authenticated crew telemetry and active dispatch monitoring.</p></div>
      <div className={`flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${statusStyle}`}><span className={`h-2 w-2 rounded-full ${connection === 'connected' ? 'bg-emerald-500' : connection === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-500'}`} /><Radio size={14} />{statusText}</div>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat icon={<Users size={16} />} label="Visible crew" value={Object.keys(crewLocations).length} note="Validated location markers" />
      <Stat icon={<BriefcaseBusiness size={16} />} label="Active jobs" value={dispatchQuery.data?.total ?? '—'} note="Backend dispatch total" />
      <div className="col-span-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-1"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Radius overlay</p><p className="mt-1 text-sm font-bold text-slate-800">5 km around selection</p><p className="mt-1 text-[10px] text-slate-500">Visual only · no backend filtering</p></div></div>
    </div>

    {authUnavailable && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Admin authentication required</p><p className="mt-1 text-xs leading-5">This session does not contain a verified access token. Sign in with the backend to load dispatches and connect to crew surveillance.</p></div></div>}
    {!authUnavailable && connection === 'error' && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Surveillance authentication failed. Please sign in again, then reload this page.</div>}
    {dispatchQuery.isError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span>{dispatchQuery.error.message === 'AUTHENTICATION' ? 'Your session cannot access active dispatches. Sign in again or verify your admin permissions.' : 'Active dispatches could not be loaded. The map remains available.'}</span><button onClick={() => void dispatchQuery.refetch()} className="flex shrink-0 items-center gap-1 font-semibold"><RefreshCw size={13} />Retry</button></div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <MapControls filter={filter} onFilter={setFilter} radius={radiusVisible} onRadius={() => setRadiusVisible((value) => !value)} onRefresh={() => void dispatchQuery.refetch()} />
      <div className="relative flex h-[min(70vh,760px)] min-h-[460px]">
        <div className="min-w-0 flex-1">{crew.length ? <SpatialMap crew={crew} selectedCrewId={selectedCrewId} dispatch={dispatch} radiusVisible={radiusVisible} onSelect={selectCrew} /> : <MapEmpty connecting={connection === 'connecting' || connection === 'reconnecting'} />}</div>
        {selectedCrew && <CrewDetailsDrawer crew={selectedCrew} dispatch={dispatch} connection={connection} onClose={() => selectCrew(null)} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500"><span className="font-semibold text-slate-600">Roles:</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-cyan-500" />Driver</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-amber-500" />Mechanic</span><span className="ml-auto">Straight line indicates pickup to destination, not a road route.</span></div>
    </section>

    {dispatchQuery.data && dispatchQuery.data.total > 50 && <div className="flex items-center justify-end gap-3 text-xs text-slate-500"><span>Page {dispatchQuery.data.page} of {Math.ceil(dispatchQuery.data.total / dispatchQuery.data.limit)}</span><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page * dispatchQuery.data.limit >= dispatchQuery.data.total} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div>}
    {dispatchQuery.isSuccess && dispatchQuery.data.total === 0 && <p className="text-xs text-slate-500">There are currently no active dispatches. Crew markers still reflect surveillance telemetry only.</p>}
  </div>;
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number | string; note: string }) { return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-[#074139]">{icon}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-lg font-bold leading-5 text-slate-900">{value}</p><p className="truncate text-[10px] text-slate-500">{note}</p></div></div>; }
