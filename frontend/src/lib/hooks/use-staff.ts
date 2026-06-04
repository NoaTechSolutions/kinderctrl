import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvitation,
  changeStaffStatus,
  createStaff,
  deleteStaff,
  getComplianceSummary,
  getInvitation,
  getInvitations,
  getMyProfile,
  getStaff,
  getStaffMember,
  inviteStaff,
  resendInvitation,
  revokeInvitation,
  sendStaffPasswordReset,
  setStaffKioskPin,
  removeStaffKioskPin,
  unlockStaffKioskPin,
  getLockedKioskPins,
  updateBackgroundCheck,
  updateCpr,
  updateMyProfile,
  updateStaff,
} from '@/lib/api/staff';
import { apiRequest } from '@/lib/api/client';
import { useAuthStore, type AuthUser } from '@/store/auth';
import type { InvitationsQuery, StaffQuery, StaffStatus } from '@/lib/types/staff';
import type {
  AcceptInvitationFormData,
  InviteStaffFormData,
  StaffFormData,
  StaffUpdateFormData,
  UpdateBackgroundCheckFormData,
  UpdateCprFormData,
  UpdateProfileFormData,
} from '@/lib/schemas/staff';

export const staffQueryKeys = {
  // Parent prefix for all staff-list queries. Invalidate this to refresh
  // every paginated/filtered slice (cache keys live underneath).
  all: ['staff'] as const,
  list: (query: StaffQuery) =>
    [
      'staff',
      'list',
      query.page ?? 1,
      query.limit ?? 25,
      // The search term MUST be part of the cache key. Without it, typing
      // a query reuses the cached (unsearched) page — React Query sees an
      // unchanged key and never refetches, so the list shows stale, wrong
      // results (e.g. searching a center name returned the full roster).
      query.search ?? '',
      query.centerId ?? '',
    ] as const,
  detail: (id: string) => ['staff', id] as const,
  invitation: (token: string) => ['staff', 'invitation', token] as const,
  complianceSummary: (centerId: string | undefined) =>
    ['staff', 'compliance-summary', centerId ?? 'default'] as const,
};

export function useStaff(query: StaffQuery = {}) {
  return useQuery({
    queryKey: staffQueryKeys.list(query),
    queryFn: () => getStaff(query),
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: id ? staffQueryKeys.detail(id) : ['staff', 'unknown'],
    queryFn: () => getStaffMember(id as string),
    enabled: !!id,
  });
}

// PO QA #30 Opción E: useCreateStaff restored for SUPER_ADMIN manual
// create surface. Backend creates Staff (ACTIVE) + User (password=null)
// + sends welcome email. The mutation invalidates staffQueryKeys.all so
// the new row appears on /staff list immediately.
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffFormData) => createStaff(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.setQueryData(staffQueryKeys.detail(created.id), created);
    },
  });
}

// Status-only transition (Activate ↔ Suspend) from the staff table dropdown.
// Invalidates the list so the row's badge updates, and seeds the detail cache.
export function useChangeStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StaffStatus }) =>
      changeStaffStatus(id, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.setQueryData(staffQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: StaffUpdateFormData;
    }) => updateStaff(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.setQueryData(staffQueryKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: (_, id) => {
      // Backend does soft delete (status=TERMINATED) and TERMINATED rows
      // are filtered out of GET /staff. So an invalidate is enough — the
      // row simply disappears from the list on next read.
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.invalidateQueries({ queryKey: staffQueryKeys.detail(id) });
    },
  });
}

// ─── Invitation flow hooks ──────────────────────────────────────

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteStaffFormData) => inviteStaff(data),
    onSuccess: () => {
      // PO QA #13: refresh the invitations list so the new invite shows up
      // immediately. Includes the old pending-list invalidation for any
      // stale subscribers that haven't refreshed yet.
      qc.invalidateQueries({ queryKey: ['staff', 'invitations'] });
    },
  });
}

// PO QA #13/#22 — list of invitations with computed lifecycle status,
// paginated. Status filter + pagination are part of the cache key so
// different tabs/pages cache independently.
const invitationsKey = (query: InvitationsQuery) =>
  [
    'staff',
    'invitations',
    query.status ?? 'ALL',
    query.centerId ?? 'default',
    query.page ?? 1,
    query.limit ?? 15,
  ] as const;

export function useInvitations(query: InvitationsQuery = {}) {
  return useQuery({
    queryKey: invitationsKey(query),
    queryFn: () => getInvitations(query),
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: () => {
      // Resend rotates the token — the row id changes, so invalidate the
      // whole invitations list to pick up the new entry.
      qc.invalidateQueries({ queryKey: ['staff', 'invitations'] });
    },
  });
}

// PO QA #28 Opción F: admin-triggered password reset for a staff member.
// Invalidates the staff detail cache so any session-related UI cues
// refresh (currently none, but the hook is the right place for it).
export function useSendStaffPasswordReset() {
  return useMutation({
    mutationFn: (staffId: string) => sendStaffPasswordReset(staffId),
  });
}

export function useSetStaffKioskPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, pin }: { staffId: string; pin: string }) =>
      setStaffKioskPin(staffId, pin),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffQueryKeys.all }),
  });
}

export function useRemoveStaffKioskPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => removeStaffKioskPin(staffId),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffQueryKeys.all }),
  });
}

export function useUnlockStaffKioskPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => unlockStaffKioskPin(staffId),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffQueryKeys.all }),
  });
}

export function useLockedKioskPins(enabled = true) {
  return useQuery({
    queryKey: ['staff', 'kiosk-pin-locked'] as const,
    queryFn: getLockedKioskPins,
    enabled,
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'invitations'] });
    },
  });
}

// Public preflight query for the accept page. enabled=false until we
// have a token; throws-on-404 surfaces naturally via the .error.
export function useInvitation(token: string | undefined) {
  return useQuery({
    queryKey: token
      ? staffQueryKeys.invitation(token)
      : ['staff', 'invitation', 'pending'],
    queryFn: () => getInvitation(token as string),
    enabled: !!token,
    // Don't retry on 404 — invalid/expired tokens won't become valid.
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  return useMutation({
    mutationFn: (data: AcceptInvitationFormData) =>
      acceptInvitation(token, data),
    // No cache invalidation needed — invitee isn't logged in pre-mutation.
    // Post-mutation the caller persists tokens + redirects.
  });
}

// ─── Compliance hooks ───────────────────────────────────────────

export function useUpdateBackgroundCheck(staffId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBackgroundCheckFormData) =>
      updateBackgroundCheck(staffId, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.setQueryData(staffQueryKeys.detail(updated.id), updated);
      // Summary cache is keyed by centerId; the easy/safe move is to
      // invalidate all summary queries — there are at most a handful.
      qc.invalidateQueries({ queryKey: ['staff', 'compliance-summary'] });
    },
  });
}

export function useUpdateCpr(staffId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCprFormData) => updateCpr(staffId, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: staffQueryKeys.all });
      qc.setQueryData(staffQueryKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: ['staff', 'compliance-summary'] });
    },
  });
}

export function useComplianceSummary(centerId?: string) {
  return useQuery({
    queryKey: staffQueryKeys.complianceSummary(centerId),
    queryFn: () => getComplianceSummary(centerId),
    // SUPER_ADMIN passes centerId; DIRECTOR can omit. Both paths are valid.
  });
}

// ─── Staff self-service (PO QA #8 Opción C) ────────────────────

const meProfileQueryKey = ['staff', 'me', 'profile'] as const;

export function useMyProfile() {
  return useQuery({
    queryKey: meProfileQueryKey,
    queryFn: () => getMyProfile(),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileFormData) => updateMyProfile(data),
    onSuccess: async (updated) => {
      qc.setQueryData(meProfileQueryKey, updated);
      // Refresh auth store so user.staff.profileComplete reflects the new
      // server-side state — otherwise the dashboard banner stays stale
      // until the next full page load. Non-fatal if the refetch fails.
      try {
        const fresh = await apiRequest<AuthUser>('/auth/me');
        const state = useAuthStore.getState();
        if (state.accessToken && state.refreshToken) {
          state.setTokens(state.accessToken, state.refreshToken, fresh);
        }
      } catch {
        /* swallow — banner will refresh on next /auth/me cycle */
      }
    },
  });
}
