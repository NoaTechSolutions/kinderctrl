// Children Fase 1 — small whitelists kept as plain string unions (validated at
// the DTO boundary with @IsIn) instead of Prisma enums, matching the codebase
// convention for gender / relationship-style fields so adding a value later is
// a no-migration change (see Staff.emergencyContactRelationship, Child.gender).

export const CHILD_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type ChildGender = (typeof CHILD_GENDERS)[number];

export const CHILD_PARENT_RELATIONSHIPS = [
  'MOTHER',
  'FATHER',
  'GUARDIAN',
  'OTHER',
] as const;
export type ChildParentRelationship =
  (typeof CHILD_PARENT_RELATIONSHIPS)[number];

// Enrollment statuses settable through the API. The Prisma ChildStatus enum
// also carries a dead GRADUATED tail value (kept only to avoid a destructive
// enum-recreation during the Fase 1 db push); it is intentionally NOT offered
// here so the API can never write it.
export const CHILD_ENROLLMENT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'WITHDRAWN',
] as const;
export type ChildEnrollmentStatus =
  (typeof CHILD_ENROLLMENT_STATUSES)[number];
