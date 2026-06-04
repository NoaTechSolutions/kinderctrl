'use client';

import { useQuery } from '@tanstack/react-query';
import { getLockedUsers, searchUsers } from '@/lib/api/admin';
import type { UserRole } from '@/store/auth';

export const adminKeys = {
  lockedUsers: ['admin', 'locked-users'] as const,
  userSearch: (search: string, roles?: UserRole[]) =>
    ['admin', 'users', 'search', search, roles ?? null] as const,
};

export function useLockedUsers() {
  return useQuery({
    queryKey: adminKeys.lockedUsers,
    queryFn: getLockedUsers,
  });
}

/**
 * Search system users by name or email (SUPER_ADMIN only).
 * Accepts the debounced search string — callers should debounce with
 * useDebouncedValue before passing it in.
 */
export function useSearchUsers(search: string, roles?: UserRole[]) {
  return useQuery({
    queryKey: adminKeys.userSearch(search, roles),
    queryFn: () => searchUsers(search || undefined, roles),
  });
}
