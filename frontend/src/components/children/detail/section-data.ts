// Shared "brain" for the unified child-detail tabs. Slice types, seeds, payload
// builders and validators are LIFTED VERBATIM from the old ChildEditForm (the
// 2A/2B logic) — converted from in-component closures to pure functions so each
// tab section can reuse them unchanged. No logic was refactored here, only its
// shape (closure → pure fn taking the slice).

import type {
  Child,
  ChildContactType,
  ChildParentLink,
  PastIllnesses,
} from '@/lib/types/child';
import type {
  ChildContactPayload,
  ChildParentPayload,
  ConsentsPayload,
  DevelopmentPayload,
  InfantSleepPayload,
  MedicalInfoPayload,
  PersonalityPayload,
  UpdateChildPayload,
} from '@/lib/api/children';
import type { ContactOps, ParentOps } from '@/lib/hooks/use-children';
import { emptyAddr, type Addr } from '../child-form-fields';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';

type Translator = (key: string) => string;

// ── Option lists (value + i18n labelKey) ────────────────────────────────────
export const GENDERS = [
  { value: 'MALE', labelKey: 'children.genderMale' },
  { value: 'FEMALE', labelKey: 'children.genderFemale' },
  { value: 'OTHER', labelKey: 'children.genderOther' },
];
export const RELATIONSHIPS = [
  { value: 'MOTHER', labelKey: 'children.relMother' },
  { value: 'FATHER', labelKey: 'children.relFather' },
  { value: 'GUARDIAN', labelKey: 'children.relGuardian' },
  { value: 'OTHER', labelKey: 'children.relOther' },
];
export const ENROLLMENT_STATUSES = [
  { value: 'PENDING', labelKey: 'children.statusPending' },
  { value: 'ACTIVE', labelKey: 'children.statusActive' },
  { value: 'INACTIVE', labelKey: 'children.statusInactive' },
  { value: 'WITHDRAWN', labelKey: 'children.statusWithdrawn' },
];
export const TOILET_HELP_LEVELS = [
  { value: 'INDEPENDENT', labelKey: 'children.toiletHelpIndependent' },
  { value: 'NEEDS_REMINDERS', labelKey: 'children.toiletHelpNeedsReminders' },
  { value: 'NEEDS_ASSISTANCE', labelKey: 'children.toiletHelpNeedsAssistance' },
  { value: 'FULL_ASSISTANCE', labelKey: 'children.toiletHelpFullAssistance' },
  { value: 'IN_DIAPERS', labelKey: 'children.toiletHelpInDiapers' },
];

// Maps a stored value to its i18n label (falls back to the raw value).
export function optionLabel(
  options: Array<{ value: string; labelKey: string }>,
  value: string | null | undefined,
  t: Translator,
): string {
  if (!value) return '';
  const o = options.find((x) => x.value === value);
  return o ? t(o.labelKey) : value;
}

// Past-illness checklist (Fase 2 · 2A).
export const PAST_ILLNESSES = [
  { code: 'CHICKEN_POX', labelKey: 'children.illnessChickenPox' },
  { code: 'ASTHMA', labelKey: 'children.illnessAsthma' },
  { code: 'RHEUMATIC_FEVER', labelKey: 'children.illnessRheumaticFever' },
  { code: 'HAY_FEVER', labelKey: 'children.illnessHayFever' },
  { code: 'DIABETES', labelKey: 'children.illnessDiabetes' },
  { code: 'EPILEPSY', labelKey: 'children.illnessEpilepsy' },
  { code: 'WHOOPING_COUGH', labelKey: 'children.illnessWhoopingCough' },
  { code: 'MUMPS', labelKey: 'children.illnessMumps' },
  { code: 'POLIOMYELITIS', labelKey: 'children.illnessPoliomyelitis' },
  { code: 'TEN_DAY_MEASLES', labelKey: 'children.illnessTenDayMeasles' },
  { code: 'THREE_DAY_MEASLES', labelKey: 'children.illnessThreeDayMeasles' },
] as const;

// The three contact groups + which fields each one shows.
export const CONTACT_GROUPS = [
  {
    type: 'EMERGENCY' as ChildContactType,
    titleKey: 'children.sectionEmergency',
    noteKey: null,
    fields: ['relationship', 'phone', 'address'] as const,
  },
  {
    type: 'AUTHORIZED_PICKUP' as ChildContactType,
    titleKey: 'children.sectionAuthorizedPickup',
    noteKey: 'children.authorizedPickupNote',
    fields: ['relationship'] as const,
  },
  {
    type: 'RESPONSIBLE' as ChildContactType,
    titleKey: 'children.sectionResponsible',
    noteKey: null,
    fields: ['homePhone', 'workPhone'] as const,
  },
] as const;

export type ContactField = (typeof CONTACT_GROUPS)[number]['fields'][number];

// ── Helpers (verbatim from the old form) ────────────────────────────────────
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const undef = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
// PATCH-merge helpers (2B): emptied field → null (clear), not undefined (keep).
export const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);
export const numOrNull = (v: string): number | null => (v.trim() ? Number(v) : null);
export const phoneDigits = (v: string): string | undefined => parsePhoneDigits(v) || undefined;
export const toStrArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
export const splitCsv = (v: string | null | undefined): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

// ── Slice types ─────────────────────────────────────────────────────────────
export interface ChildState {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  address: Addr;
  admissionDate: string;
  firstCareDay: string;
  reasonForCare: string;
  lastEnrollmentDate: string;
  enrollmentStatus: string;
  // Proxy for the primary contact's phone (seeded from / synced to the primary
  // parent's homePhone). NOT written to Child.phone — see ChildDetailsSection.
  phone: string;
}

// The "primary contact": the linked parent flagged isPrimary, falling back to
// the first linked parent. Source of truth for the Child tab's phone field.
export function primaryParentOf(child: Child): ChildParentLink | null {
  const links = child.childParents ?? [];
  return links.find((l) => l.isPrimary) ?? links[0] ?? null;
}

export interface IllnessEntryState {
  checked: boolean;
  date: string;
}

export interface MedicalState {
  doctorName: string;
  doctorPhone: string;
  doctorAddress: string;
  doctorLastExamDate: string;
  isUnderDoctorCare: boolean;
  prescribedMedicationDetails: string;
  medicationSideEffects: string;
  allergies: string[];
  medicationAllergies: string[];
  medications: string[];
  medicalPlan: string;
  hasSpecialNeeds: boolean;
  dentistName: string;
  dentistPhone: string;
  dentistAddress: Addr;
  dentalPlan: string;
  specialDevices: string;
  frequentColds: boolean;
  frequentColdsCount: string;
  pastIllnesses: Record<string, IllnessEntryState>;
  otherIllnesses: string;
}

export interface ParentRow {
  rowKey: string;
  linked: boolean;
  parentId: string;
  displayName: string;
  displayEmail: string;
  mode: 'existing' | 'new';
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  sameAddressAsChild: boolean;
  home: Addr;
  showWork: boolean;
  workPhone: string;
  workEmployer: string;
  work: Addr;
  relationship: string;
  isPrimary: boolean;
  livesWithChild: boolean;
  origRelationship: string;
  origIsPrimary: boolean;
  origLivesWithChild: boolean;
}

export interface ContactRow {
  rowKey: string;
  id: string;
  contactType: ChildContactType;
  name: string;
  relationship: string;
  phone: string;
  homePhone: string;
  workPhone: string;
  address: Addr;
  orig: string;
}

export interface DevelopmentState {
  walkedAtMonths: string;
  talkedAtMonths: string;
  toiletTrainedAtMonths: string;
  developmentNotes: string;
}

export interface RoutinesState {
  wakeUpTime: string;
  bedTime: string;
  takesNap: boolean;
  napStartTime: string;
  napEndTime: string;
  diet: string;
  mealTimes: string;
  // Fase 2 (2D) — tri-state: true / false / null (unanswered).
  sleepsWell: boolean | null;
  eatingProblems: string;
}

export interface ToiletState {
  toiletTrained: boolean;
  // Fase 2 (2D) — split into bowel + urination words.
  toiletWordBowel: string;
  toiletWordUrination: string;
  toiletHelpLevel: string;
  toiletAccidents: string;
  bowelMovementsRegular: boolean | null;
  bowelMovementTime: string;
}

// ── Row factories / signatures (verbatim) ───────────────────────────────────
export function emptyNewRow(key: string): ParentRow {
  return {
    rowKey: key,
    linked: false,
    parentId: '',
    displayName: '',
    displayEmail: '',
    mode: 'new',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    sameAddressAsChild: true,
    home: emptyAddr(),
    showWork: false,
    workPhone: '',
    workEmployer: '',
    work: emptyAddr(),
    relationship: '',
    isPrimary: false,
    livesWithChild: true,
    origRelationship: '',
    origIsPrimary: false,
    origLivesWithChild: false,
  };
}

export function contactSig(r: Omit<ContactRow, 'rowKey' | 'orig'>): string {
  return JSON.stringify({
    contactType: r.contactType,
    name: r.name.trim(),
    relationship: r.relationship.trim(),
    phone: r.phone,
    homePhone: r.homePhone,
    workPhone: r.workPhone,
    address: r.address,
  });
}

export function emptyContactRow(key: string, type: ChildContactType): ContactRow {
  const base = {
    id: '',
    contactType: type,
    name: '',
    relationship: '',
    phone: '',
    homePhone: '',
    workPhone: '',
    address: emptyAddr(),
  };
  return { rowKey: key, ...base, orig: contactSig(base) };
}

export function buildIllnessState(
  saved: PastIllnesses | null,
): Record<string, IllnessEntryState> {
  const out: Record<string, IllnessEntryState> = {};
  for (const it of PAST_ILLNESSES) {
    const s = saved?.[it.code];
    out[it.code] = { checked: s?.checked ?? false, date: s?.date ?? '' };
  }
  return out;
}

// ── Seeds (saved child → editable slice) ────────────────────────────────────
export function seedChild(child: Child): ChildState {
  const primary = primaryParentOf(child);
  return {
    firstName: child.firstName,
    middleName: child.middleName ?? '',
    lastName: child.lastName,
    birthDate: child.dateOfBirth ? child.dateOfBirth.slice(0, 10) : '',
    gender: child.gender,
    address: {
      street: child.addressStreet ?? '',
      city: child.addressCity ?? '',
      state: child.addressState ?? '',
      zip: child.addressZip ?? '',
    },
    admissionDate: child.admissionDate ? child.admissionDate.slice(0, 10) : '',
    firstCareDay: child.firstCareDay ? child.firstCareDay.slice(0, 10) : '',
    reasonForCare: child.reasonForCare ?? '',
    lastEnrollmentDate: child.lastEnrollmentDate ? child.lastEnrollmentDate.slice(0, 10) : '',
    enrollmentStatus: child.enrollmentStatus,
    phone: primary?.parent.homePhone ? formatPhoneUS(primary.parent.homePhone) : '',
  };
}

export function seedMedical(child: Child): MedicalState {
  const med = child.medicalInfo ?? null;
  return {
    doctorName: med?.doctorName ?? '',
    doctorPhone: med?.doctorPhone ? formatPhoneUS(med.doctorPhone) : '',
    doctorAddress: med?.doctorAddress ?? '',
    doctorLastExamDate: med?.doctorLastExamDate
      ? med.doctorLastExamDate.slice(0, 10)
      : '',
    isUnderDoctorCare: med?.isUnderDoctorCare ?? false,
    prescribedMedicationDetails: med?.prescribedMedicationDetails ?? '',
    medicationSideEffects: med?.medicationSideEffects ?? '',
    allergies: toStrArray(med?.allergies),
    medicationAllergies: splitCsv(med?.medicationAllergies),
    medications: toStrArray(med?.medications),
    medicalPlan: med?.medicalPlan ?? '',
    hasSpecialNeeds: med?.hasSpecialNeeds ?? false,
    dentistName: med?.dentistName ?? '',
    dentistPhone: med?.dentistPhone ? formatPhoneUS(med.dentistPhone) : '',
    dentistAddress: {
      street: med?.dentistAddressStreet ?? '',
      city: med?.dentistAddressCity ?? '',
      state: med?.dentistAddressState ?? '',
      zip: med?.dentistAddressZip ?? '',
    },
    dentalPlan: med?.dentalPlan ?? '',
    specialDevices: med?.specialDevices ?? '',
    frequentColds: med?.frequentColds ?? false,
    frequentColdsCount:
      med?.frequentColdsCount != null ? String(med.frequentColdsCount) : '',
    pastIllnesses: buildIllnessState(med?.pastIllnesses ?? null),
    otherIllnesses: med?.otherIllnesses ?? '',
  };
}

export function seedParents(child: Child): ParentRow[] {
  return (child.childParents ?? []).map((link, i) => ({
    ...emptyNewRow(`linked-${link.parentId}-${i}`),
    linked: true,
    parentId: link.parentId,
    firstName: link.parent.firstName,
    middleName: link.parent.middleName ?? '',
    lastName: link.parent.lastName,
    displayName: `${link.parent.firstName} ${link.parent.lastName}`.trim(),
    displayEmail: link.parent.email,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    livesWithChild: link.livesWithChild,
    origRelationship: link.relationship,
    origIsPrimary: link.isPrimary,
    origLivesWithChild: link.livesWithChild,
  }));
}

export function seedContacts(child: Child): ContactRow[] {
  return (child.contacts ?? []).map((c, i) => {
    const base = {
      id: c.id,
      contactType: c.contactType,
      name: c.name,
      relationship: c.relationship ?? '',
      phone: c.phone ? formatPhoneUS(c.phone) : '',
      homePhone: c.homePhone ? formatPhoneUS(c.homePhone) : '',
      workPhone: c.workPhone ? formatPhoneUS(c.workPhone) : '',
      address: {
        street: c.addressStreet ?? '',
        city: c.addressCity ?? '',
        state: c.addressState ?? '',
        zip: c.addressZip ?? '',
      },
    };
    return { rowKey: `c-${c.id}-${i}`, ...base, orig: contactSig(base) };
  });
}

export function seedDevelopment(child: Child): DevelopmentState {
  const dev = child.development ?? null;
  return {
    walkedAtMonths: dev?.walkedAtMonths != null ? String(dev.walkedAtMonths) : '',
    talkedAtMonths: dev?.talkedAtMonths != null ? String(dev.talkedAtMonths) : '',
    toiletTrainedAtMonths:
      dev?.toiletTrainedAtMonths != null ? String(dev.toiletTrainedAtMonths) : '',
    developmentNotes: dev?.developmentNotes ?? '',
  };
}

export function seedRoutines(child: Child): RoutinesState {
  const dev = child.development ?? null;
  return {
    wakeUpTime: dev?.wakeUpTime ?? '',
    bedTime: dev?.bedTime ?? '',
    takesNap: dev?.takesNap ?? false,
    napStartTime: dev?.napStartTime ?? '',
    napEndTime: dev?.napEndTime ?? '',
    diet: dev?.diet ?? '',
    mealTimes: dev?.mealTimes ?? '',
    sleepsWell: dev?.sleepsWell ?? null,
    eatingProblems: dev?.eatingProblems ?? '',
  };
}

export function seedToilet(child: Child): ToiletState {
  const dev = child.development ?? null;
  return {
    toiletTrained: dev?.toiletTrained ?? false,
    // Prefer the new split fields; fall back to the legacy single field for
    // rows that predate the 2D backfill (lands in urination, the generic word).
    toiletWordBowel: dev?.toiletWordBowel ?? '',
    toiletWordUrination: dev?.toiletWordUrination ?? dev?.toiletWords ?? '',
    toiletHelpLevel: dev?.toiletHelpLevel ?? '',
    toiletAccidents: dev?.toiletAccidents ?? '',
    bowelMovementsRegular: dev?.bowelMovementsRegular ?? null,
    bowelMovementTime: dev?.bowelMovementTime ?? '',
  };
}

// ── Payload builders (verbatim) ─────────────────────────────────────────────
export function buildChildPayload(s: ChildState): UpdateChildPayload {
  return {
    firstName: s.firstName.trim(),
    middleName: undef(s.middleName),
    lastName: s.lastName.trim(),
    dateOfBirth: s.birthDate,
    gender: s.gender,
    addressStreet: undef(s.address.street),
    addressCity: undef(s.address.city),
    addressState: undef(s.address.state),
    addressZip: undef(s.address.zip),
    admissionDate: s.admissionDate || undefined,
    firstCareDay: s.firstCareDay || undefined,
    reasonForCare: undef(s.reasonForCare),
    lastEnrollmentDate: s.lastEnrollmentDate || undefined,
    enrollmentStatus: s.enrollmentStatus,
  };
}

export function buildMedicalPayload(s: MedicalState): MedicalInfoPayload {
  return {
    allergies: s.allergies,
    medications: s.medications,
    doctorName: undef(s.doctorName),
    doctorPhone: phoneDigits(s.doctorPhone),
    doctorAddress: undef(s.doctorAddress),
    medicationAllergies: s.medicationAllergies.length
      ? s.medicationAllergies.join(', ')
      : undefined,
    medicalPlan: undef(s.medicalPlan),
    hasSpecialNeeds: s.hasSpecialNeeds,
    isUnderDoctorCare: s.isUnderDoctorCare,
    doctorLastExamDate: s.doctorLastExamDate || undefined,
    prescribedMedicationDetails: undef(s.prescribedMedicationDetails),
    medicationSideEffects: undef(s.medicationSideEffects),
    dentistName: undef(s.dentistName),
    dentistPhone: phoneDigits(s.dentistPhone),
    dentistAddressStreet: undef(s.dentistAddress.street),
    dentistAddressCity: undef(s.dentistAddress.city),
    dentistAddressState: undef(s.dentistAddress.state),
    dentistAddressZip: undef(s.dentistAddress.zip),
    dentalPlan: undef(s.dentalPlan),
    specialDevices: undef(s.specialDevices),
    frequentColds: s.frequentColds,
    frequentColdsCount: s.frequentColdsCount.trim()
      ? Number(s.frequentColdsCount)
      : undefined,
    pastIllnesses: PAST_ILLNESSES.reduce<PastIllnesses>((acc, it) => {
      const e = s.pastIllnesses[it.code];
      if (e?.checked) acc[it.code] = { checked: true, date: e.date || null };
      return acc;
    }, {}),
    otherIllnesses: undef(s.otherIllnesses),
  };
}

export function buildParentOps(
  parents: ParentRow[],
  removedLinkedIds: string[],
  childAddr: Addr,
): ParentOps {
  const ops: ParentOps = { add: [], updateLinks: [], remove: [...removedLinkedIds] };
  for (const p of parents) {
    if (p.linked) {
      if (
        p.relationship !== p.origRelationship ||
        p.isPrimary !== p.origIsPrimary ||
        p.livesWithChild !== p.origLivesWithChild
      ) {
        ops.updateLinks.push({
          parentId: p.parentId,
          relationship: p.relationship,
          isPrimary: p.isPrimary,
          livesWithChild: p.livesWithChild,
        });
      }
      continue;
    }
    const base: ChildParentPayload = {
      relationship: p.relationship,
      isPrimary: p.isPrimary,
      livesWithChild: p.livesWithChild,
    };
    if (p.mode === 'existing') {
      ops.add.push({ ...base, parentId: p.parentId });
    } else {
      const home = p.sameAddressAsChild ? childAddr : p.home;
      ops.add.push({
        ...base,
        firstName: p.firstName.trim(),
        middleName: undef(p.middleName),
        lastName: p.lastName.trim(),
        email: p.email.trim(),
        homePhone: phoneDigits(p.phone),
        homeAddressStreet: undef(home.street),
        homeAddressCity: undef(home.city),
        homeAddressState: undef(home.state),
        homeAddressZip: undef(home.zip),
        ...(p.showWork
          ? {
              workPhone: phoneDigits(p.workPhone),
              workEmployer: undef(p.workEmployer),
              workAddressStreet: undef(p.work.street),
              workAddressCity: undef(p.work.city),
              workAddressState: undef(p.work.state),
              workAddressZip: undef(p.work.zip),
            }
          : {}),
      });
    }
  }
  return ops;
}

export function buildContactOps(
  contacts: ContactRow[],
  removedContactIds: string[],
): ContactOps {
  const ops: ContactOps = { add: [], update: [], remove: [...removedContactIds] };
  for (const c of contacts) {
    const payload: ChildContactPayload = {
      contactType: c.contactType,
      name: c.name.trim(),
      relationship: undef(c.relationship),
      phone: phoneDigits(c.phone),
      homePhone: phoneDigits(c.homePhone),
      workPhone: phoneDigits(c.workPhone),
      addressStreet: undef(c.address.street),
      addressCity: undef(c.address.city),
      addressState: undef(c.address.state),
      addressZip: undef(c.address.zip),
    };
    if (!c.id) {
      ops.add.push(payload);
    } else if (contactSig(c) !== c.orig) {
      ops.update.push({ id: c.id, payload });
    }
  }
  return ops;
}

export function buildDevelopmentPayload(s: DevelopmentState): DevelopmentPayload {
  return {
    walkedAtMonths: numOrNull(s.walkedAtMonths),
    talkedAtMonths: numOrNull(s.talkedAtMonths),
    toiletTrainedAtMonths: numOrNull(s.toiletTrainedAtMonths),
    developmentNotes: orNull(s.developmentNotes),
  };
}

export function buildRoutinesPayload(s: RoutinesState): DevelopmentPayload {
  return {
    wakeUpTime: orNull(s.wakeUpTime),
    bedTime: orNull(s.bedTime),
    takesNap: s.takesNap,
    napStartTime: s.takesNap ? orNull(s.napStartTime) : null,
    napEndTime: s.takesNap ? orNull(s.napEndTime) : null,
    diet: orNull(s.diet),
    mealTimes: orNull(s.mealTimes),
    sleepsWell: s.sleepsWell, // tri-state: true / false / null
    eatingProblems: orNull(s.eatingProblems),
  };
}

export function buildToiletPayload(s: ToiletState): DevelopmentPayload {
  return {
    toiletTrained: s.toiletTrained,
    toiletWordBowel: orNull(s.toiletWordBowel),
    toiletWordUrination: orNull(s.toiletWordUrination),
    toiletHelpLevel: s.toiletHelpLevel || null,
    toiletAccidents: orNull(s.toiletAccidents),
    bowelMovementsRegular: s.bowelMovementsRegular, // tri-state
    bowelMovementTime: orNull(s.bowelMovementTime),
  };
}

// ── Medical, split into independent cards (detail refactor) ─────────────────
// Each card owns a slice + a merge payload builder that sends ONLY its fields.
// Seeds derive from seedMedical() so normalization stays in one place.

const phoneOrNull = (v: string): string | null => parsePhoneDigits(v) || null;

export interface MedDoctorState {
  doctorName: string;
  doctorPhone: string;
  doctorAddress: string;
  doctorLastExamDate: string;
  isUnderDoctorCare: boolean;
  prescribedMedicationDetails: string;
  medicationSideEffects: string;
}
export interface MedAllergiesState {
  allergies: string[];
  medicationAllergies: string[];
  medications: string[];
  medicalPlan: string;
}
export interface MedDentistState {
  dentistName: string;
  dentistPhone: string;
  dentistAddress: Addr;
  dentalPlan: string;
}
export interface MedHealthState {
  medicalConditions: string[];
  specialDevices: string;
  frequentColds: boolean;
  frequentColdsCount: string;
  hasSpecialNeeds: boolean;
}
export interface MedInsuranceState {
  insuranceProvider: string;
  insurancePolicy: string;
}
export interface MedIllnessesState {
  pastIllnesses: Record<string, IllnessEntryState>;
  otherIllnesses: string;
}

export function seedMedDoctor(child: Child): MedDoctorState {
  const m = seedMedical(child);
  return {
    doctorName: m.doctorName,
    doctorPhone: m.doctorPhone,
    doctorAddress: m.doctorAddress,
    doctorLastExamDate: m.doctorLastExamDate,
    isUnderDoctorCare: m.isUnderDoctorCare,
    prescribedMedicationDetails: m.prescribedMedicationDetails,
    medicationSideEffects: m.medicationSideEffects,
  };
}
export function seedMedAllergies(child: Child): MedAllergiesState {
  const m = seedMedical(child);
  return {
    allergies: m.allergies,
    medicationAllergies: m.medicationAllergies,
    medications: m.medications,
    medicalPlan: m.medicalPlan,
  };
}
export function seedMedDentist(child: Child): MedDentistState {
  const m = seedMedical(child);
  return {
    dentistName: m.dentistName,
    dentistPhone: m.dentistPhone,
    dentistAddress: m.dentistAddress,
    dentalPlan: m.dentalPlan,
  };
}
export function seedMedHealth(child: Child): MedHealthState {
  const m = seedMedical(child);
  return {
    // medicalConditions wasn't part of MedicalState; read it straight off the
    // record (same normalization as allergies).
    medicalConditions: toStrArray(child.medicalInfo?.medicalConditions),
    specialDevices: m.specialDevices,
    frequentColds: m.frequentColds,
    frequentColdsCount: m.frequentColdsCount,
    hasSpecialNeeds: m.hasSpecialNeeds,
  };
}
export function seedMedInsurance(child: Child): MedInsuranceState {
  return {
    insuranceProvider: child.medicalInfo?.insuranceProvider ?? '',
    insurancePolicy: child.medicalInfo?.insurancePolicy ?? '',
  };
}
export function seedMedIllnesses(child: Child): MedIllnessesState {
  const m = seedMedical(child);
  return { pastIllnesses: m.pastIllnesses, otherIllnesses: m.otherIllnesses };
}

export function buildMedDoctorPayload(s: MedDoctorState): MedicalInfoPayload {
  return {
    doctorName: orNull(s.doctorName),
    doctorPhone: phoneOrNull(s.doctorPhone),
    doctorAddress: orNull(s.doctorAddress),
    doctorLastExamDate: s.doctorLastExamDate || null,
    isUnderDoctorCare: s.isUnderDoctorCare,
    prescribedMedicationDetails: orNull(s.prescribedMedicationDetails),
    medicationSideEffects: orNull(s.medicationSideEffects),
  };
}
export function buildMedAllergiesPayload(s: MedAllergiesState): MedicalInfoPayload {
  return {
    allergies: s.allergies,
    medications: s.medications,
    medicationAllergies: s.medicationAllergies.length ? s.medicationAllergies.join(', ') : null,
    medicalPlan: orNull(s.medicalPlan),
  };
}
export function buildMedDentistPayload(s: MedDentistState): MedicalInfoPayload {
  return {
    dentistName: orNull(s.dentistName),
    dentistPhone: phoneOrNull(s.dentistPhone),
    dentistAddressStreet: orNull(s.dentistAddress.street),
    dentistAddressCity: orNull(s.dentistAddress.city),
    dentistAddressState: orNull(s.dentistAddress.state),
    dentistAddressZip: orNull(s.dentistAddress.zip),
    dentalPlan: orNull(s.dentalPlan),
  };
}
export function buildMedHealthPayload(s: MedHealthState): MedicalInfoPayload {
  return {
    medicalConditions: s.medicalConditions,
    specialDevices: orNull(s.specialDevices),
    frequentColds: s.frequentColds,
    frequentColdsCount: s.frequentColdsCount.trim() ? Number(s.frequentColdsCount) : null,
    hasSpecialNeeds: s.hasSpecialNeeds,
  };
}
export function buildMedInsurancePayload(s: MedInsuranceState): MedicalInfoPayload {
  return {
    insuranceProvider: orNull(s.insuranceProvider),
    insurancePolicy: orNull(s.insurancePolicy),
  };
}
export function buildMedIllnessesPayload(s: MedIllnessesState): MedicalInfoPayload {
  return {
    pastIllnesses: PAST_ILLNESSES.reduce<PastIllnesses>((acc, it) => {
      const e = s.pastIllnesses[it.code];
      if (e?.checked) acc[it.code] = { checked: true, date: e.date || null };
      return acc;
    }, {}),
    otherIllnesses: orNull(s.otherIllnesses),
  };
}

// ── Personality, split into cards (2C) ──────────────────────────────────────
// Likes & preferences / Behavior & social (LIC 702) / Notes — each a card that
// merges only its fields (same as Medical's cards).

export interface PersLikesState {
  personalityWords: string;
  likesToDo: string;
  favoriteFoods: string;
  dislikedFoods: string;
  fears: string;
  favoriteIndoorActivity: string;
  favoriteOutdoorActivity: string;
  favoriteToy: string;
  napsAtHome: boolean;
  napTimeAtHome: string;
}
export interface PersBehaviorState {
  expressesEmotions: string;
  homeDiscipline: string;
  getsAlongWith: string;
  groupPlayExperience: string;
  sickCarePlan: string;
}
export interface PersNotesState {
  transitionTips: string;
  anythingElse: string;
}

export function seedPersLikes(child: Child): PersLikesState {
  const p = child.personality ?? null;
  return {
    personalityWords: p?.personalityWords ?? '',
    likesToDo: p?.likesToDo ?? '',
    favoriteFoods: p?.favoriteFoods ?? '',
    dislikedFoods: p?.dislikedFoods ?? '',
    fears: p?.fears ?? '',
    favoriteIndoorActivity: p?.favoriteIndoorActivity ?? '',
    favoriteOutdoorActivity: p?.favoriteOutdoorActivity ?? '',
    favoriteToy: p?.favoriteToy ?? '',
    napsAtHome: p?.napsAtHome ?? false,
    napTimeAtHome: p?.napTimeAtHome ?? '',
  };
}
export function seedPersBehavior(child: Child): PersBehaviorState {
  const p = child.personality ?? null;
  return {
    expressesEmotions: p?.expressesEmotions ?? '',
    homeDiscipline: p?.homeDiscipline ?? '',
    getsAlongWith: p?.getsAlongWith ?? '',
    groupPlayExperience: p?.groupPlayExperience ?? '',
    sickCarePlan: p?.sickCarePlan ?? '',
  };
}
export function seedPersNotes(child: Child): PersNotesState {
  const p = child.personality ?? null;
  return {
    transitionTips: p?.transitionTips ?? '',
    anythingElse: p?.anythingElse ?? '',
  };
}

export function buildPersLikesPayload(s: PersLikesState): PersonalityPayload {
  return {
    personalityWords: orNull(s.personalityWords),
    likesToDo: orNull(s.likesToDo),
    favoriteFoods: orNull(s.favoriteFoods),
    dislikedFoods: orNull(s.dislikedFoods),
    fears: orNull(s.fears),
    favoriteIndoorActivity: orNull(s.favoriteIndoorActivity),
    favoriteOutdoorActivity: orNull(s.favoriteOutdoorActivity),
    favoriteToy: orNull(s.favoriteToy),
    napsAtHome: s.napsAtHome,
    // Nap window only persists while napsAtHome is on.
    napTimeAtHome: s.napsAtHome ? orNull(s.napTimeAtHome) : null,
  };
}
export function buildPersBehaviorPayload(s: PersBehaviorState): PersonalityPayload {
  return {
    expressesEmotions: orNull(s.expressesEmotions),
    homeDiscipline: orNull(s.homeDiscipline),
    getsAlongWith: orNull(s.getsAlongWith),
    groupPlayExperience: orNull(s.groupPlayExperience),
    sickCarePlan: orNull(s.sickCarePlan),
  };
}
export function buildPersNotesPayload(s: PersNotesState): PersonalityPayload {
  return {
    transitionTips: orNull(s.transitionTips),
    anythingElse: orNull(s.anythingElse),
  };
}

// ── Consents / Permissions (2C) — ONE card (single signature event) ──────────
export interface ConsentsState {
  waterPlay: boolean;
  photoInternal: boolean;
  photoMarketing: boolean;
  sunscreenRepellent: boolean;
  sunscreenProducts: string;
  sunscreenInstructions: string;
  sunscreenStartDate: string;
  sunscreenEndDate: string;
  emergencyMedical: boolean;
  emergencyTransport: boolean;
}
export function seedConsents(child: Child): ConsentsState {
  const c = child.consents ?? null;
  return {
    waterPlay: c?.waterPlay ?? false,
    photoInternal: c?.photoInternal ?? false,
    photoMarketing: c?.photoMarketing ?? false,
    sunscreenRepellent: c?.sunscreenRepellent ?? false,
    sunscreenProducts: c?.sunscreenProducts ?? '',
    sunscreenInstructions: c?.sunscreenInstructions ?? '',
    sunscreenStartDate: c?.sunscreenStartDate ? c.sunscreenStartDate.slice(0, 10) : '',
    sunscreenEndDate: c?.sunscreenEndDate ? c.sunscreenEndDate.slice(0, 10) : '',
    emergencyMedical: c?.emergencyMedical ?? false,
    emergencyTransport: c?.emergencyTransport ?? false,
  };
}
// ── Infant sleep plan (2D, LIC 9227) ─────────────────────────────────────────
export const SLEEP_LOCATIONS = [
  { value: 'CRIB', labelKey: 'children.sleepCrib' },
  { value: 'PLAY_YARD', labelKey: 'children.sleepPlayYard' },
  { value: 'OTHER', labelKey: 'children.sleepOther' },
];
export const PACIFIER_USE = [
  { value: 'YES', labelKey: 'children.pacifierYes' },
  { value: 'NO', labelKey: 'children.pacifierNo' },
  { value: 'SOMETIMES', labelKey: 'children.pacifierSometimes' },
];

export interface InfantSleepState {
  sleepLocation: string;
  sleepLocationOther: string;
  usualSleepHours: string;
  averageNapDuration: string;
  usesPacifier: string;
  pacifierBrand: string;
  canRollOver: boolean;
  rollOverDate: string;
  providerObservedRoll: boolean;
  medicalExemption: boolean;
  medicalExemptionInstructions: string;
}
export function seedInfantSleep(child: Child): InfantSleepState {
  const s = child.infantSleep ?? null;
  return {
    sleepLocation: s?.sleepLocation ?? '',
    sleepLocationOther: s?.sleepLocationOther ?? '',
    usualSleepHours: s?.usualSleepHours ?? '',
    averageNapDuration: s?.averageNapDuration ?? '',
    usesPacifier: s?.usesPacifier ?? '',
    pacifierBrand: s?.pacifierBrand ?? '',
    canRollOver: s?.canRollOver ?? false,
    rollOverDate: s?.rollOverDate ? s.rollOverDate.slice(0, 10) : '',
    providerObservedRoll: s?.providerObservedRoll ?? false,
    medicalExemption: s?.medicalExemption ?? false,
    medicalExemptionInstructions: s?.medicalExemptionInstructions ?? '',
  };
}
export function buildInfantSleepPayload(s: InfantSleepState): InfantSleepPayload {
  return {
    sleepLocation: s.sleepLocation || null,
    // "Other" detail only persists when OTHER is selected.
    sleepLocationOther: s.sleepLocation === 'OTHER' ? orNull(s.sleepLocationOther) : null,
    usualSleepHours: orNull(s.usualSleepHours),
    averageNapDuration: orNull(s.averageNapDuration),
    usesPacifier: s.usesPacifier || null,
    pacifierBrand: orNull(s.pacifierBrand),
    canRollOver: s.canRollOver,
    rollOverDate: s.canRollOver ? s.rollOverDate || null : null,
    providerObservedRoll: s.providerObservedRoll,
    medicalExemption: s.medicalExemption,
    medicalExemptionInstructions: s.medicalExemption ? orNull(s.medicalExemptionInstructions) : null,
  };
}

export function buildConsentsPayload(s: ConsentsState): ConsentsPayload {
  return {
    waterPlay: s.waterPlay,
    photoInternal: s.photoInternal,
    photoMarketing: s.photoMarketing,
    sunscreenRepellent: s.sunscreenRepellent,
    // Sub-fields only persist while the sunscreen consent is granted.
    sunscreenProducts: s.sunscreenRepellent ? orNull(s.sunscreenProducts) : null,
    sunscreenInstructions: s.sunscreenRepellent ? orNull(s.sunscreenInstructions) : null,
    sunscreenStartDate: s.sunscreenRepellent ? s.sunscreenStartDate || null : null,
    sunscreenEndDate: s.sunscreenRepellent ? s.sunscreenEndDate || null : null,
    emergencyMedical: s.emergencyMedical,
    emergencyTransport: s.emergencyTransport,
  };
}

// ── Validators (verbatim) ───────────────────────────────────────────────────
export function childErrors(s: ChildState, t: Translator, todayStr: string): string[] {
  const e: string[] = [];
  if (!s.firstName.trim()) e.push(t('children.errFirstNameRequired'));
  if (!s.lastName.trim()) e.push(t('children.errLastNameRequired'));
  if (!s.birthDate) e.push(t('children.errBirthDateRequired'));
  else if (s.birthDate > todayStr) e.push(t('children.errBirthDateFuture'));
  if (!s.gender) e.push(t('children.errGenderRequired'));
  return e;
}

export function parentErrors(parents: ParentRow[], t: Translator): string[] {
  const e: string[] = [];
  if (parents.length === 0) e.push(t('children.errAtLeastOneParent'));
  parents.forEach((p, i) => {
    const tag = `${t('children.parentWord')} ${i + 1}`;
    if (!p.relationship) e.push(`${tag}: ${t('children.errRelationshipRequired')}`);
    if (!p.linked && p.mode === 'existing' && !p.parentId) e.push(`${tag}: ${t('children.errPickExisting')}`);
    if (!p.linked && p.mode === 'new') {
      if (!p.firstName.trim()) e.push(`${tag}: ${t('children.errFirstNameRequired')}`);
      if (!p.lastName.trim()) e.push(`${tag}: ${t('children.errLastNameRequired')}`);
      if (!EMAIL_RE.test(p.email.trim())) e.push(`${tag}: ${t('children.errEmailRequired')}`);
    }
  });
  if (parents.length > 0 && !parents.some((p) => p.isPrimary)) e.push(t('children.errMarkPrimary'));
  return e;
}

export function contactErrors(contacts: ContactRow[], t: Translator): string[] {
  const e: string[] = [];
  contacts.forEach((c) => {
    if (!c.name.trim()) e.push(t('children.errContactNameRequired'));
  });
  return [...new Set(e)];
}

export function routinesErrors(routines: RoutinesState, t: Translator): string[] {
  const e: string[] = [];
  if (
    routines.takesNap &&
    routines.napStartTime &&
    routines.napEndTime &&
    routines.napEndTime <= routines.napStartTime
  ) {
    e.push(t('children.errNapEndBeforeStart'));
  }
  return e;
}
