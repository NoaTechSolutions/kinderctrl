import { apiRequest } from './client';
import type { Child, ChildrenQuery } from '@/lib/types/child';

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
