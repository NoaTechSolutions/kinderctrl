import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvitation,
  createStaff,
  deleteStaff,
  getComplianceSummary,
  getInvitation,
  getStaff,
  getStaffMember,
  inviteStaff,
  updateBackgroundCheck,
  updateCpr,
  updateStaff,
} from '@/lib/api/staff';
import type {
  AcceptInvitationFormData,
  InviteStaffFormData,
  StaffFormData,
  StaffUpdateFormData,
  UpdateBackgroundCheckFormData,
  UpdateCprFormData,
} from '@/lib/schemas/staff';

export const staffQueryKeys = {
  all: ['staff'] as const,
  detail: (id: string) => ['staff', id] as const,
  invitation: (token: string) => ['staff', 'invitation', token] as const,
  complianceSummary: (centerId: string | undefined) =>
    ['staff', 'compliance-summary', centerId ?? 'default'] as const,
};

export function useStaff() {
  return useQuery({
    queryKey: staffQueryKeys.all,
    queryFn: getStaff,
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: id ? staffQueryKeys.detail(id) : ['staff', 'unknown'],
    queryFn: () => getStaffMember(id as string),
    enabled: !!id,
  });
}

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
  return useMutation({
    mutationFn: (data: InviteStaffFormData) => inviteStaff(data),
    // No cache invalidation — the invited staff doesn't show up in
    // /staff until they accept (no row exists yet).
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
