import { apiClient, ApiClientError } from '@/lib/api/client';
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
 * - VendorWalletController (POST /vendor/wallet/admin/settle/:vendorProfileId, GET /vendor/wallet/summary)
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
 * Capability Gap: GET /admin/billing/summary
 * Not registered in obpark-backend integration/final-all.
 */
export async function fetchBillingSummary(_cycle?: string): Promise<BillingSummary> {
  throw new ApiClientError(
    404,
    'Backend capability gap: GET /admin/billing/summary is not registered in authoritative backend (integration/final-all).'
  );
}

/**
 * Capability Gap: GET /vendor/wallet/admin/pending
 * Not registered in obpark-backend integration/final-all.
 */
export async function fetchPendingVendorPayouts(): Promise<PendingVendorPayoutsResponse> {
  throw new ApiClientError(
    404,
    'Backend capability gap: GET /vendor/wallet/admin/pending is not registered in authoritative backend (integration/final-all).'
  );
}

/**
 * Capability Gap: GET /crew/wallet/ledger/all
 * Not registered in obpark-backend integration/final-all.
 */
export async function fetchGlobalSettlementLedger(): Promise<LedgerTransaction[]> {
  throw new ApiClientError(
    404,
    'Backend capability gap: GET /crew/wallet/ledger/all is not registered in authoritative backend (integration/final-all).'
  );
}
