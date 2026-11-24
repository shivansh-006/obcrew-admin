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
} from '@/types/settlements';

/**
 * Query Key Factory for Settlements & Ledgers
 */
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
 * Live endpoint: GET /admin/billing/summary?cycle=YYYY-MM
 */
export function useBillingSummaryQuery(cycle?: string) {
  return useQuery<BillingSummary, Error>({
    queryKey: settlementKeys.billingSummary(cycle),
    queryFn: () => fetchBillingSummary(cycle),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Query Global Settled Bookings Ledger
 */
export function useGlobalSettlementLedgerQuery() {
  return useQuery<LedgerTransaction[], Error>({
    queryKey: settlementKeys.globalLedger(),
    queryFn: fetchGlobalSettlementLedger,
    retry: false,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Pending Crew Payouts (Real backend endpoint)
 */
export function usePendingCrewPayoutsQuery() {
  return useQuery<PendingCrewPayoutsResponse, Error>({
    queryKey: settlementKeys.pendingCrewPayouts(),
    queryFn: fetchPendingCrewPayouts,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Pending Vendor Retainers (Real backend endpoint)
 */
export function usePendingVendorPayoutsQuery() {
  return useQuery<PendingVendorPayoutsResponse, Error>({
    queryKey: settlementKeys.pendingVendorPayouts(),
    queryFn: fetchPendingVendorPayouts,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Query Audit History of Payouts for a Crew Member
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
 * Hook: Query Vendor Agency Wallet Overview
 * Accepts optional enabled parameter to prevent unauthorized queries for non-VENDOR roles.
 */
export function useVendorWalletSummaryQuery(enabled: boolean = true) {
  return useQuery<VendorWalletSummaryResponse, Error>({
    queryKey: settlementKeys.vendorWalletSummary(),
    queryFn: fetchVendorWalletSummary,
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Mutation to Record External Crew Payout
 * Automatically invalidates pending crew payouts and wallet queries on success.
 */
export function useMarkCrewPaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      crewProfileId,
      payload,
    }: {
      crewProfileId: string;
      payload?: MarkCrewPaidDto;
    }) => markCrewPaid(crewProfileId, payload),
    onSuccess: (_, variables) => {
      // Invalidate pending payouts list and crew audit history
      queryClient.invalidateQueries({ queryKey: settlementKeys.pendingCrewPayouts() });
      queryClient.invalidateQueries({
        queryKey: settlementKeys.crewPayoutHistory(variables.crewProfileId),
      });
      queryClient.invalidateQueries({ queryKey: settlementKeys.billingSummary() });
    },
  });
}

/**
 * Hook: Mutation to Settle Vendor Agency Payout
 */
export function useSettleVendorPayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorProfileId,
      payload,
    }: {
      vendorProfileId: string;
      payload: MarkVendorPaidDto;
    }) => settleVendorPayout(vendorProfileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.vendorWalletSummary() });
      queryClient.invalidateQueries({ queryKey: settlementKeys.billingSummary() });
    },
  });
}
