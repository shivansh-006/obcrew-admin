'use client';

import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Users,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { useAuthStore } from '@/store/auth.store';

type VendorStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | 'SUSPENDED';

interface VendorAgency {
  id: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  driversCount: number;
  commissionTier: string;
  status: VendorStatus;
  gstStatus: string;
}

const STATUS_LABELS: Record<VendorStatus, string> = {
  APPROVED: 'Approved',
  PENDING_APPROVAL: 'Pending approval',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

function readText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function requestVendorApi(path: string, init: RequestInit = {}): Promise<unknown> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const token = useAuthStore.getState().token ||
    (typeof window !== 'undefined' ? localStorage.getItem('obcrew_token') : null);
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${backendUrl}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = asRecord(payload).message;
    throw new Error(typeof message === 'string' ? message : `Vendor request failed (${response.status}).`);
  }
  return payload;
}

function getVendorAgencies(): Promise<unknown> {
  return requestVendorApi('/admin/vendors/pending');
}

function normalizeStatus(value: unknown): VendorStatus {
  const status = String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (status === 'VERIFIED' || status === 'APPROVED' || status === 'ACTIVE') return 'APPROVED';
  if (status === 'REJECTED' || status === 'DECLINED') return 'REJECTED';
  if (status === 'SUSPENDED') return 'SUSPENDED';
  return 'PENDING_APPROVAL';
}

function normalizeVendor(raw: Record<string, unknown>, index: number): VendorAgency {
  const nestedUser = (raw.owner || raw.contact || raw.admin || {}) as Record<string, unknown>;
  const nestedAgency = (raw.agency || raw.vendor || {}) as Record<string, unknown>;
  const statusSource = raw.status ?? raw.approvalStatus ?? raw.kycStatus;
  const fleetCount =
    raw.driversCount ?? raw.driverCount ?? raw.fleetCount ?? raw.mechanicsCount ??
    nestedAgency.driversCount ?? nestedAgency.driverCount ?? nestedAgency.fleetCount;

  return {
    id: readText(raw.id ?? raw._id ?? raw.vendorId, `vendor-${index + 1}`),
    agencyName: readText(
      raw.agencyName ?? raw.name ?? raw.companyName ?? nestedAgency.agencyName ?? nestedAgency.name,
      'Unnamed agency'
    ),
    contactPerson: readText(
      raw.contactPerson ?? raw.ownerName ?? nestedUser.name ?? nestedUser.fullName,
    ),
    email: readText(
      raw.email ?? raw.contactEmail ?? nestedUser.email,
    ),
    phone: readText(
      raw.phone ?? raw.phoneNumber ?? raw.mobile ?? nestedUser.phone ?? nestedUser.phoneNumber,
    ),
    gstin: readText(raw.gstin ?? raw.gstNumber ?? raw.gstIn ?? nestedAgency.gstin),
    driversCount: typeof fleetCount === 'number' ? fleetCount : Number(fleetCount) || 0,
    commissionTier: readText(
      raw.commissionTier ?? raw.commission ?? raw.commissionSplit,
      '70/15/15 Tri-Party'
    ),
    status: normalizeStatus(statusSource),
    gstStatus: readText(
      raw.gstStatus ?? raw.gstVerificationStatus ?? raw.gstinStatus,
      'Pending'
    ).replace(/_/g, ' '),
  };
}

export default function VendorsPage() {
  const shouldReduceMotion = useReducedMotion();
  const vendorsQuery = useQuery({
    queryKey: ['vendor-agencies'],
    queryFn: async () => {
      const payload = await getVendorAgencies();
      const response = asRecord(payload);
      const data = asRecord(response.data);
      const list = Array.isArray(payload)
        ? payload
        : data.vendors ?? data.agencies ?? response.vendors ?? response.agencies ?? response.data ?? [];
      if (!Array.isArray(list)) throw new Error('The vendor API returned an unexpected response format.');
      return list.map((item, index) =>
        normalizeVendor((item && typeof item === 'object' ? item : {}) as Record<string, unknown>, index)
      );
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const vendors = vendorsQuery.data ?? [];
  const isLoading = vendorsQuery.isLoading;
  const error = vendorsQuery.error instanceof Error ? vendorsQuery.error.message : '';

  const kpis = [
    {
      label: 'Total Agencies',
      value: vendors.length,
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Approved',
      value: vendors.filter((vendor) => vendor.status === 'APPROVED').length,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Approval',
      value: vendors.filter((vendor) => vendor.status === 'PENDING_APPROVAL').length,
      icon: Clock3,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Fleet Workforce',
      value: vendors.reduce((total, vendor) => total + vendor.driversCount, 0),
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Vendor Agency Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered fleet agencies, approval status, and partner details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <span className={`${microgrammaBold.className} block mt-3 text-2xl font-bold text-slate-900`}>
                {isLoading ? '—' : kpi.value}
              </span>
            </div>
          );
        })}
      </div>

      {vendorsQuery.isError && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
            <p className="text-xs font-medium text-red-700">
              {error || 'Unable to load vendor agencies.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-56 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : vendorsQuery.isError ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-bold text-slate-800">Vendor agencies could not be loaded</p>
            <p className="mt-1 text-xs text-slate-400">{error}</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">
              No vendor agencies found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Agencies will appear here when the backend returns them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {vendors.map((vendor, index) => (
              <motion.article
                key={vendor.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{
                  duration: 0.2,
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.2),
                }}
                className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={`${microgrammaBold.className} text-sm font-bold text-slate-900 truncate`}>
                      {vendor.agencyName}
                    </h2>
                    {vendor.contactPerson !== '—' && (
                      <p className="text-xs text-slate-500 mt-1">Contact: {vendor.contactPerson}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      vendor.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : vendor.status === 'REJECTED' || vendor.status === 'SUSPENDED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {STATUS_LABELS[vendor.status]}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {vendor.email !== '—' && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone !== '—' && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">GSTIN</span>
                    <span className="font-mono text-xs text-slate-700">{vendor.gstin}</span>
                    <span className={`mt-1 block text-[10px] font-bold ${
                      vendor.gstStatus.toUpperCase() === 'VERIFIED'
                        ? 'text-emerald-600'
                        : vendor.gstStatus.toUpperCase() === 'REJECTED'
                          ? 'text-red-600'
                          : 'text-amber-600'
                    }`}>
                      GST: {vendor.gstStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fleet Workforce</span>
                    <span className="font-bold text-xs text-slate-800">{vendor.driversCount} Drivers / Mechanics</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">Commission: {vendor.commissionTier}</span>
                  <Link
                    href={`/admin/vendors/${encodeURIComponent(vendor.id)}`}
                    className="text-[11px] font-bold text-[#074139] hover:underline"
                  >
                    View agency →
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
