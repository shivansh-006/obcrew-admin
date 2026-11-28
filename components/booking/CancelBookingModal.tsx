'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { useCancelBookingMutation } from '@/hooks/useBookings';

interface CancelBookingModalProps {
  isOpen: boolean;
  bookingId: string;
  bookingCode?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelBookingModal({
  isOpen,
  bookingId,
  bookingCode,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelMutation = useCancelBookingMutation();

  if (!isOpen) return null;

  const close = () => {
    if (cancelMutation.isPending) return;
    setReason('');
    setConfirming(false);
    setErrorMessage(null);
    onClose();
  };

  const submit = async () => {
    setErrorMessage(null);
    try {
      await cancelMutation.mutateAsync({
        id: bookingId,
        reason: reason.trim(),
      });
      setReason('');
      setConfirming(false);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to cancel the booking. Please try again.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                Emergency Booking Cancellation
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {bookingCode || bookingId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={cancelMutation.isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!confirming ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cancellation reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Enter the reason for this administrator override..."
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>
              {errorMessage && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!reason.trim()}
                  onClick={() => {
                    setErrorMessage(null);
                    setConfirming(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                Confirm cancellation of this booking? This action will be recorded as an administrator override.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">Reason:</span> {reason.trim()}
              </div>
              {errorMessage && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={cancelMutation.isPending}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Edit reason
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={cancelMutation.isPending}
                  className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {cancelMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
