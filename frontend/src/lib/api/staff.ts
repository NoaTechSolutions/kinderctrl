import { apiRequest } from './client';
import type { Staff } from '@/lib/types/staff';
import type {
  StaffFormData,
  StaffUpdateFormData,
} from '@/lib/schemas/staff';

export function getStaff() {
  return apiRequest<Staff[]>('/staff', { method: 'GET' });
}

export function getStaffMember(id: string) {
  return apiRequest<Staff>(`/staff/${id}`, { method: 'GET' });
}

// Strip optional empty/NaN fields before posting so the backend's
// `forbidNonWhitelisted: true` ValidationPipe sees a clean shape instead
// of `phone: ""` or `hourlyRate: NaN` and rejects them.
function cleanCreatePayload(data: StaffFormData) {
  const out: Record<string, unknown> = { ...data };
  if (out.phone === '' || out.phone == null) delete out.phone;
  if (out.notes === '' || out.notes == null) delete out.notes;
  if (
    out.hourlyRate == null ||
    (typeof out.hourlyRate === 'number' && Number.isNaN(out.hourlyRate))
  ) {
    delete out.hourlyRate;
  }
  return out;
}

export function createStaff(data: StaffFormData) {
  return apiRequest<Staff>('/staff', {
    method: 'POST',
    body: cleanCreatePayload(data),
  });
}

// For update we DO send empty strings explicitly so the backend can clear
// a previously-set phone/notes by setting them to null. (Hourly rate has
// no clear-to-null path via the form; intentionally left as-is for v1.)
export function updateStaff(id: string, data: StaffUpdateFormData) {
  const payload: Record<string, unknown> = { ...data };
  if (payload.phone === '') payload.phone = null;
  if (payload.notes === '') payload.notes = null;
  if (
    typeof payload.hourlyRate === 'number' &&
    Number.isNaN(payload.hourlyRate)
  ) {
    delete payload.hourlyRate;
  }
  return apiRequest<Staff>(`/staff/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteStaff(id: string) {
  return apiRequest<void>(`/staff/${id}`, { method: 'DELETE' });
}
