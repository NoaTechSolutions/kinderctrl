import { apiRequest } from './client';
import type {
  ComplianceSummary,
  InvitationInfo,
  InvitationsQuery,
  InviteResult,
  PaginatedInvitations,
  PaginatedStaff,
  Staff,
  StaffQuery,
  StaffStatus,
} from '@/lib/types/staff';
import type {
  AcceptInvitationFormData,
  InviteStaffFormData,
  StaffFormData,
  StaffUpdateFormData,
  UpdateBackgroundCheckFormData,
  UpdateCprFormData,
  UpdateProfileFormData,
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

export function getStaff(query: StaffQuery = {}) {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.centerId) params.set('centerId', query.centerId);
  const qs = params.toString();
  return apiRequest<PaginatedStaff>(qs ? `/staff?${qs}` : '/staff', {
    method: 'GET',
  });
}

export function getStaffMember(id: string) {
  return apiRequest<Staff>(`/staff/${id}`, { method: 'GET' });
}

// PO QA #30 Opción E: createStaff resurrected for SUPER_ADMIN-only
// manual create. Backend creates Staff + User (password=null) + sends
// welcome email with tokenized setup link. Director still uses
// inviteStaff() — that surface is unchanged.
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
  if (out.backgroundCheckCompleted !== true) delete out.backgroundCheckCompleted;
  if (out.cprCertified !== true) delete out.cprCertified;
  if (!out.centerId) delete out.centerId;
  if (out.dateOfBirth === '' || out.dateOfBirth == null) delete out.dateOfBirth;
  // PO QA #32: hireDate + employmentType are no longer required. Backend
  // defaults them (hireDate=now, employmentType='full_time') when omitted.
  if (out.hireDate === '' || out.hireDate == null) delete out.hireDate;
  if (!out.employmentType) delete out.employmentType;
  // PO QA #31 — strip blank optional address + emergency fields. The
  // backend DTO @IsOptional() only kicks in for `undefined`, not empty
  // strings; sending empty strings would trigger the @IsString length
  // checks or the @Matches regex. State + zip get stripped if empty;
  // the trim()/digits normalization happens before this for phones.
  if (!out.street) delete out.street;
  if (!out.city) delete out.city;
  if (!out.state) delete out.state;
  if (!out.zipCode) delete out.zipCode;
  if (!out.emergencyContactName) delete out.emergencyContactName;
  if (!out.emergencyContactPhone) {
    delete out.emergencyContactPhone;
  } else if (typeof out.emergencyContactPhone === 'string') {
    out.emergencyContactPhone = out.emergencyContactPhone.replace(/\D/g, '');
  }
  if (!out.emergencyContactRelationship) delete out.emergencyContactRelationship;
  if (!out.emergencyContact2Name) delete out.emergencyContact2Name;
  if (!out.emergencyContact2Phone) {
    delete out.emergencyContact2Phone;
  } else if (typeof out.emergencyContact2Phone === 'string') {
    out.emergencyContact2Phone = out.emergencyContact2Phone.replace(/\D/g, '');
  }
  if (!out.emergencyContact2Relationship) delete out.emergencyContact2Relationship;
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
  // PO QA #31 — empty strings on optional address + emergency fields
  // get stripped before sending. State + zip get validated by regex so
  // empty strings would 400. Empty relationship would fail @IsIn.
  // Phones get digits-only normalization (same pattern as create).
  for (const key of [
    'street',
    'city',
    'state',
    'zipCode',
    'emergencyContactName',
    'emergencyContactRelationship',
    'emergencyContact2Name',
    'emergencyContact2Relationship',
  ] as const) {
    if (payload[key] === '') delete payload[key];
  }
  if (payload.emergencyContactPhone === '') {
    delete payload.emergencyContactPhone;
  } else if (typeof payload.emergencyContactPhone === 'string') {
    payload.emergencyContactPhone = (payload.emergencyContactPhone as string).replace(/\D/g, '');
  }
  if (payload.emergencyContact2Phone === '') {
    delete payload.emergencyContact2Phone;
  } else if (typeof payload.emergencyContact2Phone === 'string') {
    payload.emergencyContact2Phone = (payload.emergencyContact2Phone as string).replace(/\D/g, '');
  }
  return apiRequest<Staff>(`/staff/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteStaff(id: string) {
  return apiRequest<void>(`/staff/${id}`, { method: 'DELETE' });
}

// Dedicated status transition (Activate ↔ Suspend). Sends ONLY status so it
// can't accidentally clear other fields — PATCH /staff/:id treats every
// other key as "leave alone". SUPER_ADMIN/DIRECTOR gated server-side.
export function changeStaffStatus(id: string, status: StaffStatus) {
  return apiRequest<Staff>(`/staff/${id}`, {
    method: 'PATCH',
    body: { status },
  });
}

// ─── Invitation flow ──────────────────────────────────────────────

// POST /staff/invite. centerId is required for SUPER_ADMIN; DIRECTOR omits
// it and the backend auto-fills from their User.centerId. Optional
// `prefill` carries Director-supplied operational fields that get
// merged into the Staff record at accept-time (PO QA #28 Opción F).
export function inviteStaff(data: InviteStaffFormData) {
  // Strip empty centerId so backend's optional UUID validator sees undefined
  // (a literal "" would fail @IsUUID() and a DIRECTOR shouldn't send the
  // field at all per the API contract).
  const payload: Record<string, unknown> = { email: data.email };
  if (data.centerId) payload.centerId = data.centerId;
  // Strip out any blank prefill keys before sending — class-validator's
  // @IsOptional() only kicks in for `undefined`, not empty strings.
  if (data.prefill) {
    const cleanPrefill: Record<string, unknown> = {};
    if (data.prefill.hireDate) cleanPrefill.hireDate = data.prefill.hireDate;
    if (data.prefill.dateOfBirth)
      cleanPrefill.dateOfBirth = data.prefill.dateOfBirth;
    if (data.prefill.employmentType)
      cleanPrefill.employmentType = data.prefill.employmentType;
    if (
      data.prefill.hourlyRate != null &&
      !Number.isNaN(data.prefill.hourlyRate)
    ) {
      cleanPrefill.hourlyRate = data.prefill.hourlyRate;
    }
    if (data.prefill.position?.trim())
      cleanPrefill.position = data.prefill.position.trim();
    if (Object.keys(cleanPrefill).length > 0) {
      payload.prefill = cleanPrefill;
    }
  }
  return apiRequest<InviteResult>('/staff/invite', {
    method: 'POST',
    body: payload,
  });
}

// POST /staff/:id/send-password-reset (PO QA #28 Opción F).
// Director/SUPER_ADMIN-triggered. The actor never sees the new password —
// the staff receives an email with a tokenized link and sets it themselves.
export function sendStaffPasswordReset(staffId: string) {
  return apiRequest<{ success: true; email: string }>(
    `/staff/${staffId}/send-password-reset`,
    { method: 'POST', body: {} },
  );
}

// ── Kiosk PIN (per-staff) ──────────────────────────────────────────────────
export function setStaffKioskPin(staffId: string, pin: string) {
  return apiRequest<{ success: true }>(`/staff/${staffId}/kiosk-pin`, {
    method: 'POST',
    body: { pin },
  });
}

export function removeStaffKioskPin(staffId: string) {
  return apiRequest<{ success: true }>(`/staff/${staffId}/kiosk-pin`, {
    method: 'DELETE',
  });
}

export function unlockStaffKioskPin(staffId: string) {
  return apiRequest<{ success: true }>(`/staff/${staffId}/kiosk-pin/unlock`, {
    method: 'POST',
    body: {},
  });
}

/** Staff in the actor's center with a locked kiosk PIN (director dashboard alert). */
export function getLockedKioskPins() {
  return apiRequest<Array<{ id: string; firstName: string; lastName: string }>>(
    '/staff/kiosk-pin/locked',
  );
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
// backend's `forbidNonWhitelisted: true` would 400 otherwise. Position was
// removed from this DTO per PO QA #8 (Opción C); the invitee completes
// optional fields later via /profile/complete.
export function acceptInvitation(
  token: string,
  data: AcceptInvitationFormData,
) {
  const { confirmPassword: _cp, agreedToTerms: _at, ...rest } = data;
  void _cp;
  void _at;
  return apiRequest<AuthTokenResponse>('/staff/accept-invitation', {
    method: 'POST',
    body: { token, ...rest },
    skipAuth: true,
  });
}

// GET /staff/me/profile — current staff fetches own profile (PO QA #8).
export function getMyProfile() {
  return apiRequest<Staff>('/staff/me/profile', { method: 'GET' });
}

// PATCH /staff/me/profile — current staff updates own profile. Empty
// strings are stripped before sending so the backend treats them as
// "leave alone" rather than "set to empty" (clear-to-null isn't supported
// via this v1 surface; future iteration could add it).
//
// Phone is stripped of formatting BEFORE POST — backend's UpdateProfileDto
// @Matches accepts digits only. Same pattern as staff-form's phone field
// (BUG-037 fix). The form keeps the formatted display value; only the
// wire payload is digits.
export function updateMyProfile(data: UpdateProfileFormData) {
  const payload: Record<string, unknown> = {};
  if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth;
  if (data.street?.trim()) payload.street = data.street.trim();
  if (data.city?.trim()) payload.city = data.city.trim();
  if (data.state?.trim()) payload.state = data.state.trim().toUpperCase();
  if (data.zipCode?.trim()) payload.zipCode = data.zipCode.trim();
  if (data.emergencyContactName?.trim())
    payload.emergencyContactName = data.emergencyContactName.trim();
  if (data.emergencyContactPhone?.trim()) {
    payload.emergencyContactPhone = data.emergencyContactPhone
      .trim()
      .replace(/\D/g, '');
  }
  return apiRequest<Staff>('/staff/me/profile', {
    method: 'PATCH',
    body: payload,
  });
}

// ─── Compliance ───────────────────────────────────────────────────

export function updateBackgroundCheck(
  staffId: string,
  data: UpdateBackgroundCheckFormData,
) {
  // PO QA #48 (BUG 3 fix): this helper was still building the old
  // {status, date, expiryDate, notes} payload from before QA #46 — the
  // `approved` flag from the new schema was silently dropped, so a user
  // marking "Approved" on the modal saw a 200 response but Prisma
  // received {approved: undefined} → null. The form already shapes a
  // valid payload (status + approved when COMPLETED); forward it as-is.
  // Backend ValidationPipe whitelists the two fields; nothing else can
  // leak through.
  return apiRequest<Staff>(`/staff/${staffId}/background-check`, {
    method: 'PATCH',
    body: data,
  });
}

export function updateCpr(staffId: string, data: UpdateCprFormData) {
  // PO QA #49: forward the form payload as-is (mirror of QA #48 BG fix).
  // Backend whitelists {status, certificationDate, expiryDate, provider,
  // notes} so nothing else can leak through. Empty strings on dates are
  // safe — backend's `IsOptional + IsDateString` skips empty values.
  return apiRequest<Staff>(`/staff/${staffId}/cpr`, {
    method: 'PATCH',
    body: data,
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

// ─── Invitations management (PO QA #13, paginated in #22) ───────────

export function getInvitations(query: InvitationsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page != null) params.set('page', String(query.page));
  if (query.limit != null) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.centerId) params.set('centerId', query.centerId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PaginatedInvitations>(`/staff/invitations${qs}`, {
    method: 'GET',
  });
}

export function resendInvitation(id: string) {
  return apiRequest<{ success: true; expiresAt: string }>(
    `/staff/invitations/${id}/resend`,
    { method: 'POST', body: {} },
  );
}

export function revokeInvitation(id: string) {
  return apiRequest<void>(`/staff/invitations/${id}`, { method: 'DELETE' });
}
