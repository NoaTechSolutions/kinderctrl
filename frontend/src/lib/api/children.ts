import { apiRequest } from './client';
import type {
  Child,
  ChildContact,
  ChildContactType,
  ChildrenQuery,
  PastIllnesses,
} from '@/lib/types/child';

// Director/SA — a center's roster. Backend: GET /centers/:centerId/children.
// Returns a plain array (no pagination in Fase 1).
export function listCenterChildren(
  centerId: string,
  query: ChildrenQuery = {},
): Promise<Child[]> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.enrollmentStatus?.length) {
    params.set('enrollmentStatus', query.enrollmentStatus.join(','));
  }
  const qs = params.toString();
  return apiRequest<Child[]>(
    `/centers/${centerId}/children${qs ? `?${qs}` : ''}`,
  );
}

// Parent — only their own children. Backend: GET /children/mine.
export function getMyChildren(): Promise<Child[]> {
  return apiRequest<Child[]>('/children/mine');
}

// Single child detail (Director/SA/Parent-own). Backend: GET /children/:id.
export function getChild(id: string): Promise<Child> {
  return apiRequest<Child>(`/children/${id}`);
}

// ── Create (Director/SA) ────────────────────────────────────────────────────

// One parent entry in the create payload — link an existing parent (parentId)
// OR create a new one (firstName/lastName/email + optional contact). Matches
// the backend ChildParentInputDto.
export interface ChildParentPayload {
  parentId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  homePhone?: string;
  homeAddressNumber?: string;
  homeAddressStreet?: string;
  homeAddressCity?: string;
  homeAddressState?: string;
  homeAddressZip?: string;
  workPhone?: string;
  workEmployer?: string;
  workAddressNumber?: string;
  workAddressStreet?: string;
  workAddressCity?: string;
  workAddressState?: string;
  workAddressZip?: string;
  relationship: string;
  isPrimary?: boolean;
  livesWithChild?: boolean;
}

export interface CreateChildPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  gender: string; // MALE | FEMALE | OTHER
  photoUrl?: string;
  addressNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  phone?: string;
  admissionDate?: string;
  firstCareDay?: string;
  reasonForCare?: string;
  lastEnrollmentDate?: string;
  parents: ChildParentPayload[];
}

// PATCH-merge (detail refactor): the Medical tab's cards each send ONLY their
// fields. `null` clears a column, `undefined`/omitted leaves it. Arrays/object
// set the value when sent (the owning card always sends them). Booleans carry
// the current toggle state.
export interface MedicalInfoPayload {
  allergies?: string[];
  medications?: string[];
  medicalConditions?: string[];
  doctorName?: string | null;
  doctorPhone?: string | null;
  doctorAddress?: string | null;
  medicationAllergies?: string | null;
  medicalPlan?: string | null;
  hasSpecialNeeds?: boolean;
  insuranceProvider?: string | null;
  insurancePolicy?: string | null;
  // Fase 2 (2A) — extended medical history.
  isUnderDoctorCare?: boolean;
  doctorLastExamDate?: string | null; // ISO date
  prescribedMedicationDetails?: string | null;
  medicationSideEffects?: string | null;
  dentistName?: string | null;
  dentistPhone?: string | null;
  dentistAddressStreet?: string | null;
  dentistAddressCity?: string | null;
  dentistAddressState?: string | null;
  dentistAddressZip?: string | null;
  dentalPlan?: string | null;
  specialDevices?: string | null;
  frequentColds?: boolean;
  frequentColdsCount?: number | null;
  pastIllnesses?: PastIllnesses;
  otherIllnesses?: string | null;
}

export function createChild(
  centerId: string,
  payload: CreateChildPayload,
): Promise<Child> {
  return apiRequest<Child>(`/centers/${centerId}/children`, {
    method: 'POST',
    body: payload,
  });
}

export function updateChildMedical(
  childId: string,
  payload: MedicalInfoPayload,
): Promise<unknown> {
  return apiRequest(`/children/${childId}/medical-info`, {
    method: 'PATCH',
    body: payload,
  });
}

// ── Update (Director/SA) — used by the edit form (hito 2) ───────────────────

export type UpdateChildPayload = Partial<Omit<CreateChildPayload, 'parents'>> & {
  enrollmentStatus?: string;
};

export function updateChild(
  id: string,
  payload: UpdateChildPayload,
): Promise<Child> {
  return apiRequest<Child>(`/children/${id}`, { method: 'PATCH', body: payload });
}

export function addChildParent(
  childId: string,
  payload: ChildParentPayload,
): Promise<Child> {
  return apiRequest<Child>(`/children/${childId}/parents`, {
    method: 'POST',
    body: payload,
  });
}

export function updateChildParentLink(
  childId: string,
  parentId: string,
  payload: {
    relationship?: string;
    isPrimary?: boolean;
    livesWithChild?: boolean;
    // Detail refactor — syncs the primary contact's phone (Parent satellite),
    // not the pivot. '' clears it; omit to leave unchanged.
    homePhone?: string;
  },
): Promise<Child> {
  return apiRequest<Child>(`/children/${childId}/parents/${parentId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function removeChildParent(
  childId: string,
  parentId: string,
): Promise<void> {
  return apiRequest<void>(`/children/${childId}/parents/${parentId}`, {
    method: 'DELETE',
  });
}

// ── Contacts (Director/SA) — Fase 2 · 2A ────────────────────────────────────
// Matches the backend CreateChildContactDto. `contactType` is the discriminator
// (EMERGENCY / AUTHORIZED_PICKUP / RESPONSIBLE); the rest are optional.
export interface ChildContactPayload {
  contactType: ChildContactType;
  name: string;
  relationship?: string;
  phone?: string;
  homePhone?: string;
  workPhone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
}

export function listChildContacts(childId: string): Promise<ChildContact[]> {
  return apiRequest<ChildContact[]>(`/children/${childId}/contacts`);
}

export function addChildContact(
  childId: string,
  payload: ChildContactPayload,
): Promise<ChildContact> {
  return apiRequest<ChildContact>(`/children/${childId}/contacts`, {
    method: 'POST',
    body: payload,
  });
}

export function updateChildContact(
  childId: string,
  contactId: string,
  payload: Partial<ChildContactPayload>,
): Promise<ChildContact> {
  return apiRequest<ChildContact>(
    `/children/${childId}/contacts/${contactId}`,
    { method: 'PATCH', body: payload },
  );
}

export function removeChildContact(
  childId: string,
  contactId: string,
): Promise<void> {
  return apiRequest<void>(`/children/${childId}/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

// ── Development / routines / toilet (Director/SA) — Fase 2 · 2B ──────────────
// Single 1:1 satellite, partial-MERGE PATCH: each of the three edit tabs sends
// only ITS fields. Anything omitted is left untouched server-side. Matches the
// backend UpdateDevelopmentDto.
// `null` clears a column (merge), `undefined`/omitted leaves it. Booleans are
// never null — they always carry the current toggle state.
export interface DevelopmentPayload {
  walkedAtMonths?: number | null;
  talkedAtMonths?: number | null;
  toiletTrainedAtMonths?: number | null;
  developmentNotes?: string | null;
  wakeUpTime?: string | null;
  bedTime?: string | null;
  takesNap?: boolean;
  napStartTime?: string | null;
  napEndTime?: string | null;
  diet?: string | null;
  mealTimes?: string | null;
  // Fase 2 (2D) — tri-state booleans: true / false / null (unanswered).
  sleepsWell?: boolean | null;
  eatingProblems?: string | null;
  toiletTrained?: boolean;
  toiletWordBowel?: string | null;
  toiletWordUrination?: string | null;
  toiletHelpLevel?: string | null;
  toiletAccidents?: string | null;
  bowelMovementsRegular?: boolean | null;
  bowelMovementTime?: string | null;
}

export function updateChildDevelopment(
  childId: string,
  payload: DevelopmentPayload,
): Promise<unknown> {
  return apiRequest(`/children/${childId}/development`, {
    method: 'PATCH',
    body: payload,
  });
}

// ── Personality + Consents (Director/SA) — Fase 2 · 2C ──────────────────────
// Both PATCH-merge; null clears, omitted leaves unchanged.
export interface PersonalityPayload {
  personalityWords?: string | null;
  likesToDo?: string | null;
  favoriteFoods?: string | null;
  dislikedFoods?: string | null;
  fears?: string | null;
  favoriteIndoorActivity?: string | null;
  favoriteOutdoorActivity?: string | null;
  favoriteToy?: string | null;
  napsAtHome?: boolean;
  napTimeAtHome?: string | null;
  expressesEmotions?: string | null;
  homeDiscipline?: string | null;
  getsAlongWith?: string | null;
  groupPlayExperience?: string | null;
  sickCarePlan?: string | null;
  transitionTips?: string | null;
  anythingElse?: string | null;
}

// signedBy*/signedAt are intentionally absent — the server stamps them.
export interface ConsentsPayload {
  waterPlay?: boolean;
  photoInternal?: boolean;
  photoMarketing?: boolean;
  sunscreenRepellent?: boolean;
  sunscreenProducts?: string | null;
  sunscreenInstructions?: string | null;
  sunscreenStartDate?: string | null; // ISO date
  sunscreenEndDate?: string | null;
  emergencyMedical?: boolean;
  emergencyTransport?: boolean;
}

export function updateChildPersonality(
  childId: string,
  payload: PersonalityPayload,
): Promise<unknown> {
  return apiRequest(`/children/${childId}/personality`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateChildConsents(
  childId: string,
  payload: ConsentsPayload,
): Promise<unknown> {
  return apiRequest(`/children/${childId}/consents`, {
    method: 'PATCH',
    body: payload,
  });
}

// ── Infant sleep plan (Director/SA) — Fase 2 · 2D (LIC 9227) ────────────────
export interface InfantSleepPayload {
  sleepLocation?: string | null;
  sleepLocationOther?: string | null;
  usualSleepHours?: string | null;
  averageNapDuration?: string | null;
  usesPacifier?: string | null;
  pacifierBrand?: string | null;
  canRollOver?: boolean;
  rollOverDate?: string | null;
  providerObservedRoll?: boolean;
  medicalExemption?: boolean;
  medicalExemptionInstructions?: string | null;
}

export function updateChildInfantSleep(
  childId: string,
  payload: InfantSleepPayload,
): Promise<unknown> {
  return apiRequest(`/children/${childId}/infant-sleep`, {
    method: 'PATCH',
    body: payload,
  });
}
