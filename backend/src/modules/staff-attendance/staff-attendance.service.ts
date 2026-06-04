import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PunchType, StaffTimeEntry } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePunchDto } from './dto/create-punch.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { ApproveCorrectionDto } from './dto/approve-correction.dto';
import { RejectCorrectionDto } from './dto/reject-correction.dto';
import {
  ApprovalAction,
  ApproveOrRejectDayDto,
  ApproveOrRejectWeekDto,
} from './dto/attendance-approval.dto';
import { haversineDistance } from './utils/haversine';

const TIME_DRIFT_THRESHOLD_MS = 5 * 60 * 1000;

interface CenterGeo {
  id: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number;
}

@Injectable()
export class StaffAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ punch
  async punch(dto: CreatePunchDto, userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    const today = dateInTimezone(new Date(), ctx.center.timezone);

    const existing = await this.prisma.staffTimeEntry.findMany({
      where: { staffId: ctx.staffId, centerId: ctx.centerId, date: today },
      orderBy: { deviceTimestamp: 'asc' },
    });

    this.validateSequence(dto.type, existing);

    const serverReceivedAt = new Date();
    const deviceTs = new Date(dto.deviceTimestamp);
    const timeDriftDetected =
      Math.abs(serverReceivedAt.getTime() - deviceTs.getTime()) >
      TIME_DRIFT_THRESHOLD_MS;

    const withinGeoFence = this.checkGeoFence(
      dto.latitude,
      dto.longitude,
      ctx.center,
    );

    const entry = await this.prisma.staffTimeEntry.create({
      data: {
        staffId: ctx.staffId,
        centerId: ctx.centerId,
        date: today,
        type: dto.type,
        deviceTimestamp: deviceTs,
        serverReceivedAt,
        timeDriftDetected,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        withinGeoFence,
        source: dto.source ?? 'APP',
      },
    });

    return {
      entry,
      shiftStatus: buildShiftStatus([...existing, entry]),
    };
  }

  // --------------------------------------------------- staff: today entries
  async getMyToday(userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    const today = dateInTimezone(new Date(), ctx.center.timezone);

    const entries = await this.prisma.staffTimeEntry.findMany({
      where: { staffId: ctx.staffId, centerId: ctx.centerId, date: today },
      orderBy: { deviceTimestamp: 'asc' },
    });

    return { entries, shiftStatus: buildShiftStatus(entries) };
  }

  // --------------------------------------------- director: team today view
  async getTeamToday(userId: string, queryCenterId?: string) {
    const centerId = await this.resolveDirectorCenter(userId, queryCenterId);

    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { timezone: true },
    });
    if (!center) throw new NotFoundException('Center not found');

    const today = dateInTimezone(new Date(), center.timezone);

    const staffMembers = await this.prisma.staff.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        timeEntries: {
          where: { date: today },
          orderBy: { deviceTimestamp: 'asc' },
        },
      },
    });

    return {
      date: today,
      centerId,
      data: staffMembers.map((s) => ({
        staff: { id: s.id, firstName: s.firstName, lastName: s.lastName },
        entries: s.timeEntries,
        shiftStatus: buildShiftStatus(s.timeEntries),
      })),
    };
  }

  // ---------------------------------------------- director: team week view
  // Aggregated weekly hours / approval / pending-correction status per staff
  // for the Team Clock approval table. One round-trip serves the whole grid.
  async getTeamWeek(
    userId: string,
    weekStart: string,
    queryCenterId?: string,
  ) {
    const centerId = await this.resolveDirectorCenter(userId, queryCenterId);
    const { startDate, endDate } = weekBounds(weekStart);

    const staff = await this.prisma.staff.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    const staffIds = staff.map((s) => s.id);

    const [entries, approvals, corrections] = await Promise.all([
      this.prisma.staffTimeEntry.findMany({
        where: {
          staffId: { in: staffIds },
          centerId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { deviceTimestamp: 'asc' },
      }),
      this.prisma.attendanceApproval.findMany({
        where: {
          staffId: { in: staffIds },
          centerId,
          date: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.correctionRequest.findMany({
        where: {
          staffId: { in: staffIds },
          centerId,
          date: { gte: startDate, lte: endDate },
          status: 'PENDING',
        },
        select: { id: true, staffId: true, date: true },
      }),
    ]);

    const dayKeys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      dayKeys.push(d.toISOString().split('T')[0]);
    }
    const sameDateKey = (a: Date, b: string) =>
      a.toISOString().split('T')[0] === b;

    return {
      weekStart: startDate.toISOString().split('T')[0],
      weekEnd: endDate.toISOString().split('T')[0],
      staff: staff.map((s) => {
        const sEntries = entries.filter((e) => e.staffId === s.id);
        const sApprovals = approvals.filter((a) => a.staffId === s.id);
        const sCorrections = corrections.filter((c) => c.staffId === s.id);
        const days = dayKeys.map((dk) => ({
          date: dk,
          entries: sEntries.filter((e) => sameDateKey(e.date, dk)),
          approval: sApprovals.find((a) => sameDateKey(a.date, dk)) ?? null,
          pendingCorrection: sCorrections.some((c) => sameDateKey(c.date, dk)),
        }));
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          days,
          pendingCorrectionsCount: sCorrections.length,
        };
      }),
    };
  }

  // ======================================================== SCHEDULES

  async createSchedule(
    dto: CreateScheduleDto,
    userId: string,
    queryCenterId?: string,
  ) {
    // SUPER_ADMIN passes the target center (center detail Schedules tab);
    // DIRECTOR ignores it and uses their own center.
    const centerId = await this.resolveDirectorCenter(userId, queryCenterId);

    await this.ensureStaffBelongsToCenter(dto.staffId, centerId);

    const { startDate, endDate } = weekBounds(dto.weekStart);

    const existing = await this.prisma.schedule.findUnique({
      where: {
        staffId_centerId_startDate: {
          staffId: dto.staffId,
          centerId,
          startDate,
        },
      },
    });
    if (existing)
      throw new ConflictException(
        'Schedule already exists for this staff and week',
      );

    this.validateDays(dto.days);

    return this.prisma.schedule.create({
      data: {
        staffId: dto.staffId,
        centerId,
        startDate,
        endDate,
        days: {
          create: dto.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.isOff ? null : d.startTime,
            endTime: d.isOff ? null : d.endTime,
            isOff: d.isOff ?? false,
          })),
        },
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
  }

  async findSchedules(
    userId: string,
    query: {
      staffId?: string;
      status?: 'DRAFT' | 'APPROVED';
      centerId?: string;
    },
  ) {
    const centerId = await this.resolveDirectorCenter(userId, query.centerId);

    return this.prisma.schedule.findMany({
      where: {
        centerId,
        ...(query.staffId && { staffId: query.staffId }),
        ...(query.status && { status: query.status }),
      },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findScheduleById(id: string, userId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    await this.ensureAccessToCenter(userId, schedule.centerId);
    return schedule;
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto, userId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.status !== 'DRAFT')
      throw new BadRequestException('Only DRAFT schedules can be edited');

    await this.ensureAccessToCenter(userId, schedule.centerId);
    this.validateDays(dto.days);

    return this.prisma.$transaction(async (tx) => {
      await tx.scheduleDay.deleteMany({ where: { scheduleId: id } });

      return tx.schedule.update({
        where: { id },
        data: {
          days: {
            create: dto.days.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              startTime: d.isOff ? null : d.startTime,
              endTime: d.isOff ? null : d.endTime,
              isOff: d.isOff ?? false,
            })),
          },
        },
        include: { days: { orderBy: { dayOfWeek: 'asc' } } },
      });
    });
  }

  async deleteSchedule(id: string, userId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.status !== 'DRAFT')
      throw new BadRequestException('Only DRAFT schedules can be deleted');

    await this.ensureAccessToCenter(userId, schedule.centerId);

    await this.prisma.schedule.delete({ where: { id } });
    return { deleted: true };
  }

  async approveSchedule(id: string, userId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.status === 'APPROVED')
      throw new BadRequestException('Schedule is already approved');

    await this.ensureAccessToCenter(userId, schedule.centerId);

    return this.prisma.schedule.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async duplicateSchedule(id: string, userId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { days: true },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    await this.ensureAccessToCenter(userId, schedule.centerId);

    const nextStart = new Date(schedule.startDate);
    nextStart.setUTCDate(nextStart.getUTCDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 6);

    const existing = await this.prisma.schedule.findUnique({
      where: {
        staffId_centerId_startDate: {
          staffId: schedule.staffId,
          centerId: schedule.centerId,
          startDate: nextStart,
        },
      },
    });
    if (existing)
      throw new ConflictException('Schedule already exists for next week');

    return this.prisma.schedule.create({
      data: {
        staffId: schedule.staffId,
        centerId: schedule.centerId,
        startDate: nextStart,
        endDate: nextEnd,
        days: {
          create: schedule.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            isOff: d.isOff,
          })),
        },
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
  }

  // staff: my approved schedules
  async getMySchedule(userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    const today = dateInTimezone(new Date(), ctx.center.timezone);

    return this.prisma.schedule.findMany({
      where: {
        staffId: ctx.staffId,
        centerId: ctx.centerId,
        status: 'APPROVED',
        endDate: { gte: today },
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { startDate: 'asc' },
    });
  }

  // ========================================================= CORRECTIONS

  async createCorrection(dto: CreateCorrectionDto, userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    const shiftDate = new Date(dto.date + 'T00:00:00.000Z');

    const hoursSince =
      (Date.now() - shiftDate.getTime()) / 3_600_000;
    if (hoursSince > 48)
      throw new BadRequestException(
        'Corrections must be requested within 48 hours',
      );

    const entries = await this.prisma.staffTimeEntry.findMany({
      where: { staffId: ctx.staffId, centerId: ctx.centerId, date: shiftDate },
    });
    if (!entries.length)
      throw new BadRequestException('No entries found for this date');

    const existing = await this.prisma.correctionRequest.findFirst({
      where: {
        staffId: ctx.staffId,
        centerId: ctx.centerId,
        date: shiftDate,
        status: 'PENDING',
      },
    });

    if (existing && !dto.replaceExisting) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CORRECTION_EXISTS',
        message: 'A pending correction already exists for this date',
        existingId: existing.id,
      });
    }

    if (existing && dto.replaceExisting) {
      await this.prisma.correctionRequest.delete({
        where: { id: existing.id },
      });
    }

    const find = (t: string) =>
      entries.find((e) => e.type === t)?.deviceTimestamp ?? null;

    return this.prisma.correctionRequest.create({
      data: {
        staffId: ctx.staffId,
        centerId: ctx.centerId,
        date: shiftDate,
        originalClockIn: find('CLOCK_IN'),
        originalBreakIn: find('BREAK_IN'),
        originalBreakOut: find('BREAK_OUT'),
        originalClockOut: find('CLOCK_OUT'),
        requestedClockIn: dto.requestedClockIn
          ? new Date(dto.requestedClockIn)
          : find('CLOCK_IN'),
        requestedBreakIn: dto.requestedBreakIn
          ? new Date(dto.requestedBreakIn)
          : find('BREAK_IN'),
        requestedBreakOut: dto.requestedBreakOut
          ? new Date(dto.requestedBreakOut)
          : find('BREAK_OUT'),
        requestedClockOut: dto.requestedClockOut
          ? new Date(dto.requestedClockOut)
          : find('CLOCK_OUT'),
        staffComment: dto.staffComment,
        expiresAt: new Date(Date.now() + 48 * 3_600_000),
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
  }

  async getMyCorrections(userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    return this.prisma.correctionRequest.findMany({
      where: { staffId: ctx.staffId, centerId: ctx.centerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCenterCorrections(userId: string, queryCenterId?: string) {
    const centerId = await this.resolveDirectorCenter(userId, queryCenterId);
    return this.prisma.correctionRequest.findMany({
      where: { centerId },
      include: { staff: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveCorrection(
    id: string,
    dto: ApproveCorrectionDto,
    userId: string,
  ) {
    const req = await this.prisma.correctionRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Correction request not found');
    if (req.status !== 'PENDING')
      throw new BadRequestException('Request is not pending');

    await this.ensureAccessToCenter(userId, req.centerId);

    const finalClockIn = dto.clockIn ? new Date(dto.clockIn) : req.requestedClockIn;
    const finalBreakIn = dto.breakIn ? new Date(dto.breakIn) : req.requestedBreakIn;
    const finalBreakOut = dto.breakOut ? new Date(dto.breakOut) : req.requestedBreakOut;
    const finalClockOut = dto.clockOut ? new Date(dto.clockOut) : req.requestedClockOut;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.correctionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: userId,
          reviewedAt: new Date(),
          directorComment: dto.directorComment,
          requestedClockIn: finalClockIn,
          requestedBreakIn: finalBreakIn,
          requestedBreakOut: finalBreakOut,
          requestedClockOut: finalClockOut,
        },
      });

      const updates: { type: PunchType; ts: Date | null }[] = [
        { type: 'CLOCK_IN', ts: finalClockIn },
        { type: 'BREAK_IN', ts: finalBreakIn },
        { type: 'BREAK_OUT', ts: finalBreakOut },
        { type: 'CLOCK_OUT', ts: finalClockOut },
      ];

      for (const { type, ts } of updates) {
        if (!ts) continue;
        await tx.staffTimeEntry.updateMany({
          where: {
            staffId: req.staffId,
            centerId: req.centerId,
            date: req.date,
            type,
          },
          data: {
            deviceTimestamp: ts,
            isCorrection: true,
            correctionId: id,
          },
        });
      }

      return updated;
    });
  }

  async rejectCorrection(
    id: string,
    dto: RejectCorrectionDto,
    userId: string,
  ) {
    const req = await this.prisma.correctionRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Correction request not found');
    if (req.status !== 'PENDING')
      throw new BadRequestException('Request is not pending');

    await this.ensureAccessToCenter(userId, req.centerId);

    return this.prisma.correctionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        directorComment: dto.directorComment,
      },
    });
  }

  // ============================================================= HISTORY

  async getMyHistory(
    userId: string,
    from?: string,
    to?: string,
  ) {
    const ctx = await this.resolveStaffContext(userId);

    const where: Record<string, unknown> = {
      staffId: ctx.staffId,
      centerId: ctx.centerId,
    };
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z');
      if (to) (where.date as Record<string, unknown>).lte = new Date(to + 'T00:00:00.000Z');
    }

    const entries = await this.prisma.staffTimeEntry.findMany({
      where: where as any,
      orderBy: [{ date: 'desc' }, { deviceTimestamp: 'asc' }],
    });

    const grouped: Record<string, typeof entries> = {};
    for (const e of entries) {
      const key = new Date(e.date).toISOString().split('T')[0];
      (grouped[key] ??= []).push(e);
    }

    return Object.entries(grouped).map(([date, dayEntries]) => ({
      date,
      entries: dayEntries,
      shiftStatus: buildShiftStatus(dayEntries),
    }));
  }

  // ============================================================ DEV-ONLY

  async devResetPunches(userId: string) {
    const ctx = await this.resolveStaffContext(userId);
    const corr = await this.prisma.correctionRequest.deleteMany({
      where: { staffId: ctx.staffId },
    });
    const entries = await this.prisma.staffTimeEntry.deleteMany({
      where: { staffId: ctx.staffId },
    });
    return { deletedEntries: entries.count, deletedCorrections: corr.count };
  }

  // ============================================================ INTERNALS

  private validateSequence(type: PunchType, entries: StaffTimeEntry[]) {
    const has = new Set(entries.map((e) => e.type));

    switch (type) {
      case 'CLOCK_IN':
        if (has.has('CLOCK_IN'))
          throw new BadRequestException('Already clocked in today');
        break;

      case 'BREAK_IN':
        if (!has.has('CLOCK_IN'))
          throw new BadRequestException('Must clock in first');
        if (has.has('BREAK_IN'))
          throw new BadRequestException('Break already started');
        if (has.has('CLOCK_OUT'))
          throw new BadRequestException('Already clocked out');
        break;

      case 'BREAK_OUT':
        if (!has.has('BREAK_IN'))
          throw new BadRequestException('No active break to end');
        if (has.has('BREAK_OUT'))
          throw new BadRequestException('Break already ended');
        break;

      case 'CLOCK_OUT':
        if (!has.has('CLOCK_IN'))
          throw new BadRequestException('Must clock in first');
        if (has.has('CLOCK_OUT'))
          throw new BadRequestException('Already clocked out');
        if (has.has('BREAK_IN') && !has.has('BREAK_OUT'))
          throw new BadRequestException('End your break before clocking out');
        break;
    }
  }

  private checkGeoFence(
    lat: number | undefined,
    lng: number | undefined,
    center: CenterGeo,
  ): boolean | null {
    if (
      lat == null ||
      lng == null ||
      center.latitude == null ||
      center.longitude == null
    ) {
      return null;
    }
    const distance = haversineDistance(
      lat,
      lng,
      center.latitude,
      center.longitude,
    );
    return distance <= center.geoFenceRadiusMeters;
  }

  private async resolveStaffContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        staff: {
          select: {
            id: true,
            centerId: true,
            status: true,
            center: {
              select: {
                id: true,
                timezone: true,
                latitude: true,
                longitude: true,
                geoFenceRadiusMeters: true,
              },
            },
          },
        },
      },
    });

    if (!user?.staff)
      throw new BadRequestException('User is not linked to a staff record');
    if (user.staff.status !== 'ACTIVE')
      throw new ForbiddenException('Staff account is not active');

    return {
      staffId: user.staff.id,
      centerId: user.staff.centerId,
      center: user.staff.center as CenterGeo,
    };
  }

  async resolveDirectorCenter(
    userId: string,
    queryCenterId?: string,
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, centerId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'SUPER_ADMIN') {
      if (!queryCenterId)
        throw new BadRequestException(
          'SUPER_ADMIN must specify centerId query param',
        );
      return queryCenterId;
    }

    if (!user.centerId)
      throw new BadRequestException('No center associated with your account');
    return user.centerId;
  }

  private async ensureStaffBelongsToCenter(
    staffId: string,
    centerId: string,
  ) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { centerId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    if (staff.centerId !== centerId)
      throw new ForbiddenException('Staff does not belong to your center');
  }

  // Returns the actor's role so callers can branch on SUPER_ADMIN without a
  // second query (e.g. the approval flow lets SUPER_ADMIN bypass the
  // pending-correction guard). Existing callers that `await` without using
  // the result are unaffected.
  private async ensureAccessToCenter(userId: string, centerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, centerId: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN') return user.role;
    if (user.centerId !== centerId)
      throw new ForbiddenException('You do not have access to this center');
    return user.role;
  }

  private validateDays(days: { dayOfWeek: number; startTime?: string; endTime?: string; isOff?: boolean }[]) {
    const seen = new Set<number>();
    for (const d of days) {
      if (seen.has(d.dayOfWeek))
        throw new BadRequestException(
          `Duplicate dayOfWeek: ${d.dayOfWeek}`,
        );
      seen.add(d.dayOfWeek);

      if (!d.isOff && (!d.startTime || !d.endTime))
        throw new BadRequestException(
          `Day ${d.dayOfWeek}: working days require startTime and endTime`,
        );
    }
  }

  // =================================================== ATTENDANCE APPROVAL

  async approveOrRejectDay(dto: ApproveOrRejectDayDto, userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
      select: { centerId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    const actorRole = await this.ensureAccessToCenter(userId, staff.centerId);

    const dateValue = new Date(dto.date + 'T00:00:00.000Z');
    const weekStart = mondayOf(dateValue);

    // Cannot approve a day while a correction request is still pending for it
    // — the director hasn't really had a chance to review the final numbers.
    // SUPER_ADMIN can force the approval (TANDA 2D): they're the escalation
    // path when a director is unavailable, so they bypass this guard.
    if (dto.action === ApprovalAction.APPROVE && actorRole !== 'SUPER_ADMIN') {
      const pending = await this.prisma.correctionRequest.count({
        where: { staffId: dto.staffId, date: dateValue, status: 'PENDING' },
      });
      if (pending > 0)
        throw new BadRequestException(
          'Cannot approve while a correction is pending for this day',
        );
    }

    const finalStatus = dto.action === ApprovalAction.APPROVE ? 'APPROVED' : 'REJECTED';
    const now = new Date();

    return this.prisma.attendanceApproval.upsert({
      where: {
        staffId_centerId_date: {
          staffId: dto.staffId,
          centerId: staff.centerId,
          date: dateValue,
        },
      },
      create: {
        staffId: dto.staffId,
        centerId: staff.centerId,
        date: dateValue,
        weekStart,
        status: finalStatus,
        directorComment: dto.directorComment,
        reviewedBy: userId,
        reviewedAt: now,
      },
      update: {
        status: finalStatus,
        directorComment: dto.directorComment,
        reviewedBy: userId,
        reviewedAt: now,
      },
    });
  }

  async approveOrRejectWeek(dto: ApproveOrRejectWeekDto, userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
      select: { centerId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    const actorRole = await this.ensureAccessToCenter(userId, staff.centerId);

    const { startDate, endDate } = weekBounds(dto.weekStart);

    // SUPER_ADMIN bypasses the pending-correction guard (TANDA 2D) — same
    // rationale as the per-day approval above.
    if (dto.action === ApprovalAction.APPROVE && actorRole !== 'SUPER_ADMIN') {
      const pending = await this.prisma.correctionRequest.count({
        where: {
          staffId: dto.staffId,
          date: { gte: startDate, lte: endDate },
          status: 'PENDING',
        },
      });
      if (pending > 0)
        throw new BadRequestException(
          'Cannot approve while corrections are pending for this week',
        );
    }

    const finalStatus = dto.action === ApprovalAction.APPROVE ? 'APPROVED' : 'REJECTED';
    const now = new Date();

    // One approval per calendar day of the week — keeps the model uniform
    // with single-day approvals and lets the staff view per-day status.
    const result = await this.prisma.$transaction(async (tx) => {
      const written: Awaited<ReturnType<typeof tx.attendanceApproval.upsert>>[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setUTCDate(date.getUTCDate() + i);
        const approval = await tx.attendanceApproval.upsert({
          where: {
            staffId_centerId_date: {
              staffId: dto.staffId,
              centerId: staff.centerId,
              date,
            },
          },
          create: {
            staffId: dto.staffId,
            centerId: staff.centerId,
            date,
            weekStart: startDate,
            status: finalStatus,
            directorComment: dto.directorComment,
            reviewedBy: userId,
            reviewedAt: now,
          },
          update: {
            status: finalStatus,
            directorComment: dto.directorComment,
            reviewedBy: userId,
            reviewedAt: now,
          },
        });
        written.push(approval);
      }
      return written;
    });

    return { count: result.length, weekStart: startDate, weekEnd: endDate };
  }

  async getCenterApprovals(
    userId: string,
    queryCenterId?: string,
    weekStart?: string,
  ) {
    const centerId = await this.resolveDirectorCenter(userId, queryCenterId);
    const where: { centerId: string; weekStart?: Date } = { centerId };
    if (weekStart) {
      const { startDate } = weekBounds(weekStart);
      where.weekStart = startDate;
    }
    return this.prisma.attendanceApproval.findMany({
      where,
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ weekStart: 'desc' }, { date: 'asc' }],
    });
  }

  async getMyApprovals(userId: string, weekStart?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    if (!user?.staffId) throw new NotFoundException('Staff not found');
    const where: { staffId: string; weekStart?: Date } = { staffId: user.staffId };
    if (weekStart) {
      const { startDate } = weekBounds(weekStart);
      where.weekStart = startDate;
    }
    return this.prisma.attendanceApproval.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }
}

// ================================================================= helpers

function dateInTimezone(date: Date, timezone: string): Date {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date(dateStr + 'T00:00:00.000Z');
}

function mondayOf(date: Date): Date {
  // Monday at UTC midnight of the ISO week containing `date`. Used to derive
  // weekStart from an arbitrary day passed to approveOrRejectDay.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jsDow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (jsDow === 0 ? 6 : jsDow - 1));
  return d;
}

function weekBounds(weekStart: string): { startDate: Date; endDate: Date } {
  const d = new Date(weekStart + 'T00:00:00.000Z');
  const jsDay = d.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  if (isoDay !== 1)
    throw new BadRequestException('weekStart must be a Monday');
  const endDate = new Date(d);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return { startDate: d, endDate };
}

function buildShiftStatus(entries: Pick<StaffTimeEntry, 'type'>[]) {
  const has = new Set(entries.map((e) => e.type));

  const clockedIn = has.has('CLOCK_IN');
  const onBreak = has.has('BREAK_IN') && !has.has('BREAK_OUT');
  const clockedOut = has.has('CLOCK_OUT');
  const breakTaken = has.has('BREAK_OUT');

  const nextActions: PunchType[] = [];

  if (!clockedIn) {
    nextActions.push('CLOCK_IN');
  } else if (clockedOut) {
    // shift complete
  } else if (onBreak) {
    nextActions.push('BREAK_OUT');
  } else if (breakTaken) {
    nextActions.push('CLOCK_OUT');
  } else {
    nextActions.push('BREAK_IN', 'CLOCK_OUT');
  }

  return { clockedIn, onBreak, clockedOut, nextActions };
}
