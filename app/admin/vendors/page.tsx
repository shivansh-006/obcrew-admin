'use client';

import { useState, useMemo } from 'react';
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
  Search,
  RefreshCw,
  Users,
} from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';
import { apiClient } from '@/lib/api/client';

export type VendorStatus =
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface VendorAgency {
  id: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  panNumber: string;
  driversCount: number;
  commissionTier: string;
  status: VendorStatus;
  rejectionReason?: string | null;
  documentsCount: number;
  createdAt: string;
}

const STATUS_LABELS: Record<VendorStatus, string> = {
  PENDING_VERIFICATION: 'Pending verification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

function readText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function normalizeStatus(value: unknown): VendorStatus {
  const status = String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (status === 'APPROVED' || status === 'VERIFIED' || status === 'ACTIVE') return 'APPROVED';
  if (status === 'REJECTED' || status === 'DECLINED') return 'REJECTED';
  if (status === 'SUSPENDED') return 'SUSPENDED';
  return 'PENDING_VERIFICATION';
}

function normalizeVendor(raw: Record<string, unknown>, index: number): VendorAgency {
  const user = (raw.user || {}) as Record<string, unknown>;
  const docs = Array.isArray(raw.documents) ? raw.documents : [];
  const members = Array.isArray(raw.members) ? raw.members : [];

  const countObj =
    raw._count && typeof raw._count === 'object'
      ? (raw._count as Record<string, unknown>).members
      : undefined;

  const rawCount =
    raw.driversCount ??
    raw.driverCount ??
    raw.fleetCount ??
    countObj;

  const count = typeof rawCount === 'number' ? rawCount : members.length;

  return {
    id: readText(raw.id ?? raw.vendorId, `vendor-${index + 1}`),
    agencyName: readText(raw.companyName ?? raw.agencyName ?? raw.name, 'Unnamed Agency'),
    contactPerson: readText(raw.contactPerson ?? raw.ownerName),
    email: readText(raw.email ?? user.email),
    phone: readText(raw.phone ?? user.phoneNumber),
    gstin: readText(raw.gstin),
    panNumber: readText(raw.panNumber),
    driversCount: count,
    commissionTier: raw.commissionRate
      ? `${Number(raw.commissionRate) * 100}% Agency Cut`
      : '15% Agency Split (70/15/15)',
    status: normalizeStatus(raw.status),
    rejectionReason: (raw.rejectionReason as string) || null,
    documentsCount: docs.length,
    createdAt: readText(raw.createdAt, new Date().toISOString()),
  };
}

export default function VendorsPage() {
  const shouldReduceMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    data: rawVendors,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['vendor-agencies'],
    queryFn: async () => {
      const response = await apiClient<unknown[]>('/admin/vendors/pending');
      return Array.isArray(response) ? response : [];
    },
    staleTime: 30 * 1000,
  });

  const vendors: VendorAgency[] = useMemo(() => {
    if (!Array.isArray(rawVendors)) return [];
    return rawVendors.map((item, index) =>
      normalizeVendor(item && typeof item === 'object' ? (item as Record<string, unknown>) : {}, index)
    );
  }, [rawVendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.gstin.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  const pendingCount = vendors.filter((v) => v.status === 'PENDING_VERIFICATION').length;
  const approvedCount = vendors.filter((v) => v.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Vendor Fleet Agencies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review corporate fleet agency KYC registrations, verify documents, and inspect fleet rosters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Agencies</span>
            <p className={`${microgrammaBold.className} text-2xl font-bold text-slate-900 mt-0.5`}>
              {vendors.length}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-amber-600">Pending Review</span>
            <p className={`${microgrammaBold.className} text-2xl font-bold text-amber-700 mt-0.5`}>
              {pendingCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-emerald-600">Active Approved</span>
            <p className={`${microgrammaBold.className} text-2xl font-bold text-emerald-700 mt-0.5`}>
              {approvedCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search agency, contact, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-500 whitespace-nowrap">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#074139]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-8 w-8 border-2 border-[#074139] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-slate-500 font-medium">Loading vendor agencies from backend…</p>
          </div>
        ) : isError ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-6">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">Unable to load vendor agencies</p>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              {error instanceof Error ? error.message : 'Please check your network and admin permissions.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#074139] text-white text-xs font-bold hover:bg-[#0a5e52] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-6">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">No vendor agencies found</p>
            <p className="mt-1 text-xs text-slate-400">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No agencies match your current search and filter criteria.'
                : 'Pending vendor registrations will appear here when submitted.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {filteredVendors.map((vendor, index) => (
              <motion.article
                key={vendor.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{
                  duration: 0.2,
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.2),
                }}
                className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-4 hover:border-slate-300 transition-all"
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
                    {STATUS_LABELS[vendor.status] || vendor.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {vendor.email !== '—' && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone !== '—' && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">GSTIN / Tax ID</span>
                    <span className="font-mono text-xs text-slate-800 font-medium">{vendor.gstin}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">PAN: {vendor.panNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fleet Workforce</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-bold text-xs text-slate-800">
                        {vendor.driversCount} Drivers / Mechanics
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {vendor.documentsCount} KYC doc(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {vendor.commissionTier}
                  </span>
                  <Link
                    href={`/admin/vendors/${encodeURIComponent(vendor.id)}`}
                    className="text-xs font-bold text-[#074139] hover:underline inline-flex items-center gap-1"
                  >
                    View agency profile →
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
