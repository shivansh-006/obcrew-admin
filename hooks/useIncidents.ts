'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIncidents,
  fetchIncidentById,
  reviewIncident,
  resolveIncident,
  dismissIncident,
} from '@/lib/api/incidents';
import {
  IncidentFilters,
  PaginatedIncidentsResponse,
  IncidentDetailResponse,
  BackendResolveIncidentDto,
} from '@/types/incidents';

/**
 * Query Key Factory for Quality Incidents & Disputes
 */
export const incidentKeys = {
  all: ['incidents'] as const,
  list: (filters?: IncidentFilters) => [...incidentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...incidentKeys.all, 'detail', id] as const,
};

/**
 * Hook: Query Paginated Quality Incidents with Optional Filters
 */
export function useIncidentsQuery(filters?: IncidentFilters) {
  return useQuery<PaginatedIncidentsResponse, Error>({
    queryKey: incidentKeys.list(filters),
    queryFn: () => fetchIncidents(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook: Query Full Incident Details by UUID
 */
export function useIncidentDetailQuery(id: string) {
  return useQuery<IncidentDetailResponse, Error>({
    queryKey: incidentKeys.detail(id),
    queryFn: () => fetchIncidentById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Mark Incident as UNDER_REVIEW
 */
export function useReviewIncidentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewIncident(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
    },
  });
}

/**
 * Hook: Resolve Incident with Admin Notes
 * Automatically invalidates incidents list and detail cache.
 */
export function useResolveIncidentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: BackendResolveIncidentDto;
    }) => resolveIncident(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook: Dismiss Incident with Admin Explanation
 */
export function useDismissIncidentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: BackendResolveIncidentDto;
    }) => dismissIncident(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(variables.id) });
    },
  });
}
