'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type UserRole } from '@/store/auth';

// Client-side role gate. Auth lives in localStorage (Zustand persist), so
// `hasHydrated` is the signal that the persisted user has been restored —
// rendering `children` before that flips would flash unauthed UI on reload.
export function useRequireRole(allowed: readonly UserRole[]) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const isAllowed = !!user && allowed.includes(user.role);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAllowed) router.replace('/dashboard');
  }, [hasHydrated, isAllowed, router]);

  return { ready: hasHydrated, allowed: isAllowed };
}
