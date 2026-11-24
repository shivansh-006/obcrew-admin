'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, XCircle, FileText, Eye, Lock, Loader2 } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { CrewErrorState } from '@/components/crew/CrewErrorState';
import { DocumentViewerModal } from '@/components/crew/DocumentViewerModal';
import { formatDateTime } from '@/lib/utils';
import {
  getCrewDetails,
  reviewDocument,
  verifyCrew,
  type CrewDetails,
  type CrewDocument,
  type DocReviewStatus,
  type KycStatus,
} from '@/lib/crew-api';

const DOC_STATUS_STYLE: Record<DocReviewStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  ACTION_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
};

const KYC_STATUS_STYLE: Record<KycStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  DOCUMENTS_PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-800 border-sky-200',
  ACTION_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const rejectSchema = z.object({
  rejectionReason: z.string().trim().min(1, 'Please enter a reason for rejecting this document.'),
});

type RejectForm = z.infer<typeof rejectSchema>;

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function DocumentRow({
  crewId,
  doc,
  onView,
}: {
  crewId: string;
  doc: CrewDocument;
  onView: (doc: CrewDocument) => void;
}) {
  const queryClient = useQueryClient();
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: '' },
  });

  const mutation = useMutation({
    mutationFn: (body: { status: 'ACCEPTED' | 'REJECTED'; rejectionReason?: string }) =>
      reviewDocument(crewId, doc.id, body),
    onSuccess: (_data, body) => {
      setSuccessMsg(body.status === 'ACCEPTED' ? 'Document accepted.' : 'Document rejected.');
      setConfirmAccept(false);
      setShowReject(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['crew', 'details', crewId] });
      queryClient.invalidateQueries({ queryKey: ['crew', 'pending'] });
    },
  });

  const canReview = !doc.isLocked && doc.status !== 'ACCEPTED';

  const handleAccept = () => {
    setSuccessMsg('');
    mutation.mutate({ status: 'ACCEPTED' });
  };

  const openAcceptConfirm = () => {
    setSuccessMsg('');
    mutation.reset();
    setShowReject(false);
    setConfirmAccept((v) => !v);
  };

  const handleReject = form.handleSubmit((values) => {
    setSuccessMsg('');
    mutation.mutate({ status: 'REJECTED', rejectionReason: values.rejectionReason.trim() });
  });

  return (
    <div className="p-5 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-900">{formatLabel(doc.docType)}</span>
            <span
              className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${DOC_STATUS_STYLE[doc.status]}`}
            >
              {formatLabel(doc.status)}
            </span>
            {doc.isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Uploaded {formatDateTime(doc.createdAt)}</p>
          {doc.rejectionReason && (
            <p className="text-xs text-red-600">Reason: {doc.rejectionReason}</p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => onView(doc)}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>

          {canReview && (
            <>
              <button
                onClick={openAcceptConfirm}
                disabled={mutation.isPending}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending && mutation.variables?.status === 'ACCEPTED' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Accept</span>
              </button>
              <button
                onClick={() => {
                  setSuccessMsg('');
                  mutation.reset();
                  setConfirmAccept(false);
                  setShowReject((v) => !v);
                }}
                disabled={mutation.isPending}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}
        </div>
      </div>

      {confirmAccept && canReview && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">
            Accept this document? It will be locked and can&apos;t be changed.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm accept
            </button>
            <button
              onClick={() => setConfirmAccept(false)}
              disabled={mutation.isPending}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReject && canReview && (
        <form onSubmit={handleReject} className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2">
          <label htmlFor={`reason-${doc.id}`} className="text-xs font-semibold text-slate-700 block">
            Reason for rejection (sent to the crew app)
          </label>
          <textarea
            id={`reason-${doc.id}`}
            rows={2}
            {...form.register('rejectionReason')}
            placeholder="e.g. Image is blurry, please upload a clear photo."
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
                setShowReject(false);
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
      {successMsg && <p className="text-xs text-emerald-700">{successMsg}</p>}
    </div>
  );
}

function FinalDecisionCard({ crew }: { crew: CrewDetails }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'idle' | 'confirmApprove' | 'reject'>('idle');
  const [successMsg, setSuccessMsg] = useState('');

  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: '' },
  });

  const mutation = useMutation({
    mutationFn: (body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      verifyCrew(crew.id, body),
    onSuccess: (_data, body) => {
      setSuccessMsg(body.status === 'APPROVED' ? 'Crew approved and activated.' : 'Crew KYC rejected.');
      setMode('idle');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['crew', 'details', crew.id] });
      queryClient.invalidateQueries({ queryKey: ['crew', 'pending'] });
    },
  });

  const canDecide = crew.kycStatus === 'UNDER_REVIEW' || crew.kycStatus === 'PENDING';

  const openMode = (next: 'confirmApprove' | 'reject') => {
    setSuccessMsg('');
    mutation.reset();
    setMode((current) => (current === next ? 'idle' : next));
  };

  const handleReject = form.handleSubmit((values) => {
    mutation.mutate({ status: 'REJECTED', rejectionReason: values.rejectionReason.trim() });
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Final KYC decision</span>
        <span className="text-[11px] text-slate-400">Endpoint: PATCH /admin/crew/:id/verify</span>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {canDecide
              ? 'Accept all required documents first, then verify and activate this crew member.'
              : `Decision already made: ${formatLabel(crew.kycStatus)}.`}
          </p>
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => openMode('confirmApprove')}
              disabled={!canDecide || mutation.isPending}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Verify & Activate</span>
            </button>
            <button
              onClick={() => openMode('reject')}
              disabled={!canDecide || mutation.isPending}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Reject</span>
            </button>
          </div>
        </div>

        {mode === 'confirmApprove' && canDecide && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Approve and activate this crew member?</p>
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

        {mode === 'reject' && canDecide && (
          <form onSubmit={handleReject} className="rounded-lg border border-red-100 bg-red-50/40 p-3 space-y-2">
            <label htmlFor="crew-reject-reason" className="text-xs font-semibold text-slate-700 block">
              Reason for rejecting this crew member (sent to the crew app)
            </label>
            <textarea
              id="crew-reject-reason"
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
        {successMsg && <p className="text-xs text-emerald-700">{successMsg}</p>}
      </div>
    </div>
  );
}

export default function CrewDetailPage() {
  const params = useParams<{ id: string }>();
  const crewId = params.id;
  const [viewDoc, setViewDoc] = useState<CrewDocument | null>(null);

  const { data: crew, isPending, isError, error, refetch } = useQuery({
    queryKey: ['crew', 'details', crewId],
    queryFn: () => getCrewDetails(crewId),
    enabled: !!crewId,
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/crew"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#074139]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to crew list
      </Link>

      {isPending ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-10 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#074139]" />
          Loading crew details…
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <CrewErrorState
            error={error}
            onRetry={() => refetch()}
            notFoundText="Crew member not found."
            showBackToList
          />
        </div>
      ) : (
        <>
          {/* Profile */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
                {crew.fullName || 'Unnamed crew'}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  crew.serviceType === 'DRIVER'
                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {crew.serviceType}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${KYC_STATUS_STYLE[crew.kycStatus]}`}
              >
                {formatLabel(crew.kycStatus)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Phone</p>
                <p className="text-slate-800 mt-0.5">{crew.user?.phoneNumber || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Email</p>
                <p className="text-slate-800 mt-0.5">{crew.user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Account</p>
                <p className="text-slate-800 mt-0.5">{crew.user?.isActive ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Submitted</p>
                <p className="text-slate-800 mt-0.5">
                  {crew.submittedAt ? formatDateTime(crew.submittedAt) : '-'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">ID: {crew.id}</p>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Documents ({crew.documents.length})</span>
              <span className="text-[11px] text-slate-400">Endpoint: GET /admin/crew/:id/details</span>
            </div>

            {crew.documents.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">No documents uploaded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {crew.documents.map((doc) => (
                  <DocumentRow key={doc.id} crewId={crew.id} doc={doc} onView={setViewDoc} />
                ))}
              </div>
            )}
          </div>

          {/* Final KYC decision */}
          <FinalDecisionCard crew={crew} />

          {viewDoc && (
            <DocumentViewerModal
              key={viewDoc.id}
              crewId={crew.id}
              doc={viewDoc}
              onClose={() => setViewDoc(null)}
            />
          )}
        </>
      )}
    </div>
  );
}