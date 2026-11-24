/**
 * Developer 4: Financial Settlements & Ledgers Types
 * 
 * References:
 * - Specification: OBCREW Admin Panel.pdf (Page 5 & 6)
 * - Backend: obpark-backend/src/modules/crew/wallet & obpark-backend/src/modules/vendor/wallet
 */

/**
 * Commission split models in OBCrew operations:
 * - DIRECT_85_15: 85% Driver/Mechanic, 15% Platform Fee (Direct Freelance)
 * - TRI_PARTY_70_15_15: 70% Driver, 15% Vendor Fleet Agency, 15% Platform Fee (Agency-Affiliated)
 */
export type CommissionSplitType =
  | 'DIRECT_85_15'
  | 'TRI_PARTY_70_15_15';

/**
 * Status of a revenue split ledger transaction
 */
export type LedgerStatus = 'SETTLED' | 'PENDING' | 'FAILED';

/**
 * System Wallet Totals & Payout Summary
 * PDF Spec: GET /admin/billing/summary
 * 
 * Response shape:
 * {
 *   "totalPlatformCommission": 84250,
 *   "totalCrewPayoutsPending": 392400,
 *   "totalVendorRetainersPending": 62100,
 *   "billingCycle": "2026-11"
 * }
 */
export interface BillingSummary {
  totalPlatformCommission: number;
  totalCrewPayoutsPending: number;
  totalVendorRetainersPending: number;
  billingCycle: string; // e.g. "2026-11"
}

/**
 * Filter parameters for GET /admin/billing/summary
 */
export interface BillingSummaryFilters {
  cycle?: string; // Format: "YYYY-MM"
}

/**
 * Settled Booking Ledger Transaction
 * PDF Spec: GET /crew/wallet/ledger/all
 * 
 * Response shape:
 * {
 *   "id": "TXN-8801",
 *   "bookingId": "BK-1092",
 *   "tripAmount": 1200,
 *   "crewShare": 840,
 *   "vendorShare": 180,
 *   "platformCommission": 180,
 *   "splitType": "TRI_PARTY_70_15_15",
 *   "status": "SETTLED",
 *   "createdAt": "2026-11-19T10:14:00.000Z"
 * }
 */
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
  payoutStatus?: string;
  paymentStatus?: string | null;
  crewProfileId?: string;
  vendorProfileId?: string | null;
  createdAt: string;
  payeeName?: string;
  serviceType?: string;
}

/**
 * Actual backend model: Pending Crew Payout item from obpark-backend
 * Endpoint: GET /admin/crew/payouts/pending
 */
export interface BackendPendingCrewPayout {
  crewProfileId: string;
  fullName: string;
  bankAccountNumber: string | null;
  pendingAmount: number;
  pendingJobsCount: number;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string;
  };
}

export interface PendingCrewPayoutsResponse {
  total: number;
  crews: BackendPendingCrewPayout[];
}

/**
 * Actual backend model: Pending Vendor Agency Retainers from obpark-backend
 * Endpoint: GET /vendor/wallet/admin/pending
 */
export interface BackendPendingVendorPayout {
  vendorProfileId: string;
  agencyName: string;
  tradeName: string | null;
  gstin: string | null;
  companyPan: string | null;
  city: string | null;
  state: string | null;
  contactName: string | null;
  email: string | null;
  phoneNumber: string | null;
  pendingAmount: number;
  pendingTripsCount: number;
}

export interface PendingVendorPayoutsResponse {
  total: number;
  vendors: BackendPendingVendorPayout[];
}

/**
 * Actual backend DTO: Mark Crew Paid from obpark-backend
 * Endpoint: POST /admin/crew/:id/mark-paid
 */
export interface MarkCrewPaidDto {
  earningIds?: string[];
  referenceNote?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface MarkCrewPaidResponse {
  payoutRecordId: string;
  crewProfileId: string;
  amountPaid: number;
  earningsSettled: number;
  earningIds: string[];
  paidAt: string;
  referenceNote: string | null;
}

export interface CrewPayoutHistoryRecord {
  id: string;
  amount: number;
  referenceNote?: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  createdAt: string;
  paidByAdmin?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export interface CrewPayoutHistoryResponse {
  crewProfileId: string;
  fullName: string;
  payoutRecords: CrewPayoutHistoryRecord[];
}

/**
 * Actual backend DTO: Mark Vendor Paid from obpark-backend
 * Endpoint: POST /vendor/wallet/admin/settle/:vendorProfileId
 */
export interface MarkVendorPaidDto {
  referenceNote: string;
  earningIds?: string[];
}

export interface VendorWalletSummaryResponse {
  vendorProfile: {
    id: string;
    agencyName: string;
    bankAccountMasked: string | null;
    bankIfsc: string | null;
  };
  wallet: {
    pendingBalance: number;
    pendingBookingsCount: number;
    totalPaidOut: number;
    lifetimeEarnings: number;
  };
}

/**
 * GST Filing Reconciliation Export Data Structure
 */
export interface GSTSettlementExportRow {
  transactionId: string;
  bookingId: string;
  date: string;
  tripAmount: number;
  crewShare: number;
  vendorShare: number;
  platformCommission: number;
  splitType: string;
  status: string;
}
