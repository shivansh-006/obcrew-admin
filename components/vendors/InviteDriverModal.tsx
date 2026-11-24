'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, LoaderCircle, ShieldAlert, X } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api/client';

async function inviteAgencyDriver(phoneNumber: string): Promise<void> {
  // Backend contract: POST /vendor/fleet/members
  // Body: { phoneNumber: string } (E.164 format with country code)
  // Guard: RolesGuard @Roles('VENDOR')
  await apiClient('/vendor/fleet/members', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

interface InviteDriverModalProps {
  vendorId: string;
  agencyName: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteDriverModal({
  agencyName,
  onClose,
  onInvited,
}: InviteDriverModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const inviteMutation = useMutation({
    mutationFn: (number: string) => inviteAgencyDriver(number),
  });

  // Backend DTO validation: Matches /^\+[1-9]\d{9,14}$/
  const PHONE_REGEX = /^\+[1-9]\d{9,14}$/;
  const cleanPhone = phoneNumber.trim().replace(/[\s()-]/g, '');
  const isPhoneValid = PHONE_REGEX.test(cleanPhone);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inviteMutation.isPending || !isPhoneValid) return;
    try {
      await inviteMutation.mutateAsync(cleanPhone);
      onInvited();
      onClose();
    } catch {
      // Handled by mutation error display below
    }
  };

  const isSubmitting = inviteMutation.isPending;
  const rawError = inviteMutation.error;

  let errorMessage = '';
  let isPermissionError = false;

  if (rawError instanceof ApiClientError) {
    if (rawError.status === 403) {
      isPermissionError = true;
      errorMessage =
        'Authorization Restriction (403): Driver fleet linking is strictly restricted to agency VENDOR sessions. Direct administrator fleet linking is prohibited under Freelance Partner Protection policy.';
    } else if (rawError.status === 404) {
      errorMessage =
        'No verified driver or mechanic was found with this phone number. The partner must first complete individual KYC.';
    } else if (rawError.status === 409) {
      errorMessage =
        'This partner is already affiliated with an agency or has an active invite pending.';
    } else {
      errorMessage = rawError.message;
    }
  } else if (rawError instanceof Error) {
    errorMessage = rawError.message;
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <Dialog.Title className="text-sm font-bold text-slate-900">
                Link Driver to Agency Fleet
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-slate-500">
                Target Agency: <span className="font-semibold text-slate-800">{agencyName}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isSubmitting}
                aria-label="Close invite dialog"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="driver-phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Driver / Mechanic Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="driver-phone"
                type="tel"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value);
                  if (inviteMutation.isError) inviteMutation.reset();
                }}
                placeholder="+919876543210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono outline-none transition-colors focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/15"
              />
              <p className={`mt-1.5 text-[11px] ${cleanPhone.length > 3 && !isPhoneValid ? 'text-red-600' : 'text-slate-400'}`}>
                {cleanPhone.length > 3 && !isPhoneValid
                  ? 'Must include country code, e.g. +919876543210 (10–15 digits).'
                  : 'Backend contract requires international E.164 format.'}
              </p>
            </div>

            {errorMessage && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  isPermissionError
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {isPermissionError ? (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">{isPermissionError ? 'Backend Role Guard' : 'Invitation Rejected'}</p>
                  <p className="text-[11px] leading-relaxed">{errorMessage}</p>
                </div>
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
                className="flex items-center gap-1.5 rounded-lg bg-[#074139] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#0a5e52] disabled:opacity-50"
              >
                {isSubmitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Send Link Request
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
