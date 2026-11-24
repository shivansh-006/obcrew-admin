'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Car,
  Search,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { formatDateTime } from '@/lib/utils';
import {
  useIncidentsQuery,
  useReviewIncidentMutation,
} from '@/hooks/useIncidents';
import {
  IncidentStatus,
  IncidentType,
  IncidentListItem,
  formatIncidentTypeLabel,
  getIncidentSeverity,
} from '@/types/incidents';
import {
  DisputeResolutionModal,
  IncidentTarget,
} from '@/components/incidents/DisputeResolutionModal';
import { IncidentDetailModal } from '@/components/incidents/IncidentDetailModal';

const INCIDENT_CATEGORIES: { value: IncidentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Incident Categories' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
  { value: 'MISCONDUCT', label: 'Misconduct / Harassment' },
  { value: 'FRAUD', label: 'Fraud / Fare Spoofing' },
  { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
  { value: 'SERVICE_QUALITY', label: 'Service Quality' },
  { value: 'OVERCHARGING', label: 'Overcharging Dispute' },
  { value: 'OTHER', label: 'Other Complaints' },
];

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'ALL'>('ALL');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Modals state
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<{
    incident: IncidentTarget;
    mode: 'RESOLVE' | 'DISMISS';
  } | null>(null);

  // Queries & Mutations
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIncidentsQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    page,
    limit,
  });

  const reviewMutation = useReviewIncidentMutation();

  const incidents = data?.incidents || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleStatusTabChange = (status: IncidentStatus | 'ALL') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as IncidentType | 'ALL');
    setPage(1);
  };

  const handleQuickReview = async (e: React.MouseEvent, incidentId: string) => {
    e.stopPropagation();
    try {
      await reviewMutation.mutateAsync(incidentId);
    } catch (err: any) {
      alert(err?.message || 'Failed to start review on this incident.');
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

  const getSeverityBadge = (type: IncidentType | string) => {
    const severity = getIncidentSeverity(type);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}
          >
            Quality & Incident Disputes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review customer complaints, investigate crew quality disputes, and adjudicate disciplinary resolutions.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-all shadow-sm disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-slate-500 ${
              isFetching ? 'animate-spin text-[#074139]' : ''
            }`}
          />
          <span>{isFetching ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Incidents
          </span>
          <p
            className={`${microgrammaBold.className} text-xl font-bold text-slate-900`}
          >
            {total}
          </p>
          <span className="text-[10px] text-slate-400 block">
            Across all service categories
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {statusFilter === 'ALL' ? 'Open (Current Page)' : 'Unreviewed (Open)'}
          </span>
          <p
            className={`${microgrammaBold.className} text-xl font-bold text-amber-600`}
          >
            {statusFilter === 'OPEN'
              ? total
              : statusFilter === 'ALL'
              ? incidents.filter((i) => i.status === 'OPEN').length
              : '-'}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {statusFilter === 'ALL'
              ? 'In current page view'
              : statusFilter === 'OPEN'
              ? 'Filtered across database'
              : 'Filtered out by status tab'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            {statusFilter === 'ALL'
              ? 'Under Investigation (Current Page)'
              : 'Under Investigation'}
          </span>
          <p
            className={`${microgrammaBold.className} text-xl font-bold text-blue-600`}
          >
            {statusFilter === 'UNDER_REVIEW'
              ? total
              : statusFilter === 'ALL'
              ? incidents.filter((i) => i.status === 'UNDER_REVIEW').length
              : '-'}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {statusFilter === 'ALL'
              ? 'In current page view'
              : statusFilter === 'UNDER_REVIEW'
              ? 'Filtered across database'
              : 'Filtered out by status tab'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {statusFilter === 'ALL'
              ? 'Adjudicated (Current Page)'
              : 'Adjudicated'}
          </span>
          <p
            className={`${microgrammaBold.className} text-xl font-bold text-emerald-700`}
          >
            {statusFilter === 'RESOLVED'
              ? total
              : statusFilter === 'ALL'
              ? incidents.filter((i) => i.status === 'RESOLVED').length
              : '-'}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {statusFilter === 'ALL'
              ? 'In current page view'
              : statusFilter === 'RESOLVED'
              ? 'Filtered across database'
              : 'Filtered out by status tab'}
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Cases' },
                { id: 'OPEN', label: 'Open' },
                { id: 'UNDER_REVIEW', label: 'Under Review' },
                { id: 'RESOLVED', label: 'Resolved' },
                { id: 'DISMISSED', label: 'Dismissed' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleStatusTabChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                    active
                      ? 'bg-[#074139] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={handleCategoryChange}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#074139] text-slate-700 font-medium"
            >
              {INCIDENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Incident List Content */}
      <div className="space-y-4">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3 animate-pulse"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-40 bg-slate-200 rounded" />
                  </div>
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error Banner */
          <div className="p-8 rounded-xl bg-red-50 border border-red-200 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-900">
                Failed to Load Incident Reports
              </h3>
              <p className="text-xs text-red-700 max-w-md mx-auto">
                {error?.message ||
                  'Could not connect to obpark-backend. Please verify API server status.'}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-white border border-red-300 rounded-lg text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </button>
          </div>
        ) : incidents.length === 0 ? (
          /* Empty State */
          <div className="p-12 rounded-xl bg-white border border-slate-200/80 shadow-sm text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-[#95D0CC] mx-auto" />
            <div className="space-y-1">
              <h3
                className={`${microgrammaBold.className} text-base font-bold text-slate-800`}
              >
                No Incidents Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No incident disputes match the selected filters. Try broadening your criteria.'
                  : 'There are currently no active or filed incident reports in the quality loop.'}
              </p>
            </div>
            {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setPage(1);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          /* Render Incidents */
          incidents.map((inc: IncidentListItem) => {
            const severity = getIncidentSeverity(inc.type);

            return (
              <div
                key={inc.incidentId}
                className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3.5 hover:border-slate-300 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {inc.incidentId.slice(0, 8)}…
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">·</span>
                      <span className="text-[10px] font-mono font-bold text-[#074139]">
                        Booking: {inc.bookingCode}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">·</span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        {inc.serviceType.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {formatIncidentTypeLabel(inc.type)}
                    </h3>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Reported by:{' '}
                      <strong className="text-slate-700">{inc.reportedBy}</strong>
                      <span className="text-slate-400 mx-1.5">|</span>
                      <span>Filed: {formatDateTime(inc.createdAt)}</span>
                    </p>
                  </div>

                  {/* Status & Severity Badges */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(
                        inc.type
                      )}`}
                    >
                      {severity} SEVERITY
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                        inc.status
                      )}`}
                    >
                      {inc.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  <span className="text-[11px] text-slate-400">
                    Last updated: {formatDateTime(inc.updatedAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDetailId(inc.incidentId)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>View Details</span>
                    </button>

                    {inc.status === 'OPEN' && (
                      <>
                        <button
                          onClick={(e) => handleQuickReview(e, inc.incidentId)}
                          disabled={reviewMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Review
                        </button>
                        <button
                          onClick={() =>
                            setActiveAction({
                              incident: {
                                id: inc.incidentId,
                                bookingCode: inc.bookingCode,
                                type: inc.type,
                                reportedBy: inc.reportedBy,
                              },
                              mode: 'DISMISS',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() =>
                            setActiveAction({
                              incident: {
                                id: inc.incidentId,
                                bookingCode: inc.bookingCode,
                                type: inc.type,
                                reportedBy: inc.reportedBy,
                              },
                              mode: 'RESOLVE',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          Resolve & Close
                        </button>
                      </>
                    )}

                    {inc.status === 'UNDER_REVIEW' && (
                      <>
                        <button
                          onClick={() =>
                            setActiveAction({
                              incident: {
                                id: inc.incidentId,
                                bookingCode: inc.bookingCode,
                                type: inc.type,
                                reportedBy: inc.reportedBy,
                              },
                              mode: 'DISMISS',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() =>
                            setActiveAction({
                              incident: {
                                id: inc.incidentId,
                                bookingCode: inc.bookingCode,
                                type: inc.type,
                                reportedBy: inc.reportedBy,
                              },
                              mode: 'RESOLVE',
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          Resolve & Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <span>
              Showing page <strong className="text-slate-800">{page}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({total}{' '}
              total incidents)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        isOpen={Boolean(selectedDetailId)}
        incidentId={selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
        onOpenResolve={(target) => {
          setSelectedDetailId(null);
          setActiveAction({ incident: target, mode: 'RESOLVE' });
        }}
        onOpenDismiss={(target) => {
          setSelectedDetailId(null);
          setActiveAction({ incident: target, mode: 'DISMISS' });
        }}
      />

      {/* Dispute Resolution Modal (Resolve or Dismiss) */}
      <DisputeResolutionModal
        isOpen={Boolean(activeAction)}
        incident={activeAction?.incident || null}
        mode={activeAction?.mode || 'RESOLVE'}
        onClose={() => setActiveAction(null)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
