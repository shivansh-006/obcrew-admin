import type { ActiveDispatchPage } from '@/types/spatial-telemetry';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function fetchActiveDispatches(token: string, page = 1, limit = 50): Promise<ActiveDispatchPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await fetch(`${BACKEND_URL}/booking/admin/active-dispatches?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('AUTHENTICATION');
    throw new Error('DISPATCH_FETCH');
  }
  const result: unknown = await response.json();
  if (!isDispatchPage(result)) throw new Error('INVALID_RESPONSE');
  return result;
}

function isDispatchPage(value: unknown): value is ActiveDispatchPage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Record<string, unknown>;
  return Array.isArray(page.data) && page.data.every(isDispatch) && typeof page.total === 'number' && typeof page.page === 'number' && typeof page.limit === 'number';
}

function isDispatch(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const pickup = item.pickup as Record<string, unknown> | null;
  const customer = item.customer as Record<string, unknown> | null;
  const assignedCrew = item.assignedCrew as Record<string, unknown> | null;
  const destination = item.destination as Record<string, unknown> | null;
  const coordinate = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  const latitude = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= -90 && n <= 90;
  const longitude = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180;
  return typeof item.bookingId === 'string' && typeof item.serviceType === 'string' &&
    ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(String(item.status)) &&
    !!customer && (customer.name === null || typeof customer.name === 'string') && (customer.phone === null || typeof customer.phone === 'string') &&
    (assignedCrew === null || (!!assignedCrew && typeof assignedCrew.id === 'string' && typeof assignedCrew.name === 'string')) &&
    !!pickup && latitude(pickup.lat) && longitude(pickup.lng) && typeof pickup.address === 'string' &&
    (destination === null || (!!destination && (destination.lat === null || latitude(destination.lat)) && (destination.lng === null || longitude(destination.lng)) && typeof destination.address === 'string'));
}

export function getSurveillanceNamespaceUrl(): string {
  return `${BACKEND_URL.replace(/\/$/, '')}/admin-surveillance`;
}
