export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type BookingServiceType = 'CHAUFFEUR' | 'RSA_MECHANIC';

export interface BookingFilters {
  status?: BookingStatus;
  serviceType?: BookingServiceType;
  dateRange?: string;
  page?: number;
  limit?: number;
}

export interface BookingListItem {
  id: string;
  bookingCode?: string;
  customerName?: string;
  customerPhone?: string;
  serviceType?: BookingServiceType;
  crewName?: string;
  status: BookingStatus;
  fare?: number | null;
  createdAt?: string;
  raw?: Record<string, unknown>;
}

export interface BookingDetail extends BookingListItem {
  customerEmail?: string;
  crewPhone?: string;
  crewProfile?: string;
  pickupLocation?: string;
  destinationLocation?: string;
  pickupCoordinates?: string;
  destinationCoordinates?: string;
  vehicleClass?: string;
  vehicleDetails?: string;
  baseFare?: number | null;
  surgeMultiplier?: number | null;
  discount?: number | null;
  totalFare?: number | null;
  platformCommission?: number | null;
  crewEarnings?: number | null;
  otpVerified?: boolean | null;
  timestamps?: Record<string, string>;
  cancellationReason?: string;
}

export interface PaginatedBookingsResponse {
  bookings: BookingListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    total?: number;
    pending?: number;
    active?: number;
    completed?: number;
    cancelled?: number;
  };
}
