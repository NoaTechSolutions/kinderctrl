import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIRECTOR_EMAIL = 'seed-director-01@kinderctrl.com';

const EXPECTED_NAMES = [
  { firstName: 'John', lastName: 'Doe' },
  { firstName: 'María', lastName: 'García' },
  { firstName: 'Carlos', lastName: 'López' },
  { firstName: 'Ana', lastName: 'Martínez' },
];

const HOURLY_RATES: Record<string, number> = {
  'John Doe': 25,
  'María García': 22,
  'Carlos López': 20,
  'Ana Martínez': 18,
};

// Weekly payroll periods across April, May and June 2026.
//  • April + May: fully APPROVED (each with a short partial first/last week).
//  • June: a single OPEN current period (Jun 1–7); punches & approvals only
//    exist up to TODAY (Jun 2) — the rest of the week is in the future.
//  • María García works overtime (10h/day) the weeks of Apr 14–20 and
//    May 19–25 (`mariaOvertime`).
const PERIODS: Array<{
  startDate: Date;
  endDate: Date;
  approved: boolean;
  mariaOvertime?: boolean;
}> = [
  // ── April 2026 (APPROVED) ──
  { startDate: new Date('2026-04-01T00:00:00.000Z'), endDate: new Date('2026-04-06T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-04-07T00:00:00.000Z'), endDate: new Date('2026-04-13T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-04-14T00:00:00.000Z'), endDate: new Date('2026-04-20T00:00:00.000Z'), approved: true, mariaOvertime: true },
  { startDate: new Date('2026-04-21T00:00:00.000Z'), endDate: new Date('2026-04-27T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-04-28T00:00:00.000Z'), endDate: new Date('2026-04-30T00:00:00.000Z'), approved: true },
  // ── May 2026 (APPROVED) ──
  { startDate: new Date('2026-05-01T00:00:00.000Z'), endDate: new Date('2026-05-04T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-05-05T00:00:00.000Z'), endDate: new Date('2026-05-11T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-05-12T00:00:00.000Z'), endDate: new Date('2026-05-18T00:00:00.000Z'), approved: true },
  { startDate: new Date('2026-05-19T00:00:00.000Z'), endDate: new Date('2026-05-25T00:00:00.000Z'), approved: true, mariaOvertime: true },
  { startDate: new Date('2026-05-26T00:00:00.000Z'), endDate: new Date('2026-05-31T00:00:00.000Z'), approved: true },
  // ── June 2026 (OPEN — current period; only Jun 1–2 have punches) ──
  { startDate: new Date('2026-06-01T00:00:00.000Z'), endDate: new Date('2026-06-07T00:00:00.000Z'), approved: false },
];

// "Today" on the seed timeline. June's open period runs Jun 1–7, but punches and
// approvals only exist up to here — later days are in the future.
const TODAY = new Date('2026-06-02T00:00:00.000Z');

// Extra non-weekly periods in the APPROVED months (April, May) so the Current
// Period frequency FILTER has biweekly/monthly data to show. These only create
// PayrollPeriod rows — they do NOT drive punch/approval generation (punches are
// shared per-date and would be re-upserted by overlapping periods).
const EXTRA_PERIODS: Array<{
  startDate: Date;
  endDate: Date;
  frequency: 'BIWEEKLY' | 'MONTHLY';
}> = [
  { startDate: new Date('2026-04-07T00:00:00.000Z'), endDate: new Date('2026-04-20T00:00:00.000Z'), frequency: 'BIWEEKLY' },
  { startDate: new Date('2026-04-01T00:00:00.000Z'), endDate: new Date('2026-04-30T00:00:00.000Z'), frequency: 'MONTHLY' },
  { startDate: new Date('2026-05-05T00:00:00.000Z'), endDate: new Date('2026-05-18T00:00:00.000Z'), frequency: 'BIWEEKLY' },
  { startDate: new Date('2026-05-01T00:00:00.000Z'), endDate: new Date('2026-05-31T00:00:00.000Z'), frequency: 'MONTHLY' },
];

// One "random" missing-punch weekday per staff (a sick / forgot-to-punch day),
// on top of the recurring weekly days off. Keyed by full name. Chosen to avoid
// each staff's recurring off day, María's overtime week, and John's adjustment
// day (2026-05-15).
const RANDOM_OFF_DATES: Record<string, string> = {
  'John Doe': '2026-05-14', // Thursday
  'María García': '2026-05-07', // Thursday (outside her OT week)
  'Carlos López': '2026-05-12', // Tuesday (already off Thursdays)
  'Ana Martínez': '2026-05-20', // Wednesday (already off Fridays)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a UTC Date for the given ISO date string (e.g. '2026-05-05') + hour offset */
function utcDate(isoDate: string, utcHour: number, utcMin = 0): Date {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCHours(utcHour, utcMin, 0, 0);
  return d;
}

/** Return ISO date string 'YYYY-MM-DD' from a Date */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Enumerate all weekday dates (Mon–Fri) between startDate and endDate (inclusive).
 * Works in UTC getUTCDay: 0=Sun, 1=Mon … 5=Fri, 6=Sat.
 */
function weekdaysInRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      result.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

/**
 * Deterministic offset (0–14 min) derived from staff name + date string.
 * Keeps the data realistic without randomness (idempotent).
 */
function deterministicOffset(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  }
  return h % 15; // 0..14
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollSeedService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Resolve director + center + staff ─────────────────────────────────────

  private async resolveContext() {
    const director = await this.prisma.user.findUnique({
      where: { email: DIRECTOR_EMAIL },
      select: {
        id: true,
        ownedCenters: { select: { id: true, name: true }, take: 1 },
        centerId: true,
      },
    });

    if (!director) {
      throw new BadRequestException(
        `Seed director not found. Expected a user with email "${DIRECTOR_EMAIL}". ` +
          `Run the user/center seed first.`,
      );
    }

    // centerId may come from User.centerId (if director is a member) or from ownedCenters[0]
    const centerId =
      director.centerId ?? director.ownedCenters[0]?.id ?? null;

    if (!centerId) {
      throw new BadRequestException(
        `Director "${DIRECTOR_EMAIL}" has no associated center (centerId is null ` +
          `and ownedCenters is empty). Ensure the Sunshine Learning Academy seed ran first.`,
      );
    }

    // Match all staff in that center against the expected names
    const allStaff = await this.prisma.staff.findMany({
      where: { centerId },
      select: { id: true, firstName: true, lastName: true },
    });

    const found: Array<{ id: string; firstName: string; lastName: string }> =
      [];
    const missing: string[] = [];

    for (const expected of EXPECTED_NAMES) {
      const match = allStaff.find(
        (s) =>
          s.firstName === expected.firstName &&
          s.lastName === expected.lastName,
      );
      if (match) {
        found.push(match);
      } else {
        missing.push(`${expected.firstName} ${expected.lastName}`);
      }
    }

    if (missing.length > 0) {
      const foundNames = found.map((s) => `${s.firstName} ${s.lastName}`);
      throw new BadRequestException(
        `The following expected staff were NOT found in center "${centerId}": ` +
          `[${missing.join(', ')}]. ` +
          `Found: [${foundNames.join(', ')}]. ` +
          `Do NOT create staff via this endpoint — they must pre-exist from the staff seed.`,
      );
    }

    return { directorId: director.id, centerId, staff: found };
  }

  // ─── SEED ──────────────────────────────────────────────────────────────────

  async seedPayroll(): Promise<object> {
    // Run reset first so seed is idempotent
    await this._deletePayrollData();

    const { directorId, centerId, staff } = await this.resolveContext();

    const staffByName = new Map(
      staff.map((s) => [`${s.firstName} ${s.lastName}`, s]),
    );
    const john = staffByName.get('John Doe')!;
    const maria = staffByName.get('María García')!;
    const carlos = staffByName.get('Carlos López')!;
    const ana = staffByName.get('Ana Martínez')!;

    // ── 1. Hourly rates ──────────────────────────────────────────────────────
    await Promise.all(
      staff.map((s) =>
        this.prisma.staff.update({
          where: { id: s.id },
          data: {
            hourlyRate: HOURLY_RATES[`${s.firstName} ${s.lastName}`] as number,
          },
        }),
      ),
    );

    // ── 2. PayrollSettings ──────────────────────────────────────────────────
    await this.prisma.payrollSettings.upsert({
      where: { centerId },
      create: {
        centerId,
        frequency: 'WEEKLY',
        breakPaid: false,
        overtimeDailyThreshold: 8,
        overtimeWeeklyThreshold: 40,
        overtimeRate: 1.5,
      },
      update: {
        frequency: 'WEEKLY',
        breakPaid: false,
        overtimeDailyThreshold: 8,
        overtimeWeeklyThreshold: 40,
        overtimeRate: 1.5,
      },
    });

    // ── 3. PayrollPeriods ────────────────────────────────────────────────────
    const createdPeriods: Array<{
      id: string;
      startDate: Date;
      endDate: Date;
      approved: boolean;
    }> = [];

    for (const p of PERIODS) {
      const period = await this.prisma.payrollPeriod.create({
        data: {
          centerId,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.approved ? 'APPROVED' : 'OPEN',
          approvedBy: p.approved ? directorId : null,
          approvedAt: p.approved ? new Date() : null,
          frequency: 'WEEKLY',
        },
      });
      createdPeriods.push({
        id: period.id,
        startDate: p.startDate,
        endDate: p.endDate,
        approved: p.approved,
      });
    }

    // Extra biweekly/monthly periods (all APPROVED) for the frequency filter demo
    for (const e of EXTRA_PERIODS) {
      const period = await this.prisma.payrollPeriod.create({
        data: {
          centerId,
          startDate: e.startDate,
          endDate: e.endDate,
          status: 'APPROVED',
          approvedBy: directorId,
          approvedAt: new Date(),
          frequency: e.frequency,
        },
      });
      createdPeriods.push({
        id: period.id,
        startDate: e.startDate,
        endDate: e.endDate,
        approved: true,
      });
    }

    // ── 3.5 Schedules ────────────────────────────────────────────────────────
    // One APPROVED Schedule per staff covering the full seed range (2026-05-05
    // to 2026-06-01). Mon–Fri: 08:00–16:00 (8 h/day → ~40 h/week). Sat+Sun: isOff.
    // ScheduleDay cascades on Schedule delete so no separate cleanup needed.
    const SCHEDULE_START = new Date('2026-04-01T00:00:00.000Z');
    const SCHEDULE_END = new Date('2026-06-07T00:00:00.000Z');

    const SCHEDULE_DAYS: Array<{
      dayOfWeek: number;
      startTime: string | null;
      endTime: string | null;
      isOff: boolean;
    }> = [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isOff: false }, // Mon
      { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isOff: false }, // Tue
      { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isOff: false }, // Wed
      { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isOff: false }, // Thu
      { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', isOff: false }, // Fri
      { dayOfWeek: 6, startTime: null, endTime: null, isOff: true },        // Sat
      { dayOfWeek: 7, startTime: null, endTime: null, isOff: true },        // Sun
    ];

    let scheduleCount = 0;
    for (const s of staff) {
      await this.prisma.schedule.create({
        data: {
          staffId: s.id,
          centerId,
          startDate: SCHEDULE_START,
          endDate: SCHEDULE_END,
          status: 'APPROVED',
          approvedBy: directorId,
          approvedAt: new Date(),
          days: {
            create: SCHEDULE_DAYS.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              startTime: d.startTime,
              endTime: d.endTime,
              isOff: d.isOff,
            })),
          },
        },
      });
      scheduleCount++;
    }

    // ── 4. Punches ───────────────────────────────────────────────────────────
    let punchCount = 0;

    for (let pi = 0; pi < PERIODS.length; pi++) {
      const period = PERIODS[pi];
      const days = weekdaysInRange(period.startDate, period.endDate);

      for (const day of days) {
        const isoDay = toIsoDate(day);
        const dowUtc = day.getUTCDay(); // 1=Mon..5=Fri

        // No punches for future dates (June's open period runs past today)
        if (day > TODAY) continue;

        for (const s of staff) {
          const fullName = `${s.firstName} ${s.lastName}`;

          // ── OFF-day rules ──────────────────────────────────────────────────
          // Carlos López: every Thursday (getUTCDay === 4)
          if (s.id === carlos.id && dowUtc === 4) continue;
          // Ana Martínez: every Friday (getUTCDay === 5)
          if (s.id === ana.id && dowUtc === 5) continue;
          // Per-staff "random" missing-punch day (sick / forgot to clock)
          if (RANDOM_OFF_DATES[fullName] === isoDay) continue;

          // ── OVERTIME override: María García on flagged weeks (Apr 14–20, May 19–25) ──
          if (s.id === maria.id && period.mariaOvertime) {
            // CLOCK_IN 08:00, CLOCK_OUT 18:00, no breaks (10h net → 2h OT/day)
            const dateField = new Date(`${isoDay}T00:00:00.000Z`);
            await this.prisma.staffTimeEntry.upsert({
              where: {
                staffId_centerId_date_type: {
                  staffId: s.id,
                  centerId,
                  date: dateField,
                  type: 'CLOCK_IN',
                },
              },
              create: {
                staffId: s.id,
                centerId,
                date: dateField,
                type: 'CLOCK_IN',
                deviceTimestamp: utcDate(isoDay, 8, 0),
                source: 'APP',
              },
              update: {
                deviceTimestamp: utcDate(isoDay, 8, 0),
                source: 'APP',
              },
            });
            await this.prisma.staffTimeEntry.upsert({
              where: {
                staffId_centerId_date_type: {
                  staffId: s.id,
                  centerId,
                  date: dateField,
                  type: 'CLOCK_OUT',
                },
              },
              create: {
                staffId: s.id,
                centerId,
                date: dateField,
                type: 'CLOCK_OUT',
                deviceTimestamp: utcDate(isoDay, 18, 0),
                source: 'APP',
              },
              update: {
                deviceTimestamp: utcDate(isoDay, 18, 0),
                source: 'APP',
              },
            });
            punchCount += 2;
            continue;
          }

          // ── Normal punch pattern ───────────────────────────────────────────
          // Deterministic offsets (0–14 min) based on staff+date
          const offIn = deterministicOffset(`${fullName}-${isoDay}-in`);
          const offBreakIn = deterministicOffset(`${fullName}-${isoDay}-brki`);
          const offBreakOut = deterministicOffset(
            `${fullName}-${isoDay}-brko`,
          );
          const offOut = deterministicOffset(`${fullName}-${isoDay}-out`);

          // CLOCK_IN: 07:55 + offset (→ 07:55..08:09)
          const clockInMin = 55 + offIn; // could go into the next hour but that's fine
          const clockInHour = 7 + Math.floor(clockInMin / 60);
          const clockInActualMin = clockInMin % 60;

          // BREAK_IN:  12:00 + 0..10
          const breakInMin = offBreakIn % 10;
          // BREAK_OUT: 12:30 + 0..10
          const breakOutMin = 30 + (offBreakOut % 10);
          // CLOCK_OUT: 16:00 + 0..15
          const clockOutMin = offOut;

          const dateField = new Date(`${isoDay}T00:00:00.000Z`);

          const punches: Array<{
            type: 'CLOCK_IN' | 'BREAK_IN' | 'BREAK_OUT' | 'CLOCK_OUT';
            ts: Date;
          }> = [
            {
              type: 'CLOCK_IN',
              ts: utcDate(isoDay, clockInHour, clockInActualMin),
            },
            { type: 'BREAK_IN', ts: utcDate(isoDay, 12, breakInMin) },
            { type: 'BREAK_OUT', ts: utcDate(isoDay, 12, breakOutMin) },
            { type: 'CLOCK_OUT', ts: utcDate(isoDay, 16, clockOutMin) },
          ];

          for (const punch of punches) {
            await this.prisma.staffTimeEntry.upsert({
              where: {
                staffId_centerId_date_type: {
                  staffId: s.id,
                  centerId,
                  date: dateField,
                  type: punch.type,
                },
              },
              create: {
                staffId: s.id,
                centerId,
                date: dateField,
                type: punch.type,
                deviceTimestamp: punch.ts,
                source: 'APP',
              },
              update: {
                deviceTimestamp: punch.ts,
                source: 'APP',
              },
            });
            punchCount++;
          }
        }
      }
    }

    // ── 5. AttendanceApprovals ───────────────────────────────────────────────
    let approvalCount = 0;

    for (let pi = 0; pi < PERIODS.length; pi++) {
      const period = PERIODS[pi];
      const periodStart = period.startDate;
      const days = weekdaysInRange(period.startDate, period.endDate);

      for (const day of days) {
        const isoDay = toIsoDate(day);
        const dateField = new Date(`${isoDay}T00:00:00.000Z`);

        // No approvals for future dates
        if (day > TODAY) continue;

        for (const s of staff) {
          const fullName = `${s.firstName} ${s.lastName}`;

          // Determine approval status for this staff on this day
          let status: 'APPROVED' | 'PENDING';

          if (period.approved) {
            // Periods 0–2 (all APPROVED): everyone APPROVED
            status = 'APPROVED';
          } else {
            // Period 3 (OPEN): John + María → APPROVED, Carlos + Ana → PENDING
            if (s.id === john.id || s.id === maria.id) {
              status = 'APPROVED';
            } else {
              status = 'PENDING';
            }
          }

          await this.prisma.attendanceApproval.upsert({
            where: {
              staffId_centerId_date: {
                staffId: s.id,
                centerId,
                date: dateField,
              },
            },
            create: {
              staffId: s.id,
              centerId,
              date: dateField,
              weekStart: periodStart,
              status,
              reviewedBy:
                status === 'APPROVED' ? directorId : null,
              reviewedAt: status === 'APPROVED' ? new Date() : null,
            },
            update: {
              weekStart: periodStart,
              status,
              reviewedBy:
                status === 'APPROVED' ? directorId : null,
              reviewedAt: status === 'APPROVED' ? new Date() : null,
            },
          });
          approvalCount++;

          void fullName; // suppress unused warning
        }
      }
    }

    // ── 6. CorrectionRequest for Ana Martínez ────────────────────────────────
    // yesterday = 2026-05-31, today is 2026-06-01
    const yesterdayIso = '2026-05-31';
    const corrDate = new Date(`${yesterdayIso}T00:00:00.000Z`);
    const corrExpiresAt = new Date('2026-06-07T00:00:00.000Z'); // +7 days

    await this.prisma.correctionRequest.create({
      data: {
        staffId: ana.id,
        centerId,
        date: corrDate,
        status: 'PENDING',
        staffComment: 'Clock in time was wrong',
        originalClockIn: new Date('2026-05-31T09:30:00.000Z'),
        requestedClockIn: new Date('2026-05-31T08:00:00.000Z'),
        expiresAt: corrExpiresAt,
      },
    });

    // ── 7. PayrollAdjustment for John Doe on 2026-05-15 ─────────────────────
    const adjDate = new Date('2026-05-15T00:00:00.000Z');

    // Look up John's actual punches for that day to snapshot the originals
    const johnPunches = await this.prisma.staffTimeEntry.findMany({
      where: {
        staffId: john.id,
        centerId,
        date: adjDate,
      },
    });

    const findTs = (type: string) =>
      johnPunches.find((e) => e.type === type)?.deviceTimestamp ?? null;

    await this.prisma.payrollAdjustment.create({
      data: {
        staffId: john.id,
        centerId,
        date: adjDate,
        originalClockIn: findTs('CLOCK_IN'),
        originalBreakIn: findTs('BREAK_IN'),
        originalBreakOut: findTs('BREAK_OUT'),
        originalClockOut: new Date('2026-05-15T17:00:00.000Z'),
        adjustedClockIn: findTs('CLOCK_IN'),
        adjustedBreakIn: findTs('BREAK_IN'),
        adjustedBreakOut: findTs('BREAK_OUT'),
        adjustedClockOut: new Date('2026-05-15T16:00:00.000Z'),
        reason: 'Entered wrong time, corrected by director',
        adjustedBy: directorId,
      },
    });

    return {
      summary: {
        centerId,
        directorId,
        staff: staff.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          hourlyRate: HOURLY_RATES[`${s.firstName} ${s.lastName}`],
        })),
        created: {
          hourlyRatesSet: staff.length,
          payrollSettings: 1,
          payrollPeriods: createdPeriods.length,
          schedules: scheduleCount,
          punches: punchCount,
          attendanceApprovals: approvalCount,
          correctionRequests: 1,
          payrollAdjustments: 1,
        },
      },
    };
  }

  // ─── RESET ─────────────────────────────────────────────────────────────────

  async resetPayrollSeed(): Promise<object> {
    return this._deletePayrollData();
  }

  // ─── DEV: realistic schedules across a multi-week range ─────────────────────
  // Fills the Schedules calendar (Month / Week / Day) for the last 2 weeks of
  // May + all of June 2026 so every view has data. One Schedule per (staff,
  // week) keyed by the week's Monday startDate (the calendar indexes by that),
  // endDate = Sunday. Weekday-only (Mon–Fri); weekends are left empty (realistic
  // for a daycare). Carlos is always off Thursday, Ana always off Friday. Per-day
  // staff count + shift hours vary deterministically so days read differently
  // (some 4 teachers, some 1–3). Idempotent: drops these weeks first; the payroll
  // seed's recurring schedule (a non-Monday startDate) is left untouched.
  async seedSchedules(): Promise<object> {
    const { directorId, centerId, staff } = await this.resolveContext();
    const byName = new Map(staff.map((s) => [`${s.firstName} ${s.lastName}`, s]));
    // Rotation order; index 2 = Carlos (off Thu), index 3 = Ana (off Fri).
    const order = [
      byName.get('John Doe')!,
      byName.get('María García')!,
      byName.get('Carlos López')!,
      byName.get('Ana Martínez')!,
    ];
    const carlosId = order[2].id;
    const anaId = order[3].id;

    // Week Mondays: last 2 of May + every June week (Jun 1 is a Monday). The
    // calendar matches schedules by startDate === week-Monday, so these MUST be
    // Mondays.
    const WEEK_MONDAYS = [
      '2026-05-18',
      '2026-05-25',
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ];

    const SHIFTS = [
      { startTime: '08:00', endTime: '16:00' }, // morning
      { startTime: '09:00', endTime: '17:00' }, // afternoon
      { startTime: '08:00', endTime: '12:00' }, // half day
    ];
    // Deterministic per-day target headcount → variety (some days 4, some 1–3).
    const COUNT_CYCLE = [4, 3, 2, 4, 1, 3, 2, 4, 3, 2];

    const isoToUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
    const addDaysIso = (iso: string, n: number) => {
      const d = isoToUtc(iso);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().split('T')[0];
    };

    // Idempotency: drop exactly these weeks (ScheduleDay cascades). The payroll
    // recurring schedule has a non-Monday startDate, so it is not in this set.
    await this.prisma.schedule.deleteMany({
      where: { centerId, startDate: { in: WEEK_MONDAYS.map(isoToUtc) } },
    });

    let schedulesCreated = 0;
    let scheduleDays = 0;

    for (let w = 0; w < WEEK_MONDAYS.length; w++) {
      const monday = WEEK_MONDAYS[w];
      const sunday = addDaysIso(monday, 6);

      const perStaff = new Map<
        string,
        Array<{ dayOfWeek: number; startTime: string; endTime: string }>
      >();

      for (let di = 0; di < 5; di++) {
        const dow = di + 1; // 1=Mon … 5=Fri
        const available = order.filter((s) => {
          if (dow === 4 && s.id === carlosId) return false; // Carlos off Thu
          if (dow === 5 && s.id === anaId) return false; // Ana off Fri
          return true;
        });
        const target = Math.min(
          COUNT_CYCLE[(w * 5 + di) % COUNT_CYCLE.length],
          available.length,
        );
        const rot = (w + di) % available.length;
        for (let k = 0; k < target; k++) {
          const s = available[(rot + k) % available.length];
          const shift = SHIFTS[(k + w) % SHIFTS.length];
          const list = perStaff.get(s.id) ?? [];
          list.push({ dayOfWeek: dow, ...shift });
          perStaff.set(s.id, list);
        }
      }

      for (const [staffId, days] of perStaff) {
        if (!days.length) continue;
        await this.prisma.schedule.create({
          data: {
            staffId,
            centerId,
            startDate: isoToUtc(monday),
            endDate: isoToUtc(sunday),
            status: 'APPROVED',
            approvedBy: directorId,
            approvedAt: new Date(),
            days: { create: days.map((d) => ({ ...d, isOff: false })) },
          },
        });
        schedulesCreated++;
        scheduleDays += days.length;
      }
    }

    return {
      centerId,
      weeks: WEEK_MONDAYS,
      range: { from: '2026-05-18', to: '2026-07-05' },
      schedulesCreated,
      scheduleDays,
    };
  }

  async resetSchedules(): Promise<object> {
    const { centerId } = await this.resolveContext();
    const WEEK_MONDAYS = [
      '2026-05-18',
      '2026-05-25',
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ];
    const res = await this.prisma.schedule.deleteMany({
      where: {
        centerId,
        startDate: { in: WEEK_MONDAYS.map((d) => new Date(`${d}T00:00:00.000Z`)) },
      },
    });
    return { centerId, deletedSchedules: res.count };
  }

  private async _deletePayrollData(): Promise<object> {
    const { centerId } = await this.resolveContext();

    // FK-safe deletion order:
    // 1. PayrollAdjustment + AttendanceApproval (no FK deps between them) in parallel
    // 2. StaffTimeEntry BEFORE CorrectionRequest (StaffTimeEntry.correctionId → CorrectionRequest)
    // 3. CorrectionRequest after StaffTimeEntry
    // 4. PayrollPeriod + PayrollSettings (no remaining FK deps) in parallel
    // 5. Schedules — ScheduleDay cascades from Schedule, so deleting Schedule
    //    is sufficient. No FK from any of the above to Schedule, so safe last.

    const [adj, approv] = await Promise.all([
      this.prisma.payrollAdjustment.deleteMany({ where: { centerId } }),
      this.prisma.attendanceApproval.deleteMany({ where: { centerId } }),
    ]);

    const entries = await this.prisma.staffTimeEntry.deleteMany({
      where: { centerId },
    });

    const corr = await this.prisma.correctionRequest.deleteMany({
      where: { centerId },
    });

    const [periods, settings, schedules] = await Promise.all([
      this.prisma.payrollPeriod.deleteMany({ where: { centerId } }),
      this.prisma.payrollSettings.deleteMany({ where: { centerId } }),
      this.prisma.schedule.deleteMany({ where: { centerId } }),
    ]);

    // Null out hourlyRate for all staff in the center
    await this.prisma.staff.updateMany({
      where: { centerId },
      data: { hourlyRate: null },
    });

    return {
      centerId,
      deleted: {
        payrollAdjustments: adj.count,
        attendanceApprovals: approv.count,
        staffTimeEntries: entries.count,
        correctionRequests: corr.count,
        payrollPeriods: periods.count,
        payrollSettings: settings.count,
        schedules: schedules.count,
      },
    };
  }
}
