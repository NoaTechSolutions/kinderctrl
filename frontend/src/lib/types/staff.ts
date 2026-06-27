// Matches backend StaffRole enum exactly (TEACHER/ASSISTANT/ADMIN).
// ADMIN displays as "Center Admin" in UI to disambiguate from SUPER_ADMIN.
export type StaffRole = 'TEACHER' | 'ASSISTANT' | 'ADMIN';

// Backend stores employmentType as a plain string. The DTO whitelists
// these two values only — keep the union in sync if the backend opens
// up CONTRACTOR / OTHER values later.
export type EmploymentType = 'full_time' | 'part_time';
export const VALID_EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
] as const satisfies ReadonlyArray<EmploymentType>;

// Matches backend StaffStatus enum exactly. NOTE: backend uses SUSPENDED,
// not ON_LEAVE (that was a spec-only value that never landed in schema).
export type StaffStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

// Today's time-clock attendance status — mirrors ChildAttendanceStatus so the
// roster card band reads identically across modules. PRESENT/END_OF_SHIFT/
// EARLY_DEPARTURE come from a real punch; NOT_ARRIVED/NOT_SCHEDULED are the
// no-record states.
export type StaffAttendanceStatus =
  | 'PRESENT'
  | 'END_OF_SHIFT'
  | 'NOT_ARRIVED'
  | 'NOT_SCHEDULED'
  | 'EARLY_DEPARTURE';

export interface StaffAttendanceToday {
  status: StaffAttendanceStatus;
  checkInTime?: string; // ISO — formatted client-side
  checkOutTime?: string; // ISO
}

// Client-side proxy used until the staff list endpoint returns a real
// attendanceToday (the way the children list already does). ACTIVE staff are
// expected today but we have no punch in the list payload → NOT_ARRIVED;
// SUSPENDED / INVITED aren't on shift → NOT_SCHEDULED. Once the backend adds
// a real attendanceToday, callers prefer it and this fallback goes unused.
export function staffAttendanceProxy(status: StaffStatus): StaffAttendanceToday {
  return { status: status === 'ACTIVE' ? 'NOT_ARRIVED' : 'NOT_SCHEDULED' };
}

// PO QA #46 — collapsed to 3 lifecycle states. The previous 5-state
// model mixed phase ("where in the process") with outcome ("did it
// pass?"). The outcome now lives on Staff.backgroundCheckApproved
// (boolean | null, only meaningful when status === COMPLETED).
export type BackgroundCheckStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

// PO QA #49 — CPR mirror of BG #46. Lifecycle phases only:
//   PENDING   — newly hired / cert not validated yet (default)
//   ACTIVE    — cert in force (future expiry required by validator)
//   EXPIRED   — cert lapsed (past expiry required by validator)
//   CANCELLED — cert revoked / no longer applicable
// Badge color derives from this stored status (NOT from comparing
// cprExpiryDate to today) — per spec "what admin saved is what they see".
export type CprStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
// PO QA #31 — emergency contact relationship whitelist. Render order in
// the Select trigger matches this array order; do not reorder. Add new
// values at the end. Shared with the backend EMERGENCY_CONTACT_RELATIONSHIPS
// constant (kept in sync manually since the two services live in
// separate packages).
export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  'father',
  'mother',
  'spouse',
  'partner',
  'sibling',
  'friend',
  'other',
] as const;
export type EmergencyContactRelationship =
  (typeof EMERGENCY_CONTACT_RELATIONSHIPS)[number];

export const BACKGROUND_CHECK_STATUSES = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const satisfies ReadonlyArray<BackgroundCheckStatus>;

export const CPR_STATUSES = [
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
] as const satisfies ReadonlyArray<CprStatus>;

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  // Sourced from linked User.email server-side (Staff.email column was
  // dropped in the v2 schema). Always populated unless the row is a rare
  // orphan; the backend falls back to '' in that case.
  email: string;
  role: StaffRole;
  // Free-text job title (e.g. "Lead Toddler Teacher"). NOT used for authz.
  position: string | null;
  status: StaffStatus;
  // ISO datetime string from the API; render with new Date().toLocaleDateString().
  hireDate: string;
  // Optional DOB (PO QA #3 CAMBIO 9). null until staff fills it in.
  dateOfBirth: string | null;
  // Self-service profile fields (Opción C) — address as 4 fields per
  // Center's pattern (PO QA #11).
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  // PO QA #31 — relationship discriminator + second contact.
  emergencyContactRelationship: string | null;
  emergencyContact2Name: string | null;
  emergencyContact2Phone: string | null;
  emergencyContact2Relationship: string | null;
  profileComplete: boolean;
  // Kiosk PIN status (hash never sent to the client).
  kioskPinSet: boolean;
  kioskPinLocked: boolean;
  hourlyRate: number | null;
  // Free-form on the backend — typed as string here, narrow at display sites
  // if you need a specific union of values.
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;

  // Background Check compliance — PO QA #46 simplified. The 5-state
  // model + date / expiry / notes / verifier columns were retired in
  // favor of status (lifecycle phase) + approved (outcome). `approved`
  // is null whenever status !== COMPLETED — the backend keeps that
  // invariant via the updateBackgroundCheck service path.
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckApproved: boolean | null;

  // CPR / First Aid certification — PO QA #49: cprCertified boolean
  // replaced by cprStatus enum (PENDING/ACTIVE/EXPIRED/CANCELLED). Aux
  // fields retained — date / expiry / provider / notes / verifier still
  // surfaced for historical reporting (CPR keeps the richer history BG
  // doesn't need).
  cprStatus: CprStatus;
  cprCertificationDate: string | null;
  cprExpiryDate: string | null;
  cprCertificationProvider: string | null;
  cprVerifiedById: string | null;
  cprVerifiedByName: string | null;
  cprNotes: string | null;

  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;

  // Today's time-clock attendance. Optional: the list endpoint doesn't return
  // it yet (unlike the children list). When absent the roster card falls back
  // to staffAttendanceProxy(status). Wire this server-side to light up the
  // real PRESENT / END_OF_SHIFT / EARLY_DEPARTURE states.
  attendanceToday?: StaffAttendanceToday;
}

// PO QA #19 — pagination shape for GET /staff. Mirrors PaginatedCenters
// (centers/types) so list endpoints stay structurally identical.
export interface StaffQuery {
  page?: number;
  limit?: number;
  search?: string;
  // SUPER_ADMIN only: scope the list to one center (center detail Staff tab).
  centerId?: string;
}

export interface StaffPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedStaff {
  data: Staff[];
  pagination: StaffPaginationMeta;
}

// Response of GET /staff/invitation/:token. Public preview shown on the
// accept-invitation page so the invitee knows what they're accepting.
export interface InvitationInfo {
  email: string;
  centerName: string;
  directorName: string;
  directorEmail: string;
  expiresAt: string;
}

// Response of POST /staff/invite.
export interface InviteResult {
  success: true;
  email: string;
  expiresAt: string;
}

// Lifecycle states (PO QA #13). PENDING is the only actionable state for
// resend/cancel; the others are terminal records kept for audit.
export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED';

// Response of GET /staff/invitations — one row per invitation token,
// with status computed server-side. Replaces PendingInvitation (QA #12).
export interface Invitation {
  id: string;
  email: string;
  centerId: string;
  centerName: string;
  role: StaffRole;
  status: InvitationStatus;
  invitedByName: string;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string;
  // PO QA #14 AJUSTE 3 — per-invitation resend rate limit telemetry. The
  // UI reads these to disable the Resend action at 3 resends per hour
  // and label the button with the remaining attempts. resendCount only
  // reflects the active sliding-window bucket; once lastResendAt drifts
  // past 1h ago the server resets the counter on the next resend.
  resendCount: number;
  lastResendAt: string | null;
}

export const RESEND_MAX_IN_WINDOW = 3;
export const RESEND_WINDOW_MS = 60 * 60 * 1000;

// PO QA #22 — pagination shape for GET /staff/invitations. Same structure
// as PaginatedStaff / PaginatedCenters so list endpoints stay uniform.
export interface InvitationsQuery {
  page?: number;
  limit?: number;
  status?: InvitationStatus;
  centerId?: string;
}

export interface PaginatedInvitations {
  data: Invitation[];
  pagination: StaffPaginationMeta;
}

// Response of GET /staff/compliance-summary. PO QA #46+#49: both
// compliance domains now follow the same shape — counts per lifecycle
// state stored explicitly in the DB column.
export interface ComplianceSummary {
  total: number;
  backgroundCheck: {
    completedApproved: number;
    completedNotApproved: number;
    pending: number;
    cancelled: number;
  };
  cpr: {
    pending: number;
    active: number;
    expired: number;
    cancelled: number;
  };
}
