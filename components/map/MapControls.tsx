'use client';
import { Crosshair, RefreshCw, Users } from 'lucide-react';
import type { CrewFilter } from '@/types/spatial-telemetry';

const filters: { label: string; value: CrewFilter }[] = [
  { label: 'All crew', value: 'ALL' }, { label: 'Drivers', value: 'DRIVER' }, { label: 'Mechanics', value: 'MECHANIC' },
  { label: 'Available', value: 'AVAILABLE' }, { label: 'En route', value: 'EN_ROUTE' }, { label: 'On job', value: 'ON_JOB' },
];

export function MapControls({ filter, onFilter, radius, onRadius, onRefresh }: { filter: CrewFilter; onFilter: (value: CrewFilter) => void; radius: boolean; onRadius: () => void; onRefresh: () => void }) {
  return <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} onClick={() => onFilter(item.value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item.value ? 'bg-[#074139] text-white' : 'border border-slate-200 text-slate-600 hover:border-[#95D0CC] hover:text-[#074139]'}`}>{item.label}</button>)}</div>
    <div className="flex gap-2">
      <button onClick={onRadius} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${radius ? 'border-[#95D0CC] bg-teal-50 text-[#074139]' : 'border-slate-200 text-slate-600'}`}><Crosshair size={14} />5 km radius</button>
      <button onClick={onRefresh} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />Refresh dispatches</button>
    </div>
  </div>;
}

export function MapEmpty({ connecting }: { connecting: boolean }) {
  return <div className="flex h-full min-h-[420px] flex-col items-center justify-center bg-slate-50 px-6 text-center"><div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-[#074139]"><Users /></div><h3 className="font-semibold text-slate-800">{connecting ? 'Waiting for crew telemetry' : 'No eligible crew locations'}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{connecting ? 'The live surveillance channel is connecting. Crew will appear as the backend sends valid locations.' : 'No crew with valid coordinates are currently present in the surveillance snapshot.'}</p></div>;
}
