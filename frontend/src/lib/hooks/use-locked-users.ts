'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLockedUsers, unlockUser } from '@/lib/api/admin';

const LOCKED_USERS_KEY = ['admin', 'locked-users'] as const;

export function useLockedUsers() {
  return useQuery({
    queryKey: LOCKED_USERS_KEY,
    queryFn: getLockedUsers,
    // Lockouts naturally expire; refetch occasionally so the list trims
    // itself without a manual reload. 30s is a fair trade between
    // freshness and request volume for an admin-only screen.
    refetchInterval: 30_000,
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unlockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOCKED_USERS_KEY });
    },
  });
}
