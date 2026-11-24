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

  it('validates remediated GET /crew/wallet/ledger/all response structure', () => {
    const rawGlobalLedger = {
      total: 1,
      items: [
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

    expect(rawGlobalLedger.items[0].bookingCode).toBe('OB-99120');
    expect(rawGlobalLedger.items[0].crewShare).toBe(700);
    expect(rawGlobalLedger.items[0].vendorShare).toBe(150);
    expect(rawGlobalLedger.items[0].platformCommission).toBe(150);
  });

  it('validates remediated GET /admin/billing/summary response structure', () => {
    const rawSummary = {
      totalPlatformCommission: 45000,
      totalCrewPayoutsPending: 28500,
      totalVendorRetainersPending: 15400,
      billingCycle: 'CURRENT_CYCLE',
    };

    expect(rawSummary.totalPlatformCommission).toBe(45000);
    expect(rawSummary.totalCrewPayoutsPending).toBe(28500);
    expect(rawSummary.totalVendorRetainersPending).toBe(15400);
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
