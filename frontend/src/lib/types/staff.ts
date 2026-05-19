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

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  // ISO datetime string from the API; render with new Date().toLocaleDateString().
  hireDate: string;
  hourlyRate: number | null;
  // Free-form on the backend — typed as string here, narrow at display sites
  // if you need a specific union of values.
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
}
