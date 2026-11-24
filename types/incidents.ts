/**
 * Developer 4: Quality Disputes & Incidents Types
 * 
 * References:
 * - Specification: OBCREW Admin Panel.pdf (Page 5 & 6)
 * - Backend: obpark-backend/src/modules/quality (QualityLoopController & Prisma Schema)
 */

/**
 * Incident Status Lifecycle (Exact match with backend Prisma enum IncidentStatus)
 */
export type IncidentStatus =
  | 'OPEN'          // Just filed — no admin action yet
  | 'UNDER_REVIEW'  // Admin is actively investigating
  | 'RESOLVED'      // Admin took action and closed case
  | 'DISMISSED';    // Admin reviewed and found no valid complaint

/**
 * Incident Category Classification (Exact match with backend Prisma enum IncidentType)
 */
export type IncidentType =
  | 'PROPERTY_DAMAGE' // Vehicle or personal property damaged
  | 'MISCONDUCT'      // Inappropriate behaviour (verbal, physical)
  | 'FRAUD'           // Fake completion, GPS spoofing, fare fraud
  | 'SAFETY_CONCERN'  // Felt unsafe
  | 'SERVICE_QUALITY' // Job done incorrectly/incompletely
  | 'OVERCHARGING'    // Crew demanded money beyond agreed fare
  | 'OTHER';          // Described in text

/**
 * Visual severity level defined in OBCREW Admin Panel specification
 */
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Dispute resolution outcome types (PDF Specification)
 */
export type DisputeResolutionType =
  | 'RESOLVED_WARNING_ISSUED'
  | 'RESOLVED_PENALTY_DEDUCTED'
  | 'DISMISSED';

/**
 * Booking metadata linked to an incident
 */
export interface IncidentBookingDetails {
  bookingCode: string;
  serviceType?: string;
  status?: string;
  completedAt?: string | null;
  customerId?: string;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  };
  crew?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

/**
 * Reporter info (customer, driver, or mechanic)
 */
export interface IncidentReporter {
  email?: string | null;
  phone?: string | null;
  role?: 'CUSTOMER' | 'DRIVER' | 'MECHANIC';
}

/**
 * Full Quality Incident entity used in admin desk
 * Merges backend BookingIncident schema with admin UI display requirements
 */
export interface Incident {
  id: string;
  incidentId?: string; // Sibling property returned by quality-loop.service
  bookingId: string;
  bookingCode?: string;
  reportedBy: string | IncidentReporter;
  reportedByRole?: 'CUSTOMER' | 'DRIVER' | 'MECHANIC';
  type: IncidentType | string;
  category?: string; // Human-friendly display string
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  evidenceUrls?: string[];
  adminNotes?: string | null;
  penaltyAmount?: number | null;
  resolvedAt?: string | null;
  resolvedByAdmin?: string | null;
  createdAt: string;
  updatedAt?: string;
  booking?: IncidentBookingDetails;
}

/**
 * Incident filtering parameters for GET /admin/incidents
 */
export interface IncidentFilters {
  status?: IncidentStatus;
  type?: string;
  page?: number;
  limit?: number;
}

/**
 * Summary incident item returned in pagination list from GET /admin/incidents
 */
export interface IncidentListItem {
  incidentId: string;
  bookingCode: string;
  serviceType: string;
  type: IncidentType;
  status: IncidentStatus;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response structure from backend listIncidents
 * Endpoint: GET /admin/incidents
 */
export interface PaginatedIncidentsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  incidents: IncidentListItem[];
}

/**
 * Detailed incident response returned by GET /admin/incidents/:id
 */
export interface IncidentDetailResponse {
  incidentId: string;
  status: IncidentStatus;
  type: IncidentType;
  description: string;
  evidenceUrls: string[];
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reportedBy: {
    email: string | null;
    phone: string | null;
  };
  booking: {
    bookingCode: string;
    serviceType: string;
    status: string;
    completedAt: string | null;
    customer: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phoneNumber: string | null;
    };
    crew: {
      fullName: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  };
  resolvedByAdmin: string | null;
}

/**
 * Payload sent to resolve an incident (PDF Specification)
 * Target Endpoint: PATCH /admin/quality/incidents/:id/resolve
 */
export interface ResolveIncidentPayload {
  resolution: DisputeResolutionType;
  penaltyAmount?: number; // Deducted from crew wallet if penalty
  adminNotes: string;
}

/**
 * Actual backend DTO payload (obpark-backend ResolveIncidentDto)
 * Target Endpoints:
 * - POST /admin/incidents/:id/resolve
 * - POST /admin/incidents/:id/dismiss
 */
export interface BackendResolveIncidentDto {
  adminNotes: string;
  resolution?: DisputeResolutionType;
  penaltyAmount?: number;
}

/**
 * Status mutation response from backend
 */
export interface IncidentActionResponse {
  success: boolean;
  incidentId: string;
  status: IncidentStatus;
  resolution?: DisputeResolutionType | string;
  penaltyAmount?: number;
  penaltyDeducted?: number;
  resolvedAt?: string;
}

/**
 * Helper: Map IncidentType to Visual Severity
 */
export function getIncidentSeverity(type: IncidentType | string): IncidentSeverity {
  switch (type) {
    case 'PROPERTY_DAMAGE':
    case 'FRAUD':
    case 'SAFETY_CONCERN':
      return 'HIGH';
    case 'MISCONDUCT':
    case 'OVERCHARGING':
      return 'MEDIUM';
    case 'SERVICE_QUALITY':
    case 'OTHER':
    default:
      return 'LOW';
  }
}

/**
 * Helper: Format IncidentType into human-friendly label
 */
export function formatIncidentTypeLabel(type: IncidentType | string): string {
  switch (type) {
    case 'PROPERTY_DAMAGE':
      return 'Property Damage';
    case 'MISCONDUCT':
      return 'Misconduct / Harassment';
    case 'FRAUD':
      return 'Fraud / Spoofing';
    case 'SAFETY_CONCERN':
      return 'Safety Concern';
    case 'SERVICE_QUALITY':
      return 'Service Quality';
    case 'OVERCHARGING':
      return 'Overcharging Dispute';
    case 'OTHER':
      return 'Other Complaint';
    default:
      return type ? type.replace(/_/g, ' ') : 'Unspecified';
  }
}
