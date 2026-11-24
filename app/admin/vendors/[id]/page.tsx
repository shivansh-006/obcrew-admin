'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { InviteDriverModal } from '@/components/vendors/InviteDriverModal';
import { microgrammaBold } from '@/lib/fonts';
import { useAuthStore } from '@/store/auth.store';
import { apiClient, ApiClientError } from '@/lib/api/client';

interface VendorDocument {
  id: string;
  docType: string;
  status: string;
  rejectionReason?: string | null;
  updatedAt?: string;
}

interface FleetMember {
  id: string;
  inviteStatus: string;
  isActive: boolean;
  invitedAt?: string;
  respondedAt?: string;
  crewProfile?: {
    id: string;
    fullName: string;
    serviceType: string;
    kycStatus: string;
    avgRating?: number;
  };
}

interface AgencyDetails {
  id: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  panNumber: string;
  status: string;
  commissionRate: number;
  rejectionReason?: string | null;
  bankName: string;
  accountHolder: string;
  accountNumberMasked: string;
  ifsc: string;
  payoutUpiId?: string | null;
  verifiedAt?: string | null;
  reviewedBy?: { id: string; email: string } | null;
  documents: VendorDocument[];
  members: FleetMember[];
}

type AgencyStatus = 'APPROVED' | 'REJECTED' | 'SUSPENDED';

function readText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function maskAccountNumber(acc: string | null | undefined): string {
  if (!acc) return 'Not provided';
  const clean = acc.trim();
  if (clean.length <= 4) return '••••';
  return `•••• •••• ${clean.slice(-4)}`;
}

function normalizeAgency(raw: Record<string, unknown>): AgencyDetails {
  const user = (raw.user || {}) as Record<string, unknown>;
  const docs = Array.isArray(raw.documents) ? (raw.documents as VendorDocument[]) : [];
  const members = Array.isArray(raw.members) ? (raw.members as FleetMember[]) : [];
  const reviewer = (raw.reviewedBy || null) as { id: string; email: string } | null;

  const rawRate = Number(raw.commissionRate ?? 0.15);

  return {
    id: readText(raw.id),
    agencyName: readText(raw.companyName ?? raw.agencyName, 'Vendor agency'),
    contactPerson: readText(raw.contactPerson),
    email: readText(raw.email ?? user.email),
    phone: readText(raw.phone ?? user.phoneNumber),
    gstin: readText(raw.gstin),
    panNumber: readText(raw.panNumber),
    status: readText(raw.status, 'PENDING_VERIFICATION').toUpperCase().replace(/[\s-]+/g, '_'),
    commissionRate: rawRate,
    rejectionReason: (raw.rejectionReason as string) || null,
    bankName: readText(raw.payoutBankName ?? raw.bankName, 'Bank of Record'),
    accountHolder: readText(raw.payoutAccountHolder ?? raw.contactPerson ?? raw.companyName),
    accountNumberMasked: maskAccountNumber(
      (raw.payoutBankAcc ?? raw.accountNumber ?? raw.bankAccountNumber) as string | null
    ),
    ifsc: readText(raw.payoutIfsc ?? raw.ifsc),
    payoutUpiId: (raw.payoutUpiId as string) || null,
    verifiedAt: (raw.verifiedAt as string) || null,
    reviewedBy: reviewer,
    documents: docs,
    members,
  };
}

export default function VendorAgencyDetailsPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;
  const user = useAuthStore((state) => state.user);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryClient = useQueryClient();

  // Authoritative Backend: GET /admin/vendors/:id/details
  const agencyQuery = useQuery({
    queryKey: ['vendor-agency-profile', vendorId],
    queryFn: async () => {
      const response = await apiClient<Record<string, unknown>>(
        `/admin/vendors/${encodeURIComponent(vendorId)}/details`
      );
      if (!response || !response.id) {
        throw new Error('Agency details were not found on the backend.');
      }
      return normalizeAgency(response);
    },
    retry: 1,
  });

  const agency = agencyQuery.data ?? null;
  const agencyLoading = agencyQuery.isLoading;
  const agencyError = agencyQuery.error instanceof Error ? agencyQuery.error.message : '';

  // Authoritative Backend: PATCH /admin/vendors/:id/verify
  // Roles: ADMIN_OBPARK, SUPER_ADMIN_OBPARK
  const isAuthorizedForVerification =
    user?.role === 'ADMIN_OBPARK' ||
    user?.role === 'SUPER_ADMIN_OBPARK' ||
    user?.role === 'SUPERADMIN'; // Legacy alias

  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      reason,
    }: {
      status: AgencyStatus;
      reason?: string;
    }) => {
      const payload: { status: AgencyStatus; rejectionReason?: string } = { status };
      if (status === 'REJECTED') {
        payload.rejectionReason = reason?.trim();
      }
      return apiClient(`/admin/vendors/${encodeURIComponent(vendorId)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (_, variables) => {
      setActionError('');
      setNotice(`Agency status updated to ${variables.status.toLowerCase()}.`);
      setIsRejectModalOpen(false);
      setRejectionReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-agencies'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-agency-profile', vendorId] }),
      ]);
    },
    onError: (requestError) => {
      setActionError(
        requestError instanceof Error ? requestError.message : 'Unable to update agency status.'
      );
    },
  });

  const docMutation = useMutation({
    mutationFn: async ({
      docId,
      status,
      rejectionReason,
    }: {
      docId: string;
      status: 'ACCEPTED' | 'REJECTED' | 'ACTION_REQUIRED';
      rejectionReason?: string;
    }) => {
      return apiClient(
        `/admin/vendors/${encodeURIComponent(vendorId)}/documents/${encodeURIComponent(docId)}/verify`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, rejectionReason }),
        }
      );
    },
    onSuccess: async (_, variables) => {
      setActionError('');
      setNotice(`Document status updated to ${variables.status.toLowerCase()}.`);
      await queryClient.invalidateQueries({
        queryKey: ['vendor-agency-profile', vendorId],
      });
    },
    onError: (requestError) => {
      setActionError(
        requestError instanceof Error ? requestError.message : 'Unable to verify document.'
      );
    },
  });

  const handleStatusChange = (status: AgencyStatus) => {
    if (!agency) return;
    if (status === 'REJECTED') {
      setIsRejectModalOpen(true);
      return;
    }

    if (!window.confirm(`Change ${agency.agencyName} status to ${status.toLowerCase()}?`)) {
      return;
    }
    setNotice('');
    setActionError('');
    statusMutation.mutate({ status });
  };

  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('A specific rejection reason is required for administrative audit.');
      return;
    }
    setNotice('');
    setActionError('');
    statusMutation.mutate({ status: 'REJECTED', reason: rejectionReason.trim() });
  };

  const fleetMembers = agency?.members ?? [];
  const activeMembers = fleetMembers.filter((m) => m.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/vendors"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#074139] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Vendor agencies directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
              {agencyLoading ? 'Loading profile…' : agency?.agencyName || 'Agency profile'}
            </h1>
            {agency && (
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  agency.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : agency.status === 'REJECTED' || agency.status === 'SUSPENDED'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {agency.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative verification record (GET /admin/vendors/:id/details).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => agencyQuery.refetch()}
            disabled={agencyLoading}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${agencyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            disabled={!agency}
            className="px-3.5 py-2 rounded-lg bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Driver
          </button>
        </div>
      </div>

      {/* Role Permission Alert */}
      {!isAuthorizedForVerification && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Restricted Verification Actions</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Agency verification (PATCH /admin/vendors/:id/verify) requires ADMIN_OBPARK or SUPER_ADMIN_OBPARK permissions. Your account is currently in read-only inspection mode.
            </p>
          </div>
        </div>
      )}

      {/* Notices & Errors */}
      {agencyError && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Failed to load agency profile</p>
              <p className="mt-0.5">{agencyError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => agencyQuery.refetch()}
            className="text-xs font-bold hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>{notice}</p>
        </div>
      )}

      {/* Agency Overview & Verification Actions */}
      {agency && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Details Card */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Corporate Agency Registration
                </h3>
                <span className="text-xs text-slate-400 font-mono">ID: {agency.id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact Person</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{agency.contactPerson}</p>
                  <p className="text-slate-500 mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {agency.phone}
                  </p>
                  <p className="text-slate-500 mt-0.5">{agency.email}</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tax Registration</span>
                  <div className="mt-1 space-y-1">
                    <p className="font-mono text-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase mr-2">GSTIN:</span>
                      {agency.gstin}
                    </p>
                    <p className="font-mono text-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase mr-2">PAN:</span>
                      {agency.panNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Masked Settlement Bank Info */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Landmark className="h-4 w-4 text-[#074139]" />
                  <span>Settlement Bank Details (Masked)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Bank</span>
                    <span className="font-semibold text-slate-800">{agency.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Account</span>
                    <span className="font-mono text-slate-800">{agency.accountNumberMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">IFSC</span>
                    <span className="font-mono text-slate-800">{agency.ifsc}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">UPI ID</span>
                    <span className="font-mono text-slate-800">{agency.payoutUpiId || '—'}</span>
                  </div>
                </div>
              </div>

              {agency.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  <p className="font-bold">Prior Rejection Finding:</p>
                  <p className="mt-0.5 italic">"{agency.rejectionReason}"</p>
                </div>
              )}
            </div>

            {/* Verification Adjudication Box */}
            <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Adjudication Desk
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Authorize or suspend agency operational status under platform review policies.
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="font-bold text-slate-800">{agency.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commission Cut:</span>
                    <span className="font-bold text-emerald-700">
                      {agency.commissionRate * 100}%
                    </span>
                  </div>
                  {agency.reviewedBy && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reviewed By:</span>
                      <span className="font-mono text-slate-600">{agency.reviewedBy.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Actions</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isAuthorizedForVerification || statusMutation.isPending || agency.status === 'APPROVED'}
                    onClick={() => handleStatusChange('APPROVED')}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!isAuthorizedForVerification || statusMutation.isPending || agency.status === 'REJECTED'}
                    onClick={() => handleStatusChange('REJECTED')}
                    className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!isAuthorizedForVerification || statusMutation.isPending || agency.status === 'SUSPENDED'}
                  onClick={() => handleStatusChange('SUSPENDED')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  Suspend Agency
                </button>
              </div>
            </div>
          </div>

          {/* KYC Documents Section */}
          <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[#074139]" />
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Uploaded KYC Documents ({agency.documents.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Authoritative verification endpoint: PATCH /admin/vendors/:id/documents/:docId/verify
              </span>
            </div>

            {agency.documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No KYC documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agency.documents.map((doc) => {
                  const isAccepted = doc.status === 'ACCEPTED' || doc.status === 'VERIFIED';
                  const isRejected = doc.status === 'REJECTED';
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                            {doc.docType.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isRejected
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                        {doc.rejectionReason && (
                          <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100 italic">
                            Reason: {doc.rejectionReason}
                          </p>
                        )}
                        {doc.updatedAt && (
                          <span className="text-[10px] text-slate-400 block">
                            Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {isAuthorizedForVerification && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            disabled={docMutation.isPending || isAccepted}
                            onClick={() =>
                              docMutation.mutate({ docId: doc.id, status: 'ACCEPTED' })
                            }
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-40"
                          >
                            Accept Doc
                          </button>
                          <button
                            type="button"
                            disabled={docMutation.isPending || isRejected}
                            onClick={() => {
                              const reason = window.prompt(
                                `Rejection reason for ${doc.docType.replace(/_/g, ' ')}:`
                              );
                              if (reason && reason.trim()) {
                                docMutation.mutate({
                                  docId: doc.id,
                                  status: 'REJECTED',
                                  rejectionReason: reason.trim(),
                                });
                              }
                            }}
                            className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-40"
                          >
                            Reject Doc
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Fleet Workforce Table (via GET /admin/vendors/:id/details) */}
          <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#074139]" />
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Fleet Workforce Roster ({fleetMembers.length} Partners / {activeMembers.length} Active)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Authoritative backend member roster
              </span>
            </div>

            {fleetMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No drivers or mechanics are currently linked to this agency fleet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Partner Name</th>
                      <th className="py-2.5 px-3">Service Role</th>
                      <th className="py-2.5 px-3">KYC Status</th>
                      <th className="py-2.5 px-3">Invite / Membership State</th>
                      <th className="py-2.5 px-3">Active State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {fleetMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {member.crewProfile?.fullName || 'Partner Profile'}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px]">
                          {member.crewProfile?.serviceType || 'DRIVER'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              member.crewProfile?.kycStatus === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}
                          >
                            {member.crewProfile?.kycStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {member.inviteStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Joined Member
                            </span>
                          ) : member.inviteStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Consent Pending
                            </span>
                          ) : member.inviteStatus === 'DECLINED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="h-3 w-3 text-slate-400" />
                              Declined by Driver
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                              {member.inviteStatus}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              member.isActive ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                member.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Invite Driver Modal */}
      {isInviteOpen && agency && (
        <InviteDriverModal
          vendorId={agency.id}
          agencyName={agency.agencyName}
          onClose={() => setIsInviteOpen(false)}
          onInvited={() => {
            setIsInviteOpen(false);
            setNotice('Driver invitation sent.');
            agencyQuery.refetch();
          }}
        />
      )}

      {/* Rejection Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>
                  Reject Agency Application
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please provide a clear reason for rejecting {agency?.agencyName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason (Required) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. GST certificate name does not match company registration documents."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                />
                <span className="text-[10px] text-slate-400 block text-right">
                  {rejectionReason.length} / 500
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusMutation.isPending || !rejectionReason.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
