import {
  BackgroundCheckStatus,
  CprStatus,
  StaffRole,
  StaffStatus,
} from '@prisma/client';

// Today's time-clock attendance, derived for the roster list. Mirrors the
// children list's ChildAttendanceToday so the frontend card band reads one
// shape across modules. PRESENT/END_OF_SHIFT come from a real StaffTimeEntry
// punch; NOT_ARRIVED/NOT_SCHEDULED are the no-punch proxy off staff status.
// EARLY_DEPARTURE is part of the contract but never emitted by this proxy
// (same as the children list).
export type StaffAttendanceStatus =
  | 'PRESENT'
  | 'END_OF_SHIFT'
  | 'NOT_ARRIVED'
  | 'NOT_SCHEDULED'
  | 'EARLY_DEPARTURE';

export class StaffAttendanceTodayDto {
  status: StaffAttendanceStatus;
  checkInTime?: string; // ISO — formatted client-side
  checkOutTime?: string; // ISO
}

export class StaffResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  // Sourced from staff.user.email (Staff.email column was dropped — User
  // is the single source of truth).
  email: string;
  role: StaffRole;
  // Free-text job title (e.g., "Lead Infant Teacher"). Not used for authz.
  position: string | null;
  status: StaffStatus;
  hireDate: Date;
  // Optional DOB (PO QA #3 CAMBIO 9). null until the staff fills it in.
  dateOfBirth: Date | null;
  // Profile fields (Opción C — invitee skips at accept, fills via /profile).
  // Address stored as 4 fields matching Center pattern (PO QA #11).
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  // PO QA #31 — relationship discriminator (free-text whitelist).
  emergencyContactRelationship: string | null;
  emergencyContact2Name: string | null;
  emergencyContact2Phone: string | null;
  emergencyContact2Relationship: string | null;
  profileComplete: boolean;
  // Kiosk PIN status (the bcrypt hash itself is never sent to the client).
  kioskPinSet: boolean;
  kioskPinLocked: boolean;
  // Decimal in DB → number in API. Null when not set (Staff.hourlyRate optional).
  hourlyRate: number | null;
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;

  // Background Check compliance — surfaced for UI badges. Soft-tracked
  // (no activation enforcement). PO QA #46 collapsed the model to:
  //   - status (Pending / Completed / Cancelled), the lifecycle phase
  //   - approved (Boolean | null), the outcome — only set when COMPLETED
  // The QA #45 verifier name + date + expiry + notes fields were dropped
  // alongside the schema simplification.
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckApproved: boolean | null;

  // CPR / First Aid certification — PO QA #49: cprCertified boolean
  // replaced by cprStatus enum (PENDING / ACTIVE / EXPIRED / CANCELLED).
  // Aux fields retained (date / expiry / provider / notes / verifier).
  cprStatus: CprStatus;
  cprCertificationDate: Date | null;
  cprExpiryDate: Date | null;
  cprCertificationProvider: string | null;
  cprVerifiedById: string | null;
  cprVerifiedByName: string | null;
  cprNotes: string | null;

  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;

  // Today's time-clock attendance — only populated by the list endpoint
  // (findAll). Detail/update responses omit it (the detail page doesn't render
  // the roster band).
  attendanceToday?: StaffAttendanceTodayDto;
}
