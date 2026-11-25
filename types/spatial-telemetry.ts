export type CrewRole = 'DRIVER' | 'MECHANIC';
export type CrewStatus = 'AVAILABLE' | 'EN_ROUTE' | 'ON_JOB';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface CrewLocationUpdate {
  crewId: string;
  name: string;
  role: CrewRole;
  lat: number;
  lng: number;
  heading?: number;
  status: CrewStatus;
  timestamp?: string;
}

export interface ActiveDispatch {
  bookingId: string;
  serviceType: string;
  status: 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS';
  customer: { name: string | null; phone: string | null };
  assignedCrew: { id: string; name: string } | null;
  pickup: { lat: number; lng: number; address: string };
  destination: { lat: number | null; lng: number | null; address: string } | null;
}

export interface ActiveDispatchPage {
  data: ActiveDispatch[];
  total: number;
  page: number;
  limit: number;
}

export type CrewFilter = 'ALL' | CrewRole | CrewStatus;
