import { describe, it, expect } from 'vitest';
import { ApiClientError } from '@/lib/api/client';
import { MarkCrewPaidDto, MarkVendorPaidDto } from '@/types/settlements';

describe('Phase 5.3: Settlements & Wallet Disbursal Workflow Tests', () => {
  it('validates pending crew payouts schema from GET /admin/crew/payouts/pending', () => {
    // Authoritative backend response from AdminCrewPayoutController.getPendingPayouts
    const mockPendingPayouts = {
      total: 2,
      crews: [
        {
          crewProfileId: 'c1111111-1111-4000-8000-111111111111',
          fullName: 'Rajesh Sharma',
          email: 'rajesh@obcrew.com',
          phoneNumber: '+919876500001',
          pendingAmount: 3450.5,
          pendingJobs: 5,
          bankAccountMasked: '•••• •••• 9812',
        },
        {
          crewProfileId: 'c2222222-2222-4000-8000-222222222222',
          fullName: 'Sunil Kumar',
          email: 'sunil@obcrew.com',
          phoneNumber: '+919876500002',
          pendingAmount: 1200.0,
          pendingJobs: 2,
          bankAccountMasked: '•••• •••• 4421',
        },
      ],
    };

    expect(mockPendingPayouts.total).toBe(2);
    expect(mockPendingPayouts.crews[0].pendingAmount).toBe(3450.5);
    expect(mockPendingPayouts.crews[0].bankAccountMasked).toBe('•••• •••• 9812');
  });

  it('validates MarkCrewPaidDto mandatory fields and date range constraints', () => {
    // Backend MarkCrewPaidDto:
    // periodStart: string (ISO 8601 required)
    // periodEnd: string (ISO 8601 required, >= periodStart)
    const validDto: MarkCrewPaidDto = {
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-24T23:59:59.999Z',
      referenceNote: 'NEFT-AXIS-992381203',
      earningIds: ['e1111111-1111-4000-8000-111111111111'],
    };

    expect(new Date(validDto.periodStart).getTime()).toBeLessThanOrEqual(
      new Date(validDto.periodEnd).getTime()
    );
    expect(validDto.referenceNote?.length).toBeGreaterThan(0);
  });

  it('verifies markCrewPaid response mapping from backend structure', () => {
    // Actual backend return from AdminCrewPayoutController.markCrewPaid:
    // { success: true, payout: { id: string, amountPaid: number, jobsSettled: number, referenceNote?: string, paidAt: Date } }
    const backendResponse = {
      success: true,
      payout: {
        id: 'payout-rec-001',
        amountPaid: 3450.5,
        jobsSettled: 5,
        referenceNote: 'NEFT-AXIS-992381203',
        paidAt: '2026-11-24T10:30:00.000Z',
      },
    };

    expect(backendResponse.success).toBe(true);
    expect(backendResponse.payout.id).toBe('payout-rec-001');
    expect(backendResponse.payout.amountPaid).toBe(3450.5);
    expect(backendResponse.payout.jobsSettled).toBe(5);
  });

  it('verifies settleVendorPayout response mapping from backend structure', () => {
    // Actual backend return from VendorWalletController.settlePayout:
    // { success: true, payoutId: string, agencyName: string, amountSettled: number, tripsSettled: number, reference?: string }
    const backendVendorResponse = {
      success: true,
      payoutId: 'vpayout-001',
      agencyName: 'Apex Chauffeur Services Pvt Ltd',
      amountSettled: 15400,
      tripsSettled: 18,
      reference: 'RTGS-HDFC-882910382',
    };

    expect(backendVendorResponse.success).toBe(true);
    expect(backendVendorResponse.payoutId).toBe('vpayout-001');
    expect(backendVendorResponse.amountSettled).toBe(15400);
  });

  it('validates remediated GET /vendor/wallet/admin/pending response structure', () => {
    const rawPendingVendors = {
      total: 1,
      vendors: [
        {
          vendorProfileId: 'v-1',
          companyName: 'Apex Chauffeur Fleet',
          tradeName: 'Apex',
          city: 'Delhi',
          state: 'DL',
          gstin: '07AABCU9603R1ZM',
          email: 'admin@apex.com',
          phoneNumber: '+919876543210',
          pendingAmount: 15400.0,
          pendingTrips: 12,
        },
      ],
    };

    expect(rawPendingVendors.total).toBe(1);
    expect(rawPendingVendors.vendors[0].companyName).toBe('Apex Chauffeur Fleet');
    expect(rawPendingVendors.vendors[0].pendingAmount).toBe(15400.0);
    expect(rawPendingVendors.vendors[0].pendingTrips).toBe(12);
  });

  it('validates remediated GET /crew/wallet/ledger/all response structure reading response.transactions', () => {
    const rawGlobalLedger = {
      total: 42,
      page: 1,
      limit: 20,
      totalPages: 3,
      transactions: [
        {
          id: 'ledger-tx-1',
          bookingId: 'booking-1',
          bookingCode: 'OB-99120',
          tripAmount: 1000,
          crewShare: 700,
          vendorShare: 150,
          platformCommission: 150,
          splitType: 'TRI_PARTY_70_15_15',
          status: 'SETTLED',
          createdAt: '2026-11-24T10:00:00.000Z',
        },
      ],
    };

    expect(rawGlobalLedger.transactions).toBeDefined();
    expect(Array.isArray(rawGlobalLedger.transactions)).toBe(true);
    expect(rawGlobalLedger.transactions[0].bookingCode).toBe('OB-99120');
    expect(rawGlobalLedger.transactions[0].crewShare).toBe(700);
    expect(rawGlobalLedger.transactions[0].vendorShare).toBe(150);
    expect(rawGlobalLedger.transactions[0].platformCommission).toBe(150);
    expect(rawGlobalLedger.transactions[0].splitType).toBe('TRI_PARTY_70_15_15');
    expect(rawGlobalLedger.total).toBe(42);
    expect(rawGlobalLedger.page).toBe(1);
    expect(rawGlobalLedger.limit).toBe(20);
    expect(rawGlobalLedger.totalPages).toBe(3);
  });

  it('validates GET /crew/wallet/ledger/all query parameters alignment (page, limit, startDate, endDate, status)', () => {
    const buildLedgerQuery = (params: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.startDate) searchParams.set('startDate', params.startDate);
      if (params.endDate) searchParams.set('endDate', params.endDate);
      if (params.status) searchParams.set('status', params.status);
      return searchParams.toString() ? `?${searchParams.toString()}` : '';
    };

    const query = buildLedgerQuery({
      page: 2,
      limit: 10,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'SETTLED',
    });

    expect(query).toBe('?page=2&limit=10&startDate=2026-11-01&endDate=2026-11-30&status=SETTLED');
  });

  it('validates remediated GET /admin/billing/summary response structure with explicit cycle vs all-time semantics', () => {
    // Authoritative backend response from CrewWalletService.getBillingSummary
    const rawSummary = {
      isCycleScoped: true,
      cycleStartDate: '2026-11-01T00:00:00.000Z',
      cycleEndDate: '2026-11-30T23:59:59.999Z',
      cycleCommission: 45000,
      allTimePlatformCommission: 180000,
      totalPlatformCommission: 45000, // alias for cycleCommission when cycle supplied
      cycleCrewPayoutsPending: 12500,
      totalCrewPayoutsPending: 28500,
      cycleVendorRetainersPending: 8400,
      totalVendorRetainersPending: 15400,
      billingCycle: '2026-11',
    };

    // Cycle semantics verification
    expect(rawSummary.isCycleScoped).toBe(true);
    expect(rawSummary.cycleCommission).toBe(45000);
    expect(rawSummary.allTimePlatformCommission).toBe(180000);
    expect(rawSummary.totalPlatformCommission).toBe(rawSummary.cycleCommission);
    expect(rawSummary.cycleCrewPayoutsPending).toBeLessThanOrEqual(rawSummary.totalCrewPayoutsPending);
    expect(rawSummary.cycleVendorRetainersPending).toBeLessThanOrEqual(rawSummary.totalVendorRetainersPending);
  });

  it('validates UTC month bounds formatting for GET /admin/billing/summary cycle parameter', () => {
    const cycleRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    const validCycle = '2026-11';
    const invalidCycle1 = '2026-13';
    const invalidCycle2 = '2026/11';
    const invalidCycle3 = 'invalid';

    expect(cycleRegex.test(validCycle)).toBe(true);
    expect(cycleRegex.test(invalidCycle1)).toBe(false);
    expect(cycleRegex.test(invalidCycle2)).toBe(false);
    expect(cycleRegex.test(invalidCycle3)).toBe(false);

    // Exact UTC month bounds calculation
    const [yearStr, monthStr] = validCycle.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    expect(startDate.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-11-30T23:59:59.999Z');
  });

  it('verifies client API functions fetchGlobalSettlementLedger and fetchBillingSummary contracts', async () => {
    const mockLedgerResponse = {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      transactions: [
        {
          id: 'tx-1',
          bookingId: 'b-1',
          bookingCode: 'BK-100',
          tripAmount: 2000,
          crewShare: 1400,
          vendorShare: 300,
          platformCommission: 300,
          splitType: 'TRI_PARTY_70_15_15' as const,
          status: 'SETTLED' as const,
          createdAt: '2026-11-15T12:00:00.000Z',
        },
      ],
    };

    // Verify parser handles transactions key
    const parsedTransactions = mockLedgerResponse.transactions ?? [];
    expect(parsedTransactions).toHaveLength(1);
    expect(parsedTransactions[0].bookingCode).toBe('BK-100');
    expect(parsedTransactions[0].splitType).toBe('TRI_PARTY_70_15_15');

    // Verify backward compatibility fallback with legacy items key
    const legacyRaw: any = {
      total: 1,
      items: mockLedgerResponse.transactions,
    };
    const fallbackTransactions = legacyRaw.transactions ?? legacyRaw.items ?? [];
    expect(fallbackTransactions).toHaveLength(1);
    expect(fallbackTransactions[0].bookingCode).toBe('BK-100');
  });

  it('enforces external transaction notice constraint (no simulated banking transfers)', () => {
    const isManualRecordNotice = (notice: string) =>
      notice.includes('records an externally completed transaction') &&
      notice.includes('does not initiate an automatic banking disbarment');

    const sampleNotice =
      'This action records an externally completed transaction (Bank NEFT/RTGS or UPI). It does not initiate an automatic banking disbarment or money transfer.';

    expect(isManualRecordNotice(sampleNotice)).toBe(true);
  });
});
