import { apiRequest } from './client';

// ================================================================= types

export interface StaffTimeEntry {
  id: string;
  staffId: string;
  centerId: string;
  date: string;
  type: 'CLOCK_IN' | 'BREAK_IN' | 'BREAK_OUT' | 'CLOCK_OUT';
  deviceTimestamp: string;
  serverReceivedAt: string | null;
  timeDriftDetected: boolean;
  latitude: number | null;
  longitude: number | null;
  withinGeoFence: boolean | null;
  source: 'APP' | 'KIOSK';
  isCorrection: boolean;
  correctionId: string | null;
  createdAt: string;
}

export interface ShiftStatus {
  clockedIn: boolean;
  onBreak: boolean;
  clockedOut: boolean;
  nextActions: Array<'CLOCK_IN' | 'BREAK_IN' | 'BREAK_OUT' | 'CLOCK_OUT'>;
}

export interface PunchResponse {
  entry: StaffTimeEntry;
  shiftStatus: ShiftStatus;
}

export interface TodayResponse {
  entries: StaffTimeEntry[];
  shiftStatus: ShiftStatus;
}

export interface TeamMember {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'TEACHER' | 'ASSISTANT' | 'ADMIN';
  };
  entries: StaffTimeEntry[];
  shiftStatus: ShiftStatus;
}

export interface TeamTodayResponse {
  date: string;
  centerId: string;
  data: TeamMember[];
}

// ================================================================= api

export function getMyToday() {
  return apiRequest<TodayResponse>('/attendance/today');
}

export function createPunch(data: {
  type: 'CLOCK_IN' | 'BREAK_IN' | 'BREAK_OUT' | 'CLOCK_OUT';
  deviceTimestamp: string;
  latitude?: number;
  longitude?: number;
}) {
  return apiRequest<PunchResponse>('/attendance/punch', {
    method: 'POST',
    body: data,
  });
}

export function getTeamToday(centerId?: string) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<TeamTodayResponse>(`/attendance/team/today${qs}`);
}

// ============================================================ schedules

export interface ScheduleDay {
  id: string;
  scheduleId: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isOff: boolean;
}

export interface Schedule {
  id: string;
  staffId: string;
  centerId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'APPROVED';
  approvedBy: string | null;
  approvedAt: string | null;
  days: ScheduleDay[];
  createdAt: string;
  updatedAt: string;
}

export function getMySchedule() {
  return apiRequest<Schedule[]>('/attendance/my-schedule');
}

export interface ScheduleWithStaff extends Schedule {
  staff: { id: string; firstName: string; lastName: string };
}

export function getSchedules(query?: {
  staffId?: string;
  status?: string;
  centerId?: string;
}) {
  const params = new URLSearchParams();
  if (query?.staffId) params.set('staffId', query.staffId);
  if (query?.status) params.set('status', query.status);
  if (query?.centerId) params.set('centerId', query.centerId);
  const qs = params.toString();
  return apiRequest<ScheduleWithStaff[]>(`/attendance/schedules${qs ? `?${qs}` : ''}`);
}

export function getScheduleById(id: string) {
  return apiRequest<ScheduleWithStaff>(`/attendance/schedules/${id}`);
}

export interface CreateScheduleData {
  staffId: string;
  weekStart: string;
  days: Array<{
    dayOfWeek: number;
    startTime?: string;
    endTime?: string;
    isOff?: boolean;
  }>;
}

export function createSchedule(data: CreateScheduleData, centerId?: string) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<Schedule>(`/attendance/schedules${qs}`, { method: 'POST', body: data });
}

export function updateSchedule(id: string, data: { days: CreateScheduleData['days'] }) {
  return apiRequest<Schedule>(`/attendance/schedules/${id}`, { method: 'PATCH', body: data });
}

export function deleteSchedule(id: string) {
  return apiRequest(`/attendance/schedules/${id}`, { method: 'DELETE' });
}

export function approveSchedule(id: string) {
  return apiRequest<Schedule>(`/attendance/schedules/${id}/approve`, { method: 'PATCH', body: {} });
}

export function duplicateSchedule(id: string) {
  return apiRequest<Schedule>(`/attendance/schedules/${id}/duplicate`, { method: 'POST', body: {} });
}

// ========================================================== corrections

export interface CorrectionRequest {
  id: string;
  staffId: string;
  centerId: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  originalClockIn: string | null;
  originalBreakIn: string | null;
  originalBreakOut: string | null;
  originalClockOut: string | null;
  requestedClockIn: string | null;
  requestedBreakIn: string | null;
  requestedBreakOut: string | null;
  requestedClockOut: string | null;
  staffComment: string;
  directorComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  expiresAt: string;
  createdAt: string;
  staff?: { id: string; firstName: string; lastName: string };
}

export function createCorrection(data: {
  date: string;
  requestedClockIn?: string;
  requestedBreakIn?: string;
  requestedBreakOut?: string;
  requestedClockOut?: string;
  staffComment: string;
  replaceExisting?: boolean;
}) {
  return apiRequest<CorrectionRequest>('/attendance/corrections', {
    method: 'POST',
    body: data,
  });
}

export function getMyCorrections() {
  return apiRequest<CorrectionRequest[]>('/attendance/corrections/my');
}

export function getCenterCorrections(centerId?: string) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<CorrectionRequest[]>(`/attendance/corrections${qs}`);
}

export function approveCorrection(id: string, data?: {
  directorComment?: string;
  clockIn?: string;
  breakIn?: string;
  breakOut?: string;
  clockOut?: string;
}) {
  return apiRequest<CorrectionRequest>(`/attendance/corrections/${id}/approve`, {
    method: 'PATCH',
    body: data ?? {},
  });
}

export function rejectCorrection(id: string, data: { directorComment: string }) {
  return apiRequest<CorrectionRequest>(`/attendance/corrections/${id}/reject`, {
    method: 'PATCH',
    body: data,
  });
}

// ============================================================== history

export interface HistoryDay {
  date: string;
  entries: StaffTimeEntry[];
  shiftStatus: ShiftStatus;
}

// ============================================================ approvals

export interface AttendanceApproval {
  id: string;
  staffId: string;
  centerId: string;
  date: string;
  weekStart: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  directorComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWeekDay {
  date: string;
  entries: StaffTimeEntry[];
  approval: AttendanceApproval | null;
  pendingCorrection: boolean;
}

export interface TeamWeekStaff {
  id: string;
  firstName: string;
  lastName: string;
  days: TeamWeekDay[];
  pendingCorrectionsCount: number;
}

export interface TeamWeekResponse {
  weekStart: string;
  weekEnd: string;
  staff: TeamWeekStaff[];
}

export function getTeamWeek(weekStart: string, centerId?: string) {
  const params = new URLSearchParams({ weekStart });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<TeamWeekResponse>(`/attendance/team/week?${params.toString()}`);
}

export function approveOrRejectDay(data: {
  staffId: string;
  date: string;
  action: 'APPROVE' | 'REJECT';
  directorComment?: string;
}) {
  return apiRequest<AttendanceApproval>('/attendance/approvals/day', {
    method: 'POST',
    body: data,
  });
}

export function approveOrRejectWeek(data: {
  staffId: string;
  weekStart: string;
  action: 'APPROVE' | 'REJECT';
  directorComment?: string;
}) {
  return apiRequest<{ count: number; weekStart: string; weekEnd: string }>(
    '/attendance/approvals/week',
    { method: 'POST', body: data },
  );
}

export function getMyApprovals(weekStart?: string) {
  const qs = weekStart ? `?weekStart=${weekStart}` : '';
  return apiRequest<AttendanceApproval[]>(`/attendance/approvals/my${qs}`);
}

export function getMyHistory(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiRequest<HistoryDay[]>(`/attendance/history${qs ? `?${qs}` : ''}`);
}

// ============================================================== payroll

export interface PayrollSettings {
  id: string;
  centerId: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  breakPaid: boolean;
  overtimeDailyThreshold: number;
  overtimeWeeklyThreshold: number;
  overtimeRate: number;
}

export interface PayrollPeriod {
  id: string;
  centerId: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'APPROVED' | 'EXPORTED';
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface DayCalc {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakIn: string | null;
  breakOut: string | null;
  regularHours: number;
  overtimeHours: number;
  /** True when a PayrollAdjustment exists for this (staffId, date). */
  adjusted: boolean;
  /** Director's attendance-approval status for this day (null when not reviewed). */
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | null;
}

export interface StaffPayroll {
  staff: { id: string; firstName: string; lastName: string; hourlyRate: number | null };
  days: DayCalc[];
  totalRegular: number;
  totalOvertime: number;
  totalPay: number;
}

export interface PayrollReport {
  period: { id: string; startDate: string; endDate: string; status: string };
  settings: PayrollSettings;
  staff: StaffPayroll[];
  totals: { regularHours: number; overtimeHours: number; totalPay: number };
}

export function getPayrollSettings(centerId?: string) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<PayrollSettings | null>(`/attendance/payroll/settings${qs}`);
}

export function upsertPayrollSettings(
  data: Omit<PayrollSettings, 'id' | 'centerId'>,
  centerId?: string,
) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<PayrollSettings>(`/attendance/payroll/settings${qs}`, {
    method: 'PATCH',
    body: data,
  });
}

export function getPayrollPeriods() {
  return apiRequest<PayrollPeriod[]>('/attendance/payroll/periods');
}

export function createPayrollPeriod(data: { startDate: string; endDate: string }) {
  return apiRequest<PayrollPeriod>('/attendance/payroll/periods', {
    method: 'POST',
    body: data,
  });
}

export function approvePayrollPeriod(id: string) {
  return apiRequest<PayrollPeriod>(`/attendance/payroll/periods/${id}/approve`, {
    method: 'PATCH',
    body: {},
  });
}

export function getPayrollReport(periodId: string) {
  return apiRequest<PayrollReport>(`/attendance/payroll/periods/${periodId}/report`);
}

/** Payroll report (view) over an arbitrary date range — powers "View Full Report". */
export function getRangeReport(from: string, to: string, centerId?: string) {
  const params = new URLSearchParams({ from, to });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollReport>(`/attendance/payroll/report/range?${params.toString()}`);
}

export function setPeriodFrequency(
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
  centerId?: string,
) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<PayrollPeriod>(`/attendance/payroll/period/set-frequency${qs}`, {
    method: 'POST',
    body: { frequency },
  });
}

export function getExportUrl(periodId: string, format: 'xlsx' | 'pdf') {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  return `${API_URL}/attendance/payroll/periods/${periodId}/export/${format}`;
}

// ======================================================== payroll v2 (Hito 2)

export interface PayrollSummary {
  month: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalCost: number;
  activeStaff: number;
}

export interface PayrollMonthlyPoint {
  month: string;
  totalCost: number;
  totalHours: number;
}

export interface PayrollWeeklyPoint {
  weekStart: string;
  regularHours: number;
  overtimeHours: number;
}

export interface PayrollTeamRow {
  staffId: string;
  firstName: string;
  lastName: string;
  regularHours: number;
  overtimeHours: number;
  totalPay: number;
  approvalState: string;
  /** Scheduled hours for the month (from approved Schedule). */
  scheduledHours: number;
  /** True when at least one PayrollAdjustment exists for this staff in the month. */
  correctionsPending: boolean;
}

/** DayCalc is already defined above — reused here for StaffPayrollDetail */
export interface StaffPayrollDetail {
  staff: { id: string; firstName: string; lastName: string; hourlyRate: number | null };
  days: DayCalc[];
  totalRegular: number;
  totalOvertime: number;
  totalPay: number;
  /** Scheduled hours for the month (from approved Schedule). */
  scheduledHours: number;
}

/** A single manual-adjustment audit record returned by GET /attendance/payroll/staff/:id/adjustments */
export interface PayrollAdjustment {
  id: string;
  date: string;
  reason: string;
  adjustedAt: string;
  original: {
    ClockIn: string | null;
    ClockOut: string | null;
    BreakIn: string | null;
    BreakOut: string | null;
  };
  adjusted: {
    ClockIn: string | null;
    ClockOut: string | null;
    BreakIn: string | null;
    BreakOut: string | null;
  };
  adjuster: { firstName: string; lastName: string };
}

/** Response from POST /attendance/payroll/approve-all */
export interface ApproveAllResult {
  approved: number;
  skipped: number;
}

export interface AdjustPayrollHoursBody {
  staffId: string;
  date: string;
  adjustedClockIn?: string;
  adjustedClockOut?: string;
  adjustedBreakIn?: string;
  adjustedBreakOut?: string;
  reason: string;
}

export function getPayrollSummary(month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollSummary>(`/attendance/payroll/summary?${params.toString()}`);
}

export function getPayrollMonthlyChart(months: number, centerId?: string) {
  const params = new URLSearchParams({ months: String(months) });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollMonthlyPoint[]>(`/attendance/payroll/chart/monthly?${params.toString()}`);
}

export function getPayrollWeeklyChart(month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollWeeklyPoint[]>(`/attendance/payroll/chart/weekly?${params.toString()}`);
}

export function getPayrollTeam(month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollTeamRow[]>(`/attendance/payroll/team?${params.toString()}`);
}

export function getPayrollStaff(staffId: string, month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<StaffPayrollDetail>(`/attendance/payroll/staff/${staffId}?${params.toString()}`);
}

export function getMyPayroll(month: string) {
  return apiRequest<StaffPayrollDetail>(`/attendance/payroll/my?month=${month}`);
}

export function adjustPayrollHours(data: AdjustPayrollHoursBody, centerId?: string) {
  const qs = centerId ? `?centerId=${centerId}` : '';
  return apiRequest<{ adjustment: unknown; day: DayCalc }>(
    `/attendance/payroll/hours${qs}`,
    { method: 'PATCH', body: data },
  );
}

/**
 * Returns the URL for a staff member's personal PDF export.
 * The JWT token must be appended as ?token=<accessToken> by the caller
 * (mirrors the existing getExportUrl pattern).
 */
export function getMyPayrollPdfUrl(month: string): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  return `${API_URL}/attendance/payroll/my/export/pdf?month=${month}`;
}

/** GET /attendance/payroll/staff/:staffId/adjustments?month=YYYY-MM&centerId= */
export function getStaffAdjustments(staffId: string, month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<PayrollAdjustment[]>(
    `/attendance/payroll/staff/${staffId}/adjustments?${params.toString()}`,
  );
}

/** POST /attendance/payroll/approve-all?month=YYYY-MM&centerId= */
export function approveAllPayroll(month: string, centerId?: string) {
  const params = new URLSearchParams({ month });
  if (centerId) params.set('centerId', centerId);
  return apiRequest<ApproveAllResult>(
    `/attendance/payroll/approve-all?${params.toString()}`,
    { method: 'POST', body: {} },
  );
}

/**
 * Returns the URL for a director's custom-range export.
 * The JWT token must be appended as ?token=<accessToken> by the caller.
 */
export function getRangeExportUrl(
  from: string,
  to: string,
  format: 'xlsx' | 'pdf',
  centerId?: string,
): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  const params = new URLSearchParams({ from, to, format });
  if (centerId) params.set('centerId', centerId);
  return `${API_URL}/attendance/payroll/export/range?${params.toString()}`;
}
