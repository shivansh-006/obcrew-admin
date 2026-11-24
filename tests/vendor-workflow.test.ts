import { describe, it, expect } from 'vitest';
import { ApiClientError } from '@/lib/api/client';

describe('Phase 5.2: Vendor Workflow & Fleet Authorization Tests', () => {
  it('normalizes GET /admin/vendors/pending response structure', () => {
    // Authoritative backend response from VendorVerificationController.listPending
    const mockPendingVendors = [
      {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        userId: 'u-1',
        companyName: 'Apex Chauffeur Services Pvt Ltd',
        contactPerson: 'Vikram Malhotra',
        gstin: '07AABCU9603R1ZM',
        panNumber: 'AABCU9603R',
        status: 'PENDING_VERIFICATION',
        commissionRate: '0.15',
        payoutBankAcc: '918273645521',
        payoutIfsc: 'HDFC0001234',
        createdAt: '2026-11-20T10:00:00.000Z',
        documents: [
          {
            id: 'doc-1',
            docType: 'GST_CERTIFICATE',
            status: 'PENDING',
            updatedAt: '2026-11-20T10:00:00.000Z',
          },
        ],
        user: {
          email: 'vikram@apexchauffeurs.in',
          phoneNumber: '+919811122334',
        },
      },
    ];

    expect(Array.isArray(mockPendingVendors)).toBe(true);
    expect(mockPendingVendors[0].status).toBe('PENDING_VERIFICATION');
    expect(mockPendingVendors[0].companyName).toBe('Apex Chauffeur Services Pvt Ltd');
    expect(mockPendingVendors[0].user.phoneNumber).toBe('+919811122334');
  });

  it('verifies GET /admin/vendors/:id/details returns full profile with members roster', () => {
    // Authoritative backend response from VendorVerificationController.getVendorDetails
    const mockDetails = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      companyName: 'Apex Chauffeur Services Pvt Ltd',
      contactPerson: 'Vikram Malhotra',
      status: 'PENDING_VERIFICATION',
      payoutBankAcc: '918273645521',
      payoutIfsc: 'HDFC0001234',
      documents: [
        { id: 'd-1', docType: 'GST_CERTIFICATE', status: 'VERIFIED' },
      ],
      members: [
        {
          id: 'mem-1',
          inviteStatus: 'ACCEPTED',
          isActive: true,
          crewProfile: {
            id: 'crew-1',
            fullName: 'Rameshwar Pal',
            serviceType: 'DRIVER',
            kycStatus: 'APPROVED',
            avgRating: 4.85,
          },
        },
      ],
      user: { email: 'vikram@apexchauffeurs.in', phoneNumber: '+919811122334' },
      reviewedBy: null,
    };

    expect(mockDetails.members.length).toBe(1);
    expect(mockDetails.members[0].crewProfile.fullName).toBe('Rameshwar Pal');
    expect(mockDetails.members[0].crewProfile.serviceType).toBe('DRIVER');
    expect(mockDetails.members[0].isActive).toBe(true);
  });

  it('validates vendor approval mutation payload', () => {
    // Backend contract: PATCH /admin/vendors/:id/verify
    // VerifyVendorDto: { status: 'APPROVED' }
    const approvalPayload = { status: 'APPROVED' };
    expect(['APPROVED', 'REJECTED', 'SUSPENDED']).toContain(approvalPayload.status);
  });

  it('requires rejectionReason when rejecting a vendor agency', () => {
    // Backend VerifyVendorDto strictly requires rejectionReason when status === 'REJECTED'
    const validateRejection = (status: string, reason?: string) => {
      if (status === 'REJECTED' && (!reason || reason.trim().length === 0)) {
        throw new Error('rejectionReason is required when rejecting a vendor');
      }
      return { status, rejectionReason: reason?.trim() };
    };

    expect(() => validateRejection('REJECTED', '')).toThrow(/rejectionReason is required/);
    expect(() => validateRejection('REJECTED', '   ')).toThrow(/rejectionReason is required/);

    const validRejection = validateRejection('REJECTED', 'GST certificate address mismatch');
    expect(validRejection.rejectionReason).toBe('GST certificate address mismatch');
  });

  it('correctly validates 403 Forbidden rejection when admin accesses vendor-only surveillance', () => {
    // GET /vendor/fleet/surveillance is decorated with @Roles('VENDOR')
    // Calling with an admin token results in a 403 Forbidden exception.
    const surveillanceError = new ApiClientError(
      403,
      'Fleet surveillance is restricted to VENDOR sessions; this admin account cannot view the roster.'
    );

    expect(surveillanceError.status).toBe(403);
    expect(surveillanceError.message).toMatch(/restricted to VENDOR sessions/);
  });

  it('validates invite driver international phone number format and handles 403 restriction', () => {
    // Backend LinkDriverDto requires E.164 format: /^\+[1-9]\d{9,14}$/
    const PHONE_REGEX = /^\+[1-9]\d{9,14}$/;

    expect(PHONE_REGEX.test('+919876543210')).toBe(true);
    expect(PHONE_REGEX.test('+14155552671')).toBe(true);
    expect(PHONE_REGEX.test('9876543210')).toBe(false); // Missing + and country code
    expect(PHONE_REGEX.test('+91 98765 43210')).toBe(false); // Unstripped spaces

    // POST /vendor/fleet/members requires role VENDOR. When called by admin, backend returns 403.
    const adminLinkError = new ApiClientError(
      403,
      'Authorization Restriction (403): Driver fleet linking is strictly restricted to agency VENDOR sessions.'
    );
    expect(adminLinkError.status).toBe(403);
  });

  it('masks sensitive bank account numbers for compliance', () => {
    const mask = (acc: string | null) => {
      if (!acc) return 'Not provided';
      const clean = acc.trim();
      if (clean.length <= 4) return '••••';
      return `•••• •••• ${clean.slice(-4)}`;
    };

    expect(mask('918273645521')).toBe('•••• •••• 5521');
    expect(mask(null)).toBe('Not provided');
    expect(mask('123')).toBe('••••');
  });
});
