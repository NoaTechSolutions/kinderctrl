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
  parents: ChildParentPayload[];
}

export interface MedicalInfoPayload {
  allergies?: string[];
  medications?: string[];
  medicalConditions?: string[];
  doctorName?: string;
  doctorPhone?: string;
  doctorAddress?: string;
  medicationAllergies?: string;
  medicalPlan?: string;
  hasSpecialNeeds?: boolean;
  // Fase 2 (2A) — extended medical history.
  isUnderDoctorCare?: boolean;
  doctorLastExamDate?: string; // ISO date
  prescribedMedicationDetails?: string;
  medicationSideEffects?: string;
  dentistName?: string;
  dentistPhone?: string;
  dentistAddressStreet?: string;
  dentistAddressCity?: string;
  dentistAddressState?: string;
  dentistAddressZip?: string;
  dentalPlan?: string;
  specialDevices?: string;
  frequentColds?: boolean;
  frequentColdsCount?: number;
  pastIllnesses?: PastIllnesses;
  otherIllnesses?: string;
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
    method: 'PUT',
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
