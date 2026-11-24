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

export function PayoutConfirmationModal({
  isOpen,
  onClose,
  recipient,
}: PayoutConfirmationModalProps) {
  const user = useAuthStore((state) => state.user);

  const [referenceNote, setReferenceNote] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
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

  // Vendor settlement in obpark-backend requires ADMIN_OBPARK or SUPER_ADMIN_OBPARK role.
  const isAuthorizedForVendor =
    user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const isPending =
    markCrewPaidMutation.isPending || settleVendorPayoutMutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    setReferenceNote('');
    setPeriodStart('');
    setPeriodEnd('');
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!referenceNote.trim()) {
      setErrorMessage('Bank transaction reference or UTR number is required for audit reconciliation.');
      return;
    }

    try {
      if (isCrew) {
        const res = await markCrewPaidMutation.mutateAsync({
          crewProfileId: recipient.id,
          payload: {
            referenceNote: referenceNote.trim(),
            earningIds: recipient.earningIds,
            periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
            periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
          },
        });
        setSuccessResult({
          payoutRecordId: res.payoutRecordId,
          amountPaid: res.amountPaid,
        });
      } else if (isVendor) {
        if (!isAuthorizedForVendor) {
          setErrorMessage(
            'Authorization Error: Vendor payouts require OBPARK Administrator credentials. Your current role cannot execute vendor payouts.'
          );
          return;
        }

        const res = await settleVendorPayoutMutation.mutateAsync({
          vendorProfileId: recipient.id,
          payload: {
            referenceNote: referenceNote.trim(),
            earningIds: recipient.earningIds,
          },
        });
        setSuccessResult({
          payoutRecordId: res.payoutRecordId,
          amountPaid: recipient.pendingAmount,
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
                Confirm External Payout
              </h3>
              <p className="text-[11px] text-slate-500">
                {isCrew ? 'Crew Member Disbursal (85% Split)' : 'Fleet Agency Retainer Settlement (15% Split)'}
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
                  Earnings have been settled and locked against further disbursal. Audit ledger updated.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
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
                    Backend API: {isCrew ? 'POST /admin/crew/:id/mark-paid' : 'POST /vendor/wallet/admin/settle/:id'}
                  </span>
                </div>
              </div>

              {/* Vendor Authorization Notice */}
              {isVendor && !isAuthorizedForVendor && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Restricted Action</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Your current account does not have OBPARK Administrator permissions required to settle corporate vendor agency accounts.
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

              {/* Optional Date Range for Crew Payouts */}
              {isCrew && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Period Start (Optional)
                    </label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Period End (Optional)
                    </label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139]"
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || (isVendor && !isAuthorizedForVendor)}
                  className="px-4 py-2 bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isPending ? 'Recording Payout…' : 'Confirm & Mark Paid'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
