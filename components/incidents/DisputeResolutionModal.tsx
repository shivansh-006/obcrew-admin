'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import {
  useResolveIncidentMutation,
  useDismissIncidentMutation,
} from '@/hooks/useIncidents';
import { formatIncidentTypeLabel, DisputeResolutionType } from '@/types/incidents';
import { formatCurrency } from '@/lib/utils';

export interface IncidentTarget {
  id: string;
  bookingCode?: string;
  type?: string;
  reportedBy?: string;
}

interface DisputeResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentTarget | null;
  mode: 'RESOLVE' | 'DISMISS';
  onSuccess?: () => void;
}

export function DisputeResolutionModal({
  isOpen,
  onClose,
  incident,
  mode,
  onSuccess,
}: DisputeResolutionModalProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionType, setResolutionType] = useState<DisputeResolutionType>('RESOLVED_WARNING_ISSUED');
  const [penaltyAmount, setPenaltyAmount] = useState<string>('250');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    status: string;
    resolution?: string;
    penaltyAmount?: number;
    resolvedAt?: string;
  } | null>(null);

  const resolveMutation = useResolveIncidentMutation();
  const dismissMutation = useDismissIncidentMutation();

  if (!isOpen || !incident) return null;

  const isResolve = mode === 'RESOLVE';
  const isPending = resolveMutation.isPending || dismissMutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    setAdminNotes('');
    setResolutionType('RESOLVED_WARNING_ISSUED');
    setPenaltyAmount('250');
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedNotes = adminNotes.trim();
    if (!trimmedNotes || trimmedNotes.length < 5) {
      setErrorMessage(
        'Please enter a detailed explanation (at least 5 characters) for audit reconciliation.'
      );
      return;
    }
    if (adminNotes.length > 2000) {
      setErrorMessage(
        'Administrative notes cannot exceed 2000 characters.'
      );
      return;
    }

    if (isResolve && resolutionType === 'RESOLVED_PENALTY_DEDUCTED') {
      const num = Number(penaltyAmount);
      if (isNaN(num) || num <= 0) {
        setErrorMessage('Please specify a valid penalty amount greater than ₹0.');
        return;
      }
    }

    try {
      if (isResolve) {
        const res = await resolveMutation.mutateAsync({
          id: incident.id,
          payload: {
            adminNotes: trimmedNotes,
            resolution: resolutionType,
            penaltyAmount:
              resolutionType === 'RESOLVED_PENALTY_DEDUCTED'
                ? Number(penaltyAmount)
                : undefined,
          },
        });
        setSuccessResult({
          status: res.status,
          resolution: res.resolution || resolutionType,
          penaltyAmount:
            resolutionType === 'RESOLVED_PENALTY_DEDUCTED'
              ? Number(penaltyAmount)
              : undefined,
          resolvedAt: res.resolvedAt,
        });
      } else {
        const res = await dismissMutation.mutateAsync({
          id: incident.id,
          payload: {
            adminNotes: trimmedNotes,
            resolution: 'DISMISSED',
          },
        });
        setSuccessResult({
          status: res.status,
          resolution: 'DISMISSED',
          resolvedAt: res.resolvedAt,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          `Failed to ${isResolve ? 'resolve' : 'dismiss'} the incident. Please verify your connection and try again.`
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
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${
                isResolve
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              {isResolve ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                className={`${microgrammaBold.className} text-sm font-bold text-slate-900 tracking-wide`}
              >
                {isResolve ? 'Adjudicate & Resolve Dispute' : 'Dismiss Incident Claim'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isResolve
                  ? 'Close case with formal findings and corrective action'
                  : 'Close case without disciplinary action (unfounded/duplicate)'}
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
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto border ${
                  isResolve
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {isResolve ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <h4
                  className={`${microgrammaBold.className} text-base font-bold text-slate-900`}
                >
                  Incident {isResolve ? 'Resolved' : 'Dismissed'} Successfully
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Status updated to{' '}
                  <span className="font-semibold text-slate-700">
                    {successResult.status}
                  </span>
                  . Admin findings have been permanently logged into the audit ledger.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident ID:</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {incident.id}
                  </span>
                </div>
                {incident.bookingCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking:</span>
                    <span className="font-semibold text-slate-800">
                      {incident.bookingCode}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution Status:</span>
                  <span
                    className={`font-bold ${
                      isResolve ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {successResult.status}
                  </span>
                </div>
                {successResult.resolution && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Adjudication Verdict:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {successResult.resolution === 'RESOLVED_PENALTY_DEDUCTED'
                        ? `Penalty Deducted (${formatCurrency(successResult.penaltyAmount ?? 0)})`
                        : successResult.resolution === 'RESOLVED_WARNING_ISSUED'
                        ? 'Formal Warning Issued'
                        : successResult.resolution}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">
                    Recorded Notes:
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-xs italic">
                    "{adminNotes.trim()}"
                  </p>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Incident Metadata Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Dispute
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {incident.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Category:</span>
                  <span className="font-bold text-slate-800">
                    {incident.type
                      ? formatIncidentTypeLabel(incident.type)
                      : 'Unspecified'}
                  </span>
                </div>
                {incident.bookingCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Booking:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {incident.bookingCode}
                    </span>
                  </div>
                )}
                {incident.reportedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Reported By:</span>
                    <span className="text-slate-700 truncate max-w-[220px]">
                      {incident.reportedBy}
                    </span>
                  </div>
                )}
              </div>

              {/* Resolution Verdict Type Selector */}
              {isResolve && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Adjudication Verdict & Resolution Action</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        resolutionType === 'RESOLVED_WARNING_ISSUED'
                          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 text-amber-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="resolutionType"
                          value="RESOLVED_WARNING_ISSUED"
                          checked={resolutionType === 'RESOLVED_WARNING_ISSUED'}
                          onChange={() => setResolutionType('RESOLVED_WARNING_ISSUED')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold">Formal Warning</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Warning logged against crew record. No financial deduction from wallet.
                      </p>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        resolutionType === 'RESOLVED_PENALTY_DEDUCTED'
                          ? 'bg-red-50/70 border-red-300 ring-2 ring-red-500/20 text-red-950'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="resolutionType"
                          value="RESOLVED_PENALTY_DEDUCTED"
                          checked={resolutionType === 'RESOLVED_PENALTY_DEDUCTED'}
                          onChange={() => setResolutionType('RESOLVED_PENALTY_DEDUCTED')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs font-bold">Wallet Penalty</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Financial penalty deducted from crew member pending earnings.
                      </p>
                    </label>
                  </div>

                  {/* Penalty Amount Input (Conditional) */}
                  {resolutionType === 'RESOLVED_PENALTY_DEDUCTED' && (
                    <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                      <label className="text-[11px] font-bold text-red-900 flex items-center justify-between">
                        <span>Penalty Amount to Deduct (INR)</span>
                        <span className="text-[10px] text-red-700 font-normal">Deducted from booking earnings</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={penaltyAmount}
                          onChange={(e) => setPenaltyAmount(e.target.value)}
                          placeholder="e.g. 250"
                          className="w-full pl-7 pr-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Notes Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>
                      {isResolve ? 'Resolution & Adjudication Notes' : 'Dismissal Reason'}
                    </span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {adminNotes.length} / 2000
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    isResolve
                      ? 'Specify findings, warning issued, crew retraining, customer refund, or corrective measures taken…'
                      : 'State clear reasons why this complaint is unfounded, duplicate, or resolved without penalty…'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/10 transition-all placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Minimum 5 characters required</span>
                  <span>Visible to parties post-resolution</span>
                </div>
              </div>

              {/* Action Info Callout */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 flex items-start gap-2">
                <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isResolve
                    ? 'POST /admin/incidents/:id/resolve will transition the incident to RESOLVED and archive the audit trail.'
                    : 'POST /admin/incidents/:id/dismiss will mark the incident as DISMISSED with no disciplinary impact on crew.'}
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Actions */}
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
                  disabled={
                    isPending ||
                    adminNotes.trim().length < 5 ||
                    adminNotes.length > 2000 ||
                    (isResolve &&
                      resolutionType === 'RESOLVED_PENALTY_DEDUCTED' &&
                      (!penaltyAmount || Number(penaltyAmount) <= 0))
                  }
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isResolve
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {isPending
                      ? isResolve
                        ? 'Resolving…'
                        : 'Dismissing…'
                      : isResolve
                      ? 'Confirm Resolution'
                      : 'Confirm Dismissal'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
