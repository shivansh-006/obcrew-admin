'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { ActiveDispatch, CrewLocationUpdate } from '@/types/spatial-telemetry';
import 'leaflet/dist/leaflet.css';

interface SpatialMapProps {
  crew: CrewLocationUpdate[];
  selectedCrewId: string | null;
  dispatch: ActiveDispatch | undefined;
  radiusVisible: boolean;
  onSelect: (crewId: string) => void;
}

const roleColor = (role: CrewLocationUpdate['role']) => role === 'DRIVER' ? '#00B8D4' : '#F59E0B';
const statusLabel = (status: CrewLocationUpdate['status']) => ({ AVAILABLE: 'Available', EN_ROUTE: 'En route', ON_JOB: 'On job' })[status];

function makeIcon(person: CrewLocationUpdate) {
  const color = roleColor(person.role);
  const shape = person.role === 'DRIVER' ? '50%' : '6px';
  const rotation = person.heading === undefined ? '' : `transform:rotate(${person.heading}deg);`;
  return L.divIcon({ className: '', iconSize: [38, 42], iconAnchor: [19, 21], html: `<div title="${escapeHtml(person.name)} · ${person.role} · ${statusLabel(person.status)}" style="width:38px;height:38px;border-radius:${shape};background:${color};border:3px solid white;box-shadow:0 3px 12px #07302a66;display:grid;place-items:center;color:#05302a;font-size:17px;${rotation}">${person.role === 'DRIVER' ? '↗' : '✚'}</div>` });
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char); }

function FitMarkers({ crew, selected }: { crew: CrewLocationUpdate[]; selected: CrewLocationUpdate | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [selected?.crewId, map]);
  useEffect(() => {
    if (!selected && crew.length) map.fitBounds(L.latLngBounds(crew.map((person) => [person.lat, person.lng])), { padding: [48, 48], maxZoom: 13 });
  }, [crew.length, selected?.crewId, map]);
  return null;
}

export default function SpatialMap({ crew, selectedCrewId, dispatch, radiusVisible, onSelect }: SpatialMapProps) {
  const selected = crew.find((person) => person.crewId === selectedCrewId);
  const route = dispatch?.destination && dispatch.destination.lat !== null && dispatch.destination.lng !== null
    ? [[dispatch.pickup.lat, dispatch.pickup.lng] as [number, number], [dispatch.destination.lat, dispatch.destination.lng] as [number, number]] : null;
  const center: [number, number] = crew.length ? [crew[0].lat, crew[0].lng] : [28.6139, 77.209];
  return <div className="h-full min-h-[420px] w-full overflow-hidden rounded-2xl bg-slate-100">
    <MapContainer center={center} zoom={crew.length ? 11 : 10} scrollWheelZoom className="h-full w-full" zoomControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitMarkers crew={crew} selected={selected} />
      {crew.map((person) => <Marker key={person.crewId} position={[person.lat, person.lng]} icon={makeIcon(person)} eventHandlers={{ click: () => onSelect(person.crewId) }} />)}
      {radiusVisible && selected && <Circle center={[selected.lat, selected.lng]} radius={5000} pathOptions={{ color: '#074139', fillColor: '#95D0CC', fillOpacity: 0.12, weight: 1.5, dashArray: '5 7' }} />}
      {route && <Polyline positions={route} pathOptions={{ color: '#074139', weight: 4, opacity: 0.75, dashArray: '8 8' }} />}
    </MapContainer>
  </div>;
}
