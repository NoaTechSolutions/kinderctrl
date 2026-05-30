'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyToday,
  createPunch,
  getTeamToday,
  getMySchedule,
  getMyCorrections,
  getCenterCorrections,
  createCorrection,
  approveCorrection,
  rejectCorrection,
  getMyHistory,
  type TodayResponse,
  type PunchResponse,
  type CorrectionRequest,
} from '@/lib/api/attendance';

export const attendanceKeys = {
  all: ['attendance'] as const,
  myToday: ['attendance', 'my-today'] as const,
  mySchedule: ['attendance', 'my-schedule'] as const,
  teamToday: (centerId?: string) =>
    ['attendance', 'team-today', centerId] as const,
};

export function useMyToday() {
  return useQuery({
    queryKey: attendanceKeys.myToday,
    queryFn: getMyToday,
  });
}

export function usePunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPunch,
    onSuccess: (data: PunchResponse) => {
      qc.setQueryData<TodayResponse>(attendanceKeys.myToday, (prev) => {
        if (!prev) return { entries: [data.entry], shiftStatus: data.shiftStatus };
        return {
          entries: [...prev.entries, data.entry],
          shiftStatus: data.shiftStatus,
        };
      });
    },
  });
}

export function useMySchedule() {
  return useQuery({
    queryKey: attendanceKeys.mySchedule,
    queryFn: getMySchedule,
  });
}

// director schedules
import {
  getSchedules,
  getScheduleById,
  createSchedule as apiCreateSchedule,
  updateSchedule as apiUpdateSchedule,
  deleteSchedule as apiDeleteSchedule,
  approveSchedule as apiApproveSchedule,
  duplicateSchedule as apiDuplicateSchedule,
  type CreateScheduleData,
} from '@/lib/api/attendance';

export const scheduleKeys = {
  all: ['schedules'] as const,
  list: (q?: { staffId?: string; status?: string }) => ['schedules', 'list', q] as const,
  detail: (id: string) => ['schedules', id] as const,
};

export function useSchedules(query?: { staffId?: string; status?: string }) {
  return useQuery({
    queryKey: scheduleKeys.list(query),
    queryFn: () => getSchedules(query),
  });
}

export function useScheduleById(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => getScheduleById(id),
    enabled: !!id,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleData) => apiCreateSchedule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: CreateScheduleData['days'] }) =>
      apiUpdateSchedule(id, { days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useApproveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiApproveSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useDuplicateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDuplicateSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useTeamToday(centerId?: string) {
  return useQuery({
    queryKey: attendanceKeys.teamToday(centerId),
    queryFn: () => getTeamToday(centerId),
    refetchInterval: 30_000,
  });
}

// corrections
export const correctionKeys = {
  my: ['corrections', 'my'] as const,
  center: ['corrections', 'center'] as const,
};

export function useMyCorrections() {
  return useQuery({
    queryKey: correctionKeys.my,
    queryFn: getMyCorrections,
    staleTime: 0,
  });
}

export function useCenterCorrections() {
  return useQuery({ queryKey: correctionKeys.center, queryFn: getCenterCorrections });
}

export function useCreateCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCorrection,
    onSuccess: () => qc.invalidateQueries({ queryKey: correctionKeys.my }),
  });
}

export function useApproveCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; directorComment?: string }) =>
      approveCorrection(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: correctionKeys.center }),
  });
}

export function useRejectCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, directorComment }: { id: string; directorComment: string }) =>
      rejectCorrection(id, { directorComment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: correctionKeys.center }),
  });
}

// approvals
import {
  getTeamWeek,
  approveOrRejectDay,
  approveOrRejectWeek,
  getMyApprovals,
} from '@/lib/api/attendance';

export const approvalKeys = {
  teamWeek: (weekStart: string) => ['attendance', 'team-week', weekStart] as const,
  myApprovals: (weekStart?: string) => ['attendance', 'my-approvals', weekStart] as const,
};

export function useTeamWeek(weekStart: string) {
  return useQuery({
    queryKey: approvalKeys.teamWeek(weekStart),
    queryFn: () => getTeamWeek(weekStart),
    enabled: !!weekStart,
  });
}

export function useApproveOrRejectDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveOrRejectDay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'team-week'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'my-approvals'] });
    },
  });
}

export function useApproveOrRejectWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveOrRejectWeek,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'team-week'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'my-approvals'] });
    },
  });
}

export function useMyApprovals(weekStart?: string) {
  return useQuery({
    queryKey: approvalKeys.myApprovals(weekStart),
    queryFn: () => getMyApprovals(weekStart),
  });
}

// history
export function useMyHistory(from?: string, to?: string) {
  return useQuery({
    queryKey: ['attendance', 'history', from, to],
    queryFn: () => getMyHistory(from, to),
  });
}

// payroll
import {
  getPayrollSettings,
  upsertPayrollSettings,
  getPayrollPeriods,
  createPayrollPeriod,
  approvePayrollPeriod,
  getPayrollReport,
} from '@/lib/api/attendance';

export const payrollKeys = {
  settings: ['payroll', 'settings'] as const,
  periods: ['payroll', 'periods'] as const,
  report: (id: string) => ['payroll', 'report', id] as const,
};

export function usePayrollSettings() {
  return useQuery({ queryKey: payrollKeys.settings, queryFn: getPayrollSettings });
}

export function useUpsertPayrollSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertPayrollSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.settings }),
  });
}

export function usePayrollPeriods() {
  return useQuery({ queryKey: payrollKeys.periods, queryFn: getPayrollPeriods });
}

export function useCreatePayrollPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPayrollPeriod,
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.periods }),
  });
}

export function useApprovePayrollPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approvePayrollPeriod,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.periods });
    },
  });
}

export function usePayrollReport(periodId: string) {
  return useQuery({
    queryKey: payrollKeys.report(periodId),
    queryFn: () => getPayrollReport(periodId),
    enabled: !!periodId,
  });
}
