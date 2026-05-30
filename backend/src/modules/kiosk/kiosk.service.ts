import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PunchType, StaffTimeEntry } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SetupKioskDto } from './dto/setup-kiosk.dto';
import { KioskPunchDto } from './dto/kiosk-punch.dto';

const TIME_DRIFT_THRESHOLD_MS = 5 * 60 * 1000;
const MAX_PIN_ATTEMPTS = 4;
const PIN_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

interface KioskCenter {
  id: string;
  name: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  geoFenceRadiusMeters: number;
}

@Injectable()
export class KioskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async setup(dto: SetupKioskDto, userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    // Setting (or resetting) a PIN clears the lockout counter and re-enables
    // the kiosk — this is also the recovery path after a lockout.
    return this.prisma.kioskSettings.upsert({
      where: { centerId },
      create: {
        centerId,
        pin: hashedPin,
        timeoutMin: dto.timeoutMin,
        failedPinAttempts: 0,
        isEnabled: true,
      },
      update: {
        pin: hashedPin,
        timeoutMin: dto.timeoutMin,
        failedPinAttempts: 0,
        isEnabled: true,
      },
      select: {
        id: true,
        centerId: true,
        isEnabled: true,
        timeoutMin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Launching the kiosk no longer requires a PIN — the PIN is only used to
  // exit. We just verify the kiosk is configured, then issue a session token.
  async activate(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    const kiosk = await this.prisma.kioskSettings.findUnique({
      where: { centerId },
    });
    if (!kiosk) {
      throw new NotFoundException('Kiosk not configured. Set up a PIN first.');
    }

    const token = randomBytes(32).toString('hex');

    await this.prisma.kioskSettings.update({
      where: { centerId },
      data: { isEnabled: true, kioskSessionToken: token, failedPinAttempts: 0 },
    });

    return { kioskSessionToken: token, timeoutMin: kiosk.timeoutMin };
  }

  async deactivate(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    await this.prisma.kioskSettings.updateMany({
      where: { centerId },
      data: { isEnabled: false, kioskSessionToken: null },
    });

    return { deactivated: true };
  }

  async resetPin(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    const kiosk = await this.prisma.kioskSettings.findUnique({
      where: { centerId },
    });
    if (!kiosk) {
      throw new NotFoundException('Kiosk not configured');
    }

    await this.prisma.kioskSettings.update({
      where: { centerId },
      data: { isEnabled: false, kioskSessionToken: null },
    });

    return { reset: true };
  }

  async getSettings(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    const kiosk = await this.prisma.kioskSettings.findUnique({
      where: { centerId },
      select: {
        id: true,
        centerId: true,
        isEnabled: true,
        timeoutMin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return kiosk ?? { centerId, isEnabled: false, timeoutMin: 2 };
  }

  async getActivity(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { timezone: true },
    });
    const tz = center?.timezone ?? 'America/New_York';
    const today = dateInTimezone(new Date(), tz);

    const recentEntries = await this.prisma.staffTimeEntry.findMany({
      where: { centerId, source: 'KIOSK' },
      orderBy: { deviceTimestamp: 'desc' },
      take: 20,
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const todayCount = await this.prisma.staffTimeEntry.count({
      where: { centerId, source: 'KIOSK', date: today },
    });

    return {
      todayCount,
      lastActivity: recentEntries[0]?.deviceTimestamp ?? null,
      entries: recentEntries.map((e) => ({
        id: e.id,
        staffName: `${e.staff.firstName} ${e.staff.lastName}`,
        type: e.type,
        deviceTimestamp: e.deviceTimestamp,
        date: e.date,
      })),
    };
  }

  async devResetKioskData(userId: string) {
    const centerId = await this.resolveDirectorCenter(userId);

    const punches = await this.prisma.staffTimeEntry.deleteMany({
      where: { centerId, source: 'KIOSK' },
    });

    const settings = await this.prisma.kioskSettings.deleteMany({
      where: { centerId },
    });

    return {
      deletedKioskPunches: punches.count,
      deletedKioskSettings: settings.count,
    };
  }

  // Exit flow: verify the PIN, then deactivate the kiosk. Wrong PINs feed the
  // lockout counter (registerFailedAttempt throws 401 or 423).
  async verifyPin(pin: string, centerId: string): Promise<{ valid: true }> {
    const kiosk = await this.prisma.kioskSettings.findUnique({
      where: { centerId },
    });
    if (!kiosk) throw new UnauthorizedException('Kiosk not configured');

    const valid = await bcrypt.compare(pin, kiosk.pin);
    if (!valid) {
      await this.registerFailedAttempt(centerId, kiosk.failedPinAttempts);
    }

    // Correct PIN — exit kiosk mode: deactivate + clear token + reset counter.
    await this.prisma.kioskSettings.update({
      where: { centerId },
      data: { isEnabled: false, kioskSessionToken: null, failedPinAttempts: 0 },
    });
    return { valid: true };
  }

  // Increments the failed-attempt counter. On the MAX_PIN_ATTEMPTS-th failure
  // it locks the kiosk (disable + clear token + email the director) and throws
  // 423 Locked. Otherwise throws 401 with the remaining attempt count.
  private async registerFailedAttempt(
    centerId: string,
    currentAttempts: number,
  ): Promise<never> {
    const newCount = currentAttempts + 1;

    if (newCount >= MAX_PIN_ATTEMPTS) {
      const email = await this.lockKiosk(centerId);
      throw new HttpException(
        { message: 'Kiosk locked due to too many incorrect PIN attempts', locked: true, email },
        HttpStatus.LOCKED,
      );
    }

    await this.prisma.kioskSettings.update({
      where: { centerId },
      data: { failedPinAttempts: newCount },
    });

    throw new UnauthorizedException({
      message: 'Incorrect PIN',
      attemptsRemaining: MAX_PIN_ATTEMPTS - newCount,
    });
  }

  private async lockKiosk(centerId: string): Promise<string | null> {
    return this.issueResetToken(centerId, 'locked');
  }

  // Director-initiated (or auto, on lockout) PIN reset request from the kiosk
  // exit screen. Disables the kiosk and emails a reset link.
  async requestReset(centerId: string): Promise<{ email: string | null }> {
    const email = await this.issueResetToken(centerId, 'requested');
    return { email };
  }

  // Generates a 1-hour reset token, disables the kiosk (clears session token +
  // attempt counter) and emails the center owner a public link to set a new
  // PIN. Returns the director's email. Shared by the lockout path and the
  // explicit "Forgot PIN" action from the exit screen.
  private async issueResetToken(
    centerId: string,
    reason: 'locked' | 'requested',
  ): Promise<string | null> {
    const resetToken = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + PIN_RESET_TTL_MS);

    await this.prisma.kioskSettings.update({
      where: { centerId },
      data: {
        isEnabled: false,
        kioskSessionToken: null,
        failedPinAttempts: 0,
        pinResetToken: resetToken,
        pinResetTokenExpiry: expiry,
      },
    });

    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { name: true, owner: { select: { email: true } } },
    });
    const email = center?.owner?.email ?? null;

    if (email) {
      const baseUrl =
        this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3003';
      const resetUrl = `${baseUrl}/kiosk-reset?token=${resetToken}`;
      const reasonLine =
        reason === 'locked'
          ? 'locked after too many incorrect PIN attempts'
          : 'flagged for a PIN reset';
      try {
        await this.email.send({
          to: email,
          subject: 'Reset your kiosk PIN',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #111;">Set a new kiosk PIN</h2>
              <p style="color: #444; font-size: 15px; line-height: 1.5;">
                The kiosk for <strong>${center?.name ?? 'your center'}</strong> was
                ${reasonLine} and has been disabled.
              </p>
              <p style="color: #444; font-size: 15px; line-height: 1.5;">
                Use the link below to set a new PIN — it expires in 1 hour.
              </p>
              <p style="margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                  Set a new kiosk PIN
                </a>
              </p>
              <p style="color: #888; font-size: 13px; margin-top: 32px;">
                If you didn't expect this, someone may have tried to access the kiosk.
              </p>
            </div>
          `,
          text: `Your kiosk was ${reasonLine} and has been disabled.\n\nSet a new PIN (link expires in 1 hour):\n${resetUrl}`,
        });
      } catch {
        // Email failure must not block the response.
      }
    }

    return email;
  }

  // Public — validates a reset token (for the no-login reset page).
  async getResetInfo(token: string): Promise<{ centerName: string }> {
    const kiosk = await this.findValidResetToken(token);
    const center = await this.prisma.center.findUnique({
      where: { id: kiosk.centerId },
      select: { name: true },
    });
    return { centerName: center?.name ?? 'your center' };
  }

  // Public — sets a new PIN via a valid reset token and re-enables the kiosk.
  async confirmResetPin(token: string, newPin: string) {
    const kiosk = await this.findValidResetToken(token);
    const hashedPin = await bcrypt.hash(newPin, 10);

    await this.prisma.kioskSettings.update({
      where: { id: kiosk.id },
      data: {
        pin: hashedPin,
        isEnabled: true,
        failedPinAttempts: 0,
        pinResetToken: null,
        pinResetTokenExpiry: null,
      },
    });

    return { success: true };
  }

  private async findValidResetToken(token: string) {
    const kiosk = await this.prisma.kioskSettings.findUnique({
      where: { pinResetToken: token },
    });
    if (!kiosk || !kiosk.pinResetTokenExpiry) {
      throw new NotFoundException('Invalid or expired reset link');
    }
    if (kiosk.pinResetTokenExpiry.getTime() < Date.now()) {
      throw new HttpException('Reset link has expired', HttpStatus.GONE);
    }
    return kiosk;
  }

  async getStaffList(center: KioskCenter) {
    const today = dateInTimezone(new Date(), center.timezone);
    const isoDow = today.getUTCDay() === 0 ? 7 : today.getUTCDay();

    const staff = await this.prisma.staff.findMany({
      where: { centerId: center.id, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        position: true,
        timeEntries: {
          where: { date: today },
          orderBy: { deviceTimestamp: 'asc' },
        },
        schedules: {
          where: {
            status: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today },
          },
          select: {
            days: { where: { dayOfWeek: isoDow } },
          },
          take: 1,
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const staffList = staff.map((s) => {
      const day = s.schedules[0]?.days[0];
      const scheduleToday =
        day && !day.isOff && day.startTime && day.endTime
          ? { startTime: day.startTime, endTime: day.endTime }
          : null;

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.position || s.role,
        shiftStatus: buildShiftStatus(s.timeEntries),
        scheduleToday,
        workedMinutes: computeWorkedMinutes(s.timeEntries),
      };
    });

    // Director email surfaced so the kiosk exit "Forgot PIN" flow can show
    // who the reset link will be sent to. The kiosk is a trusted device.
    const centerRecord = await this.prisma.center.findUnique({
      where: { id: center.id },
      select: { owner: { select: { email: true } } },
    });

    return {
      center: { name: center.name, directorEmail: centerRecord?.owner?.email ?? null },
      staff: staffList,
    };
  }

  async punch(dto: KioskPunchDto, center: KioskCenter) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, centerId: center.id, status: 'ACTIVE' },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found in this center');
    }

    const today = dateInTimezone(new Date(), center.timezone);

    const existing = await this.prisma.staffTimeEntry.findMany({
      where: { staffId: dto.staffId, centerId: center.id, date: today },
      orderBy: { deviceTimestamp: 'asc' },
    });

    this.validateSequence(dto.type, existing);

    const serverReceivedAt = new Date();
    const deviceTs = new Date(dto.deviceTimestamp);
    const timeDriftDetected =
      Math.abs(serverReceivedAt.getTime() - deviceTs.getTime()) >
      TIME_DRIFT_THRESHOLD_MS;

    let withinGeoFence: boolean | null = null;
    if (
      dto.latitude != null &&
      dto.longitude != null &&
      center.latitude != null &&
      center.longitude != null
    ) {
      const dist = haversineDistance(
        dto.latitude,
        dto.longitude,
        center.latitude,
        center.longitude,
      );
      withinGeoFence = dist <= center.geoFenceRadiusMeters;
    }

    const entry = await this.prisma.staffTimeEntry.create({
      data: {
        staffId: dto.staffId,
        centerId: center.id,
        date: today,
        type: dto.type,
        deviceTimestamp: deviceTs,
        serverReceivedAt,
        timeDriftDetected,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        withinGeoFence,
        source: 'KIOSK',
      },
    });

    return {
      entry,
      shiftStatus: buildShiftStatus([...existing, entry]),
    };
  }

  private validateSequence(type: PunchType, entries: StaffTimeEntry[]) {
    const has = new Set(entries.map((e) => e.type));

    switch (type) {
      case 'CLOCK_IN':
        if (has.has('CLOCK_IN'))
          throw new ConflictException('Already clocked in today');
        break;
      case 'BREAK_IN':
        if (!has.has('CLOCK_IN'))
          throw new BadRequestException('Must clock in first');
        if (has.has('BREAK_IN'))
          throw new ConflictException('Already on break');
        if (has.has('CLOCK_OUT'))
          throw new BadRequestException('Already clocked out');
        break;
      case 'BREAK_OUT':
        if (!has.has('BREAK_IN'))
          throw new BadRequestException('Not on break');
        if (has.has('BREAK_OUT'))
          throw new ConflictException('Break already ended');
        break;
      case 'CLOCK_OUT':
        if (!has.has('CLOCK_IN'))
          throw new BadRequestException('Must clock in first');
        if (has.has('BREAK_IN') && !has.has('BREAK_OUT'))
          throw new BadRequestException('End break before clocking out');
        if (has.has('CLOCK_OUT'))
          throw new ConflictException('Already clocked out');
        break;
    }
  }

  private async resolveDirectorCenter(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, centerId: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Super admins must specify a center context',
      );
    }
    if (!user.centerId) {
      throw new BadRequestException('User has no center assigned');
    }
    return user.centerId;
  }
}

function dateInTimezone(date: Date, timezone: string): Date {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date(dateStr + 'T00:00:00.000Z');
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

// Worked minutes from today's punches: CLOCK_IN → (CLOCK_OUT or now), minus
// the break window (BREAK_IN → BREAK_OUT). Returns 0 if not clocked in.
function computeWorkedMinutes(
  entries: Pick<StaffTimeEntry, 'type' | 'deviceTimestamp'>[],
): number {
  const find = (t: PunchType) =>
    entries.find((e) => e.type === t)?.deviceTimestamp;

  const clockIn = find('CLOCK_IN');
  if (!clockIn) return 0;

  const clockOut = find('CLOCK_OUT') ?? new Date();
  let ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();

  const breakIn = find('BREAK_IN');
  const breakOut = find('BREAK_OUT');
  if (breakIn) {
    const breakEnd = breakOut ?? new Date();
    ms -= new Date(breakEnd).getTime() - new Date(breakIn).getTime();
  }

  return Math.max(0, Math.round(ms / 60_000));
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
