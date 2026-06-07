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

// Children Fase 2 (2A) — contact types for the single ChildContact table.
// Whitelist validated at the DTO boundary (no Prisma enum) so a new contact
// kind is a no-migration change.
export const CHILD_CONTACT_TYPES = [
  'EMERGENCY',
  'AUTHORIZED_PICKUP',
  'RESPONSIBLE',
] as const;
export type ChildContactType = (typeof CHILD_CONTACT_TYPES)[number];

// Children Fase 2 (2A) — past-illness checklist keys. Stored as a Json object
// on ChildMedicalInfo.pastIllnesses, each value { checked, date? }. Same
// no-enum convention: editing the list never needs a migration.
export const CHILD_PAST_ILLNESSES = [
  'CHICKEN_POX',
  'ASTHMA',
  'RHEUMATIC_FEVER',
  'HAY_FEVER',
  'DIABETES',
  'EPILEPSY',
  'WHOOPING_COUGH',
  'MUMPS',
  'POLIOMYELITIS',
  'TEN_DAY_MEASLES',
  'THREE_DAY_MEASLES',
] as const;
export type ChildPastIllness = (typeof CHILD_PAST_ILLNESSES)[number];
