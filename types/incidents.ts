/**
 * Quality Disputes & Incidents Types
 * Aligned with obpark-backend/src/modules/quality (QualityLoopController & Prisma Schema)
 */

export type IncidentStatus =
  | 'OPEN'          // Just filed — no admin action yet
  | 'UNDER_REVIEW'  // Admin is actively investigating
  | 'RESOLVED'      // Admin took action and closed case
  | 'DISMISSED';    // Admin reviewed and found no valid complaint

export type IncidentType =
  | 'PROPERTY_DAMAGE' // Vehicle or personal property damaged
  | 'MISCONDUCT'      // Inappropriate behaviour (verbal, physical)
  | 'FRAUD'           // Fake completion, GPS spoofing, fare fraud
  | 'SAFETY_CONCERN'  // Felt unsafe
  | 'SERVICE_QUALITY' // Job done incorrectly/incompletely
  | 'OVERCHARGING'    // Crew demanded money beyond agreed fare
  | 'OTHER';          // Described in text

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type DisputeFindingCategory =
  | 'WARNING_ISSUED'
  | 'RETRAINING_ORDERED'
  | 'CUSTOMER_REFUNDED'
  | 'ACTION_TAKEN_CLOSED'
  | 'DISMISSED_INVALID'
  | 'DISMISSED_DUPLICATE';

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

export interface IncidentReporter {
  email?: string | null;
  phone?: string | null;
  role?: 'CUSTOMER' | 'DRIVER' | 'MECHANIC';
}

export interface Incident {
  id: string;
  incidentId?: string;
  bookingId: string;
  bookingCode?: string;
  reportedBy: string | IncidentReporter;
  reportedByRole?: 'CUSTOMER' | 'DRIVER' | 'MECHANIC';
  type: IncidentType | string;
  category?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  evidenceUrls?: string[];
  adminNotes?: string | null;
  resolvedAt?: string | null;
  resolvedByAdmin?: string | null;
  createdAt: string;
  updatedAt?: string;
  booking?: IncidentBookingDetails;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  type?: string;
  page?: number;
  limit?: number;
}

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

export interface PaginatedIncidentsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  incidents: IncidentListItem[];
}

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
 * Backend ResolveIncidentDto
 * obpark-backend/src/modules/quality/dto/resolve-incident.dto.ts
 */
export interface BackendResolveIncidentDto {
  adminNotes: string; // Max 2000 chars, required
}

export interface IncidentActionResponse {
  success: boolean;
  incidentId: string;
  status: IncidentStatus;
  resolvedAt?: string;
}

export function formatIncidentTypeLabel(type: string | IncidentType): string {
  switch (type) {
    case 'PROPERTY_DAMAGE':
      return 'Property / Vehicle Damage';
    case 'MISCONDUCT':
      return 'Misconduct / Harassment';
    case 'FRAUD':
      return 'Fraud / Spoofing';
    case 'SAFETY_CONCERN':
      return 'Safety Concern';
    case 'SERVICE_QUALITY':
      return 'Service Quality Defect';
    case 'OVERCHARGING':
      return 'Overcharging Dispute';
    case 'OTHER':
    default:
      return type ? type.replace(/_/g, ' ') : 'General Incident';
  }
}

export function getIncidentSeverity(type: string | IncidentType): IncidentSeverity {
  switch (type) {
    case 'PROPERTY_DAMAGE':
    case 'SAFETY_CONCERN':
    case 'FRAUD':
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
