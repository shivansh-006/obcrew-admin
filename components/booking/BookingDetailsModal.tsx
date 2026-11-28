'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Car,
  Clock,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BookingDetail, BookingStatus } from '@/types/bookings';
import { useBookingDetailQuery } from '@/hooks/useBookings';
import { BookingStatusBadge } from './BookingStatusBadge';
import { CancelBookingModal } from './CancelBookingModal';

interface BookingDetailsModalProps {
  isOpen: boolean;
  bookingId: string | null;
  onClose: () => void;
  onCancelled: () => void;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | null | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() && Number.isFinite(Number(value))
      ? Number(value)
      : undefined;
}

function normalizeDetail(raw: unknown): BookingDetail | null {
  const root = record(raw);
  if (!root) return null;
  const payload = record(root.booking) || record(root.data) || root;
  const customer = record(payload.customer) || record(payload.customerProfile) || null;
  const crew = record(payload.assignedCrew) || record(payload.crew) || record(payload.driver) || record(payload.mechanic) || null;
  const pickup = record(payload.pickup) || record(payload.pickupLocation);
  const destination = record(payload.destination) || record(payload.destinationLocation);
  const vehicle = record(payload.vehicle) || record(payload.vehicleDetails);
  const fare = record(payload.fare) || record(payload.fareBreakdown) || record(payload.pricing);
  const earnings = record(payload.earnings) || record(payload.earningLedger) || record(payload.commission);

  const statusValue = String(payload.status || payload.bookingStatus || 'PENDING').toUpperCase();
  const statuses: BookingStatus[] = [
    'PENDING',
    'ACCEPTED',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ];
  const status = statuses.includes(statusValue as BookingStatus)
    ? (statusValue as BookingStatus)
    : 'PENDING';
  const id = text(payload.id) || text(payload._id) || text(payload.bookingId) || text(payload.bookingCode) || '';

  const timestamps: Record<string, string> = {};
  ['createdAt', 'acceptedAt', 'arrivedAt', 'startedAt', 'inProgressAt', 'completedAt', 'cancelledAt', 'updatedAt'].forEach((key) => {
    const value = text(payload[key]);
    if (value) timestamps[key] = value;
  });

  return {
    id,
    bookingCode: text(payload.bookingCode) || text(payload.bookingId),
    customerName:
      text(customer?.name) ||
      [text(customer?.firstName), text(customer?.lastName)].filter(Boolean).join(' ') ||
      text(payload.customerName),
    customerPhone: text(customer?.phoneNumber) || text(customer?.phone) || text(payload.customerPhone),
    customerEmail: text(customer?.email) || text(payload.customerEmail),
    crewName:
      text(crew?.name) ||
      [text(crew?.firstName), text(crew?.fullName), text(crew?.lastName)].filter(Boolean).join(' ') ||
      text(payload.crewName) ||
      text(payload.assignedCrewName),
    crewPhone: text(crew?.phoneNumber) || text(crew?.phone) || text(payload.crewPhone),
    crewProfile: text(crew?.profile) || text(crew?.profileType) || text(payload.crewProfile),
    serviceType:
      String(payload.serviceType || '').toUpperCase() === 'RSA_MECHANIC'
        ? 'RSA_MECHANIC'
        : 'CHAUFFEUR',
    status,
    fare: numberValue(payload.fare) ?? numberValue(payload.totalFare) ?? numberValue(fare?.total),
    createdAt: text(payload.createdAt),
    pickupLocation:
      text(payload.pickupLocation) ||
      text(payload.pickupAddress) ||
      text(pickup?.address) ||
      text(pickup?.name),
    destinationLocation:
      text(payload.destinationLocation) ||
      text(payload.destinationAddress) ||
      text(destination?.address) ||
      text(destination?.name),
    pickupCoordinates:
      text(payload.pickupCoordinates) ||
      (pickup?.latitude !== undefined && pickup?.longitude !== undefined
        ? `${String(pickup.latitude)}, ${String(pickup.longitude)}`
        : undefined),
    destinationCoordinates:
      text(payload.destinationCoordinates) ||
      (destination?.latitude !== undefined && destination?.longitude !== undefined
        ? `${String(destination.latitude)}, ${String(destination.longitude)}`
        : undefined),
    vehicleClass: text(payload.vehicleClass) || text(vehicle?.class) || text(vehicle?.type),
    vehicleDetails: text(payload.vehicleDetails) || text(vehicle?.model) || text(vehicle?.registrationNumber),
    baseFare: numberValue(payload.baseFare) ?? numberValue(fare?.baseFare) ?? numberValue(fare?.base),
    surgeMultiplier: numberValue(payload.surgeMultiplier) ?? numberValue(fare?.surgeMultiplier),
    discount: numberValue(payload.discount) ?? numberValue(fare?.discount),
    totalFare: numberValue(payload.totalFare) ?? numberValue(payload.finalFare) ?? numberValue(fare?.total),
    platformCommission: numberValue(payload.platformCommission) ?? numberValue(earnings?.platformCommission) ?? numberValue(earnings?.platform),
    crewEarnings: numberValue(payload.crewEarnings) ?? numberValue(earnings?.crewEarnings) ?? numberValue(earnings?.crew),
    otpVerified:
      typeof payload.otpVerified === 'boolean'
        ? payload.otpVerified
        : typeof payload.startOtpVerified === 'boolean'
          ? payload.startOtpVerified
          : null,
    timestamps,
    cancellationReason: text(payload.cancellationReason) || text(payload.cancelReason),
  };
}

export function BookingDetailsModal({
  isOpen,
  bookingId,
  onClose,
  onCancelled,
}: BookingDetailsModalProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingDetailQuery(bookingId || '');
  const booking = normalizeDetail(data);
  if (!isOpen || !bookingId) return null;

  const timeline: Array<{ status: BookingStatus; timestamp?: string }> = [
    { status: 'PENDING', timestamp: booking?.timestamps?.createdAt },
    { status: 'ACCEPTED', timestamp: booking?.timestamps?.acceptedAt },
    { status: 'ARRIVED', timestamp: booking?.timestamps?.arrivedAt },
    { status: 'IN_PROGRESS', timestamp: booking?.timestamps?.startedAt || booking?.timestamps?.inProgressAt },
    { status: 'COMPLETED', timestamp: booking?.timestamps?.completedAt },
  ];

  return (
    <>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#074139] text-[#95D0CC] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Booking Inspection
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {booking?.bookingCode || bookingId}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            {isLoading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#074139]" />
                <span className="text-xs">Loading booking details…</span>
              </div>
            ) : isError || !booking ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertTriangle className="h-7 w-7 text-red-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-red-900">Failed to load booking details</p>
                <p className="text-xs text-red-700 mt-1">{error?.message || 'Unable to retrieve booking information.'}</p>
                <button type="button" onClick={() => refetch()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<Calendar className="h-4 w-4" />} label="Booking Status">
                    <BookingStatusBadge status={booking.status} />
                  </InfoCard>
                  <InfoCard icon={<Clock className="h-4 w-4" />} label="Created At">
                    {formatDateTime(booking.createdAt || '')}
                  </InfoCard>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Section title="Customer Information" icon={<User className="h-4 w-4" />}>
                    <p className="font-semibold">{booking.customerName || 'Not available'}</p>
                    {booking.customerPhone && <TextRow icon={<Phone className="h-3.5 w-3.5" />} value={booking.customerPhone} />}
                    {booking.customerEmail && <p className="text-slate-500">{booking.customerEmail}</p>}
                  </Section>
                  <Section title="Assigned Crew" icon={<ShieldCheck className="h-4 w-4" />}>
                    <p className="font-semibold">{booking.crewName || 'Not assigned'}</p>
                    {booking.crewPhone && <TextRow icon={<Phone className="h-3.5 w-3.5" />} value={booking.crewPhone} />}
                    {booking.crewProfile && <p className="text-slate-500">{booking.crewProfile}</p>}
                    <p className="text-slate-500">{booking.serviceType}</p>
                  </Section>
                </div>

                <Section title={booking.serviceType === 'RSA_MECHANIC' ? 'Breakdown & Service Location' : 'Location Information'} icon={<MapPin className="h-4 w-4" />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Pickup / Breakdown</p>
                      <p className="mt-1">{booking.pickupLocation || 'Not available'}</p>
                      {booking.pickupCoordinates && <p className="text-slate-500 font-mono mt-1">{booking.pickupCoordinates}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Destination</p>
                      <p className="mt-1">{booking.destinationLocation || 'Not available'}</p>
                      {booking.destinationCoordinates && <p className="text-slate-500 font-mono mt-1">{booking.destinationCoordinates}</p>}
                    </div>
                  </div>
                </Section>

                <Section title="Vehicle Information" icon={<Car className="h-4 w-4" />}>
                  <p>{booking.vehicleClass || 'Not available'}</p>
                  {booking.vehicleDetails && <p className="text-slate-500 mt-1">{booking.vehicleDetails}</p>}
                </Section>

                <Section title="Fare & Commission" icon={<Wallet className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <FareItem label="Base Fare" value={booking.baseFare == null ? 'Not available' : formatCurrency(booking.baseFare)} />
                    <FareItem label="Surge" value={booking.surgeMultiplier == null ? 'Not available' : String(booking.surgeMultiplier)} />
                    <FareItem label="Discount" value={booking.discount == null ? 'Not available' : formatCurrency(booking.discount)} />
                    <FareItem label="Platform 15%" value={booking.platformCommission == null ? 'Not available' : formatCurrency(booking.platformCommission)} />
                    <FareItem label="Crew 85%" value={booking.crewEarnings == null ? 'Not available' : formatCurrency(booking.crewEarnings)} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Total Fare</span>
                    <span className="text-sm font-bold text-slate-900">{booking.totalFare == null ? 'Not available' : formatCurrency(booking.totalFare)}</span>
                  </div>
                </Section>

                <Section title="Start OTP Verification" icon={<ShieldCheck className="h-4 w-4" />}>
                  <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
                    booking.otpVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {booking.otpVerified === null ? 'Status unavailable' : booking.otpVerified ? 'Verified' : 'Not verified'}
                  </span>
                </Section>

                <Section title="Booking Timeline" icon={<Clock className="h-4 w-4" />}>
                  {booking.status === 'CANCELLED' ? (
                    <div className="space-y-2">
                      {timeline.map((step) => (
                        <p key={step.status} className="text-slate-500">{step.status.replace('_', ' ')}{step.timestamp ? ` · ${formatDateTime(step.timestamp)}` : ''}</p>
                      ))}
                      <p className="font-bold text-red-700">
                        CANCELLED · {formatDateTime(booking.timestamps?.cancelledAt || '')}
                      </p>
                      {booking.cancellationReason && <p className="text-slate-600">Reason: {booking.cancellationReason}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeline.map((step) => (
                        <p key={step.status} className={step.timestamp ? 'text-slate-700' : 'text-slate-400'}>
                          {step.status.replace('_', ' ')}{step.timestamp ? ` · ${formatDateTime(step.timestamp)}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>

          {booking && booking.status !== 'CANCELLED' && (
            <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Cancel booking
              </button>
            </div>
          )}
        </div>
      </div>

      <CancelBookingModal
        isOpen={cancelOpen}
        bookingId={bookingId}
        bookingCode={booking?.bookingCode}
        onClose={() => setCancelOpen(false)}
        onSuccess={async () => {
          onCancelled();
          await refetch();
        }}
      />
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {icon}{title}
      </h4>
      <div className="text-xs text-slate-700">{children}</div>
    </section>
  );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">{icon}</div>
      <div className="text-xs">
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function TextRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <p className="mt-1 flex items-center gap-1.5 text-slate-500">{icon}{value}</p>;
}

function FareItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
