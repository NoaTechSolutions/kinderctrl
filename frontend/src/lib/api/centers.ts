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

// Geofence-only patch — used by the center detail Settings tab.
// Kept separate so the Zod centerUpdateSchema (which drives the edit form)
// doesn't need to change; the edit form continues to type-check correctly.
export interface GeofencePatch {
  latitude?: number | null;
  longitude?: number | null;
  geoFenceRadiusMeters?: number;
}

// Full patch payload — the edit form uses CenterUpdateData, the Settings
// tab uses GeofencePatch. Any extra keys flow through to the PATCH body.
export type CenterPatchPayload = CenterUpdateData & GeofencePatch;

export function getCenters(query: CentersQuery = {}) {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
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

export function updateCenter(id: string, data: CenterPatchPayload) {
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

// =================================================== Global stats (SUPER_ADMIN)

export interface GlobalStatsCenter {
  id: string;
  name: string;
  status: 'SETUP_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  city: string | null;
  state: string | null;
  director: { id: string; name: string; email: string } | null;
  staffCount: number;
  childrenCount: number;
}

export interface GlobalStats {
  counts: {
    centers: number;
    staff: number;
    children: number;
    directors: number;
  };
  alerts: {
    // CorrectionRequest in PENDING older than 48 hours.
    oldCorrections: number;
    // PayrollPeriod still OPEN whose endDate is >7 days in the past.
    overduePayrolls: number;
    // ACTIVE staff with no CLOCK_IN in the last 7 days.
    staffWithoutClockIn: number;
  };
  centers: GlobalStatsCenter[];
}

export function getGlobalStats() {
  return apiRequest<GlobalStats>('/centers/global-stats', { method: 'GET' });
}

// =================================================== Center stats (detail)

export interface CenterStats {
  counts: {
    staff: number;
    children: number;
    schedules: number;
    corrections: number;
  };
  alerts: {
    oldCorrections: number;
    overduePayrolls: number;
    staffWithoutClockIn: number;
  };
}

export function getCenterStats(id: string) {
  return apiRequest<CenterStats>(`/centers/${id}/stats`, { method: 'GET' });
}

// =================================================== Change director (SUPER_ADMIN)

/**
 * Transfer Director access of a center to a different system user.
 * PATCH /centers/:id/director  body { newDirectorUserId }
 * Returns the updated Center (owner now reflects the new director).
 */
export function changeDirector(centerId: string, newDirectorUserId: string) {
  return apiRequest<Center>(`/centers/${centerId}/director`, {
    method: 'PATCH',
    body: { newDirectorUserId },
  });
}
