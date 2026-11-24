import { apiClient } from '@/lib/api/client';
import {
  IncidentFilters,
  PaginatedIncidentsResponse,
  IncidentDetailResponse,
  BackendResolveIncidentDto,
  IncidentActionResponse,
} from '@/types/incidents';

/**
 * Quality Disputes & Incidents API Service
 * Authoritative Backend Controller: QualityLoopController (obpark-backend/src/modules/quality/quality-loop.controller.ts)
 * Roles: ADMIN_OBCREW, ADMIN_OBPARK, SUPER_ADMIN_OBCREW, SUPER_ADMIN_OBPARK
 */

/**
 * Fetch paginated incidents list with optional status and category filters.
 * Backend Endpoint: GET /admin/incidents
 */
export async function fetchIncidents(
  filters: IncidentFilters = {}
): Promise<PaginatedIncidentsResponse> {
  return apiClient<PaginatedIncidentsResponse>('/admin/incidents', {
    method: 'GET',
    params: {
      status: filters.status,
      type: filters.type,
      page: filters.page,
      limit: filters.limit,
    },
  });
}

/**
 * Fetch full incident details by UUID.
 * Backend Endpoint: GET /admin/incidents/:id
 */
export async function fetchIncidentById(id: string): Promise<IncidentDetailResponse> {
  return apiClient<IncidentDetailResponse>(`/admin/incidents/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

/**
 * Mark incident as UNDER_REVIEW when an admin begins investigating.
 * Backend Endpoint: POST /admin/incidents/:id/review
 * Valid transition: OPEN -> UNDER_REVIEW
 */
export async function reviewIncident(id: string): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${encodeURIComponent(id)}/review`, {
    method: 'POST',
  });
}

/**
 * Resolve an incident with admin investigation notes.
 * Backend Endpoint: POST /admin/incidents/:id/resolve
 * Valid transition: OPEN | UNDER_REVIEW -> RESOLVED
 * Backend DTO: ResolveIncidentDto { adminNotes: string }
 */
export async function resolveIncident(
  id: string,
  payload: BackendResolveIncidentDto
): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: payload.adminNotes }),
  });
}

/**
 * Dismiss an incident as invalid or unfounded with admin explanation notes.
 * Backend Endpoint: POST /admin/incidents/:id/dismiss
 * Valid transition: OPEN | UNDER_REVIEW -> DISMISSED
 * Backend DTO: ResolveIncidentDto { adminNotes: string }
 */
export async function dismissIncident(
  id: string,
  payload: BackendResolveIncidentDto
): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: payload.adminNotes }),
  });
}
