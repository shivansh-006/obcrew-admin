'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  User,
  ShieldAlert,
  Clock,
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  Car,
  Paperclip,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatDateTime } from '@/lib/utils';
import {
  useIncidentDetailQuery,
  useReviewIncidentMutation,
} from '@/hooks/useIncidents';
import {
  formatIncidentTypeLabel,
  getIncidentSeverity,
  IncidentStatus,
} from '@/types/incidents';
import { IncidentTarget } from './DisputeResolutionModal';

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string | null;
  onOpenResolve: (incident: IncidentTarget) => void;
  onOpenDismiss: (incident: IncidentTarget) => void;
}

export function IncidentDetailModal({
  isOpen,
  onClose,
  incidentId,
  onOpenResolve,
  onOpenDismiss,
}: IncidentDetailModalProps) {
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: incident,
    isLoading,
    isError,
    error,
    refetch,
  } = useIncidentDetailQuery(incidentId || '');

  const reviewMutation = useReviewIncidentMutation();

  if (!isOpen || !incidentId) return null;

  const handleStartReview = async () => {
    setActionError(null);
    try {
      await reviewMutation.mutateAsync(incidentId);
      await refetch();
    } catch (err: any) {
      setActionError(
        err?.message || 'Failed to mark incident as under review. Please try again.'
      );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#074139] text-[#95D0CC] flex items-center justify-center shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`${microgrammaBold.className} text-sm font-bold text-slate-900 tracking-wide`}
                >
                  Dispute Case #{incidentId.slice(0, 8)}
                </h3>
                {incident && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                      incident.status
                    )}`}
                  >
                    {incident.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                UUID: {incidentId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#074139]" />
                <span className="text-xs">Fetching incident records from backend…</span>
              </div>
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ) : isError || !incident ? (
            <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-900">
                  Failed to Load Incident Details
                </h4>
                <p className="text-xs text-red-700">
                  {error?.message || 'Unable to retrieve incident from obpark-backend.'}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-white border border-red-300 rounded-lg text-red-700 hover:bg-red-50 font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Category, Severity & Booking Overview Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Incident Classification
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {formatIncidentTypeLabel(incident.type)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(
                        getIncidentSeverity(incident.type)
                      )}`}
                    >
                      {getIncidentSeverity(incident.type)} SEVERITY
                    </span>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Booking Reference
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {incident.booking.bookingCode}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Service: {incident.booking.serviceType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Incident Description */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Incident Statement / Description
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                  "{incident.description || 'No detailed statement provided.'}"
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Filed on: {formatDateTime(incident.createdAt)}
                </span>
              </div>

              {/* Evidence URLs & Attachments */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                  Evidence Attachments ({incident.evidenceUrls?.length || 0})
                </h4>

                {incident.evidenceUrls && incident.evidenceUrls.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incident.evidenceUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#074139] hover:bg-slate-50 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#074139] shrink-0" />
                          <span className="text-xs text-slate-700 font-medium truncate">
                            Evidence Attachment #{idx + 1}
                          </span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#074139] shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                    No external photographic or document evidence files uploaded for this dispute.
                  </p>
                )}
              </div>

              {/* Stakeholder Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reported By */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reported By
                  </span>
                  <div className="space-y-1 text-slate-700">
                    {incident.reportedBy.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{incident.reportedBy.email}</span>
                      </div>
                    )}
                    {incident.reportedBy.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{incident.reportedBy.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Account
                  </span>
                  <p className="font-bold text-slate-900">
                    {[
                      incident.booking.customer.firstName,
                      incident.booking.customer.lastName,
                    ]
                      .filter(Boolean)
                      .join(' ') || 'Customer'}
                  </p>
                  <div className="space-y-0.5 text-slate-600 text-[11px]">
                    <p className="truncate">{incident.booking.customer.email || '-'}</p>
                    <p>{incident.booking.customer.phoneNumber || '-'}</p>
                  </div>
                </div>

                {/* Crew Member */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Crew
                  </span>
                  {incident.booking.crew ? (
                    <>
                      <p className="font-bold text-slate-900">
                        {incident.booking.crew.fullName || 'Crew Member'}
                      </p>
                      <div className="space-y-0.5 text-slate-600 text-[11px]">
                        <p className="truncate">{incident.booking.crew.email || '-'}</p>
                        <p>{incident.booking.crew.phone || '-'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No crew assigned</p>
                  )}
                </div>
              </div>

              {/* Completed Case Audit Trail (Resolved / Dismissed) */}
              {(incident.status === 'RESOLVED' || incident.status === 'DISMISSED') && (
                <div
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    incident.status === 'RESOLVED'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-slate-100/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        incident.status === 'RESOLVED'
                          ? 'text-emerald-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {incident.status === 'RESOLVED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-600" />
                      )}
                      Final Adjudication Finding: {incident.status}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Resolved: {formatDateTime(incident.resolvedAt || '')}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 italic">
                    "{incident.adminNotes || 'No administrative notes recorded.'}"
                  </div>

                  {incident.resolvedByAdmin && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span>Adjudicated by Admin:</span>
                      <span className="font-semibold text-slate-700">
                        {incident.resolvedByAdmin}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error feedback for action */}
              {actionError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p>{actionError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="text-[11px] text-slate-400">
            {incident && (
              <span>
                Service Status:{' '}
                <strong className="text-slate-600">
                  {incident.booking.status}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>

            {incident && incident.status === 'OPEN' && (
              <>
                <button
                  onClick={handleStartReview}
                  disabled={reviewMutation.isPending}
                  className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {reviewMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Start Review</span>
                </button>

                <button
                  onClick={() => {
                    onOpenDismiss({
                      id: incident.incidentId,
                      bookingCode: incident.booking.bookingCode,
                      type: incident.type,
                      reportedBy: incident.reportedBy.email || incident.reportedBy.phone || undefined,
                    });
                  }}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  Dismiss Claim
                </button>

                <button
                  onClick={() => {
                    onOpenResolve({
                      id: incident.incidentId,
                      bookingCode: incident.booking.bookingCode,
                      type: incident.type,
                      reportedBy: incident.reportedBy.email || incident.reportedBy.phone || undefined,
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Resolve & Close
                </button>
              </>
            )}

            {incident && incident.status === 'UNDER_REVIEW' && (
              <>
                <button
                  onClick={() => {
                    onOpenDismiss({
                      id: incident.incidentId,
                      bookingCode: incident.booking.bookingCode,
                      type: incident.type,
                      reportedBy: incident.reportedBy.email || incident.reportedBy.phone || undefined,
                    });
                  }}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
                >
                  Dismiss Claim
                </button>

                <button
                  onClick={() => {
                    onOpenResolve({
                      id: incident.incidentId,
                      bookingCode: incident.booking.bookingCode,
                      type: incident.type,
                      reportedBy: incident.reportedBy.email || incident.reportedBy.phone || undefined,
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Resolve & Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
