'use client';

import { useQuery } from '@tanstack/react-query';
import { getLockedUsers } from '@/lib/api/admin';

export const adminKeys = {
  lockedUsers: ['admin', 'locked-users'] as const,
};

export function useLockedUsers() {
  return useQuery({
    queryKey: adminKeys.lockedUsers,
    queryFn: getLockedUsers,
  });
}
