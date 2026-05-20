import { BackgroundCheckStatus, StaffRole, StaffStatus } from '@prisma/client';

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
  // Decimal in DB → number in API. Null when not set (Staff.hourlyRate optional).
  hourlyRate: number | null;
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;

  // Background Check compliance — surfaced for UI badges. Soft-tracked
  // (no activation enforcement).
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckDate: Date | null;
  backgroundCheckExpiryDate: Date | null;
  backgroundCheckVerifiedById: string | null;
  backgroundCheckNotes: string | null;

  // CPR / First Aid certification.
  cprCertified: boolean;
  cprCertificationDate: Date | null;
  cprExpiryDate: Date | null;
  cprCertificationProvider: string | null;
  cprVerifiedById: string | null;
  cprNotes: string | null;

  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
}
