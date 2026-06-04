import { apiRequest } from './client';
import type { UserRole } from '@/store/auth';

export interface LockedUser {
  id: string;
  email: string;
  role: UserRole;
  failedLoginAttempts: number;
  // ISO datetime string from the API.
  lockedUntil: string;
  lastLoginAt: string | null;
  center: { id: string; name: string } | null;
}

export function getLockedUsers() {
  return apiRequest<LockedUser[]>('/admin/users/locked', { method: 'GET' });
}

export function unlockUser(id: string) {
  return apiRequest<{ success: true; userId: string }>(
    `/admin/users/${id}/unlock`,
    { method: 'POST' },
  );
}

// Global stats moved to lib/api/centers.ts (endpoint is /centers/global-stats).

// =================================================== User search (SUPER_ADMIN)

export interface SystemUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  center: { id: string; name: string } | null;
}

/**
 * Search system users by name or email.
 * Blank / no search returns the first 25 users; otherwise case-insensitive
 * match on firstName / lastName / email, capped at 25.
 * Requires SUPER_ADMIN authentication.
 */
export function searchUsers(search?: string, roles?: UserRole[]) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (roles && roles.length > 0) params.set('roles', roles.join(','));
  const qs = params.toString();
  return apiRequest<SystemUser[]>(
    qs ? `/admin/users?${qs}` : '/admin/users',
    { method: 'GET' },
  );
}
