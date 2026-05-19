import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStaff,
  deleteStaff,
  getStaff,
  getStaffMember,
  updateStaff,
} from '@/lib/api/staff';
import type {
  StaffFormData,
  StaffUpdateFormData,
} from '@/lib/schemas/staff';

export const staffQueryKeys = {
  all: ['staff'] as const,
  detail: (id: string) => ['staff', id] as const,
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
