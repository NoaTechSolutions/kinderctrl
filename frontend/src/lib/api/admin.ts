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
