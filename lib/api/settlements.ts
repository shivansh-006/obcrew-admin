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
} from '@/types/settlements';

/**
 * Developer 4: Settlements & Ledgers API Service
 * 
 * Backend Source Mapping:
 * - Actual endpoints: obpark-backend (AdminCrewPayoutController, VendorWalletController)
 * - PDF Specification: OBCREW Admin Panel.pdf (Page 5)
 */

/**
 * Fetch system wallet totals and platform commission summary.
 * 
 * [Actual Backend Endpoint]: GET /admin/billing/summary
 * Optional Query: ?cycle=YYYY-MM
 */
export async function fetchBillingSummary(cycle?: string): Promise<BillingSummary> {
  return apiClient<BillingSummary>('/admin/billing/summary', {
    method: 'GET',
    params: cycle ? { cycle } : undefined,
  });
}

/**
 * Fetch all settled booking revenue splits.
 * 
 * [Actual Backend Endpoint]: GET /crew/wallet/ledger/all
 */
export async function fetchGlobalSettlementLedger(): Promise<LedgerTransaction[]> {
  try {
    const res = await apiClient<any>('/crew/wallet/ledger/all');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  } catch (err: any) {
    if (err?.message?.includes('404')) {
      return [];
    }
    throw err;
  }
}

/**
 * Fetch crew members with pending unpaid earnings.
 * 
 * [Actual Backend Endpoint]: GET /admin/crew/payouts/pending
 * Controller: AdminCrewPayoutController
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function fetchPendingCrewPayouts(): Promise<PendingCrewPayoutsResponse> {
  return apiClient<PendingCrewPayoutsResponse>('/admin/crew/payouts/pending');
}

/**
 * Record a manually completed crew payout (bank transfer, UPI, or cash).
 * 
 * [Actual Backend Endpoint]: POST /admin/crew/:id/mark-paid
 * Controller: AdminCrewPayoutController
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function markCrewPaid(
  crewProfileId: string,
  payload: MarkCrewPaidDto = {}
): Promise<MarkCrewPaidResponse> {
  return apiClient<MarkCrewPaidResponse>(`/admin/crew/${crewProfileId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch a crew member's complete payout audit history.
 * 
 * [Actual Backend Endpoint]: GET /admin/crew/:id/payout-history
 * Controller: AdminCrewPayoutController
 * Roles: ADMIN_OBCREW, SUPER_ADMIN_OBCREW
 */
export async function fetchCrewPayoutHistory(
  crewProfileId: string
): Promise<CrewPayoutHistoryResponse> {
  return apiClient<CrewPayoutHistoryResponse>(`/admin/crew/${crewProfileId}/payout-history`);
}

/**
 * Fetch vendor agency wallet overview (pending balance, lifetime earnings).
 * 
 * [Actual Backend Endpoint]: GET /vendor/wallet/summary
 * Controller: VendorWalletController
 * Roles: VENDOR
 */
export async function fetchVendorWalletSummary(): Promise<VendorWalletSummaryResponse> {
  return apiClient<VendorWalletSummaryResponse>('/vendor/wallet/summary');
}

/**
 * Fetch all vendor agencies with pending retainers for admin payout.
 * 
 * [Actual Backend Endpoint]: GET /vendor/wallet/admin/pending
 * Controller: VendorWalletController
 * Roles: ADMIN_OBCREW, ADMIN_OBPARK, SUPER_ADMIN_OBCREW, SUPER_ADMIN_OBPARK
 */
export async function fetchPendingVendorPayouts(): Promise<PendingVendorPayoutsResponse> {
  return apiClient<PendingVendorPayoutsResponse>('/vendor/wallet/admin/pending');
}

/**
 * Admin records bank payout batch to a corporate vendor agency.
 * 
 * [Actual Backend Endpoint]: POST /vendor/wallet/admin/settle/:vendorProfileId
 * Controller: VendorWalletController
 * Roles: ADMIN_OBPARK, SUPER_ADMIN_OBPARK
 */
export async function settleVendorPayout(
  vendorProfileId: string,
  payload: MarkVendorPaidDto
): Promise<{ success: boolean; payoutRecordId: string }> {
  return apiClient<{ success: boolean; payoutRecordId: string }>(
    `/vendor/wallet/admin/settle/${vendorProfileId}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}
