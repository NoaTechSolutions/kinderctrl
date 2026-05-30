import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeMyPassword,
  getMyProfile,
  updateMyEmail,
  updateMyEmergencyContact,
  updateMyPreferences,
  updateMyProfile,
  type ChangeMyPasswordInput,
  type MyProfile,
  type UpdateMyEmailInput,
  type UpdateMyEmergencyContactInput,
  type UpdateMyPreferencesInput,
  type UpdateMyProfileInput,
} from '@/lib/api/auth';

// Issue #6 — /profile module hooks. Keep separate from use-staff: this
// surface is the role-agnostic self-service profile, whereas use-staff
// covers admin-facing staff management.
//
// Query key shape:
//   ['auth', 'me', 'profile']   — the unified profile read
// The /auth/me composite (auth store + getCurrentUser) keeps its own
// freshness; this is only the firstName/lastName/phone slice.
export const profileQueryKeys = {
  me: ['auth', 'me', 'profile'] as const,
};

export function useMyAuthProfile() {
  return useQuery({
    queryKey: profileQueryKeys.me,
    queryFn: getMyProfile,
  });
}

export function useUpdateMyAuthProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyProfileInput) => updateMyProfile(input),
    onSuccess: (updated: MyProfile) => {
      // Seed the cache from the response so the card re-renders with the
      // saved values without a roundtrip. Also invalidate the broader
      // /auth/me query — the topbar greeting reads from auth store, but
      // any UI hanging off the profile query (e.g., the avatar initials)
      // refreshes in the same tick.
      qc.setQueryData(profileQueryKeys.me, updated);
    },
  });
}

// Email + password mutations have a destructive side effect — every
// session is revoked server-side. The mutation does NOT clear local
// auth state; the calling component handles redirect-to-/login after
// success so the UX can show a toast + ConfirmDialog confirmation
// transition before the page swap.
export function useUpdateMyEmail() {
  return useMutation({
    mutationFn: (input: UpdateMyEmailInput) => updateMyEmail(input),
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (input: ChangeMyPasswordInput) => changeMyPassword(input),
  });
}

// v2 — non-destructive mutations. Both reseed the cache from the
// response (backend returns the updated MyProfile) so dependent cards
// re-render in the same tick without a refetch roundtrip.
export function useUpdateMyPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyPreferencesInput) => updateMyPreferences(input),
    onSuccess: (updated: MyProfile) => {
      qc.setQueryData(profileQueryKeys.me, updated);
    },
  });
}

export function useUpdateMyEmergencyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyEmergencyContactInput) =>
      updateMyEmergencyContact(input),
    onSuccess: (updated: MyProfile) => {
      qc.setQueryData(profileQueryKeys.me, updated);
    },
  });
}
