'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAdminBookingsQuery } from '@/hooks/useBookings';
import {
  BookingListItem,
  BookingStatus,
  BookingServiceType,
  PaginatedBookingsResponse,
} from '@/types/bookings';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingDetailsModal } from '@/components/booking/BookingDetailsModal';

const STATUSES: BookingStatus[] = [
  'PENDING',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | null | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function normalizeBooking(raw: unknown, index: number): BookingListItem | null {
  const item = asRecord(raw);
  if (!item) return null;
  const customer =
    asRecord(item.customer) ||
    asRecord(item.customerProfile) ||
    null;
  const crew =
    asRecord(item.assignedCrew) ||
    asRecord(item.crew) ||
    asRecord(item.driver) ||
    asRecord(item.mechanic) ||
    null;
  const statusValue = String(item.status || item.bookingStatus || 'PENDING').toUpperCase();
  const status = STATUSES.includes(statusValue as BookingStatus)
    ? (statusValue as BookingStatus)
    : 'PENDING';
  const id =
    asText(item.id) ||
    asText(item._id) ||
    asText(item.bookingId) ||
    asText(item.bookingCode) ||
    `booking-${index}`;

  const serviceType =
    String(item.serviceType || '').toUpperCase() === 'RSA_MECHANIC'
      ? 'RSA_MECHANIC'
      : 'CHAUFFEUR';

  return {
    id,
    bookingCode: asText(item.bookingCode) || asText(item.bookingId),
    customerName:
      asText(customer?.name) ||
      [asText(customer?.firstName), asText(customer?.lastName)].filter(Boolean).join(' ') ||
      asText(item.customerName),
    customerPhone:
      asText(customer?.phoneNumber) ||
      asText(customer?.phone) ||
      asText(item.customerPhone),
    serviceType,
    crewName:
      asText(crew?.name) ||
      [asText(crew?.firstName), asText(crew?.fullName), asText(crew?.lastName)].filter(Boolean).join(' ') ||
      asText(item.crewName) ||
      asText(item.assignedCrewName),
    status,
    fare:
      asNumber(item.totalFare) ??
      asNumber(item.finalFare) ??
      asNumber(item.fare) ??
      null,
    createdAt: asText(item.createdAt) || asText(item.bookingCreatedAt),
    raw: item,
  };
}

function normalizeResponse(raw: unknown, page: number, limit: number): PaginatedBookingsResponse {
  const root = asRecord(raw);
  let bookingsRaw: unknown[] = [];

  if (Array.isArray(raw)) bookingsRaw = raw;
  else if (root) {
    for (const key of ['bookings', 'data', 'items', 'results']) {
      if (Array.isArray(root[key])) {
        bookingsRaw = root[key] as unknown[];
        break;
      }
    }
  }

  const bookings = bookingsRaw
    .map(normalizeBooking)
    .filter((item): item is BookingListItem => Boolean(item));

  const rootStats = root
    ? asRecord(root.stats) || asRecord(root.statistics) || asRecord(root.summary)
    : null;

  const total =
    (root && (asNumber(root.total) ?? asNumber(root.count) ?? asNumber(root.totalCount))) ??
    bookings.length;
  const responsePage =
    (root && asNumber(root.page)) ??
    page;
  const responseLimit =
    (root && (asNumber(root.limit) ?? asNumber(root.pageSize))) ??
    limit;
  const totalPages =
    (root && (asNumber(root.totalPages) ?? asNumber(root.pages))) ??
    Math.max(1, Math.ceil(total / responseLimit));

  return {
    bookings,
    total,
    page: responsePage,
    limit: responseLimit,
    totalPages,
    stats: rootStats
      ? {
          total: asNumber(rootStats.total) ?? undefined,
          pending: asNumber(rootStats.pending) ?? undefined,
          active: asNumber(rootStats.active) ?? undefined,
          completed: asNumber(rootStats.completed) ?? undefined,
          cancelled: asNumber(rootStats.cancelled) ?? undefined,
        }
      : undefined,
  };
}

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<BookingServiceType | 'ALL'>('ALL');
  const [dateMode, setDateMode] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const limit = 10;

  const dateRange = useMemo(() => {
    if (dateMode === 'TODAY') {
      return new Date().toISOString().slice(0, 10);
    }
    if (dateMode === 'CUSTOM' && startDate && endDate) {
      return `${startDate}_${endDate}`;
    }
    return undefined;
  }, [dateMode, startDate, endDate]);

  const filters = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      serviceType: serviceFilter === 'ALL' ? undefined : serviceFilter,
      dateRange,
      page,
      limit,
    }),
    [statusFilter, serviceFilter, dateRange, page]
  );

  const query = useAdminBookingsQuery(filters);
  const response = normalizeResponse(query.data, page, limit);
  const bookings = response.bookings;

  const stats = useMemo(() => {
    if (response.stats) {
      return {
        total: response.stats.total ?? response.total,
        pending: response.stats.pending ?? bookings.filter((b) => b.status === 'PENDING').length,
        active: response.stats.active ?? bookings.filter((b) => ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)).length,
        completed: response.stats.completed ?? bookings.filter((b) => b.status === 'COMPLETED').length,
        cancelled: response.stats.cancelled ?? bookings.filter((b) => b.status === 'CANCELLED').length,
      };
    }
    return {
      total: response.total,
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      active: bookings.filter((b) => ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)).length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
    };
  }, [response, bookings]);

  const resetFilters = () => {
    setStatusFilter('ALL');
    setServiceFilter('ALL');
    setDateMode('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-6 top-20 z-[80] flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-emerald-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Dispatch Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor customer rides and RSA mechanic breakdown jobs across live booking operations.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Total Bookings', stats.total, 'text-slate-900'],
          ['Pending Bookings', stats.pending, 'text-amber-600'],
          ['Active Bookings', stats.active, 'text-violet-700'],
          ['Completed Bookings', stats.completed, 'text-emerald-700'],
          ['Cancelled Bookings', stats.cancelled, 'text-red-700'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`${microgrammaBold.className} mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="text-[10px] font-bold uppercase text-slate-400">
            Booking Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as BookingStatus | 'ALL');
                setPage(1);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-700 outline-none focus:border-[#074139]"
            >
              <option value="ALL">All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="text-[10px] font-bold uppercase text-slate-400">
            Service Type
            <select
              value={serviceFilter}
              onChange={(event) => {
                setServiceFilter(event.target.value as BookingServiceType | 'ALL');
                setPage(1);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-700 outline-none focus:border-[#074139]"
            >
              <option value="ALL">All</option>
              <option value="CHAUFFEUR">CHAUFFEUR</option>
              <option value="RSA_MECHANIC">RSA_MECHANIC</option>
            </select>
          </label>

          <label className="text-[10px] font-bold uppercase text-slate-400">
            Date
            <select
              value={dateMode}
              onChange={(event) => {
                setDateMode(event.target.value as 'ALL' | 'TODAY' | 'CUSTOM');
                setPage(1);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-700 outline-none focus:border-[#074139]"
            >
              <option value="ALL">All dates</option>
              <option value="TODAY">Today</option>
              <option value="CUSTOM">Date range</option>
            </select>
          </label>

        </div>

        {dateMode === 'CUSTOM' && (
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <label className="text-[10px] font-bold uppercase text-slate-400">
              Start date
              <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="mt-1.5 block rounded-lg border border-slate-200 px-3 py-2 text-xs normal-case text-slate-700" />
            </label>
            <label className="text-[10px] font-bold uppercase text-slate-400">
              End date
              <input type="date" value={endDate} min={startDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="mt-1.5 block rounded-lg border border-slate-200 px-3 py-2 text-xs normal-case text-slate-700" />
            </label>
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Reset filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {query.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-bold text-red-900">Failed to load bookings</p>
            <p className="mt-1 text-xs text-red-700">{query.error?.message || 'Unable to retrieve booking operations.'}</p>
            <button type="button" onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No bookings match these filters</p>
            <p className="mt-1 text-xs text-slate-500">Adjust or reset the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  {['Booking ID', 'Customer', 'Service Type', 'Assigned Crew', 'Status', 'Fare', 'Created At', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{booking.bookingCode || booking.id}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-slate-800">{booking.customerName || 'Not available'}</p>
                      {booking.customerPhone && <p className="mt-0.5 text-slate-500">{booking.customerPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{booking.serviceType}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{booking.crewName || 'Not assigned'}</td>
                    <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">{booking.fare == null ? '—' : formatCurrency(booking.fare)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDateTime(booking.createdAt || '')}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedBookingId(booking.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!query.isLoading && !query.isError && response.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {response.page} of {response.totalPages} · {response.total} bookings
            </p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={page >= response.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <BookingDetailsModal
        isOpen={Boolean(selectedBookingId)}
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onCancelled={() => {
          showToast('Booking cancelled successfully.');
          query.refetch();
        }}
      />
    </div>
  );
}