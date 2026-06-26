// Mirrors the backend CHILD_DETAIL_INCLUDE shape (children.service.ts). Dates
// arrive as ISO strings over the wire.

export type ChildEnrollmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'WITHDRAWN';

export interface ChildParentLink {
  id: string;
  parentId: string;
  relationship: string; // MOTHER | FATHER | GUARDIAN | OTHER
  isPrimary: boolean;
  livesWithChild: boolean;
  parent: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    status: string;
    homePhone: string | null;
    homeAddressNumber: string | null;
    homeAddressStreet: string | null;
    homeAddressCity: string | null;
    homeAddressState: string | null;
    homeAddressZip: string | null;
    workPhone: string | null;
    workEmployer: string | null;
    workAddressNumber: string | null;
    workAddressStreet: string | null;
    workAddressCity: string | null;
    workAddressState: string | null;
    workAddressZip: string | null;
    user: { id: string; email: string; status: string } | null;
  };
}

// Past-illness checklist (Fase 2 · 2A). Keyed by the illness code
// (CHICKEN_POX, ASTHMA, …); each value { checked, date? }.
export interface PastIllnessEntry {
  checked: boolean;
  date?: string | null;
}
export type PastIllnesses = Record<string, PastIllnessEntry>;

export interface ChildMedicalInfo {
  id: string;
  allergies: unknown;
  medications: unknown;
  medicalConditions: unknown;
  doctorName: string | null;
  doctorPhone: string | null;
  doctorAddress: string | null;
  medicationAllergies: string | null;
  medicalPlan: string | null;
  hasSpecialNeeds: boolean;
  insuranceProvider: string | null;
  insurancePolicy: string | null;
  // Fase 2 (2A) — extended medical history.
  isUnderDoctorCare: boolean;
  doctorLastExamDate: string | null;
  prescribedMedicationDetails: string | null;
  medicationSideEffects: string | null;
  dentistName: string | null;
  dentistPhone: string | null;
  dentistAddressStreet: string | null;
  dentistAddressCity: string | null;
  dentistAddressState: string | null;
  dentistAddressZip: string | null;
  dentalPlan: string | null;
  specialDevices: string | null;
  frequentColds: boolean;
  frequentColdsCount: number | null;
  pastIllnesses: PastIllnesses | null;
  otherIllnesses: string | null;
}

// Fase 2 (2A) — emergency / authorized-pickup / responsible contact.
export type ChildContactType =
  | 'EMERGENCY'
  | 'AUTHORIZED_PICKUP'
  | 'RESPONSIBLE';

export interface ChildContact {
  id: string;
  childId: string;
  contactType: ChildContactType;
  name: string;
  relationship: string | null;
  phone: string | null;
  homePhone: string | null;
  workPhone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  createdAt: string;
}

// Fase 2 (2B) — how much help the child needs with toileting. Mirrors the
// backend CHILD_TOILET_HELP_LEVELS whitelist.
export type ChildToiletHelpLevel =
  | 'INDEPENDENT'
  | 'NEEDS_REMINDERS'
  | 'NEEDS_ASSISTANCE'
  | 'FULL_ASSISTANCE'
  | 'IN_DIAPERS';

// Fase 2 (2B) — single 1:1 development/routines/toilet satellite. Times are
// "HH:mm" strings; milestone ages are months. Mirrors ChildDevelopment on the
// backend.
export interface ChildDevelopment {
  id: string;
  // Development.
  walkedAtMonths: number | null;
  talkedAtMonths: number | null;
  toiletTrainedAtMonths: number | null;
  developmentNotes: string | null;
  // Routines.
  wakeUpTime: string | null;
  bedTime: string | null;
  takesNap: boolean;
  napStartTime: string | null;
  napEndTime: string | null;
  diet: string | null;
  mealTimes: string | null;
  // Fase 2 (2D) — A5 gaps (tri-state booleans: null = unanswered).
  sleepsWell: boolean | null;
  eatingProblems: string | null;
  // Toilet.
  toiletTrained: boolean;
  toiletWordBowel: string | null;
  toiletWordUrination: string | null;
  toiletHelpLevel: ChildToiletHelpLevel | null;
  toiletAccidents: string | null;
  bowelMovementsRegular: boolean | null;
  bowelMovementTime: string | null;
}

// Fase 2 (2D) — infant sleep plan (LIC 9227). Infant-only (UI age-gates edit
// to <12 months); the satellite has no age constraint.
export type ChildSleepLocation = 'CRIB' | 'PLAY_YARD' | 'OTHER';
export type ChildPacifierUse = 'YES' | 'NO' | 'SOMETIMES';
export interface ChildInfantSleep {
  id: string;
  sleepLocation: ChildSleepLocation | null;
  sleepLocationOther: string | null;
  usualSleepHours: string | null;
  averageNapDuration: string | null;
  usesPacifier: ChildPacifierUse | null;
  pacifierBrand: string | null;
  canRollOver: boolean;
  rollOverDate: string | null;
  providerObservedRoll: boolean;
  medicalExemption: boolean;
  medicalExemptionInstructions: string | null;
}

// Fase 2 (2C) — "About Your Child" personality / profile satellite.
export interface ChildPersonality {
  id: string;
  personalityWords: string | null;
  likesToDo: string | null;
  favoriteFoods: string | null;
  dislikedFoods: string | null;
  fears: string | null;
  favoriteIndoorActivity: string | null;
  favoriteOutdoorActivity: string | null;
  favoriteToy: string | null;
  napsAtHome: boolean;
  napTimeAtHome: string | null;
  expressesEmotions: string | null;
  homeDiscipline: string | null;
  getsAlongWith: string | null;
  groupPlayExperience: string | null;
  sickCarePlan: string | null;
  transitionTips: string | null;
  anythingElse: string | null;
}

// Fase 2 (2C) — daycare permission / consent checklist. signedBy is resolved
// by the backend (findOne) from signedByUserId for the audit line; the client
// never writes signedBy*/signedAt.
export interface ChildConsentSigner {
  firstName: string | null;
  lastName: string | null;
  email: string;
}
export interface ChildConsent {
  id: string;
  waterPlay: boolean;
  photoInternal: boolean;
  photoMarketing: boolean;
  sunscreenRepellent: boolean;
  sunscreenProducts: string | null;
  sunscreenInstructions: string | null;
  sunscreenStartDate: string | null;
  sunscreenEndDate: string | null;
  emergencyMedical: boolean;
  emergencyTransport: boolean;
  signedByUserId: string | null;
  signedAt: string | null;
  signedBy?: ChildConsentSigner | null;
}

export interface Child {
  id: string;
  centerId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string; // MALE | FEMALE | OTHER
  photoUrl: string | null;
  addressNumber: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  phone: string | null;
  enrollmentStatus: ChildEnrollmentStatus;
  admissionDate: string | null;
  firstCareDay: string | null;
  reasonForCare: string | null;
  lastEnrollmentDate: string | null;
  enrollmentDate: string;
  createdAt: string;
  updatedAt: string;
  center?: { id: string; name: string };
  medicalInfo?: ChildMedicalInfo | null;
  childParents?: ChildParentLink[];
  contacts?: ChildContact[];
  development?: ChildDevelopment | null;
  personality?: ChildPersonality | null;
  consents?: ChildConsent | null;
  infantSleep?: ChildInfantSleep | null;
  // Today's attendance (detail endpoint, same proxy as the list) — for the
  // detail Overview tab.
  attendanceToday?: ChildAttendanceToday;
}

export interface ChildrenQuery {
  search?: string;
  enrollmentStatus?: ChildEnrollmentStatus[];
}

// ── List/roster shape (lean) — mirrors the backend CHILD_LIST_SELECT. The list
// endpoints (GET /centers/:id/children, GET /children/mine) return THIS, not the
// full Child. The detail page (GET /children/:id) still returns Child. ─────────

// Five states. PRESENT/END_OF_SHIFT come from a real attendance record; the rest
// are derived (today, no children-attendance module yet). EARLY_DEPARTURE is
// supported by the card for the future module but never emitted by the backend
// proxy today.
export type ChildAttendanceStatus =
  | 'PRESENT'
  | 'END_OF_SHIFT'
  | 'NOT_ARRIVED'
  | 'NOT_SCHEDULED'
  | 'EARLY_DEPARTURE';

export interface ChildAttendanceToday {
  status: ChildAttendanceStatus;
  checkInTime?: string; // ISO — formatted client-side
  checkOutTime?: string; // ISO
}

export interface ChildListItem {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  photoUrl: string | null;
  enrollmentStatus: ChildEnrollmentStatus;
  primaryParent: {
    name: string;
    relationship: string; // raw code (MOTHER/…) — localized in the view
    phone: string | null;
  } | null;
  medicalSummary: { allergies: string[]; medications: unknown[] };
  hasInfantSleepPlan: boolean;
  attendanceToday: ChildAttendanceToday;
}

// Distinct parent of a center — for the "link an existing parent" picker
// (create wizard + Parents tab). Backend: GET /centers/:centerId/parents.
export interface CenterParentOption {
  id: string;
  name: string;
  email: string;
}
