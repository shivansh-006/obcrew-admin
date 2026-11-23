import { apiClient } from '@/lib/api/client';
import {
  IncidentFilters,
  PaginatedIncidentsResponse,
  IncidentDetailResponse,
  BackendResolveIncidentDto,
  IncidentActionResponse,
} from '@/types/incidents';

/**
 * Developer 4: Quality Disputes & Incidents API Service
 * 
 * Backend Source Mapping:
 * - Actual Controller: QualityLoopController (obpark-backend/src/modules/quality/quality-loop.controller.ts)
 * - Guards: JwtAuthGuard, RolesGuard
 * - Roles: ADMIN_OBCREW, ADMIN_OBPARK, SUPER_ADMIN_OBCREW, SUPER_ADMIN_OBPARK
 */

/**
 * Fetch paginated incidents list with optional status and category filters.
 * 
 * [Actual Backend Endpoint]: GET /admin/incidents
 * Query Params: status (OPEN, UNDER_REVIEW, RESOLVED, DISMISSED), type, page, limit
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
 * Fetch full incident details by UUID, including booking, customer, crew, and evidence attachments.
 * 
 * [Actual Backend Endpoint]: GET /admin/incidents/:id
 */
export async function fetchIncidentById(id: string): Promise<IncidentDetailResponse> {
  return apiClient<IncidentDetailResponse>(`/admin/incidents/${id}`, {
    method: 'GET',
  });
}

/**
 * Mark incident as UNDER_REVIEW when an admin begins investigating.
 * 
 * [Actual Backend Endpoint]: POST /admin/incidents/:id/review
 * Valid transition: OPEN -> UNDER_REVIEW
 */
export async function reviewIncident(id: string): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${id}/review`, {
    method: 'POST',
  });
}

/**
 * Resolve an incident with admin investigation notes.
 * 
 * [Actual Backend Endpoint]: POST /admin/incidents/:id/resolve
 * Note: PDF specifies PATCH /admin/quality/incidents/:id/resolve, but the actual backend
 * implements POST /admin/incidents/:id/resolve accepting ResolveIncidentDto { adminNotes: string }.
 * Valid transition: OPEN | UNDER_REVIEW -> RESOLVED
 */
export async function resolveIncident(
  id: string,
  payload: BackendResolveIncidentDto
): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Dismiss an incident as invalid or unfounded with admin explanation notes.
 * 
 * [Actual Backend Endpoint]: POST /admin/incidents/:id/dismiss
 * Valid transition: OPEN | UNDER_REVIEW -> DISMISSED
 */
export async function dismissIncident(
  id: string,
  payload: BackendResolveIncidentDto
): Promise<IncidentActionResponse> {
  return apiClient<IncidentActionResponse>(`/admin/incidents/${id}/dismiss`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
