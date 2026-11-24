import { apiClient } from '@/lib/api/client';
import {
  BillingSummary,
  LedgerTransaction,
  PendingCrewPayoutsResponse,
  PendingVendorPayoutsResponse,
  MarkCrewPaidDto,
  MarkCrewPaidResponse,
  CrewPayoutHistoryResponse,
  VendorWalletSummaryResponse,
  MarkVendorPaidDto,
  SettleVendorPayoutResponse,
} from '@/types/settlements';

/**
 * Settlements & Wallet API Client
 * Backend controllers:
 * - AdminCrewPayoutController (GET /admin/crew/payouts/pending, POST /admin/crew/:id/mark-paid, GET /admin/crew/:id/payout-history)
 * - VendorWalletController (GET /vendor/wallet/admin/pending, POST /vendor/wallet/admin/settle/:vendorProfileId, GET /vendor/wallet/summary)
 * - CrewWalletController / AdminBillingController (GET /crew/wallet/ledger/all, GET /admin/billing/summary)
 */

/**
 * Fetch crew members with pending unpaid earnings.
 * Backend: GET /admin/crew/payouts/pending
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function fetchPendingCrewPayouts(): Promise<PendingCrewPayoutsResponse> {
  return apiClient<PendingCrewPayoutsResponse>('/admin/crew/payouts/pending');
}

/**
 * Record a manually completed external crew payout.
 * Backend: POST /admin/crew/:id/mark-paid
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function markCrewPaid(
  crewProfileId: string,
  payload: MarkCrewPaidDto
): Promise<MarkCrewPaidResponse> {
  return apiClient<MarkCrewPaidResponse>(`/admin/crew/${crewProfileId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch a crew member's complete payout audit history.
 * Backend: GET /admin/crew/:id/payout-history
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function fetchCrewPayoutHistory(
  crewProfileId: string
): Promise<CrewPayoutHistoryResponse> {
  return apiClient<CrewPayoutHistoryResponse>(`/admin/crew/${crewProfileId}/payout-history`);
}

/**
 * Admin records bank payout batch to a corporate vendor agency.
 * Backend: POST /vendor/wallet/admin/settle/:vendorProfileId
 * Roles: ADMIN_OBPARK, SUPER_ADMIN_OBPARK
 */
export async function settleVendorPayout(
  vendorProfileId: string,
  payload: MarkVendorPaidDto
): Promise<SettleVendorPayoutResponse> {
  return apiClient<SettleVendorPayoutResponse>(
    `/vendor/wallet/admin/settle/${vendorProfileId}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Fetch vendor agency wallet overview (pending balance, lifetime earnings).
 * Backend: GET /vendor/wallet/summary
 * Roles: VENDOR only
 */
export async function fetchVendorWalletSummary(): Promise<VendorWalletSummaryResponse> {
  return apiClient<VendorWalletSummaryResponse>('/vendor/wallet/summary');
}

/**
 * Fetch platform billing summary overview.
 * Backend: GET /admin/billing/summary
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW, ADMIN_OBPARK, SUPER_ADMIN_OBPARK
 */
export async function fetchBillingSummary(cycle?: string): Promise<BillingSummary> {
  const query = cycle ? `?cycle=${encodeURIComponent(cycle)}` : '';
  return apiClient<BillingSummary>(`/admin/billing/summary${query}`);
}

/**
 * Fetch corporate vendor agencies with pending balances for disbursal.
 * Backend: GET /vendor/wallet/admin/pending
 * Roles: ADMIN_OBPARK, SUPER_ADMIN_OBPARK
 */
export async function fetchPendingVendorPayouts(): Promise<PendingVendorPayoutsResponse> {
  const raw = await apiClient<{
    total: number;
    vendors: Array<{
      vendorProfileId: string;
      companyName?: string;
      agencyName?: string;
      tradeName?: string;
      city?: string;
      state?: string;
      gstin?: string;
      email?: string | null;
      phoneNumber?: string | null;
      pendingAmount: number;
      pendingTrips?: number;
      pendingTripsCount?: number;
    }>;
  }>('/vendor/wallet/admin/pending');

  return {
    total: raw?.total ?? 0,
    vendors: (raw?.vendors ?? []).map((v) => ({
      vendorProfileId: v.vendorProfileId,
      agencyName: v.companyName || v.agencyName || v.tradeName || 'Vendor Agency',
      companyName: v.companyName,
      tradeName: v.tradeName,
      city: v.city,
      state: v.state,
      contactPerson: v.companyName || 'Agency Representative',
      gstin: v.gstin || 'Not registered',
      email: v.email ?? null,
      phoneNumber: v.phoneNumber ?? null,
      bankAccountMasked: 'Direct Settlement',
      pendingAmount: Number(v.pendingAmount ?? 0),
      pendingTripsCount: v.pendingTripsCount ?? v.pendingTrips ?? 0,
    })),
  };
}

/**
 * Fetch global settled bookings ledger across all partners.
 * Backend: GET /crew/wallet/ledger/all
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function fetchGlobalSettlementLedger(params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): Promise<LedgerTransaction[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const raw = await apiClient<{
    total: number;
    items: LedgerTransaction[];
  } | LedgerTransaction[]>(`/crew/wallet/ledger/all${query}`);

  if (Array.isArray(raw)) return raw;
  return raw?.items ?? [];
}
