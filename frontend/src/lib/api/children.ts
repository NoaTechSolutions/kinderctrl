import { apiRequest } from './client';
import type { Child, ChildrenQuery } from '@/lib/types/child';

// Director/SA — a center's roster. Backend: GET /centers/:centerId/children.
// Returns a plain array (no pagination in Fase 1).
export function listCenterChildren(
  centerId: string,
  query: ChildrenQuery = {},
): Promise<Child[]> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.enrollmentStatus?.length) {
    params.set('enrollmentStatus', query.enrollmentStatus.join(','));
  }
  const qs = params.toString();
  return apiRequest<Child[]>(
    `/centers/${centerId}/children${qs ? `?${qs}` : ''}`,
  );
}

// Parent — only their own children. Backend: GET /children/mine.
export function getMyChildren(): Promise<Child[]> {
  return apiRequest<Child[]>('/children/mine');
}

// Single child detail (Director/SA/Parent-own). Backend: GET /children/:id.
export function getChild(id: string): Promise<Child> {
  return apiRequest<Child>(`/children/${id}`);
}
