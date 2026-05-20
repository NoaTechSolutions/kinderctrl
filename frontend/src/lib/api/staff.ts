import { apiRequest } from './client';
import type {
  ComplianceSummary,
  InvitationInfo,
  InviteResult,
  Staff,
} from '@/lib/types/staff';
import type {
  AcceptInvitationFormData,
  InviteStaffFormData,
  StaffFormData,
  StaffUpdateFormData,
  UpdateBackgroundCheckFormData,
  UpdateCprFormData,
} from '@/lib/schemas/staff';

// Response of POST /auth/login + POST /staff/accept-invitation. Imports
// AuthUser from the store so setTokens() consumes the same shape without
// runtime conversion. Backend's toAuthUserResponse() already returns this
// shape (id, email, role, centerId, center, staff, parent).
import type { AuthUser } from '@/store/auth';

interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

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
  // Compliance booleans: send only when explicitly true. False default
  // would be redundant (backend has its own defaults) and noisy.
  if (out.backgroundCheckCompleted !== true) delete out.backgroundCheckCompleted;
  if (out.cprCertified !== true) delete out.cprCertified;
  // centerId: only send when provided (SUPER_ADMIN path). DIRECTOR omits
  // and the backend auto-fills from User.centerId.
  if (!out.centerId) delete out.centerId;
  // Optional DOB.
  if (out.dateOfBirth === '' || out.dateOfBirth == null) delete out.dateOfBirth;
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
// Compliance fields and centerId never go through update (compliance has
// its own PATCH endpoints; moving staff between centers isn't supported).
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
  delete payload.backgroundCheckCompleted;
  delete payload.cprCertified;
  delete payload.centerId;
  return apiRequest<Staff>(`/staff/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteStaff(id: string) {
  return apiRequest<void>(`/staff/${id}`, { method: 'DELETE' });
}

// ─── Invitation flow ──────────────────────────────────────────────

// POST /staff/invite. centerId is required for SUPER_ADMIN; DIRECTOR omits
// it and the backend auto-fills from their User.centerId.
export function inviteStaff(data: InviteStaffFormData) {
  // Strip empty centerId so backend's optional UUID validator sees undefined
  // (a literal "" would fail @IsUUID() and a DIRECTOR shouldn't send the
  // field at all per the API contract).
  const payload: Record<string, unknown> = { email: data.email };
  if (data.centerId) payload.centerId = data.centerId;
  return apiRequest<InviteResult>('/staff/invite', {
    method: 'POST',
    body: payload,
  });
}

// GET /staff/invitation/:token. Public — skipAuth keeps the apiRequest
// helper from attaching an Authorization header (the invitee isn't logged
// in yet).
export function getInvitation(token: string) {
  return apiRequest<InvitationInfo>(`/staff/invitation/${token}`, {
    method: 'GET',
    skipAuth: true,
  });
}

// POST /staff/accept-invitation. Public. Returns login-shaped tokens so
// the caller can drop the invitee into the dashboard immediately.
//
// Strips UI-only fields (confirmPassword + agreedToTerms) before sending —
// backend's `forbidNonWhitelisted: true` would 400 otherwise.
export function acceptInvitation(
  token: string,
  data: AcceptInvitationFormData,
) {
  const { confirmPassword: _cp, agreedToTerms: _at, position, ...rest } = data;
  void _cp;
  void _at;
  const payload: Record<string, unknown> = { token, ...rest };
  if (position) payload.position = position;
  return apiRequest<AuthTokenResponse>('/staff/accept-invitation', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  });
}

// ─── Compliance ───────────────────────────────────────────────────

export function updateBackgroundCheck(
  staffId: string,
  data: UpdateBackgroundCheckFormData,
) {
  // Backend treats undefined as "leave alone" but rejects empty strings on
  // date fields. Drop empties before sending so PATCH semantics work.
  const payload: Record<string, unknown> = { status: data.status };
  if (data.date) payload.date = data.date;
  if (data.expiryDate) payload.expiryDate = data.expiryDate;
  if (data.notes !== undefined) payload.notes = data.notes;
  return apiRequest<Staff>(`/staff/${staffId}/background-check`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateCpr(staffId: string, data: UpdateCprFormData) {
  const payload: Record<string, unknown> = { certified: data.certified };
  if (data.certificationDate) payload.certificationDate = data.certificationDate;
  if (data.expiryDate) payload.expiryDate = data.expiryDate;
  if (data.provider !== undefined) payload.provider = data.provider;
  if (data.notes !== undefined) payload.notes = data.notes;
  return apiRequest<Staff>(`/staff/${staffId}/cpr`, {
    method: 'PATCH',
    body: payload,
  });
}

// GET /staff/compliance-summary?centerId=...
// DIRECTOR can omit centerId (defaults to their primary); SUPER_ADMIN must
// pass one.
export function getComplianceSummary(centerId?: string) {
  const qs = centerId ? `?centerId=${encodeURIComponent(centerId)}` : '';
  return apiRequest<ComplianceSummary>(`/staff/compliance-summary${qs}`, {
    method: 'GET',
  });
}
