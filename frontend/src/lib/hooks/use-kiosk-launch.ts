'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { activateKiosk, KioskNotConfiguredError } from '@/lib/api/kiosk';

/**
 * Launch flow shared by every "Launch Kiosk" entry point (dashboard card,
 * dashboard mobile section, /kiosk-settings mobile row) so they can never
 * drift: activate (mint a kiosk session token), stash it, then navigate. A
 * plain <Link href="/kiosk"> would skip activation. When the center has no PIN
 * yet (KioskNotConfiguredError) we surface "Set up a PIN first" and bounce to
 * /kiosk-settings.
 */
export function useKioskLaunch() {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  const launchKiosk = async () => {
    setLaunching(true);
    try {
      const result = await activateKiosk();
      sessionStorage.setItem('kc-kiosk-token', result.kioskSessionToken);
      sessionStorage.setItem('kc-kiosk-timeout', String(result.timeoutMin));
      router.push('/kiosk');
    } catch (e) {
      if (e instanceof KioskNotConfiguredError) {
        toast.error('Set up a PIN first');
      } else {
        toast.error('Could not launch kiosk');
      }
      router.push('/kiosk-settings');
    } finally {
      setLaunching(false);
    }
  };

  return { launching, launchKiosk };
}
