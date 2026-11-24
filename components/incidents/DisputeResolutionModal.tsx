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
import { formatIncidentTypeLabel, DisputeFindingCategory } from '@/types/incidents';

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

const RESOLUTION_FINDINGS: { value: DisputeFindingCategory; label: string; desc: string }[] = [
  {
    value: 'WARNING_ISSUED',
    label: 'Formal Warning Issued',
    desc: 'Official conduct / safety warning registered against the partner profile.',
  },
  {
    value: 'RETRAINING_ORDERED',
    label: 'Service Quality Retraining',
    desc: 'Partner must complete quality re-induction before next priority dispatch.',
  },
  {
    value: 'CUSTOMER_REFUNDED',
    label: 'Customer Goodwill & Refund',
    desc: 'Customer concern addressed with fare adjustment or goodwill voucher.',
  },
  {
    value: 'ACTION_TAKEN_CLOSED',
    label: 'Corrective Action Completed',
    desc: 'Investigation completed and corrective operational measures enacted.',
  },
];

const DISMISSAL_FINDINGS: { value: DisputeFindingCategory; label: string; desc: string }[] = [
  {
    value: 'DISMISSED_INVALID',
    label: 'Unsubstantiated / Invalid Complaint',
    desc: 'GPS telemetry, booking logs, and partner records verify correct compliance.',
  },
  {
    value: 'DISMISSED_DUPLICATE',
    label: 'Duplicate / Settled Between Parties',
    desc: 'Case duplicate or resolved amicably at vehicle handover.',
  },
];

export function DisputeResolutionModal({
  isOpen,
  onClose,
  incident,
  mode,
  onSuccess,
}: DisputeResolutionModalProps) {
  const isResolve = mode === 'RESOLVE';

  const [finding, setFinding] = useState<DisputeFindingCategory>(
    isResolve ? 'WARNING_ISSUED' : 'DISMISSED_INVALID'
  );
  const [adminNotes, setAdminNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    status: string;
    findingLabel: string;
    resolvedAt?: string;
  } | null>(null);

  const resolveMutation = useResolveIncidentMutation();
  const dismissMutation = useDismissIncidentMutation();

  if (!isOpen || !incident) return null;

  const isPending = resolveMutation.isPending || dismissMutation.isPending;

  const handleClose = () => {
    if (isPending) return;
    setAdminNotes('');
    setFinding(isResolve ? 'WARNING_ISSUED' : 'DISMISSED_INVALID');
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
        'Please enter detailed audit findings (at least 5 characters) for the record.'
      );
      return;
    }
    if (trimmedNotes.length > 2000) {
      setErrorMessage('Administrative audit notes cannot exceed 2000 characters.');
      return;
    }

    const findingList = isResolve ? RESOLUTION_FINDINGS : DISMISSAL_FINDINGS;
    const selectedObj = findingList.find((f) => f.value === finding);
    const findingPrefix = selectedObj ? `[${selectedObj.label}] ` : '';
    const finalNotes = `${findingPrefix}${trimmedNotes}`;

    try {
      if (isResolve) {
        const res = await resolveMutation.mutateAsync({
          id: incident.id,
          payload: { adminNotes: finalNotes },
        });
        setSuccessResult({
          status: res.status,
          findingLabel: selectedObj?.label || 'Case Resolved',
          resolvedAt: res.resolvedAt,
        });
      } else {
        const res = await dismissMutation.mutateAsync({
          id: incident.id,
          payload: { adminNotes: finalNotes },
        });
        setSuccessResult({
          status: res.status,
          findingLabel: selectedObj?.label || 'Case Dismissed',
          resolvedAt: res.resolvedAt,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          `Failed to ${isResolve ? 'resolve' : 'dismiss'} the incident. Please check server connectivity.`
      );
    }
  };

  const activeFindings = isResolve ? RESOLUTION_FINDINGS : DISMISSAL_FINDINGS;

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
                isResolve ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
              }`}
            >
              {isResolve ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </div>
            <div>
              <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900 tracking-wide`}>
                {isResolve ? 'Adjudicate & Resolve Dispute' : 'Dismiss Incident Complaint'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Booking: <span className="font-mono text-slate-700">{incident.bookingCode || incident.id}</span> · Category:{' '}
                {incident.type ? formatIncidentTypeLabel(incident.type) : 'Incident'}
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

        {/* Modal Body */}
        <div className="p-6">
          {successResult ? (
            <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto border ${
                  isResolve
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {isResolve ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <h4 className={`${microgrammaBold.className} text-base font-bold text-slate-900`}>
                  {isResolve ? 'Incident Formally Resolved' : 'Incident Dismissed'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The case status has been updated in the backend Quality Loop registry.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Finding Category:</span>
                  <span className="font-semibold text-slate-800">{successResult.findingLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Status:</span>
                  <span className="font-bold text-slate-800">{successResult.status}</span>
                </div>
                {successResult.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-mono text-slate-600">{successResult.resolvedAt}</span>
                  </div>
                )}
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
              {/* Finding Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Adjudication Finding <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {activeFindings.map((f) => (
                    <label
                      key={f.value}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        finding === f.value
                          ? 'border-[#074139] bg-[#074139]/5 text-slate-900 ring-1 ring-[#074139]/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="finding"
                        value={f.value}
                        checked={finding === f.value}
                        onChange={() => setFinding(f.value)}
                        className="mt-0.5 text-[#074139] focus:ring-[#074139]"
                      />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-slate-900">{f.label}</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">{f.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Admin Notes Textarea (Matches backend ResolveIncidentDto.adminNotes) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Audit Notes & Actions Taken <span className="text-red-500">*</span>
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
                      ? 'Specify findings, warning communicated, customer compensation, or retraining assigned…'
                      : 'State clear objective reasons why this incident is unfounded or duplicate…'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/10 transition-all font-sans"
                />
                <span className="text-[10px] text-slate-400 block">
                  Permanent audit record. Minimum 5 characters required by backend.
                </span>
              </div>

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
                  disabled={isPending || adminNotes.trim().length < 5}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isResolve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isResolve ? 'Resolve Case' : 'Dismiss Case'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
