import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeDirector,
  createCenter,
  deleteCenter,
  getCenter,
  getCenters,
  getCenterStats,
  getGlobalStats,
  setCenterHours,
  updateCenter,
  type CenterHourInput,
  type CenterPatchPayload,
} from '@/lib/api/centers';
import type {
  CenterFormData,
} from '@/lib/schemas/center';
import type { CentersQuery } from '@/lib/types/center';

export const centersQueryKeys = {
  all: ['centers'] as const,
  list: (query: CentersQuery) => ['centers', query] as const,
  detail: (id: string) => ['center', id] as const,
  globalStats: ['centers', 'global-stats'] as const,
};

// SUPER_ADMIN's global stats — counts, alerts and per-center summaries used
// by the SUPER_ADMIN dashboard view on /dashboard.
export function useGlobalStats() {
  return useQuery({
    queryKey: centersQueryKeys.globalStats,
    queryFn: getGlobalStats,
  });
}

// Per-center stats for the detail page Overview tab. `enabled` lets callers
// skip the fetch when the viewer can't access stats (the endpoint is
// DIRECTOR/SUPER_ADMIN-only — STAFF would get a 403).
export function useCenterStats(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['center', id, 'stats'],
    queryFn: () => getCenterStats(id!),
    enabled: !!id && enabled,
  });
}

// Query is part of the cache key so different page/status combos don't
// stomp each other. Mutations invalidate `centers` (prefix) to refresh
// every cached list at once.
//
// `enabled` is exposed so callers can gate the request — e.g. staff-form
// only fetches centers when the SUPER_ADMIN Center select is rendered,
// preventing a console-noise 401 for DIRECTOR sessions on /staff/new.
export function useCenters(
  query: CentersQuery = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: centersQueryKeys.list(query),
    queryFn: () => getCenters(query),
    enabled: options.enabled ?? true,
  });
}

export function useCenter(id: string | undefined) {
  return useQuery({
    queryKey: id ? centersQueryKeys.detail(id) : ['center', 'unknown'],
    queryFn: () => getCenter(id as string),
    enabled: !!id,
  });
}

export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CenterFormData) => createCenter(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: centersQueryKeys.all });
      qc.setQueryData(centersQueryKeys.detail(created.id), created);
    },
  });
}

export function useUpdateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CenterPatchPayload;
    }) => updateCenter(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: centersQueryKeys.all });
      qc.setQueryData(centersQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCenter(id),
    onSuccess: (_, id) => {
      // Backend does soft delete (status=CLOSED). Invalidate list AND
      // detail so the closed status is reflected on next read.
      qc.invalidateQueries({ queryKey: centersQueryKeys.all });
      qc.invalidateQueries({ queryKey: centersQueryKeys.detail(id) });
    },
  });
}

export function useSetCenterHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      hours,
    }: {
      id: string;
      hours: CenterHourInput[];
    }) => setCenterHours(id, hours),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: centersQueryKeys.detail(id) });
      qc.invalidateQueries({ queryKey: centersQueryKeys.all });
    },
  });
}

/**
 * Transfer Director access of a center to a different system user.
 * On success: invalidates centersQueryKeys.detail(centerId) AND
 * centersQueryKeys.all so the Overview card refetches the new owner.
 */
export function useChangeDirector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      centerId,
      newDirectorUserId,
    }: {
      centerId: string;
      newDirectorUserId: string;
    }) => changeDirector(centerId, newDirectorUserId),
    onSuccess: (_, { centerId }) => {
      qc.invalidateQueries({ queryKey: centersQueryKeys.detail(centerId) });
      qc.invalidateQueries({ queryKey: centersQueryKeys.all });
    },
  });
}
