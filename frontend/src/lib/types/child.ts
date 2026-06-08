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
  // Toilet.
  toiletTrained: boolean;
  toiletWords: string | null;
  toiletHelpLevel: ChildToiletHelpLevel | null;
  toiletAccidents: string | null;
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
}

export interface ChildrenQuery {
  search?: string;
  enrollmentStatus?: ChildEnrollmentStatus[];
}
