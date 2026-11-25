import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSpatialTelemetryStore,
  isCrewLocationUpdate,
} from '@/store/useSpatialTelemetryStore';
import {
  isDispatchPage,
  getSurveillanceNamespaceUrl,
} from '@/services/spatial-telemetry.service';
import type { CrewLocationUpdate } from '@/types/spatial-telemetry';

describe('Spatial Telemetry & Surveillance Tests', () => {
  beforeEach(() => {
    useSpatialTelemetryStore.getState().clearCrewLocations();
    useSpatialTelemetryStore.getState().setConnectionStatus('disconnected');
  });

  describe('isCrewLocationUpdate', () => {
    it('validates a correct crew location update', () => {
      const valid: CrewLocationUpdate = {
        crewId: 'crew-uuid-1',
        name: 'Vikram Singh',
        role: 'DRIVER',
        lat: 28.6139,
        lng: 77.209,
        heading: 45,
        status: 'AVAILABLE',
        timestamp: '2026-11-25T10:00:00Z',
      };
      expect(isCrewLocationUpdate(valid)).toBe(true);
    });

    it('rejects update with invalid coordinates', () => {
      const invalidLat = {
        crewId: 'crew-uuid-2',
        name: 'Arjun Yadav',
        role: 'MECHANIC',
        lat: 95.0, // out of range
        lng: 77.209,
        status: 'ON_JOB',
      };
      expect(isCrewLocationUpdate(invalidLat)).toBe(false);

      const invalidLng = {
        crewId: 'crew-uuid-2',
        name: 'Arjun Yadav',
        role: 'MECHANIC',
        lat: 28.5,
        lng: 195.0, // out of range
        status: 'ON_JOB',
      };
      expect(isCrewLocationUpdate(invalidLng)).toBe(false);
    });

    it('rejects non-object or missing required fields', () => {
      expect(isCrewLocationUpdate(null)).toBe(false);
      expect(isCrewLocationUpdate(undefined)).toBe(false);
      expect(isCrewLocationUpdate({ crewId: '1' })).toBe(false);
    });
  });

  describe('useSpatialTelemetryStore', () => {
    it('upserts a crew location marker', () => {
      const update: CrewLocationUpdate = {
        crewId: 'crew-1',
        name: 'Deepak Joshi',
        role: 'DRIVER',
        lat: 28.6,
        lng: 77.2,
        status: 'EN_ROUTE',
      };

      useSpatialTelemetryStore.getState().upsertCrewLocation(update);
      const locations = useSpatialTelemetryStore.getState().crewLocations;
      expect(locations['crew-1']).toBeDefined();
      expect(locations['crew-1'].name).toBe('Deepak Joshi');
      expect(locations['crew-1'].status).toBe('EN_ROUTE');
    });

    it('ignores older out-of-order timestamp updates', () => {
      const initial: CrewLocationUpdate = {
        crewId: 'crew-1',
        name: 'Deepak Joshi',
        role: 'DRIVER',
        lat: 28.6,
        lng: 77.2,
        status: 'EN_ROUTE',
        timestamp: '2026-11-25T10:10:00Z',
      };
      useSpatialTelemetryStore.getState().upsertCrewLocation(initial);

      const older: CrewLocationUpdate = {
        crewId: 'crew-1',
        name: 'Deepak Joshi',
        role: 'DRIVER',
        lat: 28.59,
        lng: 77.19,
        status: 'AVAILABLE',
        timestamp: '2026-11-25T10:05:00Z', // older!
      };
      useSpatialTelemetryStore.getState().upsertCrewLocation(older);

      const current = useSpatialTelemetryStore.getState().crewLocations['crew-1'];
      expect(current.lat).toBe(28.6); // kept initial newer value
      expect(current.status).toBe('EN_ROUTE');
    });

    it('manages connection status and crew selection', () => {
      useSpatialTelemetryStore.getState().setConnectionStatus('connected');
      expect(useSpatialTelemetryStore.getState().connectionStatus).toBe('connected');

      useSpatialTelemetryStore.getState().selectCrew('crew-1');
      expect(useSpatialTelemetryStore.getState().selectedCrewId).toBe('crew-1');

      useSpatialTelemetryStore.getState().clearCrewLocations();
      expect(useSpatialTelemetryStore.getState().crewLocations).toEqual({});
      expect(useSpatialTelemetryStore.getState().selectedCrewId).toBeNull();
    });
  });

  describe('isDispatchPage', () => {
    it('validates a standard paginated dispatches response', () => {
      const payload = {
        data: [
          {
            bookingId: 'OB-2026-1001',
            serviceType: 'DRIVER',
            status: 'IN_PROGRESS',
            customer: { name: 'Ananya', phone: '+919999111001' },
            assignedCrew: { id: 'crew-uuid-1', name: 'Deepak Joshi' },
            pickup: { lat: 28.6315, lng: 77.2167, address: 'Connaught Place' },
            destination: { lat: 28.5562, lng: 77.1, address: 'Airport T3' },
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      };
      expect(isDispatchPage(payload)).toBe(true);
    });

    it('rejects invalid dispatch structure', () => {
      expect(isDispatchPage(null)).toBe(false);
      expect(isDispatchPage({})).toBe(false);
      expect(isDispatchPage({ data: 'invalid' })).toBe(false);
    });
  });

  describe('getSurveillanceNamespaceUrl', () => {
    it('returns valid namespace url ending with /admin-surveillance', () => {
      const url = getSurveillanceNamespaceUrl();
      expect(url).toContain('/admin-surveillance');
      expect(url).not.toContain('//admin-surveillance');
    });
  });
});
