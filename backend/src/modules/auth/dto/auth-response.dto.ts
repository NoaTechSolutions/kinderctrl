import { StaffRole, UserRole } from '@prisma/client';

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    centerId: string | null;
    // User's own name (DIRECTOR/SUPER_ADMIN display). STAFF use staff.firstName.
    firstName: string | null;
    lastName: string | null;
    // Populated for DIRECTOR/STAFF/PARENT/SUPER_ADMIN that have a linked center.
    // Null when the user has no center yet (e.g. fresh DIRECTOR registration).
    center: { id: string; name: string } | null;
    // Populated when the user is linked to a Staff record (UserRole === STAFF).
    // staff.role carries the job title (TEACHER/ASSISTANT/ADMIN) used by the
    // topbar display — distinct from UserRole's auth-level role.
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      role: StaffRole;
    } | null;
    // Populated when the user is linked to a Parent record (UserRole === PARENT).
    parent: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
}
