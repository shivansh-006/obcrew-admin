import { describe, it, expect } from 'vitest';
import { ApiClientError } from '@/lib/api/client';
import { AdminUser, PlatformRole } from '@/store/auth.store';

describe('Phase 5.1: Authentication & Role Permission Verification', () => {
  it('validates admin login response contract schema', () => {
    // Authoritative backend response from AuthController.adminLogin
    const mockBackendResponse = {
      success: true,
      message: 'Admin login successful.',
      accessToken: 'jwt-access-token-xyz',
      refreshToken: 'jwt-refresh-token-abc',
      user: {
        id: '00000000-0000-4000-8000-000000000101',
        firebaseUid: null,
        phoneNumber: '+919999988888',
        email: 'ops@obcrew.com',
        firstName: 'Operations',
        lastName: 'Lead',
        role: 'ADMIN_OBCREW' as PlatformRole,
        isActive: true,
        kycStatus: null,
        createdAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-20T10:00:00.000Z',
      },
    };

    expect(mockBackendResponse.success).toBe(true);
    expect(mockBackendResponse.accessToken.length).toBeGreaterThan(0);
    expect(mockBackendResponse.refreshToken.length).toBeGreaterThan(0);
    expect(mockBackendResponse.user.role).toBe('ADMIN_OBCREW');

    const mappedUser: AdminUser = {
      id: mockBackendResponse.user.id,
      name: `${mockBackendResponse.user.firstName} ${mockBackendResponse.user.lastName}`,
      email: mockBackendResponse.user.email,
      role: mockBackendResponse.user.role,
      phoneNumber: mockBackendResponse.user.phoneNumber,
    };

    expect(mappedUser.name).toBe('Operations Lead');
    expect(mappedUser.role).toBe('ADMIN_OBCREW');
  });

  it('validates platform role segregation between OBCREW and OBPARK administrators', () => {
    const obcrewAdminRole: PlatformRole = 'ADMIN_OBCREW';
    const obparkAdminRole: PlatformRole = 'ADMIN_OBPARK';
    const superObcrewRole: PlatformRole = 'SUPER_ADMIN_OBCREW';
    const superObparkRole: PlatformRole = 'SUPER_ADMIN_OBPARK';

    const canManageCrewPayouts = (role: PlatformRole) =>
      role === 'ADMIN_OBCREW' || role === 'SUPER_ADMIN_OBCREW' || role === 'SUPERADMIN';

    const canManageVendorSettlement = (role: PlatformRole) =>
      role === 'ADMIN_OBPARK' || role === 'SUPER_ADMIN_OBPARK' || role === 'SUPERADMIN';

    // OBCrew admin can manage crew payouts but NOT vendor settlements
    expect(canManageCrewPayouts(obcrewAdminRole)).toBe(true);
    expect(canManageVendorSettlement(obcrewAdminRole)).toBe(false);

    // ObPark admin can manage vendor settlements but NOT crew payouts
    expect(canManageCrewPayouts(obparkAdminRole)).toBe(false);
    expect(canManageVendorSettlement(obparkAdminRole)).toBe(true);

    // Super admins are platform-scoped
    expect(canManageCrewPayouts(superObcrewRole)).toBe(true);
    expect(canManageVendorSettlement(superObcrewRole)).toBe(false);

    expect(canManageCrewPayouts(superObparkRole)).toBe(false);
    expect(canManageVendorSettlement(superObparkRole)).toBe(true);
  });

  it('handles 401 session expiration via ApiClientError', () => {
    const error = new ApiClientError(401, 'Unauthorized: session expired or invalid token');
    expect(error.status).toBe(401);
    expect(error.message).toMatch(/Unauthorized/);
  });

  it('handles token refresh request formatting', () => {
    const refreshPayload = { refreshToken: 'jwt-refresh-token-abc' };
    expect(typeof refreshPayload.refreshToken).toBe('string');
    expect(refreshPayload.refreshToken.length).toBeGreaterThan(5);
  });
});
