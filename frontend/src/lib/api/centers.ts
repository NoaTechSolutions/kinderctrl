import { apiRequest } from './client';
import type { Center, CenterHours } from '@/lib/types/center';
import type {
  CenterFormData,
  CenterUpdateData,
} from '@/lib/schemas/center';

export function getCenters() {
  return apiRequest<Center[]>('/centers', { method: 'GET' });
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
