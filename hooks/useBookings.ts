'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelAdminBooking,
  fetchAdminBookings,
  fetchBookingDetail,
} from '@/lib/api/bookings';
import { BookingFilters } from '@/types/bookings';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (filters?: BookingFilters) => [...bookingKeys.all, 'list', filters] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
};

export function useAdminBookingsQuery(filters: BookingFilters) {
  return useQuery<unknown, Error>({
    queryKey: bookingKeys.list(filters),
    queryFn: () => fetchAdminBookings(filters),
  });
}

export function useBookingDetailQuery(id: string) {
  return useQuery<unknown, Error>({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBookingDetail(id),
    enabled: Boolean(id),
  });
}

export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelAdminBooking(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.id),
      });
    },
  });
}
