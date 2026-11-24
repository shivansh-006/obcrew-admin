'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  FileCheck2,
  Landmark,
  Phone,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import { InviteDriverModal } from '@/components/vendors/InviteDriverModal';
import { microgrammaBold } from '@/lib/fonts';
import { useAuthStore } from '@/store/auth.store';

interface AgencyDetails {
  id: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  panNumber: string;
  status: string;
  commissionTier: string;
  gstCertificateUrl: string;
  panDocumentUrl: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
}

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  contractStatus: string;
}

type AgencyStatus = 'APPROVED' | 'REJECTED' | 'SUSPENDED';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

async function requestAgencyApi(path: string, init: RequestInit = {}): Promise<unknown> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const token = useAuthStore.getState().token ||
    (typeof window !== 'undefined' ? localStorage.getItem('obcrew_token') : null);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${backendUrl}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (path === '/vendor/fleet/surveillance' && response.status === 403) {
      throw new Error('Fleet surveillance is restricted to VENDOR sessions; this admin account cannot view the roster.');
    }
    const message = asRecord(payload).message;
    throw new Error(typeof message === 'string' ? message : `Vendor request failed (${response.status}).`);
  }
  return payload;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const list = data.vendors ?? data.agencies ?? data.drivers ?? data.members ?? data.fleet ??
    response.vendors ?? response.agencies ?? response.drivers ?? response.members ?? response.data;
  return Array.isArray(list) ? list : [];
}

function normalizeAgency(rawValue: unknown): AgencyDetails {
  const raw = asRecord(rawValue);
  const bank = asRecord(raw.bankAccount ?? raw.bankDetails ?? raw.settlementBank);
  const documents = asRecord(raw.documents ?? raw.kycDocuments);
  return {
    id: readText(raw.id ?? raw._id ?? raw.vendorId),
    agencyName: readText(raw.agencyName ?? raw.name ?? raw.companyName, 'Vendor agency'),
    contactPerson: readText(raw.contactPerson ?? raw.ownerName),
    email: readText(raw.email ?? raw.contactEmail),
    phone: readText(raw.phone ?? raw.phoneNumber),
    gstin: readText(raw.gstin ?? raw.gstNumber ?? raw.gstIn),
    panNumber: readText(raw.panNumber ?? raw.pan ?? raw.companyPan),
    status: readText(raw.status ?? raw.approvalStatus, 'PENDING_APPROVAL').toUpperCase().replace(/[\s-]+/g, '_'),
    commissionTier: readText(raw.commissionTier ?? raw.commission ?? raw.commissionSplit, '70/15/15'),
    gstCertificateUrl: readText(
      raw.gstCertificateUrl ?? raw.gstCertificate ?? documents.gstCertificateUrl ?? documents.gstCertificate,
      ''
    ),
    panDocumentUrl: readText(
      raw.panDocumentUrl ?? raw.panDocument ?? documents.panDocumentUrl ?? documents.panDocument,
      ''
    ),
    bankName: readText(raw.bankName ?? bank.bankName),
    accountHolder: readText(raw.accountHolder ?? bank.accountHolder ?? bank.accountName),
    accountNumber: readText(raw.accountNumber ?? bank.accountNumber),
    ifsc: readText(raw.ifsc ?? raw.ifscCode ?? bank.ifsc ?? bank.ifscCode),
  };
}

function normalizeDriver(value: unknown, index: number): FleetDriver {
  const raw = asRecord(value);
  return {
    id: readText(raw.id ?? raw._id ?? raw.driverId, `driver-${index + 1}`),
    name: readText(raw.name ?? raw.fullName ?? raw.driverName, 'Unnamed driver'),
    phone: readText(raw.phoneNumber ?? raw.phone ?? raw.mobile),
    contractStatus: readText(raw.contractStatus ?? raw.status, 'Unknown').replace(/_/g, ' '),
  };
}

export default function VendorAgencyDetailsPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const queryClient = useQueryClient();
  const agencyQuery = useQuery({
    queryKey: ['vendor-agency-profile', vendorId],
    queryFn: async () => {
      const vendors = unwrapList(await requestAgencyApi('/admin/vendors/pending'));
      const found = vendors.find((item) => {
        const raw = asRecord(item);
        return readText(raw.id ?? raw._id ?? raw.vendorId) === vendorId;
      });
      if (!found) throw new Error('This agency was not found in the vendor directory response.');
      return normalizeAgency(found);
    },
  });
  const fleetQuery = useQuery({
    queryKey: ['agency-fleet', vendorId],
    queryFn: async () =>
      unwrapList(await requestAgencyApi('/vendor/fleet/surveillance')).map(normalizeDriver),
  });
  const agency = agencyQuery.data ?? null;
  const drivers = fleetQuery.data ?? [];
  const agencyLoading = agencyQuery.isLoading;
  const fleetLoading = fleetQuery.isLoading;
  const agencyError = agencyQuery.error instanceof Error ? agencyQuery.error.message : '';
  const fleetError = fleetQuery.error instanceof Error ? fleetQuery.error.message : '';
  const statusMutation = useMutation({
    mutationFn: (status: AgencyStatus) => requestAgencyApi(
      `/admin/vendors/${encodeURIComponent(vendorId)}/verify`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    ),
    onSuccess: async (_, status) => {
      setActionError('');
      setNotice(`Agency status updated to ${status.toLowerCase()}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-agencies'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-agency-profile', vendorId] }),
      ]);
    },
    onError: (requestError) => {
      setActionError(requestError instanceof Error ? requestError.message : 'Unable to update agency status.');
    },
  });

  const handleStatusChange = (status: AgencyStatus) => {
    if (!agency || !window.confirm(`Change ${agency.agencyName} status to ${status.toLowerCase()}?`)) return;
    setNotice('');
    setActionError('');
    statusMutation.mutate(status);
  };

  const activeDriverCount = useMemo(
    () => drivers.filter((driver) => driver.contractStatus.toUpperCase() === 'ACTIVE').length,
    [drivers]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/vendors" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#074139]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Vendor agencies
          </Link>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            {agencyLoading ? 'Agency profile' : agency?.agencyName || 'Agency profile'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Agency KYC, settlement details, and linked driver roster.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { agencyQuery.refetch(); fleetQuery.refetch(); }}
            disabled={agencyLoading || fleetLoading}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${agencyLoading || fleetLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            disabled={!agency}
            className="px-3.5 py-2 rounded-lg bg-[#074139] hover:bg-[#0a5e52] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite driver
          </button>
        </div>
      </div>

      {agencyError && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2 text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs font-medium">{agencyError}</p>
          </div>
          <button type="button" onClick={() => agencyQuery.refetch()} className="text-xs font-bold text-red-700 hover:underline">Retry</button>
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
          {notice}
        </div>
      )}
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {actionError}
        </div>
      )}

      {agency ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>Agency information</h2>
                  <p className="text-xs text-slate-500 mt-1">{agency.contactPerson} · {agency.phone}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{agency.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  agency.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : agency.status === 'REJECTED' || agency.status === 'SUSPENDED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {agency.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">GSTIN</span>
                  <span className="font-mono text-xs text-slate-700">{agency.gstin}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Company PAN</span>
                  <span className="font-mono text-xs text-slate-700">{agency.panNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Commission tier</span>
                  <span className="text-xs font-bold text-slate-800">{agency.commissionTier}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {agency.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('APPROVED')}
                    disabled={statusMutation.isPending}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {agency.status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={statusMutation.isPending}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {agency.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('SUSPENDED')}
                    disabled={statusMutation.isPending}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </section>

            <section className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h2 className={`${microgrammaBold.className} text-sm font-bold text-slate-900 flex items-center gap-2`}>
                <Landmark className="h-4 w-4 text-slate-400" />
                Settlement bank account
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div><dt className="text-[10px] uppercase font-semibold text-slate-400">Bank</dt><dd className="mt-1 text-slate-700">{agency.bankName}</dd></div>
                <div><dt className="text-[10px] uppercase font-semibold text-slate-400">Account holder</dt><dd className="mt-1 text-slate-700">{agency.accountHolder}</dd></div>
                <div><dt className="text-[10px] uppercase font-semibold text-slate-400">Account number</dt><dd className="mt-1 font-mono text-slate-700">{agency.accountNumber}</dd></div>
                <div><dt className="text-[10px] uppercase font-semibold text-slate-400">IFSC</dt><dd className="mt-1 font-mono text-slate-700">{agency.ifsc}</dd></div>
              </dl>
            </section>

            <section className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3 lg:col-span-2">
              <h2 className={`${microgrammaBold.className} text-sm font-bold text-slate-900`}>Company verification documents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'GST certificate', url: agency.gstCertificateUrl },
                  { title: 'PAN document', url: agency.panDocumentUrl },
                ].map((document) => (
                  <div key={document.title} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <FileCheck2 className="h-4 w-4 text-slate-400" />
                      {document.title}
                    </div>
                    {document.url ? (
                      <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#074139] hover:underline">
                        View document
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Not included in API response</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-bold text-slate-800">Agency fleet roster</h2>
                {!fleetLoading && !fleetError && (
                  <span className="text-[11px] text-slate-400">{activeDriverCount} active · {drivers.length} total</span>
                )}
              </div>
              {agency.phone !== '—' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Phone className="h-3 w-3" />
                  Agency contact: {agency.phone}
                </span>
              )}
            </div>
            {fleetError ? (
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="text-xs text-red-700">{fleetError}</p>
                <button type="button" onClick={() => fleetQuery.refetch()} className="text-xs font-bold text-[#074139] hover:underline">Retry</button>
              </div>
            ) : fleetLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((row) => <div key={row} className="h-10 rounded-lg bg-slate-50 animate-pulse" />)}
              </div>
            ) : drivers.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-slate-400">No drivers are linked to this agency yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Driver</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Contract status</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">{driver.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{driver.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            driver.contractStatus.toUpperCase() === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {driver.contractStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {driver.contractStatus.toUpperCase() === 'TERMINATED' && (
                            <button
                              type="button"
                              disabled
                              title="The backend delink endpoint has not been specified."
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-400"
                            >
                              Delink
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : agencyLoading ? (
        <div className="h-64 rounded-xl border border-slate-100 bg-white animate-pulse" />
      ) : null}

      {isInviteOpen && agency && (
        <InviteDriverModal
          vendorId={agency.id === '—' ? vendorId : agency.id}
          agencyName={agency.agencyName}
          onClose={() => setIsInviteOpen(false)}
          onInvited={() => {
            setNotice('Driver invitation sent.');
            queryClient.invalidateQueries({ queryKey: ['agency-fleet', vendorId] });
          }}
        />
      )}
    </div>
  );
}
