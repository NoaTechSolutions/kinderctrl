'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Routes that ARE the locked kiosk experience. Note `/kiosk-settings` is a
// DIRECTOR config page (under the dashboard), NOT part of the locked zone — the
// exit/locked/reset flows deliberately land there AFTER clearing the token.
const KIOSK_PATHS = ['/kiosk', '/kiosk-reset'];

function inKioskZone(path: string): boolean {
  return KIOSK_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function hasKioskSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!window.sessionStorage.getItem('kc-kiosk-token');
  } catch {
    return false;
  }
}

/**
 * TEMA 1 — locks the browser into the kiosk while a kiosk session is active.
 *
 * Mounted globally (in Providers) so it runs on EVERY route, not just /kiosk.
 * While a `kc-kiosk-token` lives in sessionStorage:
 *   - any attempt to reach a non-kiosk route (direct URL, stray link) is bounced
 *     back to /kiosk, and
 *   - the back button is neutralised via a pinned history entry.
 *
 * The only legitimate way out is the Exit-PIN flow, which removes the token
 * BEFORE navigating away — so by the time this guard re-evaluates, there is no
 * session to enforce and the user leaves cleanly. The same is true for the
 * locked / forgot-PIN escape hatches (they clear the token first). And if the
 * session goes stale, the kiosk page drops the dead token and leaves, which
 * also releases this guard — nobody gets trapped.
 */
export function KioskLockGuard() {
  const pathname = usePathname();
  const router = useRouter();

  // Bounce direct navigation away from the kiosk back into it.
  useEffect(() => {
    if (hasKioskSession() && !inKioskZone(pathname)) {
      router.replace('/kiosk');
    }
  }, [pathname, router]);

  // Trap the back button while inside the locked kiosk.
  useEffect(() => {
    if (!hasKioskSession() || !inKioskZone(pathname)) return;

    // Pin a sentinel entry; popping it just re-pins so "back" goes nowhere.
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      if (hasKioskSession()) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [pathname]);

  return null;
}
