import { apiClient } from '@/lib/api/client';
import { BookingFilters } from '@/types/bookings';

export async function fetchAdminBookings(
  filters: BookingFilters = {}
): Promise<unknown> {
  return apiClient<unknown>('/bookings/my', {
    method: 'GET',
    params: {
      status: filters.status,
      serviceType: filters.serviceType,
      dateRange: filters.dateRange,
      page: filters.page,
      limit: filters.limit,
    },
  });
}

export async function fetchBookingDetail(id: string): Promise<unknown> {
  return apiClient<unknown>(`/bookings/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function cancelAdminBooking(
  id: string,
  reason: string
): Promise<unknown> {
  return apiClient<unknown>(`/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
