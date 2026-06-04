'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getKioskSettings,
  getKioskActivity,
  setupKiosk,
  activateKiosk,
  deactivateKiosk,
  resetKioskPin,
} from '@/lib/api/kiosk';

export const kioskKeys = {
  // Default (no centerId) key — used by /kiosk-settings director flow.
  settings: ['kiosk', 'settings'] as const,
  // Scoped key — used by SUPER_ADMIN center-detail tab to avoid collisions.
  settingsForCenter: (centerId: string) => ['kiosk', 'settings', centerId] as const,
  activity: ['kiosk', 'activity'] as const,
};

// centerId is optional — omitting it keeps the /kiosk-settings director flow
// identical to before (same query key, same API call, no centerId param).
export function useKioskSettings(centerId?: string) {
  return useQuery({
    queryKey: centerId ? kioskKeys.settingsForCenter(centerId) : kioskKeys.settings,
    queryFn: () => getKioskSettings(centerId),
  });
}

export function useKioskActivity() {
  return useQuery({
    queryKey: kioskKeys.activity,
    queryFn: getKioskActivity,
    refetchInterval: 30_000,
  });
}

// centerId is bound at hook level (same pattern as useCreateSchedule).
// Omitting it keeps the existing /kiosk-settings director flow unchanged.
export function useSetupKiosk(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof setupKiosk>[0]) => setupKiosk(data, centerId),
    onSuccess: () => {
      if (centerId) {
        qc.invalidateQueries({ queryKey: kioskKeys.settingsForCenter(centerId) });
      } else {
        qc.invalidateQueries({ queryKey: kioskKeys.settings });
      }
    },
  });
}

export function useActivateKiosk() {
  return useMutation({ mutationFn: activateKiosk });
}

export function useDeactivateKiosk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateKiosk,
    onSuccess: () => qc.invalidateQueries({ queryKey: kioskKeys.settings }),
  });
}

export function useResetKioskPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetKioskPin,
    onSuccess: () => qc.invalidateQueries({ queryKey: kioskKeys.settings }),
  });
}
