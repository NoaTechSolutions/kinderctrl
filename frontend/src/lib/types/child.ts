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
}

export interface ChildrenQuery {
  search?: string;
  enrollmentStatus?: ChildEnrollmentStatus[];
}
