'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBillingSummary,
  fetchGlobalSettlementLedger,
  fetchPendingCrewPayouts,
  fetchPendingVendorPayouts,
  fetchCrewPayoutHistory,
  fetchVendorWalletSummary,
  markCrewPaid,
  settleVendorPayout,
} from '@/lib/api/settlements';
import {
  BillingSummary,
  LedgerTransaction,
  PendingCrewPayoutsResponse,
  PendingVendorPayoutsResponse,
  CrewPayoutHistoryResponse,
  VendorWalletSummaryResponse,
  MarkCrewPaidDto,
  MarkVendorPaidDto,
  MarkCrewPaidResponse,
  SettleVendorPayoutResponse,
} from '@/types/settlements';

export const settlementKeys = {
  all: ['settlements'] as const,
  billingSummary: (cycle?: string) =>
    [...settlementKeys.all, 'billing-summary', cycle] as const,
  globalLedger: () => [...settlementKeys.all, 'global-ledger'] as const,
  pendingCrewPayouts: () => [...settlementKeys.all, 'pending-crew-payouts'] as const,
  pendingVendorPayouts: () => [...settlementKeys.all, 'pending-vendor-payouts'] as const,
  crewPayoutHistory: (crewProfileId: string) =>
    [...settlementKeys.all, 'crew-history', crewProfileId] as const,
  vendorWalletSummary: () => [...settlementKeys.all, 'vendor-summary'] as const,
};

/**
 * Hook: Query System Wallet Totals & Payout Summary
 * Backend: GET /admin/billing/summary
 */
export function useBillingSummaryQuery(cycle?: string, enabled: boolean = true) {
  return useQuery<BillingSummary, Error>({
    queryKey: settlementKeys.billingSummary(cycle),
    queryFn: () => fetchBillingSummary(cycle),
    enabled,
    retry: 1,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Query Global Settled Bookings Ledger
 * Backend: GET /crew/wallet/ledger/all
 */
export function useGlobalSettlementLedgerQuery(enabled: boolean = true) {
  return useQuery<LedgerTransaction[], Error>({
    queryKey: settlementKeys.globalLedger(),
    queryFn: () => fetchGlobalSettlementLedger(),
    enabled,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Pending Crew Payouts (Active backend endpoint: GET /admin/crew/payouts/pending)
 */
export function usePendingCrewPayoutsQuery() {
  return useQuery<PendingCrewPayoutsResponse, Error>({
    queryKey: settlementKeys.pendingCrewPayouts(),
    queryFn: fetchPendingCrewPayouts,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Pending Vendor Retainers
 * Backend: GET /vendor/wallet/admin/pending
 */
export function usePendingVendorPayoutsQuery(enabled: boolean = true) {
  return useQuery<PendingVendorPayoutsResponse, Error>({
    queryKey: settlementKeys.pendingVendorPayouts(),
    queryFn: fetchPendingVendorPayouts,
    enabled,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Audit History of Payouts for a Crew Member
 * Active backend endpoint: GET /admin/crew/:id/payout-history
 */
export function useCrewPayoutHistoryQuery(crewProfileId: string) {
  return useQuery<CrewPayoutHistoryResponse, Error>({
    queryKey: settlementKeys.crewPayoutHistory(crewProfileId),
    queryFn: () => fetchCrewPayoutHistory(crewProfileId),
    enabled: Boolean(crewProfileId),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Query Vendor Agency Wallet Overview (Restricted to VENDOR role sessions)
 */
export function useVendorWalletSummaryQuery(enabled: boolean = false) {
  return useQuery<VendorWalletSummaryResponse, Error>({
    queryKey: settlementKeys.vendorWalletSummary(),
    queryFn: fetchVendorWalletSummary,
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Mutation to Record External Crew Payout
 * Active backend endpoint: POST /admin/crew/:id/mark-paid
 */
export function useMarkCrewPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkCrewPaidResponse,
    Error,
    { crewProfileId: string; payload: MarkCrewPaidDto }
  >({
    mutationFn: ({ crewProfileId, payload }) => markCrewPaid(crewProfileId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.pendingCrewPayouts() });
      queryClient.invalidateQueries({
        queryKey: settlementKeys.crewPayoutHistory(variables.crewProfileId),
      });
    },
  });
}

/**
 * Hook: Mutation to Settle Vendor Agency Payout
 * Active backend endpoint: POST /vendor/wallet/admin/settle/:vendorProfileId
 */
export function useSettleVendorPayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    SettleVendorPayoutResponse,
    Error,
    { vendorProfileId: string; payload: MarkVendorPaidDto }
  >({
    mutationFn: ({ vendorProfileId, payload }) =>
      settleVendorPayout(vendorProfileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.pendingVendorPayouts() });
    },
  });
}
