'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  UserCheck,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  useMarkCrewPaidMutation,
  useSettleVendorPayoutMutation,
} from '@/hooks/useSettlements';

export interface PayoutRecipient {
  type: 'CREW' | 'VENDOR';
  id: string; // crewProfileId or vendorProfileId
  name: string;
  bankAccountMasked?: string | null;
  pendingAmount: number;
  pendingJobsCount?: number;
  earningIds?: string[];
}

interface PayoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: PayoutRecipient | null;
}

function getDefaultPeriodDates() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(1); // Default to start of month
  const toDateInputString = (d: Date) => d.toISOString().split('T')[0];
  return {
    startStr: toDateInputString(start),
    endStr: toDateInputString(now),
  };
}

export function PayoutConfirmationModal({
  isOpen,
  onClose,
  recipient,
}: PayoutConfirmationModalProps) {
  const user = useAuthStore((state) => state.user);

  const defaultDates = getDefaultPeriodDates();
  const [referenceNote, setReferenceNote] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultDates.startStr);
  const [periodEnd, setPeriodEnd] = useState(defaultDates.endStr);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    payoutRecordId: string;
    amountPaid: number;
  } | null>(null);

  const markCrewPaidMutation = useMarkCrewPaidMutation();
  const settleVendorPayoutMutation = useSettleVendorPayoutMutation();

  if (!isOpen || !recipient) return null;

  const isCrew = recipient.type === 'CREW';
  const isVendor = recipient.type === 'VENDOR';

  // Role permissions:
  // Crew payout requires: ADMIN_OBCREW or SUPER_ADMIN_OBCREW
  const isAuthorizedForCrew =
    user?.role === 'ADMIN_OBCREW' ||
    user?.role === 'SUPER_ADMIN_OBCREW' ||
    user?.role === 'SUPERADMIN'; // Legacy alias

  // Vendor payout requires: ADMIN_OBPARK or SUPER_ADMIN_OBPARK
  const isAuthorizedForVendor =
    user?.role === 'ADMIN_OBPARK' ||
    user?.role === 'SUPER_ADMIN_OBPARK' ||
    user?.role === 'SUPERADMIN'; // Legacy alias

  const isCurrentActionAuthorized = isCrew ? isAuthorizedForCrew : isAuthorizedForVendor;

  const isPending =
    markCrewPaidMutation.isPending || settleVendorPayoutMutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    setReferenceNote('');
    setPeriodStart(defaultDates.startStr);
    setPeriodEnd(defaultDates.endStr);
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isCurrentActionAuthorized) {
      setErrorMessage(
        isCrew
          ? 'Authorization Error: Crew payout recording requires ADMIN_OBCREW or SUPER_ADMIN_OBCREW role.'
          : 'Authorization Error: Vendor settlement recording requires ADMIN_OBPARK or SUPER_ADMIN_OBPARK role.'
      );
      return;
    }

    if (!referenceNote.trim()) {
      setErrorMessage('Bank transaction reference or UTR number is required for audit reconciliation.');
      return;
    }

    try {
      if (isCrew) {
        const startIso = new Date(`${periodStart}T00:00:00.000Z`).toISOString();
        const endIso = new Date(`${periodEnd}T23:59:59.999Z`).toISOString();

        if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
          setErrorMessage('Period End cannot be earlier than Period Start.');
          return;
        }

        const res = await markCrewPaidMutation.mutateAsync({
          crewProfileId: recipient.id,
          payload: {
            referenceNote: referenceNote.trim(),
            earningIds: recipient.earningIds,
            periodStart: startIso,
            periodEnd: endIso,
          },
        });

        setSuccessResult({
          payoutRecordId: res.payout?.id || 'settled-record',
          amountPaid: res.payout?.amountPaid ?? recipient.pendingAmount,
        });
      } else {
        const res = await settleVendorPayoutMutation.mutateAsync({
          vendorProfileId: recipient.id,
          payload: {
            referenceNote: referenceNote.trim(),
            earningIds: recipient.earningIds,
          },
        });

        setSuccessResult({
          payoutRecordId: res.payoutId || 'vendor-settled-record',
          amountPaid: res.amountSettled ?? recipient.pendingAmount,
        });
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to record payout. Please verify backend connectivity and try again.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#074139] text-[#95D0CC] flex items-center justify-center shadow-sm">
              {isCrew ? <UserCheck className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            </div>
            <div>
              <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900 tracking-wide`}>
                Record External Disbursal
              </h3>
              <p className="text-[11px] text-slate-500">
                {isCrew ? 'Crew Payout Ledger Record' : 'Fleet Agency Retainer Settlement Record'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {successResult ? (
            <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className={`${microgrammaBold.className} text-base font-bold text-slate-900`}>
                  Payout Successfully Recorded!
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Earnings have been settled in the backend audit ledger.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payee:</span>
                  <span className="font-semibold text-slate-800">{recipient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Settled:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(successResult.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payout Record ID:</span>
                  <span className="font-mono text-[10px] text-slate-700 truncate max-w-[200px]">
                    {successResult.payoutRecordId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Reference / UTR:</span>
                  <span className="font-mono text-slate-700">{referenceNote}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmPayout} className="space-y-4">
              {/* Critical Legal Disclaimer */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <p className="font-bold">Manual Payout Record Audit</p>
                <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                  This action records an externally completed transaction (Bank NEFT/RTGS or UPI). It does <strong>not</strong> initiate an automatic banking disbarment or money transfer.
                </p>
              </div>

              {/* Recipient Details Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Payee Information
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{recipient.name}</p>
                    <p className="text-xs text-slate-500">
                      Bank A/C: {recipient.bankAccountMasked || 'Not provided'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Net Payable
                    </span>
                    <span className={`${microgrammaBold.className} text-lg font-bold text-emerald-700 block mt-0.5`}>
                      {formatCurrency(recipient.pendingAmount)}
                    </span>
                    {recipient.pendingJobsCount !== undefined && (
                      <span className="text-[10px] text-slate-400">
                        {recipient.pendingJobsCount} pending job(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Backend Endpoint: {isCrew ? 'POST /admin/crew/:id/mark-paid' : 'POST /vendor/wallet/admin/settle/:id'}
                  </span>
                </div>
              </div>

              {/* Role Authorization Alert */}
              {!isCurrentActionAuthorized && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Authorization Restriction</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {isCrew
                        ? 'Crew payouts require ADMIN_OBCREW or SUPER_ADMIN_OBCREW role.'
                        : 'Vendor settlements require ADMIN_OBPARK or SUPER_ADMIN_OBPARK role.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Reference Note (Required) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Bank UTR / UPI Transaction Reference <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit requirement</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEFT-AXIS-982341203 or UPI-REF-123456"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/10 transition-all font-mono"
                />
              </div>

              {/* Date Range for Crew Payouts (Required by backend DTO) */}
              {isCrew && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Period Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Period End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139]"
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !referenceNote.trim() || !isCurrentActionAuthorized}
                  className="px-4 py-2 bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Record Payout in Ledger
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
