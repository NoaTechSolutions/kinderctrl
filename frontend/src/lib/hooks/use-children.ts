import { useQuery } from '@tanstack/react-query';
import {
  getChild,
  getMyChildren,
  listCenterChildren,
} from '@/lib/api/children';
import type { ChildrenQuery } from '@/lib/types/child';

export const childrenQueryKeys = {
  all: ['children'] as const,
  centerList: (centerId: string, query: ChildrenQuery) =>
    [
      'children',
      'center',
      centerId,
      // Search MUST be in the key (same lesson as the staff list) so a new
      // query refetches instead of reusing the cached unsearched slice.
      query.search?.trim() ?? '',
      (query.enrollmentStatus ?? []).join(','),
    ] as const,
  mine: ['children', 'mine'] as const,
  detail: (id: string) => ['children', id] as const,
};

/** Director/SA — children of a center. Disabled until centerId is known. */
export function useCenterChildren(
  centerId: string | undefined,
  query: ChildrenQuery = {},
) {
  return useQuery({
    queryKey: centerId
      ? childrenQueryKeys.centerList(centerId, query)
      : (['children', 'center', 'none'] as const),
    queryFn: () => listCenterChildren(centerId as string, query),
    enabled: !!centerId,
  });
}

/** Parent — their own children. */
export function useMyChildren() {
  return useQuery({
    queryKey: childrenQueryKeys.mine,
    queryFn: getMyChildren,
  });
}

/** Single child detail. */
export function useChild(id: string | undefined) {
  return useQuery({
    queryKey: id ? childrenQueryKeys.detail(id) : (['children', 'unknown'] as const),
    queryFn: () => getChild(id as string),
    enabled: !!id,
  });
}
