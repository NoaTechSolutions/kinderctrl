import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCenter,
  deleteCenter,
  getCenter,
  getCenters,
  setCenterHours,
  updateCenter,
  type CenterHourInput,
} from '@/lib/api/centers';
import type {
  CenterFormData,
  CenterUpdateData,
} from '@/lib/schemas/center';
import type { CentersQuery } from '@/lib/types/center';

export const centersQueryKeys = {
  all: ['centers'] as const,
  list: (query: CentersQuery) => ['centers', query] as const,
  detail: (id: string) => ['center', id] as const,
};

// Query is part of the cache key so different page/status combos don't
// stomp each other. Mutations invalidate `centers` (prefix) to refresh
// every cached list at once.
export function useCenters(query: CentersQuery = {}) {
  return useQuery({
    queryKey: centersQueryKeys.list(query),
    queryFn: () => getCenters(query),
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
      data: CenterUpdateData;
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
