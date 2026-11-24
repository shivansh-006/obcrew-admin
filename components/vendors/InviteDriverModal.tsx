'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

async function inviteAgencyDriver(vendorId: string, phoneNumber: string): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL; 
  const token = useAuthStore.getState().token ||
    (typeof window !== 'undefined' ? localStorage.getItem('obcrew_token') : null);
  const response = await fetch(`${backendUrl}/vendor/fleet/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ vendorId, phoneNumber }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Freelancer Protection prevented this link: drivers registered as direct freelancers cannot be added to an agency.');
    }
    const message = payload && typeof payload === 'object' && 'message' in payload &&
      typeof payload.message === 'string'
      ? payload.message
      : `Unable to send the driver invitation (${response.status}).`;
    throw new Error(message);
  }
}

interface InviteDriverModalProps {
  vendorId: string;
  agencyName: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteDriverModal({
  vendorId,
  agencyName,
  onClose,
  onInvited,
}: InviteDriverModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const inviteMutation = useMutation({
    mutationFn: (number: string) => inviteAgencyDriver(vendorId, number),
  });
  const isPhoneValid = /^\+?[0-9][0-9\s()-]{6,19}$/.test(phoneNumber.trim());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteMutation.isPending || !isPhoneValid) return;
    try {
      const normalizedPhone = phoneNumber.trim().replace(/[\s()-]/g, '');
      await inviteMutation.mutateAsync(normalizedPhone);
      onInvited();
      onClose();
    } catch {
      // Mutation error is rendered below; keep the dialog open for correction/retry.
    }
  };
  const isSubmitting = inviteMutation.isPending;
  const error = inviteMutation.error instanceof Error ? inviteMutation.error.message : '';

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-sm font-bold text-slate-900">
                Invite driver to agency fleet
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-slate-500">
                {agencyName}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isSubmitting}
                aria-label="Close invite dialog"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="driver-phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Driver phone number
              </label>
              <input
                id="driver-phone"
                type="tel"
                autoComplete="tel"
                required
                pattern="\+?[0-9][0-9\s()-]{6,19}"
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value);
                  inviteMutation.reset();
                }}
                placeholder="+91 98111 22334"
                aria-invalid={phoneNumber.length > 0 && !isPhoneValid}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/15"
              />
              <p className={`mt-1.5 text-[11px] ${phoneNumber.length > 0 && !isPhoneValid ? 'text-red-600' : 'text-slate-400'}`}>
                {phoneNumber.length > 0 && !isPhoneValid
                  ? 'Enter a valid phone number, including country code if needed.'
                  : 'An invitation will be sent by SMS or notification.'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting || !isPhoneValid}
                className="flex items-center gap-1.5 rounded-lg bg-[#074139] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0a5e52] disabled:opacity-50"
              >
                {isSubmitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Send invite
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
