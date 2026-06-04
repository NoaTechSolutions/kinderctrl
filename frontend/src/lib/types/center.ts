export type CenterStatus = 'SETUP_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface CenterOwner {
  id: string;
  email: string;
  // Director's name — present on GET /centers/:id (used by the Change
  // Director card/dialog). Optional because list endpoints omit it.
  firstName?: string | null;
  lastName?: string | null;
}

export interface Center {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string | null;
  capacity: number;
  licenseNumber: string | null;
  timezone: string;
  status: CenterStatus;
  // True only for the single "KinderCtrl Admin" center — drives the badge,
  // first-in-list ordering, and the locked (no edit/delete/status) actions.
  isAdminCenter: boolean;
  ownerId: string;
  setupCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: CenterOwner;
  // Present on the GET /centers/:id response (operating hours are included
  // in the detail payload). Optional because list endpoints omit it.
  centerHours?: CenterHours[];
  // Geofence — returned by GET /centers/:id as scalar fields.
  // null when not yet configured; 0 means no geofence enforced.
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number;
}

export interface CenterHours {
  id: string;
  centerId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

// Mirror of backend FindAllCentersDto / pagination response. Keep the
// totalPages floor at 1 in sync with centers.service.ts so the UI's
// "Page X of Y" never shows "of 0" for empty results.
export interface CentersQuery {
  page?: number;
  limit?: number;
  status?: CenterStatus;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedCenters {
  data: Center[];
  pagination: PaginationMeta;
}

export const VALID_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;

export type ValidTimezone = (typeof VALID_TIMEZONES)[number];
