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
  list: (q?: { staffId?: string; status?: string; centerId?: string }) =>
    ['schedules', 'list', q] as const,
  detail: (id: string) => ['schedules', id] as const,
};

export function useSchedules(query?: {
  staffId?: string;
  status?: string;
  centerId?: string;
}) {
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

// centerId is bound at hook level (SUPER_ADMIN center detail). Omitting it
// keeps the director's /attendance/schedules/new flow unchanged.
export function useCreateSchedule(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleData) => apiCreateSchedule(data, centerId),
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
  center: (centerId?: string) => ['corrections', 'center', centerId] as const,
};

export function useMyCorrections() {
  return useQuery({
    queryKey: correctionKeys.my,
    queryFn: getMyCorrections,
    staleTime: 0,
  });
}

export function useCenterCorrections(centerId?: string) {
  return useQuery({
    queryKey: correctionKeys.center(centerId),
    queryFn: () => getCenterCorrections(centerId),
  });
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
    // Prefix invalidation covers every centerId-scoped corrections query.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrections', 'center'] }),
  });
}

export function useRejectCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, directorComment }: { id: string; directorComment: string }) =>
      rejectCorrection(id, { directorComment }),
    // Prefix invalidation covers every centerId-scoped corrections query.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrections', 'center'] }),
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
  teamWeek: (weekStart: string, centerId?: string) =>
    ['attendance', 'team-week', weekStart, centerId] as const,
  myApprovals: (weekStart?: string) => ['attendance', 'my-approvals', weekStart] as const,
};

export function useTeamWeek(weekStart: string, centerId?: string) {
  return useQuery({
    queryKey: approvalKeys.teamWeek(weekStart, centerId),
    queryFn: () => getTeamWeek(weekStart, centerId),
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
  getRangeReport,
  setPeriodFrequency,
} from '@/lib/api/attendance';

export const payrollKeys = {
  // Default (no centerId) key — used by /reports/payroll director flow.
  settings: ['payroll', 'settings'] as const,
  // Scoped key — used by SUPER_ADMIN center-detail tab to avoid collisions.
  settingsForCenter: (centerId: string) => ['payroll', 'settings', centerId] as const,
  periods: ['payroll', 'periods'] as const,
  report: (id: string) => ['payroll', 'report', id] as const,
};

// centerId is optional — omitting it keeps the /reports/payroll director flow
// identical to before (same query key, same API call, no centerId param).
export function usePayrollSettings(centerId?: string) {
  return useQuery({
    queryKey: centerId ? payrollKeys.settingsForCenter(centerId) : payrollKeys.settings,
    queryFn: () => getPayrollSettings(centerId),
  });
}

// centerId is bound at hook level (same pattern as useCreateSchedule).
// Omitting it keeps the existing /reports/payroll director flow unchanged.
export function useUpsertPayrollSettings(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof upsertPayrollSettings>[0]) =>
      upsertPayrollSettings(data, centerId),
    onSuccess: () => {
      if (centerId) {
        qc.invalidateQueries({ queryKey: payrollKeys.settingsForCenter(centerId) });
      } else {
        qc.invalidateQueries({ queryKey: payrollKeys.settings });
      }
    },
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

export function usePayrollRangeReport(from: string, to: string, centerId?: string) {
  return useQuery({
    queryKey: ['payroll', 'report', 'range', from, to, centerId ?? null] as const,
    queryFn: () => getRangeReport(from, to, centerId),
    enabled: !!from && !!to,
  });
}

/**
 * Mutation: POST /attendance/payroll/period/set-frequency
 * Upserts PayrollSettings.frequency, replaces the OPEN period with a new one
 * whose range matches the requested frequency around today.
 * Invalidates periods + settings so the UI refreshes automatically.
 */
export function useSetPeriodFrequency(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY') =>
      setPeriodFrequency(frequency, centerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.periods });
      if (centerId) {
        qc.invalidateQueries({ queryKey: payrollKeys.settingsForCenter(centerId) });
      } else {
        qc.invalidateQueries({ queryKey: payrollKeys.settings });
      }
    },
  });
}

// ====================================================== payroll v2 hooks

import {
  getPayrollSummary,
  getPayrollMonthlyChart,
  getPayrollWeeklyChart,
  getPayrollTeam,
  getPayrollStaff,
  getMyPayroll,
  adjustPayrollHours,
  getStaffAdjustments,
  approveAllPayroll,
  type AdjustPayrollHoursBody,
} from '@/lib/api/attendance';

export const payrollV2Keys = {
  summary: (month: string, centerId?: string) =>
    ['payroll', 'summary', month, centerId] as const,
  monthlyChart: (months: number, centerId?: string) =>
    ['payroll', 'chart', 'monthly', months, centerId] as const,
  weeklyChart: (month: string, centerId?: string) =>
    ['payroll', 'chart', 'weekly', month, centerId] as const,
  team: (month: string, centerId?: string) =>
    ['payroll', 'team', month, centerId] as const,
  staff: (staffId: string, month: string, centerId?: string) =>
    ['payroll', 'staff', staffId, month, centerId] as const,
  staffAdjustments: (staffId: string, month: string, centerId?: string) =>
    ['payroll', 'staff', staffId, 'adjustments', month, centerId] as const,
  myPayroll: (month: string) =>
    ['payroll', 'my', month] as const,
};

export function usePayrollSummary(month: string, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.summary(month, centerId),
    queryFn: () => getPayrollSummary(month, centerId),
    enabled: !!month,
  });
}

export function usePayrollMonthlyChart(months: number, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.monthlyChart(months, centerId),
    queryFn: () => getPayrollMonthlyChart(months, centerId),
  });
}

export function usePayrollWeeklyChart(month: string, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.weeklyChart(month, centerId),
    queryFn: () => getPayrollWeeklyChart(month, centerId),
    enabled: !!month,
  });
}

export function usePayrollTeam(month: string, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.team(month, centerId),
    queryFn: () => getPayrollTeam(month, centerId),
    enabled: !!month,
  });
}

export function usePayrollStaff(staffId: string, month: string, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.staff(staffId, month, centerId),
    queryFn: () => getPayrollStaff(staffId, month, centerId),
    enabled: !!staffId && !!month,
  });
}

export function useMyPayroll(month: string) {
  return useQuery({
    queryKey: payrollV2Keys.myPayroll(month),
    queryFn: () => getMyPayroll(month),
    enabled: !!month,
  });
}

export function useAdjustPayrollHours(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdjustPayrollHoursBody) => adjustPayrollHours(data, centerId),
    onSuccess: () => {
      // Invalidate all payroll v2 queries for this center scope.
      qc.invalidateQueries({ queryKey: ['payroll', 'summary'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'chart'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'team'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'staff'] });
    },
  });
}

/** Query: GET /attendance/payroll/staff/:staffId/adjustments */
export function useStaffAdjustments(staffId: string, month: string, centerId?: string) {
  return useQuery({
    queryKey: payrollV2Keys.staffAdjustments(staffId, month, centerId),
    queryFn: () => getStaffAdjustments(staffId, month, centerId),
    enabled: !!staffId && !!month,
  });
}

/**
 * Mutation: POST /attendance/payroll/approve-all
 * Bulk-approves all pending payroll days for the given month.
 * Invalidates team + staff payroll queries so the table refreshes.
 */
export function useApproveAllPayroll(centerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => approveAllPayroll(month, centerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', 'team'] });
      qc.invalidateQueries({ queryKey: ['payroll', 'staff'] });
    },
  });
}
