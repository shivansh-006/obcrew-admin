import { create } from 'zustand';
import type { ConnectionStatus, CrewLocationUpdate } from '@/types/spatial-telemetry';

interface SpatialTelemetryState {
  crewLocations: Record<string, CrewLocationUpdate>;
  selectedCrewId: string | null;
  connectionStatus: ConnectionStatus;
  upsertCrewLocation: (update: CrewLocationUpdate) => void;
  selectCrew: (crewId: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  clearCrewLocations: () => void;
}

export function isCrewLocationUpdate(value: unknown): value is CrewLocationUpdate {
  if (!value || typeof value !== 'object') return false;
  const update = value as Record<string, unknown>;
  return typeof update.crewId === 'string' && update.crewId.length > 0 &&
    typeof update.name === 'string' &&
    (update.role === 'DRIVER' || update.role === 'MECHANIC') &&
    typeof update.lat === 'number' && Number.isFinite(update.lat) && update.lat >= -90 && update.lat <= 90 &&
    typeof update.lng === 'number' && Number.isFinite(update.lng) && update.lng >= -180 && update.lng <= 180 &&
    (update.status === 'AVAILABLE' || update.status === 'EN_ROUTE' || update.status === 'ON_JOB') &&
    (update.heading === undefined || (typeof update.heading === 'number' && Number.isFinite(update.heading))) &&
    (update.timestamp === undefined || typeof update.timestamp === 'string');
}

export const useSpatialTelemetryStore = create<SpatialTelemetryState>((set) => ({
  crewLocations: {},
  selectedCrewId: null,
  connectionStatus: 'disconnected',
  upsertCrewLocation: (update) => set((state) => {
    const previous = state.crewLocations[update.crewId];
    if (previous?.timestamp && update.timestamp && Date.parse(update.timestamp) < Date.parse(previous.timestamp)) return state;
    return { crewLocations: { ...state.crewLocations, [update.crewId]: { ...previous, ...update, heading: update.heading ?? previous?.heading, timestamp: update.timestamp ?? previous?.timestamp } } };
  }),
  selectCrew: (crewId) => set({ selectedCrewId: crewId }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  clearCrewLocations: () => set({ crewLocations: {}, selectedCrewId: null }),
}));
