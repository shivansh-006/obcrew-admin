'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, XCircle, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { CrewErrorState } from '@/components/crew/CrewErrorState';
import { formatDateTime } from '@/lib/utils';
import {
  getPendingCrew,
  verifyCrew,
  type CrewListItem,
  type DocReviewStatus,
  type ServiceType,
} from '@/lib/crew-api';

const PAGE_SIZE = 10;

const FILTERS: { label: string; value: ServiceType | 'ALL' }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'DRIVER', value: 'DRIVER' },
  { label: 'MECHANIC', value: 'MECHANIC' },
];

const DOC_STATUS_STYLE: Record<DocReviewStatus, string> = {
  PENDING: 'bg-slate-100 border-slate-200 text-slate-700',
  ACCEPTED: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  REJECTED: 'bg-red-50 border-red-200 text-red-700',
  ACTION_REQUIRED: 'bg-amber-50 border-amber-200 text-amber-800',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

const rejectSchema = z.object({
  rejectionReason: z.string().trim().min(1, 'Please enter a reason for rejecting this crew member.'),
});

type RejectForm = z.infer<typeof rejectSchema>;

function CrewRow({ crew, onDone }: { crew: CrewListItem; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'idle' | 'confirmApprove' | 'reject'>('idle');
  const displayName = crew.fullName || 'Unnamed crew';

  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: '' },
  });

  const mutation = useMutation({
    mutationFn: (body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      verifyCrew(crew.id, body),
    onSuccess: (_data, body) => {
      onDone(
        body.status === 'APPROVED'
          ? `${displayName} approved and activated.`
          : `${displayName} KYC rejected.`
      );
      queryClient.invalidateQueries({ queryKey: ['crew', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['crew', 'details', crew.id] });
    },
  });

  const openMode = (next: 'confirmApprove' | 'reject') => {
    onDone('');
    mutation.reset();
    setMode((current) => (current === next ? 'idle' : next));
  };

  const handleReject = form.handleSubmit((values) => {
    mutation.mutate({ status: 'REJECTED', rejectionReason: values.rejectionReason.trim() });
  });

  return (
    <div className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link href={`/admin/crew/${crew.id}`} className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 hover:text-[#074139]">{displayName}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                crew.serviceType === 'DRIVER'
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {crew.serviceType}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Phone: {crew.user?.phoneNumber || '-'} · ID: {crew.id}
          </p>

          {/* Document badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {crew.documents.length === 0 ? (
              <span className="text-[11px] text-slate-400">No documents uploaded</span>
            ) : (
              crew.documents.map((doc) => (
                <span
                  key={doc.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium ${DOC_STATUS_STYLE[doc.status]}`}
                >
                  <FileText className="h-3 w-3 opacity-60" />
                  <span>{doc.docType}</span>
                  <span className="opacity-60">· {formatLabel(doc.status)}</span>
                </span>
              ))
            )}
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => openMode('confirmApprove')}
            disabled={mutation.isPending}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Verify & Activate</span>
          </button>
          <button
            onClick={() => openMode('reject')}
            disabled={mutation.isPending}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Reject</span>
          </button>
        </div>
      </div>

      {mode === 'confirmApprove' && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">Approve and activate {displayName}?</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => mutation.mutate({ status: 'APPROVED' })}
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm approve
            </button>
            <button
              onClick={() => setMode('idle')}
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <form onSubmit={handleReject} className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2">
          <label htmlFor={`crew-reason-${crew.id}`} className="text-xs font-semibold text-slate-700 block">
            Reason for rejecting {displayName} (sent to the crew app)
          </label>
          <textarea
            id={`crew-reason-${crew.id}`}
            rows={2}
            {...form.register('rejectionReason')}
            placeholder="e.g. Documents do not match the applicant's details."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/15"
          />
          {form.formState.errors.rejectionReason && (
            <p className="text-[11px] text-red-600">{form.formState.errors.rejectionReason.message}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                form.reset();
              }}
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mutation.isError && <CrewErrorState error={mutation.error} variant="inline" />}
    </div>
  );
}

export default function CrewVerificationPage() {
  const [selectedRole, setSelectedRole] = useState<ServiceType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');

  const serviceType = selectedRole === 'ALL' ? undefined : selectedRole;

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['crew', 'pending', { serviceType, page }],
    queryFn: () => getPendingCrew({ serviceType, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const crewList = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If the last crew on a page was approved/rejected, step back to the last page that exists
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  const handleFilter = (value: ServiceType | 'ALL') => {
    setSelectedRole(value);
    setPage(1);
    setSuccessMsg('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Crew KYC Verification Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review government IDs, background checks, and certifications before unlocking dispatch.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedRole === f.value
                  ? 'bg-[#074139] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Verification Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
            Pending Review Pipeline ({total})
            {isFetching && !isPending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </span>
          <span className="text-[11px] text-slate-400">Endpoint: GET /admin/crew/pending</span>
        </div>

        {isPending ? (
          <div className="p-10 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#074139]" />
            Loading crew…
          </div>
        ) : isError ? (
          <CrewErrorState error={error} onRetry={() => refetch()} />
        ) : crewList.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            {selectedRole === 'DRIVER'
              ? 'No drivers waiting for review.'
              : selectedRole === 'MECHANIC'
                ? 'No mechanics waiting for review.'
                : 'No crew waiting for review.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {crewList.map((crew) => (
              <CrewRow key={crew.id} crew={crew} onDone={setSuccessMsg} />
            ))}
          </div>
        )}

        {/* Paging */}
        {!isPending && !isError && total > PAGE_SIZE && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}