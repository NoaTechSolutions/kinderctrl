import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayrollAdjustment, Schedule, ScheduleDay } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPayrollSettingsDto } from './dto/payroll-settings.dto';
import { CreatePayrollPeriodDto, SetPeriodFrequencyDto } from './dto/payroll-period.dto';
import { PayFrequency } from '@prisma/client';
import { AdjustHoursDto } from './dto/adjust-hours.dto';
import * as XLSX from 'xlsx';

// ============================================ types

export interface DayCalc {
  date: string;
  clockIn: Date | null;
  clockOut: Date | null;
  breakIn: Date | null;
  breakOut: Date | null;
  totalMs: number;
  breakMs: number;
  workedMs: number;
  regularHours: number;
  overtimeHours: number;
  /** true when a PayrollAdjustment was applied for this day */
  adjusted: boolean;
  /** Director's attendance-approval status for this day (null when not reviewed) */
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
  settings: { frequency: string; breakPaid: boolean; overtimeDailyThreshold: number; overtimeWeeklyThreshold: number; overtimeRate: number };
  staff: StaffPayroll[];
  totals: { regularHours: number; overtimeHours: number; totalPay: number };
}

// Minimal shape of PayrollSettings the calc helpers need.
// Includes `frequency` so generateReport can still expose it in the response.
interface CalcSettings {
  frequency: string;
  breakPaid: boolean;
  overtimeDailyThreshold: number;
  overtimeWeeklyThreshold: number;
  overtimeRate: number;
}

// Raw time-entry row (subset used by the helpers).
interface RawEntry {
  type: string;
  deviceTimestamp: Date;
  date: Date;
}

// ============================================ month helpers

/** 'YYYY-MM' → { startDate, endDate } as UTC midnight Date objects */
function monthBounds(month: string): { startDate: Date; endDate: Date } {
  const [y, m] = month.split('-').map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, 1));
  // Last day: first day of the NEXT month minus 1 ms gives end-of-last-day,
  // but for Prisma "lte" comparisons on @db.Date we just want the last day.
  const endDate = new Date(Date.UTC(y, m, 0)); // day 0 of month m+1 = last day of month m
  return { startDate, endDate };
}

/** ISO date string → week (Mon–Sun) bounds */
function weekBoundsFromDate(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() + diffToMon);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { weekStart: mon, weekEnd: sun };
}

/** Returns an array of ISO date strings for each Monday of the weeks that
 *  overlap with the given month. */
function weeksInMonth(month: string): string[] {
  const { startDate, endDate } = monthBounds(month);
  const weeks: string[] = [];
  const seen = new Set<string>();

  // Iterate every day of the month and collect distinct week-starts
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const { weekStart } = weekBoundsFromDate(cur);
    const key = weekStart.toISOString().split('T')[0];
    if (!seen.has(key)) {
      seen.add(key);
      weeks.push(key);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return weeks;
}

/** Returns the Monday (UTC midnight) of the ISO week containing `date`. */
function mondayOfDate(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jsDow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (jsDow === 0 ? 6 : jsDow - 1));
  return d;
}

// ============================================ schedule helpers

type ScheduleWithDays = Schedule & { days: ScheduleDay[] };

/**
 * Parse "HH:MM" → fractional hours (e.g. "08:30" → 8.5).
 * Returns NaN for invalid strings so callers can guard with isNaN.
 */
function parseHoursFromTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h + m / 60;
}

/**
 * For a given calendar date, find the best active Schedule:
 *   1. A Schedule whose [startDate, endDate] bracket the date AND
 *      whose status is APPROVED.
 *   2. Failing that, any status (DRAFT) within the date range.
 *
 * "Active" here means startDate <= date <= endDate (inclusive, UTC).
 * When multiple APPROVED schedules cover the same date (unusual but
 * technically possible before the unique index prevents overlaps at
 * write time), we take the first one returned by Prisma (ordered by
 * startDate asc in the query that produced the list).
 */
function findActiveScheduleForDate(
  schedules: ScheduleWithDays[],
  date: Date,
): ScheduleWithDays | undefined {
  const ts = date.getTime();
  const approved = schedules.filter(
    (s) =>
      s.status === 'APPROVED' &&
      s.startDate.getTime() <= ts &&
      s.endDate.getTime() >= ts,
  );
  if (approved.length > 0) return approved[0];
  return schedules.find(
    (s) => s.startDate.getTime() <= ts && s.endDate.getTime() >= ts,
  );
}

/**
 * Sum the scheduled hours across a date range [startDate, endDate] inclusive.
 *
 * Algorithm:
 *   For each calendar date D in [startDate, endDate]:
 *     1. Convert D's JS getUTCDay (0=Sun) to ISO dayOfWeek (1=Mon … 7=Sun).
 *     2. Find the active Schedule for that date (APPROVED preferred).
 *     3. Locate the ScheduleDay whose dayOfWeek matches.
 *     4. Skip if isOff=true or startTime/endTime are absent.
 *     5. Add (endTime − startTime) in fractional hours.
 *
 * Assumptions:
 *   - Times are wall-clock "HH:MM" strings; no DST or timezone
 *     conversion is applied (pure arithmetic on the strings).
 *   - Partial-day rounding is NOT applied — the raw difference is used.
 *   - Overlapping schedules: APPROVED wins; ties broken by list order.
 */
export function computeScheduledHours(
  schedules: ScheduleWithDays[],
  startDate: Date,
  endDate: Date,
): number {
  let total = 0;
  const cur = new Date(startDate);

  while (cur.getTime() <= endDate.getTime()) {
    const schedule = findActiveScheduleForDate(schedules, cur);
    if (schedule) {
      // Convert JS UTC day (0=Sun) to ISO dayOfWeek (1=Mon … 7=Sun)
      const jsDay = cur.getUTCDay();
      const isoDow = jsDay === 0 ? 7 : jsDay;

      const schedDay = schedule.days.find((d) => d.dayOfWeek === isoDow);
      if (schedDay && !schedDay.isOff && schedDay.startTime && schedDay.endTime) {
        const startH = parseHoursFromTime(schedDay.startTime);
        const endH = parseHoursFromTime(schedDay.endTime);
        if (!isNaN(startH) && !isNaN(endH) && endH > startH) {
          total += endH - startH;
        }
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return total;
}

// ============================================ service

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------- settings

  async getSettings(centerId: string) {
    return this.prisma.payrollSettings.findUnique({ where: { centerId } });
  }

  async upsertSettings(centerId: string, dto: UpsertPayrollSettingsDto) {
    return this.prisma.payrollSettings.upsert({
      where: { centerId },
      create: { centerId, ...dto },
      update: dto,
    });
  }

  // ------------------------------------------------- periods

  async createPeriod(centerId: string, dto: CreatePayrollPeriodDto) {
    const startDate = new Date(dto.startDate + 'T00:00:00.000Z');
    const endDate = new Date(dto.endDate + 'T00:00:00.000Z');

    if (endDate <= startDate)
      throw new BadRequestException('endDate must be after startDate');

    const overlap = await this.prisma.payrollPeriod.findFirst({
      where: {
        centerId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });
    if (overlap)
      throw new BadRequestException('Period overlaps with an existing one');

    // Stamp the period with the center's current frequency (default WEEKLY if
    // settings haven't been configured yet).
    const settings = await this.prisma.payrollSettings.findUnique({
      where: { centerId },
      select: { frequency: true },
    });
    const frequency: PayFrequency = settings?.frequency ?? PayFrequency.WEEKLY;

    return this.prisma.payrollPeriod.create({
      data: { centerId, startDate, endDate, frequency },
    });
  }

  // ------------------------------------------------- set-frequency (FIX 4)

  /**
   * POST /attendance/payroll/period/set-frequency?centerId=
   * (a) Upserts PayrollSettings.frequency to the requested value.
   * (b) Deletes all OPEN PayrollPeriod(s) for the center (time entries and
   *     approvals are NOT FK-bound to periods, so they survive untouched).
   * (c) Creates a new OPEN period whose [startDate, endDate] covers TODAY
   *     according to the requested frequency:
   *       WEEKLY   → Monday of this UTC week → +6 days (Sun)
   *       BIWEEKLY → Monday of this UTC week → +13 days
   *       MONTHLY  → first day of this UTC month → last day of this UTC month
   * Returns the newly created period.
   */
  async setPeriodFrequency(centerId: string, dto: SetPeriodFrequencyDto) {
    const { frequency } = dto;

    // (a) upsert settings
    await this.prisma.payrollSettings.upsert({
      where: { centerId },
      create: {
        centerId,
        frequency,
        breakPaid: false,
        overtimeDailyThreshold: 8,
        overtimeWeeklyThreshold: 40,
        overtimeRate: 1.5,
      },
      update: { frequency },
    });

    // (b) delete OPEN period(s)
    await this.prisma.payrollPeriod.deleteMany({
      where: { centerId, status: 'OPEN' },
    });

    // (c) compute new range around TODAY (UTC)
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (frequency === PayFrequency.MONTHLY) {
      const bounds = monthBounds(
        `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`,
      );
      startDate = bounds.startDate;
      endDate = bounds.endDate;
    } else {
      // WEEKLY or BIWEEKLY — anchor on Monday of this week
      const { weekStart } = weekBoundsFromDate(today);
      startDate = weekStart;
      endDate = new Date(weekStart);
      endDate.setUTCDate(weekStart.getUTCDate() + (frequency === PayFrequency.BIWEEKLY ? 13 : 6));
    }

    return this.prisma.payrollPeriod.create({
      data: { centerId, startDate, endDate, frequency, status: 'OPEN' },
    });
  }

  async listPeriods(centerId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { centerId },
      orderBy: { startDate: 'desc' },
    });
  }

  async approvePeriod(id: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Period not found');
    if (period.status !== 'OPEN')
      throw new BadRequestException('Period is not open');

    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  // ------------------------------------------------- shared calc helpers

  /**
   * Given the raw time entries for ONE staff member for a date range,
   * compute the per-day breakdown (DayCalc[]).
   * This is the single source of truth for hours math — reused by all
   * month-based endpoints and by generateReport.
   *
   * @param adjustments  PayrollAdjustment rows for this staff (default []).
   *   When an adjustment exists for a day, its adjusted* timestamps override
   *   the corresponding punch values (null adjusted field → keep punch value).
   *   When no adjustment exists the output is byte-for-byte identical to the
   *   un-adjusted calculation.
   */
  private computeStaffDays(
    entries: RawEntry[],
    settings: CalcSettings,
    adjustments: PayrollAdjustment[] = [],
  ): DayCalc[] {
    // Index adjustments by YYYY-MM-DD for O(1) lookup
    const adjByDate = new Map<string, PayrollAdjustment>();
    for (const adj of adjustments) {
      const key = new Date(adj.date).toISOString().split('T')[0];
      adjByDate.set(key, adj);
    }

    // Group entries by date (YYYY-MM-DD key in UTC)
    const grouped: Record<string, RawEntry[]> = {};
    for (const e of entries) {
      const key = new Date(e.date).toISOString().split('T')[0];
      (grouped[key] ??= []).push(e);
    }

    return Object.entries(grouped).map(([date, dayEntries]) => {
      const ci = dayEntries.find((e) => e.type === 'CLOCK_IN');
      const co = dayEntries.find((e) => e.type === 'CLOCK_OUT');
      const bi = dayEntries.find((e) => e.type === 'BREAK_IN');
      const bo = dayEntries.find((e) => e.type === 'BREAK_OUT');

      // Punch-based values (the original calculation, unchanged)
      let clockIn: Date | null = ci?.deviceTimestamp ?? null;
      let clockOut: Date | null = co?.deviceTimestamp ?? null;
      let breakIn: Date | null = bi?.deviceTimestamp ?? null;
      let breakOut: Date | null = bo?.deviceTimestamp ?? null;

      // Apply adjustment overrides — only for non-null adjusted fields
      const adj = adjByDate.get(date);
      const adjusted = adj !== undefined;
      if (adj) {
        if (adj.adjustedClockIn !== null) clockIn = adj.adjustedClockIn;
        if (adj.adjustedClockOut !== null) clockOut = adj.adjustedClockOut;
        if (adj.adjustedBreakIn !== null) breakIn = adj.adjustedBreakIn;
        if (adj.adjustedBreakOut !== null) breakOut = adj.adjustedBreakOut;
      }

      let totalMs = 0;
      let breakMs = 0;
      if (clockIn && clockOut) {
        totalMs = clockOut.getTime() - clockIn.getTime();
        if (breakIn && breakOut) {
          breakMs = breakOut.getTime() - breakIn.getTime();
        }
      }

      const workedMs = settings.breakPaid ? totalMs : totalMs - breakMs;
      const workedHours = workedMs / 3_600_000;
      const regularHours = Math.min(workedHours, settings.overtimeDailyThreshold);
      const overtimeHours = Math.max(0, workedHours - settings.overtimeDailyThreshold);

      return {
        date,
        clockIn,
        clockOut,
        breakIn,
        breakOut,
        totalMs,
        breakMs,
        workedMs,
        regularHours,
        overtimeHours,
        adjusted,
      };
    });
  }

  /**
   * Given days (already computed by computeStaffDays) + staff rate + settings,
   * apply the weekly-overflow rule and compute final totals + pay.
   */
  private computeStaffPayroll(
    staffMeta: { id: string; firstName: string; lastName: string; hourlyRate: number | null },
    days: DayCalc[],
    settings: CalcSettings,
  ): StaffPayroll {
    let totalRegular = days.reduce((s, d) => s + d.regularHours, 0);
    let totalOvertime = days.reduce((s, d) => s + d.overtimeHours, 0);

    // Weekly overflow: if summed regular exceeds weekly threshold, move excess to OT
    if (totalRegular > settings.overtimeWeeklyThreshold) {
      const weeklyExcess = totalRegular - settings.overtimeWeeklyThreshold;
      totalRegular = settings.overtimeWeeklyThreshold;
      totalOvertime += weeklyExcess;
    }

    const rate = staffMeta.hourlyRate ? Number(staffMeta.hourlyRate) : 0;
    const totalPay = totalRegular * rate + totalOvertime * rate * settings.overtimeRate;

    return { staff: staffMeta, days, totalRegular, totalOvertime, totalPay };
  }

  // ------------------------------------------------- month-based helpers

  /** Resolve settings for a center or throw a clear error. */
  private async requireSettings(centerId: string): Promise<CalcSettings> {
    const settings = await this.prisma.payrollSettings.findUnique({
      where: { centerId },
    });
    if (!settings)
      throw new BadRequestException(
        'Configure payroll settings before generating reports',
      );
    return settings;
  }

  /** Load all ACTIVE staff of the center with their time entries and
   *  payroll adjustments in [start, end]. */
  private async loadStaffWithEntries(
    centerId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.staff.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        timeEntries: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: [{ date: 'asc' }, { deviceTimestamp: 'asc' }],
        },
        payrollAdjustments: {
          where: { date: { gte: startDate, lte: endDate } },
        },
      },
    });
  }

  /**
   * Load schedules (with days) for a set of staff IDs that overlap with
   * [startDate, endDate]. Returns a Map keyed by staffId.
   * Uses a single Prisma query to avoid N+1 for the team endpoint.
   */
  private async loadSchedulesForStaff(
    staffIds: string[],
    centerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, ScheduleWithDays[]>> {
    if (staffIds.length === 0) return new Map();

    const schedules = await this.prisma.schedule.findMany({
      where: {
        staffId: { in: staffIds },
        centerId,
        // Overlap condition: schedule starts before or on endDate AND ends on or after startDate
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { days: true },
      orderBy: { startDate: 'asc' },
    });

    const map = new Map<string, ScheduleWithDays[]>();
    for (const s of schedules) {
      const list = map.get(s.staffId) ?? [];
      list.push(s as ScheduleWithDays);
      map.set(s.staffId, list);
    }
    return map;
  }

  // ------------------------------------------------- endpoint: summary

  async getMonthlySummary(centerId: string, month: string) {
    const settings = await this.requireSettings(centerId);
    const { startDate, endDate } = monthBounds(month);
    const staffMembers = await this.loadStaffWithEntries(centerId, startDate, endDate);

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCost = 0;

    for (const s of staffMembers) {
      const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
      const payroll = this.computeStaffPayroll(
        { id: s.id, firstName: s.firstName, lastName: s.lastName, hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null },
        days,
        settings,
      );
      totalRegularHours += payroll.totalRegular;
      totalOvertimeHours += payroll.totalOvertime;
      totalCost += payroll.totalPay;
    }

    return {
      month,
      totalRegularHours,
      totalOvertimeHours,
      totalCost,
      activeStaff: staffMembers.length,
    };
  }

  // ------------------------------------------------- endpoint: chart/monthly

  async getMonthlyChart(centerId: string, months: number = 3) {
    const settings = await this.requireSettings(centerId);

    // Build the list of YYYY-MM strings going back `months` from the current month
    const result: { month: string; totalCost: number; totalHours: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const { startDate, endDate } = monthBounds(month);

      const staffMembers = await this.loadStaffWithEntries(centerId, startDate, endDate);

      let totalCost = 0;
      let totalHours = 0;

      for (const s of staffMembers) {
        const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
        const payroll = this.computeStaffPayroll(
          { id: s.id, firstName: s.firstName, lastName: s.lastName, hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null },
          days,
          settings,
        );
        totalCost += payroll.totalPay;
        totalHours += payroll.totalRegular + payroll.totalOvertime;
      }

      result.push({ month, totalCost, totalHours });
    }

    return result;
  }

  // ------------------------------------------------- endpoint: chart/weekly

  async getWeeklyChart(centerId: string, month: string) {
    const settings = await this.requireSettings(centerId);
    const weekStarts = weeksInMonth(month);

    const result: { weekStart: string; regularHours: number; overtimeHours: number }[] = [];

    for (const weekStart of weekStarts) {
      const startDate = new Date(weekStart + 'T00:00:00.000Z');
      const endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 6);

      const staffMembers = await this.loadStaffWithEntries(centerId, startDate, endDate);

      let regularHours = 0;
      let overtimeHours = 0;

      for (const s of staffMembers) {
        const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
        const payroll = this.computeStaffPayroll(
          { id: s.id, firstName: s.firstName, lastName: s.lastName, hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null },
          days,
          settings,
        );
        regularHours += payroll.totalRegular;
        overtimeHours += payroll.totalOvertime;
      }

      result.push({ weekStart, regularHours, overtimeHours });
    }

    return result;
  }

  // ------------------------------------------------- endpoint: team

  async getTeamPayroll(centerId: string, month: string) {
    const settings = await this.requireSettings(centerId);
    const { startDate, endDate } = monthBounds(month);
    const staffMembers = await this.loadStaffWithEntries(centerId, startDate, endDate);

    // Load all approval records for the month to determine per-staff approval state.
    // approvalState = APPROVED if ALL their days are approved,
    //                 REJECTED if any is rejected,
    //                 PENDING if mix of pending/approved,
    //                 'n/a' if no approval records exist.
    const approvals = await this.prisma.attendanceApproval.findMany({
      where: { centerId, date: { gte: startDate, lte: endDate } },
      select: { staffId: true, status: true },
    });

    const approvalsByStaff: Record<string, string[]> = {};
    for (const a of approvals) {
      (approvalsByStaff[a.staffId] ??= []).push(a.status);
    }

    // Load schedules (with days) for all ACTIVE staff in the range — one query
    // for the whole team so we avoid N+1 queries.
    const schedulesByStaff = await this.loadSchedulesForStaff(
      staffMembers.map((s) => s.id),
      centerId,
      startDate,
      endDate,
    );

    // Load pending correction requests for this center in the month range —
    // used to derive correctionsPending per staff.
    const pendingCorrections = await this.prisma.correctionRequest.findMany({
      where: {
        centerId,
        status: 'PENDING',
        date: { gte: startDate, lte: endDate },
      },
      select: { staffId: true },
    });

    const pendingCorrStaffIds = new Set(pendingCorrections.map((c) => c.staffId));

    return staffMembers.map((s) => {
      const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
      const payroll = this.computeStaffPayroll(
        { id: s.id, firstName: s.firstName, lastName: s.lastName, hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null },
        days,
        settings,
      );

      const statuses = approvalsByStaff[s.id] ?? [];
      let approvalState: string;
      if (statuses.length === 0) {
        approvalState = 'n/a';
      } else if (statuses.every((st) => st === 'APPROVED')) {
        approvalState = 'APPROVED';
      } else if (statuses.some((st) => st === 'REJECTED')) {
        approvalState = 'REJECTED';
      } else {
        approvalState = 'PENDING';
      }

      const staffSchedules = schedulesByStaff.get(s.id) ?? [];
      const scheduledHours = computeScheduledHours(staffSchedules, startDate, endDate);

      return {
        staffId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        scheduledHours,
        regularHours: payroll.totalRegular,
        overtimeHours: payroll.totalOvertime,
        totalPay: payroll.totalPay,
        approvalState,
        correctionsPending: pendingCorrStaffIds.has(s.id),
      };
    });
  }

  // ------------------------------------------------- endpoint: staff detail

  async getStaffMonthPayroll(
    centerId: string,
    staffId: string,
    month: string,
  ): Promise<StaffPayroll & { scheduledHours: number }> {
    const settings = await this.requireSettings(centerId);
    const { startDate, endDate } = monthBounds(month);

    const staffMember = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        centerId: true,
        timeEntries: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: [{ date: 'asc' }, { deviceTimestamp: 'asc' }],
        },
        payrollAdjustments: {
          where: { date: { gte: startDate, lte: endDate } },
        },
      },
    });

    if (!staffMember) throw new NotFoundException('Staff not found');
    if (staffMember.centerId !== centerId)
      throw new BadRequestException('Staff does not belong to this center');

    const days = this.computeStaffDays(staffMember.timeEntries, settings, staffMember.payrollAdjustments);

    // Attach the director's per-day approval status (for the Daily Breakdown).
    const approvals = await this.prisma.attendanceApproval.findMany({
      where: { staffId, centerId, date: { gte: startDate, lte: endDate } },
      select: { date: true, status: true },
    });
    const statusByDate = new Map(
      approvals.map((a) => [a.date.toISOString().slice(0, 10), a.status]),
    );
    for (const d of days) {
      d.approvalStatus =
        (statusByDate.get(d.date) as 'APPROVED' | 'PENDING' | 'REJECTED' | undefined) ?? null;
    }

    const payroll = this.computeStaffPayroll(
      {
        id: staffMember.id,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        hourlyRate: staffMember.hourlyRate ? Number(staffMember.hourlyRate) : null,
      },
      days,
      settings,
    );

    // Load this staff's schedules for the month to compute scheduled hours.
    const schedulesMap = await this.loadSchedulesForStaff(
      [staffId],
      centerId,
      startDate,
      endDate,
    );
    const staffSchedules = schedulesMap.get(staffId) ?? [];
    const scheduledHours = computeScheduledHours(staffSchedules, startDate, endDate);

    return { ...payroll, scheduledHours };
  }

  // ------------------------------------------------- endpoint: my payroll (STAFF)

  async getMyMonthPayroll(userId: string, month: string): Promise<StaffPayroll> {
    // Resolve the staff record from the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    if (!user?.staffId) throw new NotFoundException('Staff record not found for user');

    const staffMember = await this.prisma.staff.findUnique({
      where: { id: user.staffId },
      select: { id: true, centerId: true, firstName: true, lastName: true, hourlyRate: true },
    });
    if (!staffMember) throw new NotFoundException('Staff not found');

    return this.getStaffMonthPayroll(staffMember.centerId, staffMember.id, month);
  }

  // ------------------------------------------------- adjust hours

  /**
   * PATCH /attendance/payroll/hours
   * Director overrides a day's clock/break timestamps.
   * Snapshots the current real punches as original* for audit, upserts the
   * adjustment, then re-computes DayCalc for that single day and returns it.
   */
  async adjustHours(
    centerId: string,
    dto: AdjustHoursDto,
    directorId: string,
  ): Promise<{ adjustment: PayrollAdjustment; day: DayCalc }> {
    // Validate staff belongs to the resolved center
    const staffMember = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
      select: { centerId: true },
    });
    if (!staffMember)
      throw new BadRequestException('Staff not found');
    if (staffMember.centerId !== centerId)
      throw new BadRequestException('Staff does not belong to this center');

    // Parse the target date as a UTC midnight Date (matches @db.Date storage)
    const dateObj = new Date(dto.date + 'T00:00:00.000Z');

    // Snapshot the real punches for that day (original* audit trail)
    const punches = await this.prisma.staffTimeEntry.findMany({
      where: { staffId: dto.staffId, date: dateObj },
      select: { type: true, deviceTimestamp: true },
    });

    const punchMap = new Map(punches.map((p) => [p.type, p.deviceTimestamp]));
    const originalClockIn = punchMap.get('CLOCK_IN') ?? null;
    const originalClockOut = punchMap.get('CLOCK_OUT') ?? null;
    const originalBreakIn = punchMap.get('BREAK_IN') ?? null;
    const originalBreakOut = punchMap.get('BREAK_OUT') ?? null;

    // Convert optional ISO strings to Date objects (null → keep punch value)
    const toDateOrNull = (iso?: string): Date | null =>
      iso ? new Date(iso) : null;

    const adjustedClockIn = toDateOrNull(dto.adjustedClockIn);
    const adjustedClockOut = toDateOrNull(dto.adjustedClockOut);
    const adjustedBreakIn = toDateOrNull(dto.adjustedBreakIn);
    const adjustedBreakOut = toDateOrNull(dto.adjustedBreakOut);

    // Upsert — @@unique([staffId, date]) means latest edit wins
    const adjustment = await this.prisma.payrollAdjustment.upsert({
      where: { staffId_date: { staffId: dto.staffId, date: dateObj } },
      create: {
        staffId: dto.staffId,
        centerId,
        date: dateObj,
        originalClockIn,
        originalClockOut,
        originalBreakIn,
        originalBreakOut,
        adjustedClockIn,
        adjustedClockOut,
        adjustedBreakIn,
        adjustedBreakOut,
        reason: dto.reason,
        adjustedBy: directorId,
      },
      update: {
        // On re-edit: keep the FIRST original* snapshot (do not overwrite it)
        // but update the adjusted* values, reason, adjuster, and timestamp.
        adjustedClockIn,
        adjustedClockOut,
        adjustedBreakIn,
        adjustedBreakOut,
        reason: dto.reason,
        adjustedBy: directorId,
        adjustedAt: new Date(),
      },
    });

    // Re-compute DayCalc for that single day so the caller can return it
    const settings = await this.requireSettings(centerId);

    const rawEntries: RawEntry[] = punches.map((p) => ({
      type: p.type,
      deviceTimestamp: p.deviceTimestamp,
      date: dateObj,
    }));

    const [day] = this.computeStaffDays(rawEntries, settings, [adjustment]);

    // If there were no punches at all the day won't appear — return a zeroed day
    const effectiveDay: DayCalc = day ?? {
      date: dto.date,
      clockIn: adjustedClockIn,
      clockOut: adjustedClockOut,
      breakIn: adjustedBreakIn,
      breakOut: adjustedBreakOut,
      totalMs: 0,
      breakMs: 0,
      workedMs: 0,
      regularHours: 0,
      overtimeHours: 0,
      adjusted: true,
    };

    return { adjustment, day: effectiveDay };
  }

  // ------------------------------------------------- audit log

  /**
   * GET /attendance/payroll/staff/:staffId/adjustments?month=YYYY-MM&centerId=
   * Returns all PayrollAdjustment rows for a staff member in the given month,
   * ordered adjustedAt desc. Each row includes the adjuster's first/last name.
   */
  async getStaffAdjustments(
    centerId: string,
    staffId: string,
    month: string,
  ) {
    // Validate staff belongs to this center
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { centerId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    if (staff.centerId !== centerId)
      throw new BadRequestException('Staff does not belong to this center');

    const { startDate, endDate } = monthBounds(month);

    return this.prisma.payrollAdjustment.findMany({
      where: {
        staffId,
        centerId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        adjuster: { select: { firstName: true, lastName: true } },
      },
      orderBy: { adjustedAt: 'desc' },
    });
  }

  // ------------------------------------------------- bulk approve

  /**
   * POST /attendance/payroll/approve-all?month=YYYY-MM&centerId=
   * For every ACTIVE staff in the center, for each weekday in the month that:
   *   - has at least one punch (StaffTimeEntry) on that date
   *   - does NOT already have an APPROVED AttendanceApproval
   *   - has NO PENDING CorrectionRequest for that date
   * → upsert AttendanceApproval status=APPROVED.
   *
   * Returns { approved: count, skipped: count }.
   */
  async bulkApproveMonth(
    centerId: string,
    month: string,
    directorId: string,
  ): Promise<{ approved: number; skipped: number }> {
    const { startDate, endDate } = monthBounds(month);

    // 1. All ACTIVE staff in the center
    const staff = await this.prisma.staff.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: { id: true },
    });
    const staffIds = staff.map((s) => s.id);
    if (staffIds.length === 0) return { approved: 0, skipped: 0 };

    // 2. All dates-with-punches in [start, end] for these staff
    //    We group by (staffId, date) — a day counts if it has at least one entry.
    const entries = await this.prisma.staffTimeEntry.findMany({
      where: {
        centerId,
        staffId: { in: staffIds },
        date: { gte: startDate, lte: endDate },
      },
      select: { staffId: true, date: true },
      distinct: ['staffId', 'date'],
    });

    // 3. Existing APPROVED approvals (keyed "staffId|date")
    const existingApproved = await this.prisma.attendanceApproval.findMany({
      where: {
        centerId,
        staffId: { in: staffIds },
        date: { gte: startDate, lte: endDate },
        status: 'APPROVED',
      },
      select: { staffId: true, date: true },
    });
    const approvedKeys = new Set(
      existingApproved.map((a) => `${a.staffId}|${a.date.toISOString().split('T')[0]}`),
    );

    // 4. Pending correction requests in the range (keyed "staffId|date")
    const pendingCorrections = await this.prisma.correctionRequest.findMany({
      where: {
        centerId,
        staffId: { in: staffIds },
        status: 'PENDING',
        date: { gte: startDate, lte: endDate },
      },
      select: { staffId: true, date: true },
    });
    const pendingCorrKeys = new Set(
      pendingCorrections.map((c) => `${c.staffId}|${c.date.toISOString().split('T')[0]}`),
    );

    const now = new Date();
    let approved = 0;
    let skipped = 0;

    for (const entry of entries) {
      const dateStr = entry.date.toISOString().split('T')[0];
      const key = `${entry.staffId}|${dateStr}`;

      // Skip if already approved
      if (approvedKeys.has(key)) {
        skipped++;
        continue;
      }

      // Skip if there's a pending correction on that day
      if (pendingCorrKeys.has(key)) {
        skipped++;
        continue;
      }

      const dateObj = new Date(dateStr + 'T00:00:00.000Z');
      const weekStart = mondayOfDate(dateObj);

      await this.prisma.attendanceApproval.upsert({
        where: {
          staffId_centerId_date: {
            staffId: entry.staffId,
            centerId,
            date: dateObj,
          },
        },
        create: {
          staffId: entry.staffId,
          centerId,
          date: dateObj,
          weekStart,
          status: 'APPROVED',
          reviewedBy: directorId,
          reviewedAt: now,
        },
        update: {
          status: 'APPROVED',
          reviewedBy: directorId,
          reviewedAt: now,
          weekStart,
        },
      });

      approved++;
    }

    return { approved, skipped };
  }

  // ------------------------------------------------- report

  async generateReport(periodId: string, centerId: string): Promise<PayrollReport> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Period not found');
    if (period.centerId !== centerId)
      throw new BadRequestException('Period does not belong to this center');

    const settings = await this.requireSettings(centerId);
    const staffMembers = await this.loadStaffWithEntries(
      centerId,
      period.startDate,
      period.endDate,
    );

    const staffPayrolls: StaffPayroll[] = staffMembers.map((s) => {
      const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
      return this.computeStaffPayroll(
        {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null,
        },
        days,
        settings,
      );
    });

    return {
      period: {
        id: period.id,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
        status: period.status,
      },
      settings: {
        frequency: settings.frequency,
        breakPaid: settings.breakPaid,
        overtimeDailyThreshold: settings.overtimeDailyThreshold,
        overtimeWeeklyThreshold: settings.overtimeWeeklyThreshold,
        overtimeRate: settings.overtimeRate,
      },
      staff: staffPayrolls,
      totals: {
        regularHours: staffPayrolls.reduce((s, p) => s + p.totalRegular, 0),
        overtimeHours: staffPayrolls.reduce((s, p) => s + p.totalOvertime, 0),
        totalPay: staffPayrolls.reduce((s, p) => s + p.totalPay, 0),
      },
    };
  }

  // ------------------------------------------------- export

  generateExcel(report: PayrollReport): Buffer {
    const rows = report.staff.map((s) => ({
      'Staff': `${s.staff.firstName} ${s.staff.lastName}`,
      'Hourly Rate': s.staff.hourlyRate ?? 0,
      'Regular Hours': Math.round(s.totalRegular * 100) / 100,
      'Overtime Hours': Math.round(s.totalOvertime * 100) / 100,
      'Total Pay': Math.round(s.totalPay * 100) / 100,
    }));

    rows.push({
      'Staff': 'TOTAL',
      'Hourly Rate': 0,
      'Regular Hours': Math.round(report.totals.regularHours * 100) / 100,
      'Overtime Hours': Math.round(report.totals.overtimeHours * 100) / 100,
      'Total Pay': Math.round(report.totals.totalPay * 100) / 100,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    // Detail sheet per staff
    for (const s of report.staff) {
      const dayRows = s.days.map((d) => ({
        'Date': d.date,
        'Clock In': d.clockIn ? new Date(d.clockIn).toLocaleTimeString() : '',
        'Clock Out': d.clockOut ? new Date(d.clockOut).toLocaleTimeString() : '',
        'Break (min)': Math.round(d.breakMs / 60_000),
        'Regular': Math.round(d.regularHours * 100) / 100,
        'Overtime': Math.round(d.overtimeHours * 100) / 100,
      }));
      const detailWs = XLSX.utils.json_to_sheet(dayRows);
      const sheetName = `${s.staff.firstName} ${s.staff.lastName}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, detailWs, sheetName);
    }

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  // ------------------------------------------------- personal PDF (STAFF)

  /**
   * Generates a single-staff PDF for a given StaffPayroll + month label.
   * Reuses the same jsPDF layout as generatePdf but scoped to one person.
   */
  generatePersonalPdf(payroll: StaffPayroll, month: string): Buffer {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();

    const name = `${payroll.staff.firstName} ${payroll.staff.lastName}`;
    doc.setFontSize(16);
    doc.text('My Payroll Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Staff: ${name}`, 14, 28);
    doc.text(`Month: ${month}`, 14, 34);

    let y = 44;
    doc.setFontSize(9);

    // Summary row
    doc.setFont(undefined, 'bold');
    doc.text('Regular Hours', 14, y);
    doc.text('Overtime Hours', 80, y);
    doc.text('Total Pay', 150, y);
    doc.setFont(undefined, 'normal');
    y += 6;

    doc.text(`${payroll.totalRegular.toFixed(1)}h`, 14, y);
    doc.text(`${payroll.totalOvertime.toFixed(1)}h`, 80, y);
    doc.text(`$${payroll.totalPay.toFixed(2)}`, 150, y);

    y += 10;

    // Per-day header
    doc.setFont(undefined, 'bold');
    doc.text('Date', 14, y);
    doc.text('Clock In', 50, y);
    doc.text('Clock Out', 85, y);
    doc.text('Regular', 125, y);
    doc.text('OT', 155, y);
    doc.text('Adj', 175, y);
    doc.setFont(undefined, 'normal');
    y += 6;

    for (const d of payroll.days) {
      if (y > 270) { doc.addPage(); y = 20; }
      const ci = d.clockIn ? new Date(d.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const co = d.clockOut ? new Date(d.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      doc.text(d.date, 14, y);
      doc.text(ci, 50, y);
      doc.text(co, 85, y);
      doc.text(`${d.regularHours.toFixed(1)}h`, 125, y);
      doc.text(`${d.overtimeHours.toFixed(1)}h`, 155, y);
      if (d.adjusted) doc.text('*', 175, y);
      y += 5;
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  // ------------------------------------------------- range report (DIRECTOR)

  /**
   * Generates a PayrollReport over an arbitrary [from, to] date range.
   * Reuses loadStaffWithEntries + computeStaffDays + computeStaffPayroll.
   * The period field uses status 'range' so callers can distinguish it from
   * period-based reports. No period ID is required — a synthetic one is used.
   */
  async generateRangeReport(
    centerId: string,
    from: string,
    to: string,
  ): Promise<PayrollReport> {
    const startDate = new Date(from + 'T00:00:00.000Z');
    const endDate = new Date(to + 'T00:00:00.000Z');

    const settings = await this.requireSettings(centerId);
    const staffMembers = await this.loadStaffWithEntries(centerId, startDate, endDate);

    const staffPayrolls: StaffPayroll[] = staffMembers.map((s) => {
      const days = this.computeStaffDays(s.timeEntries, settings, s.payrollAdjustments);
      return this.computeStaffPayroll(
        {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : null,
        },
        days,
        settings,
      );
    });

    return {
      period: {
        id: `range-${from}-${to}`,
        startDate: from,
        endDate: to,
        status: 'range',
      },
      settings: {
        frequency: settings.frequency,
        breakPaid: settings.breakPaid,
        overtimeDailyThreshold: settings.overtimeDailyThreshold,
        overtimeWeeklyThreshold: settings.overtimeWeeklyThreshold,
        overtimeRate: settings.overtimeRate,
      },
      staff: staffPayrolls,
      totals: {
        regularHours: staffPayrolls.reduce((s, p) => s + p.totalRegular, 0),
        overtimeHours: staffPayrolls.reduce((s, p) => s + p.totalOvertime, 0),
        totalPay: staffPayrolls.reduce((s, p) => s + p.totalPay, 0),
      },
    };
  }

  generatePdf(report: PayrollReport): Buffer {
    // jsPDF in Node requires the constructor from the module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Payroll Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${report.period.startDate} — ${report.period.endDate}`, 14, 28);
    doc.text(`Status: ${report.period.status}`, 14, 34);

    let y = 44;
    doc.setFontSize(9);

    // Header
    doc.setFont(undefined, 'bold');
    doc.text('Staff', 14, y);
    doc.text('Rate', 70, y);
    doc.text('Regular', 95, y);
    doc.text('OT', 125, y);
    doc.text('Pay', 150, y);
    doc.setFont(undefined, 'normal');
    y += 6;

    for (const s of report.staff) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${s.staff.firstName} ${s.staff.lastName}`, 14, y);
      doc.text(`$${s.staff.hourlyRate?.toFixed(2) ?? '0.00'}`, 70, y);
      doc.text(`${s.totalRegular.toFixed(1)}h`, 95, y);
      doc.text(`${s.totalOvertime.toFixed(1)}h`, 125, y);
      doc.text(`$${s.totalPay.toFixed(2)}`, 150, y);
      y += 5;
    }

    y += 3;
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL', 14, y);
    doc.text(`${report.totals.regularHours.toFixed(1)}h`, 95, y);
    doc.text(`${report.totals.overtimeHours.toFixed(1)}h`, 125, y);
    doc.text(`$${report.totals.totalPay.toFixed(2)}`, 150, y);

    return Buffer.from(doc.output('arraybuffer'));
  }
}
