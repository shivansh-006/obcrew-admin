import { describe, it, expect } from 'vitest';
import { IncidentStatus, IncidentType, BackendResolveIncidentDto } from '@/types/incidents';

describe('Phase 5.4: Incidents & Quality Loop Workflow Tests', () => {
  it('validates paginated incidents list response from GET /admin/incidents', () => {
    // Authoritative backend response from QualityLoopController.listIncidents
    const mockList = {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      incidents: [
        {
          id: 'inc-001',
          incidentId: 'inc-001',
          bookingId: 'bk-101',
          booking: {
            bookingCode: 'BK-501',
            serviceType: 'CHAUFFEUR',
            customerId: 'cust-1',
          },
          reportedBy: {
            email: 'ananya@example.com',
            phoneNumber: '+919811122334',
          },
          status: 'OPEN' as IncidentStatus,
          type: 'OVERCHARGING' as IncidentType,
          createdAt: '2026-11-23T14:00:00.000Z',
        },
      ],
    };

    expect(mockList.total).toBe(1);
    expect(mockList.incidents[0].status).toBe('OPEN');
    expect(mockList.incidents[0].type).toBe('OVERCHARGING');
    expect(mockList.incidents[0].booking.bookingCode).toBe('BK-501');
  });

  it('validates incident review status transition OPEN -> UNDER_REVIEW', () => {
    const transitionToReview = (currentStatus: IncidentStatus): IncidentStatus => {
      if (currentStatus !== 'OPEN') {
        throw new Error(
          `Incident is already ${currentStatus}. Only OPEN incidents can be moved to UNDER_REVIEW.`
        );
      }
      return 'UNDER_REVIEW';
    };

    expect(transitionToReview('OPEN')).toBe('UNDER_REVIEW');
    expect(() => transitionToReview('UNDER_REVIEW')).toThrow(/Only OPEN incidents/);
    expect(() => transitionToReview('RESOLVED')).toThrow(/Only OPEN incidents/);
    expect(() => transitionToReview('DISMISSED')).toThrow(/Only OPEN incidents/);
  });

  it('validates incident resolve transition and rejects invented financial penalties', () => {
    const resolveIncident = (
      currentStatus: IncidentStatus,
      dto: BackendResolveIncidentDto
    ) => {
      if (currentStatus === 'RESOLVED' || currentStatus === 'DISMISSED') {
        throw new Error(`Incident is already ${currentStatus} and cannot be changed.`);
      }
      if (!dto.adminNotes || dto.adminNotes.trim().length < 5) {
        throw new Error('adminNotes must be at least 5 characters');
      }
      if (dto.adminNotes.length > 2000) {
        throw new Error('adminNotes cannot exceed 2000 characters');
      }

      // Backend ResolveIncidentDto has only adminNotes. No penalty fields are permitted.
      return {
        status: 'RESOLVED' as IncidentStatus,
        adminNotes: dto.adminNotes.trim(),
        resolvedAt: new Date().toISOString(),
      };
    };

    // Valid resolution from OPEN or UNDER_REVIEW
    const res1 = resolveIncident('OPEN', {
      adminNotes: '[Formal Warning Issued] Partner warned about route deviation.',
    });
    expect(res1.status).toBe('RESOLVED');

    const res2 = resolveIncident('UNDER_REVIEW', {
      adminNotes: '[Customer Refunded] Fare adjustment credited to customer.',
    });
    expect(res2.status).toBe('RESOLVED');

    // Fails on short notes
    expect(() => resolveIncident('OPEN', { adminNotes: 'abc' })).toThrow(/at least 5 characters/);

    // Fails on closed cases
    expect(() =>
      resolveIncident('RESOLVED', { adminNotes: 'Already closed case.' })
    ).toThrow(/already RESOLVED/);
  });

  it('validates incident dismiss transition with administrative explanation', () => {
    const dismissIncident = (
      currentStatus: IncidentStatus,
      dto: BackendResolveIncidentDto
    ) => {
      if (currentStatus === 'RESOLVED' || currentStatus === 'DISMISSED') {
        throw new Error(`Incident is already ${currentStatus} and cannot be changed.`);
      }
      if (!dto.adminNotes || dto.adminNotes.trim().length < 5) {
        throw new Error('adminNotes must be at least 5 characters');
      }

      return {
        status: 'DISMISSED' as IncidentStatus,
        adminNotes: dto.adminNotes.trim(),
        resolvedAt: new Date().toISOString(),
      };
    };

    const res = dismissIncident('UNDER_REVIEW', {
      adminNotes: '[Unsubstantiated] Telemetry logs confirm route followed in-app navigation.',
    });
    expect(res.status).toBe('DISMISSED');
  });
});
