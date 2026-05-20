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

// Matches backend BackgroundCheckStatus enum exactly. RENEWED was dropped
// in the v2 spec (renewal = APPROVED + new date, no separate state).
export type BackgroundCheckStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';
export const BACKGROUND_CHECK_STATUSES = [
  'NOT_STARTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const satisfies ReadonlyArray<BackgroundCheckStatus>;

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
  hourlyRate: number | null;
  // Free-form on the backend — typed as string here, narrow at display sites
  // if you need a specific union of values.
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;

  // Background Check compliance — soft-tracked (no activation enforcement
  // per PO Q1). Dates come as ISO strings; verifier is the userId that
  // last touched the record (null on rows never verified).
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckDate: string | null;
  backgroundCheckExpiryDate: string | null;
  backgroundCheckVerifiedById: string | null;
  backgroundCheckNotes: string | null;

  // CPR / First Aid certification — soft-tracked. Provider is free-text
  // (e.g. "Red Cross", "American Heart Association").
  cprCertified: boolean;
  cprCertificationDate: string | null;
  cprExpiryDate: string | null;
  cprCertificationProvider: string | null;
  cprVerifiedById: string | null;
  cprNotes: string | null;

  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
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

// Response of GET /staff/compliance-summary. Matches the backend's nested
// shape — UI renders two stacked widgets (Background Check + CPR).
export interface ComplianceSummary {
  total: number;
  backgroundCheck: {
    approved: number;
    pending: number;
    notStarted: number;
    rejected: number;
    expired: number;
  };
  cpr: {
    valid: number;
    expiring: number;
    expired: number;
    missing: number;
  };
}
