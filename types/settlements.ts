/**
 * Financial Settlements & Ledgers Types
 * Aligned with obpark-backend/src/modules/crew/wallet & obpark-backend/src/modules/vendor/wallet
 */

export type CommissionSplitType = 'DIRECT_85_15' | 'TRI_PARTY_70_15_15';
export type LedgerStatus = 'SETTLED' | 'PENDING' | 'FAILED';

export interface BillingSummary {
  totalPlatformCommission: number;
  totalCrewPayoutsPending: number;
  totalVendorRetainersPending: number;
  billingCycle: string;
}

export interface BillingSummaryFilters {
  cycle?: string;
}

export interface LedgerTransaction {
  id: string;
  bookingId: string;
  bookingCode?: string | null;
  tripAmount: number;
  crewShare: number;
  vendorShare?: number;
  platformCommission: number;
  splitType: CommissionSplitType;
  status: LedgerStatus;
  createdAt: string;
}

export interface PendingCrewPayout {
  crewProfileId: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  pendingAmount: number;
  pendingJobs: number;
  bankAccountMasked: string | null;
}

export interface PendingCrewPayoutsResponse {
  total: number;
  crews: PendingCrewPayout[];
}

export interface BackendPendingVendorPayout {
  vendorProfileId: string;
  agencyName: string;
  companyName?: string;
  tradeName?: string;
  city?: string;
  state?: string;
  contactPerson?: string;
  gstin?: string;
  email?: string | null;
  phoneNumber?: string | null;
  bankAccountMasked?: string | null;
  pendingAmount: number;
  pendingTripsCount: number;
  pendingTrips?: number;
}

export interface PendingVendorPayoutsResponse {
  total: number;
  vendors: BackendPendingVendorPayout[];
}

export interface MarkCrewPaidDto {
  periodStart: string; // ISO 8601 string (Required)
  periodEnd: string;   // ISO 8601 string (Required)
  earningIds?: string[];
  referenceNote?: string;
}

export interface MarkCrewPaidResponse {
  success: boolean;
  payout: {
    id: string;
    amountPaid: number;
    jobsSettled: number;
    referenceNote?: string;
    paidAt: string;
  };
}

export interface MarkVendorPaidDto {
  earningIds?: string[];
  referenceNote?: string;
}

export interface SettleVendorPayoutResponse {
  success: boolean;
  payoutId: string;
  agencyName: string;
  amountSettled: number;
  tripsSettled: number;
  reference?: string;
}

export interface CrewPayoutRecord {
  id: string;
  amount: number | string;
  referenceNote?: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  paidByAdmin?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  earnings?: Array<{
    id: string;
    netEarnings: number | string;
    booking?: { bookingCode?: string };
  }>;
}

export interface CrewPayoutHistoryResponse {
  crewProfile: {
    id: string;
    fullName: string | null;
  };
  total: number;
  totalPaid: number;
  payouts: CrewPayoutRecord[];
}

export interface VendorWalletSummaryResponse {
  agencyName: string;
  wallet: {
    pendingBalance: number;
    pendingTripsCount: number;
    totalPaidOut: number;
    lifetimeEarnings: number;
    lifetimeTripsCount: number;
  };
}
