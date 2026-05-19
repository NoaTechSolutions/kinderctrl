import { apiRequest } from './client';
import type {
  Center,
  CenterHours,
  CentersQuery,
  PaginatedCenters,
} from '@/lib/types/center';
import type {
  CenterFormData,
  CenterUpdateData,
} from '@/lib/schemas/center';

export function getCenters(query: CentersQuery = {}) {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return apiRequest<PaginatedCenters>(
    qs ? `/centers?${qs}` : '/centers',
    { method: 'GET' },
  );
}

export function getCenter(id: string) {
  return apiRequest<Center & { centerHours?: CenterHours[] }>(
    `/centers/${id}`,
    { method: 'GET' },
  );
}

function cleanCreatePayload(data: CenterFormData) {
  const out: Record<string, unknown> = { ...data };
  if (out.licenseNumber === '' || out.licenseNumber == null) {
    delete out.licenseNumber;
  }
  if (out.website === '' || out.website == null) {
    delete out.website;
  }
  if (!out.timezone) {
    delete out.timezone;
  }
  return out;
}

export function createCenter(data: CenterFormData) {
  return apiRequest<Center>('/centers', {
    method: 'POST',
    body: cleanCreatePayload(data),
  });
}

export function updateCenter(id: string, data: CenterUpdateData) {
  const payload: Record<string, unknown> = { ...data };
  if (payload.licenseNumber === '') {
    payload.licenseNumber = null;
  }
  if (payload.website === '') {
    payload.website = null;
  }
  return apiRequest<Center>(`/centers/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteCenter(id: string) {
  return apiRequest<void>(`/centers/${id}`, { method: 'DELETE' });
}

export interface CenterHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export function setCenterHours(id: string, hours: CenterHourInput[]) {
  return apiRequest<CenterHours[]>(`/centers/${id}/hours`, {
    method: 'POST',
    body: { hours },
  });
}
