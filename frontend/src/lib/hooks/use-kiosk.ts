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
  settings: ['kiosk', 'settings'] as const,
  activity: ['kiosk', 'activity'] as const,
};

export function useKioskSettings() {
  return useQuery({
    queryKey: kioskKeys.settings,
    queryFn: getKioskSettings,
  });
}

export function useKioskActivity() {
  return useQuery({
    queryKey: kioskKeys.activity,
    queryFn: getKioskActivity,
    refetchInterval: 30_000,
  });
}

export function useSetupKiosk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setupKiosk,
    onSuccess: () => qc.invalidateQueries({ queryKey: kioskKeys.settings }),
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
