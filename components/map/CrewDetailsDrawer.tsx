'use client';
import { X, MapPin, Navigation, Clock3, BriefcaseBusiness } from 'lucide-react';
import type { ActiveDispatch, ConnectionStatus, CrewLocationUpdate } from '@/types/spatial-telemetry';

const statusName = { AVAILABLE: 'Available', EN_ROUTE: 'En route', ON_JOB: 'On job' };

export function CrewDetailsDrawer({ crew, dispatch, connection, onClose }: { crew: CrewLocationUpdate | undefined; dispatch: ActiveDispatch | undefined; connection: ConnectionStatus; onClose: () => void }) {
  if (!crew) return null;
  return <aside className="absolute inset-y-0 right-0 z-[500] w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:relative sm:inset-auto sm:z-10 sm:w-80 sm:shrink-0 sm:shadow-none">
    <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#074139]">Crew surveillance</p><h2 className="mt-1 text-lg font-bold text-slate-900">{crew.name}</h2><p className="mt-1 text-xs text-slate-500">{crew.role === 'DRIVER' ? 'Driver' : 'Roadside mechanic'} · {crew.crewId}</p></div><button aria-label="Close crew details" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
    <div className="space-y-5 p-5">
      <section><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Live information</p><div className="space-y-3 text-sm">
        <Info icon={<MapPin size={15} />} label="Coordinates" value={`${crew.lat.toFixed(5)}, ${crew.lng.toFixed(5)}`} />
        <Info icon={<Navigation size={15} />} label="Heading" value={crew.heading === undefined ? 'Not supplied' : `${Math.round(crew.heading)}°`} />
        <Info icon={<Clock3 size={15} />} label="GPS timestamp" value={crew.timestamp ? new Date(crew.timestamp).toLocaleString() : 'Not supplied'} />
        <div className="flex items-center justify-between"><span className="text-slate-500">Backend status</span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-[#074139]">{statusName[crew.status]}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-500">Connection</span><span className="text-xs font-semibold text-slate-700">{connection.replace('_', ' ')}</span></div>
      </div></section>
      <section className="border-t border-slate-100 pt-4"><p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><BriefcaseBusiness size={13} />Active booking</p>{dispatch ? <div className="space-y-3 text-sm"><div className="font-bold text-[#074139]">{dispatch.bookingId}</div><Info label="Service / status" value={`${dispatch.serviceType} · ${dispatch.status.replace('_', ' ')}`} /><Info label="Customer" value={dispatch.customer.name || 'Not provided'} /><Info label="Pickup" value={dispatch.pickup.address || 'Address not provided'} /><Info label="Pickup coordinates" value={`${dispatch.pickup.lat}, ${dispatch.pickup.lng}`} /><Info label="Destination" value={dispatch.destination?.address || 'Not provided'} />{dispatch.destination && <Info label="Destination coordinates" value={dispatch.destination.lat === null || dispatch.destination.lng === null ? 'Not provided' : `${dispatch.destination.lat}, ${dispatch.destination.lng}`} />}</div> : <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">No active dispatch associated with this crew in the current results.</p>}</section>
    </div>
  </aside>;
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <div className="flex gap-2"><span className="mt-0.5 text-slate-400">{icon}</span><div className="min-w-0"><p className="text-[11px] text-slate-400">{label}</p><p className="break-words text-xs font-medium leading-5 text-slate-700">{value}</p></div></div>; }
