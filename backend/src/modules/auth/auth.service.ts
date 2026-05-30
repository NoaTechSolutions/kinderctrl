import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateMyEmailDto } from './dto/update-my-email.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import { UpdateMyEmergencyContactDto } from './dto/update-my-emergency-contact.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthException } from './exceptions/auth.exception';
import { EmailService } from '../email/email.service';
import { passwordResetTemplate } from '../email/templates/password-reset.template';
import { welcomeSetPasswordTemplate } from '../email/templates/welcome-set-password.template';
import { accountLockedTemplate } from '../email/templates/account-locked.template';

// Shape every auth endpoint loads — keeps the response consistent across
// register/login/refresh/me. Selecting (not including the full models) keeps
// the payload small and avoids leaking unrelated columns to the client.
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  centerId: true,
  password: true,
  status: true,
  // User's own name — used for DIRECTOR/SUPER_ADMIN display (STAFF read their
  // name from the staff satellite below).
  firstName: true,
  lastName: true,
  center: { select: { id: true, name: true } },
  staff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      // PO QA #8 Opción C: surface so the dashboard banner can read
      // user.staff.profileComplete without a separate fetch.
      profileComplete: true,
    },
  },
  parent: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.UserSelect;

// Login needs the lockout counters in addition to AUTH_USER_SELECT, but
// other endpoints don't — kept separate so /auth/me and /auth/refresh
// don't fetch fields they never use.
const LOGIN_USER_SELECT = {
  ...AUTH_USER_SELECT,
  failedLoginAttempts: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

type AuthUser = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>;

// Match the throttler limit (auth.controller @Throttle login). The two layers
// reinforce each other: throttler blocks per-IP, DB lockout blocks per-account.
// An attacker rotating IPs through proxies still trips the per-account lockout
// after N attempts on the same email.
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Password reset window. Short enough that a stolen token from a mail
// archive isn't useful for long; long enough that a user finding the
// email in their spam folder 20 min later still has time to click.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_TOKEN_TTL_MINUTES = RESET_TOKEN_TTL_MS / 60_000;

// Welcome / first-time-setup tokens get a longer expiry than self-service
// resets — the recipient might not check email immediately and we don't
// want them to need to ask the admin for a re-send. 7 days mirrors the
// staff invitation TTL (PO QA #30 Opción E).
const SETUP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SETUP_TOKEN_TTL_DAYS = SETUP_TOKEN_TTL_MS / (24 * 60 * 60 * 1000);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw AuthException.emailExists();
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        role: registerDto.role,
        centerId: registerDto.centerId,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
      select: AUTH_USER_SELECT,
    });

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: LOGIN_USER_SELECT,
    });

    // Same generic error for "user not found" and "wrong password" prevents
    // email enumeration via the response shape — both return identical
    // INVALID_CREDENTIALS bodies.
    if (!user) {
      throw AuthException.invalidCredentials();
    }

    // Lockout check BEFORE bcrypt to avoid burning CPU on a known-blocked
    // account. retryAfter is in seconds for parity with HTTP Retry-After
    // semantics.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000,
      );
      throw AuthException.accountLocked(retryAfter);
    }

    if (user.status !== 'ACTIVE') {
      throw AuthException.accountNotActive();
    }

    // PO QA #30 Opción E: User.password is nullable for staff that were
    // created manually by SUPER_ADMIN and haven't completed setup yet.
    // CRITICAL: respond with the IDENTICAL invalidCredentials exception
    // we use for wrong-password. Differentiating ("this account needs
    // setup") would leak account enumeration — an attacker could probe
    // emails and learn which ones have pending-setup users. Setup is
    // ONLY accessible via the tokenized email link.
    const isPasswordValid =
      user.password !== null &&
      (await bcrypt.compare(loginDto.password, user.password));

    if (!isPasswordValid) {
      const justLocked = await this.recordFailedLogin(
        user.id,
        user.failedLoginAttempts,
      );
      // If THIS attempt was the one that tripped the lockout, surface the
      // ACCOUNT_LOCKED state immediately. Otherwise the user only ever
      // sees INVALID_CREDENTIALS followed by RATE_LIMITED (throttler) and
      // never learns their account is locked until the throttler resets
      // 15 min later — confusing and worse for legitimate users.
      if (justLocked) {
        // Fire-and-forget: email failure must NOT block the response.
        // sendAccountLockedEmail logs its own errors via EmailService.
        void this.sendAccountLockedEmail(user.email);
        throw AuthException.accountLocked(LOCKOUT_DURATION_MS / 1000);
      }
      throw AuthException.invalidCredentials();
    }

    // Successful login resets the counter, clears any expired lockout
    // sitting around, and records lastLoginAt for audit.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return this.generateTokens(user);
  }

  private async sendAccountLockedEmail(email: string): Promise<void> {
    // Trace breadcrumb so an audit can confirm the lockout-email codepath
    // actually fired. Before BUG-029 the IP-only throttler would 429 a
    // shared-IP user before this method ever ran — without this log there
    // was no way to tell "email rejected" from "email never attempted".
    this.logger.log('Sending account-locked email (lockout triggered)');
    const unlocksAt = new Date(Date.now() + LOCKOUT_DURATION_MS);
    // Format as wall-clock time — keeping it short and unambiguous. Locale
    // is server-default; refining to per-user locale would need the user
    // record, which we already have but skip here to keep this fire-and-
    // forget path simple.
    const unlocksAtText = `at ${unlocksAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3003';
    const resetUrl = `${baseUrl}/forgot-password`;

    const tpl = accountLockedTemplate({ unlocksAtText, resetUrl });
    try {
      await this.emailService.send({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch {
      // EmailService already logged the failure; nothing to do here —
      // lockout is the source of truth, the email is just a heads-up.
    }
  }

  // Returns true if this attempt was the one that activated the lockout,
  // so the caller can surface ACCOUNT_LOCKED instead of INVALID_CREDENTIALS.
  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<boolean> {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      // Reset the counter to 0 when we transition into a lockout so the
      // *next* lockout cycle (after lockedUntil expires) starts fresh.
      // lockedUntil is the actual block signal — the counter is just the
      // running tally between lockouts.
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        },
      });
      return true;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: nextAttempts },
    });
    return false;
  }

  async refresh(userId: string, sessionId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return this.generateTokens(user);
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  // ALWAYS resolves without revealing whether the email exists. Three
  // observable paths from outside: (a) unknown email — we no-op silently,
  // (b) known email — we create a token + send mail, (c) email service is
  // down — we log and still no-op externally. The caller sees the same
  // response in all three cases, so probing for "is this email registered"
  // returns nothing useful.
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      this.logger.debug(
        `forgotPassword: no-op for ${dto.email} (not found or inactive)`,
      );
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3003';
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    const tpl = passwordResetTemplate({
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    try {
      await this.emailService.send({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch (err) {
      // Swallow the error so the response stays generic. The send() method
      // already logged the failure with context.
      this.logger.warn(
        `Reset email send failed for userId=${user.id}; token persists for manual recovery.`,
      );
    }
  }

  /**
   * Admin-triggered password reset (PO QA #28 Opción F). Same email
   * template / token shape as the self-service forgotPassword flow —
   * the admin's only privilege is to trigger it for a known user without
   * needing the email address. Action is audited in
   * password_admin_actions so we can answer "who reset my password?"
   * later for compliance.
   *
   * Differs from forgotPassword in 3 ways:
   *  (a) takes a userId directly (no email lookup needed),
   *  (b) throws NotFound when the user is missing (the admin sees the
   *      error — there's no enumeration concern here since they already
   *      had to know the staffId to call this),
   *  (c) writes an audit row before sending the email so failed sends
   *      still log the intent.
   */
  async triggerPasswordResetByAdmin(
    targetUserId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, status: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    // Intentionally NOT gating on user.status — admins should be able to
    // reset for a SUSPENDED or LOCKED user to recover access.

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.create({
        data: { userId: target.id, token, expiresAt },
      }),
      this.prisma.passwordAdminAction.create({
        data: {
          actorUserId,
          targetUserId,
          action: 'RESET_TRIGGERED',
          ipAddress: ipAddress ?? null,
        },
      }),
    ]);

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3003';
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    const tpl = passwordResetTemplate({
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    try {
      await this.emailService.send({
        to: target.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch (err) {
      this.logger.warn(
        `Admin-triggered reset email send failed for targetUserId=${targetUserId}; token persists.`,
      );
    }
  }

  /**
   * Welcome / first-time-setup token issuance (PO QA #30 Opción E).
   * Called by staff.service.createWithSetupEmail when a SUPER_ADMIN
   * manually creates a staff member without a password. The token is
   * stored in the same password_reset_tokens table — reuse keeps the
   * type space small and the token-consumption path (POST /auth/reset-
   * password) handles both flows transparently. The difference is in
   * the EMAIL: welcome-framed copy + 7d expiry vs reset's 1h.
   *
   * Audits action='SETUP_TRIGGERED' in password_admin_actions so we can
   * distinguish "admin created + sent welcome" from "admin reset
   * existing user's password" later.
   */
  async issueWelcomeSetupToken(
    targetUserId: string,
    actorUserId: string,
    options: {
      inviterName: string;
      centerName: string;
      ipAddress?: string;
    },
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.create({
        data: { userId: target.id, token, expiresAt },
      }),
      this.prisma.passwordAdminAction.create({
        data: {
          actorUserId,
          targetUserId,
          action: 'SETUP_TRIGGERED',
          ipAddress: options.ipAddress ?? null,
        },
      }),
    ]);

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3003';
    // ?welcome=1 lets the reset-password page swap copy without needing
    // a separate route.
    const setupUrl = `${baseUrl}/reset-password/${token}?welcome=1`;

    const tpl = welcomeSetPasswordTemplate({
      setupUrl,
      expiresInDays: SETUP_TOKEN_TTL_DAYS,
      inviterName: options.inviterName,
      centerName: options.centerName,
    });

    try {
      await this.emailService.send({
        to: target.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch (err) {
      this.logger.warn(
        `Welcome setup email send failed for targetUserId=${targetUserId}; token persists.`,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    // Same RESET_TOKEN_INVALID for missing / used / expired — see exception
    // comment for rationale.
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AuthException.resetTokenInvalid();
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Atomic: rotate password, mark the token used, clear any lockout state,
    // and REVOKE EVERY SESSION for the user. The session revoke is the
    // security teeth — a leaked credential reset (phishing) must invalidate
    // any pre-existing attacker sessions, not just rotate the secret. Same
    // pattern as the in-app Change Password (changeMyPassword) and the
    // staff-email-change flow in staff.service.ts. Clearing
    // lockedUntil/failedLoginAttempts is intentional — a successful reset
    // is implicit proof the user controls the inbox, so any prior lockout
    // from forgotten-password retries should be released too.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.deleteMany({
        where: { userId: record.userId },
      }),
    ]);
  }

  // Public wrapper around generateTokens for callers outside the auth module
  // (e.g. StaffService.acceptInvitation, which creates a User + Staff and
  // wants to drop the new user straight into the dashboard with valid JWTs).
  // Keeps the AuthUser shape + AUTH_USER_SELECT as private implementation
  // details — the caller only needs a userId.
  async issueTokensForUser(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.generateTokens(user);
  }

  // /auth/me always queries fresh from the DB rather than reading the JWT,
  // because the JWT only carries id/email/role/centerId — staff/parent/center
  // relations are needed for the topbar greeting + job title.
  async getMe(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toAuthUserResponse(user);
  }

  private toAuthUserResponse(user: AuthUser): AuthResponseDto['user'] {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      centerId: user.centerId,
      firstName: user.firstName,
      lastName: user.lastName,
      center: user.center,
      staff: user.staff,
      parent: user.parent,
    };
  }

  private async generateTokens(user: AuthUser): Promise<AuthResponseDto> {
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: this.generateOpaqueToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      centerId: user.centerId,
      sessionId: session.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId: session.id },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d') as any,
      },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toAuthUserResponse(user),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // /profile module endpoints (Issue #6). Unified self-service surface
  // for all roles. Read/write of firstName/lastName/phone is role-
  // dispatched: STAFF uses the Staff satellite (single source of truth
  // for HR data); DIRECTOR / SUPER_ADMIN use the User row directly
  // (they have no satellite). Email + password are User-level for
  // everyone, with destructive side effect (session revoke).
  // ──────────────────────────────────────────────────────────────────

  async getMyProfile(userId: string): Promise<MyProfileResponse> {
    // v2: response now carries everything the /profile page renders:
    // identity (firstName/lastName/phone), contact (email + center
    // timezone + the language is purely client), badges (createdAt for
    // "member since", status for the Active badge), the role's center
    // payload (DIRECTOR card), the role's emergency contact (DIRECTOR
    // User columns OR STAFF satellite), and preferences (timeFormat).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        status: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        phone: true,
        timeFormat: true,
        // v3: User-level address (DIRECTOR / SUPER_ADMIN home).
        street: true,
        city: true,
        state: true,
        zipCode: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelationship: true,
        emergencyContact2Name: true,
        emergencyContact2Phone: true,
        emergencyContact2Relationship: true,
        staffId: true,
        // Center payload kept for the Contact Info timezone read (v2)
        // even though v3 dropped the Center Info card. The Center Info
        // card is gone from the UI but the timezone display + role
        // gates may still want it. Cheap to fetch (single relation).
        center: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            timezone: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            // v3: STAFF address read here so the response mirrors what
            // we'd write through updateMyProfile.
            street: true,
            city: true,
            state: true,
            zipCode: true,
            // v14: STAFF-only DOB. Other roles get null.
            dateOfBirth: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelationship: true,
            emergencyContact2Name: true,
            emergencyContact2Phone: true,
            emergencyContact2Relationship: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // STAFF + satellite Staff row → Staff is the source of truth for
    // firstName/lastName/phone, address AND emergency contact (primary).
    // The secondary EC stays in the legacy ProfileForm "Additional info"
    // card; this endpoint only surfaces the primary.
    const usesStaffSatellite = user.role === 'STAFF' && user.staff;
    const firstName = usesStaffSatellite
      ? (user.staff!.firstName ?? null)
      : (user.firstName ?? null);
    const lastName = usesStaffSatellite
      ? (user.staff!.lastName ?? null)
      : (user.lastName ?? null);
    const phone = usesStaffSatellite
      ? (user.staff!.phone ?? null)
      : (user.phone ?? null);
    const street = usesStaffSatellite
      ? (user.staff!.street ?? null)
      : (user.street ?? null);
    const city = usesStaffSatellite
      ? (user.staff!.city ?? null)
      : (user.city ?? null);
    const state = usesStaffSatellite
      ? (user.staff!.state ?? null)
      : (user.state ?? null);
    const zipCode = usesStaffSatellite
      ? (user.staff!.zipCode ?? null)
      : (user.zipCode ?? null);
    // v14: DOB is STAFF-only. Other roles always get null — the
    // frontend gates the row + modal field render on role anyway,
    // but defense-in-depth here. Serialize YYYY-MM-DD because
    // Staff.dateOfBirth is @db.Date (no time component); .toISOString()
    // would produce a UTC midnight that could shift the date in some
    // timezones, so we slice the date part directly.
    const dateOfBirth =
      usesStaffSatellite && user.staff!.dateOfBirth
        ? user.staff!.dateOfBirth.toISOString().split('T')[0]
        : null;
    // v6: read both primary + secondary. Each is collapsed to null
    // when all three of its fields are absent — gives the UI a single
    // `if (contact)` check per tab instead of three OR-chains.
    const ec1Raw = usesStaffSatellite
      ? {
          name: user.staff!.emergencyContactName ?? null,
          phone: user.staff!.emergencyContactPhone ?? null,
          relationship: user.staff!.emergencyContactRelationship ?? null,
        }
      : {
          name: user.emergencyContactName ?? null,
          phone: user.emergencyContactPhone ?? null,
          relationship: user.emergencyContactRelationship ?? null,
        };
    const ec2Raw = usesStaffSatellite
      ? {
          name: user.staff!.emergencyContact2Name ?? null,
          phone: user.staff!.emergencyContact2Phone ?? null,
          relationship: user.staff!.emergencyContact2Relationship ?? null,
        }
      : {
          name: user.emergencyContact2Name ?? null,
          phone: user.emergencyContact2Phone ?? null,
          relationship: user.emergencyContact2Relationship ?? null,
        };
    const emergencyContact1 =
      ec1Raw.name || ec1Raw.phone || ec1Raw.relationship ? ec1Raw : null;
    const emergencyContact2 =
      ec2Raw.name || ec2Raw.phone || ec2Raw.relationship ? ec2Raw : null;

    return {
      firstName,
      lastName,
      email: user.email,
      phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      timeFormat: user.timeFormat === 'TWELVE_HOUR' ? '12h' : '24h',
      street,
      city,
      state,
      zipCode,
      dateOfBirth,
      emergencyContact1,
      emergencyContact2,
      center: user.center
        ? {
            id: user.center.id,
            name: user.center.name,
            street: user.center.street,
            city: user.center.city,
            state: user.center.state,
            zipCode: user.center.zipCode,
            timezone: user.center.timezone,
          }
        : null,
    };
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
  ): Promise<MyProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, staffId: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Empty string phone / address fields explicitly clear the column
    // (null). Undefined is no-op. Trimmed names: empty string →
    // undefined (skip; the DTO validator already enforces @Length(1,
    // ...) so empty shouldn't reach here, but defensive).
    const trimmedFirst = dto.firstName?.trim() || undefined;
    const trimmedLast = dto.lastName?.trim() || undefined;
    const trimToNullable = (v: string | undefined): string | null | undefined => {
      if (v === undefined) return undefined;
      const trimmed = v.trim();
      return trimmed === '' ? null : trimmed;
    };
    const phoneValue = trimToNullable(dto.phone);
    const streetValue = trimToNullable(dto.street);
    const cityValue = trimToNullable(dto.city);
    // State already uppercased by the DTO regex; we just trim.
    const stateValue = trimToNullable(dto.state);
    const zipValue = trimToNullable(dto.zipCode);
    // v14: DOB is STAFF-only on write too. For non-STAFF callers we
    // silently ignore the field — User has no DOB column to write to,
    // and quietly dropping it is friendlier than rejecting the whole
    // payload over an irrelevant field.
    const dobValue: Date | undefined =
      dto.dateOfBirth === undefined
        ? undefined
        : new Date(dto.dateOfBirth);

    if (user.role === 'STAFF' && user.staffId) {
      await this.prisma.staff.update({
        where: { id: user.staffId },
        data: {
          firstName: trimmedFirst,
          lastName: trimmedLast,
          phone: phoneValue,
          street: streetValue,
          city: cityValue,
          state: stateValue,
          zipCode: zipValue,
          dateOfBirth: dobValue,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: trimmedFirst,
          lastName: trimmedLast,
          phone: phoneValue,
          street: streetValue,
          city: cityValue,
          state: stateValue,
          zipCode: zipValue,
          // dateOfBirth intentionally dropped — User has no column.
        },
      });
    }

    return this.getMyProfile(userId);
  }

  async updateMyEmail(userId: string, dto: UpdateMyEmailDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // PO QA #30 Opción E: password=null is possible for SUPER_ADMIN-
    // created accounts that never completed setup. They can't change
    // email in-app — they must use the welcome email link first.
    if (!user.password) {
      throw AuthException.currentPasswordInvalid();
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) {
      throw AuthException.currentPasswordInvalid();
    }

    const normalizedNewEmail = dto.newEmail.trim().toLowerCase();
    // No-op if the new email is the same — don't waste a session revoke
    // on a non-change. The UI prevents this case but defense-in-depth.
    if (normalizedNewEmail === user.email.toLowerCase()) {
      return;
    }

    // Explicit uniqueness check returns EMAIL_EXISTS instead of letting
    // Prisma's P2002 leak through as a 500.
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedNewEmail },
      select: { id: true },
    });
    if (existing) {
      throw AuthException.emailExists();
    }

    // Atomic email rotation + session revoke. The session revoke is the
    // security teeth — every device the user (or attacker) was logged
    // in on gets kicked. Caller's UI clears local tokens after the
    // 200 response and redirects to /login.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: normalizedNewEmail },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
    ]);
  }

  async changeMyPassword(
    userId: string,
    dto: ChangeMyPasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.password) {
      throw AuthException.currentPasswordInvalid();
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) {
      throw AuthException.currentPasswordInvalid();
    }

    const hashedNew = await bcrypt.hash(dto.newPassword, 10);
    // Atomic: rotate password, clear lockout state, revoke every session.
    // Same security model as resetPassword (now also revokes sessions).
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNew,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
    ]);
  }

  // Profile v2 — server-persisted preferences. Currently just
  // timeFormat; theme + language stay client-only per Israel's spec
  // (no cross-device need, no first-paint requirement). Always returns
  // the updated profile so the caller can reseed its query cache.
  async updateMyPreferences(
    userId: string,
    dto: UpdateMyPreferencesDto,
  ): Promise<MyProfileResponse> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        timeFormat: dto.timeFormat === '12h' ? 'TWELVE_HOUR' : 'TWENTY_FOUR_HOUR',
      },
    });
    return this.getMyProfile(userId);
  }

  // Profile v2 — primary emergency contact. Role-dispatched:
  //   STAFF (with satellite Staff row) → Staff.emergencyContact*
  //   DIRECTOR / SUPER_ADMIN / fallback → User.emergencyContact*
  // SUPER_ADMIN is allowed through silently — the UI hides the card
  // for them but the data model has no objection if a payload arrives.
  // Empty strings collapse to null so the user can clear individual
  // fields (matches the staff /me/profile pattern).
  async updateMyEmergencyContact(
    userId: string,
    dto: UpdateMyEmergencyContactDto,
  ): Promise<MyProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, staffId: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalize = (v: string | undefined): string | null | undefined => {
      if (v === undefined) return undefined;
      const trimmed = v.trim();
      return trimmed === '' ? null : trimmed;
    };
    const nameValue = normalize(dto.name);
    const phoneValue = normalize(dto.phone);
    const relValue = normalize(dto.relationship);

    // v6: slot picks WHICH contact (primary vs secondary). The column
    // names differ — emergencyContact{,2}{Name,Phone,Relationship} —
    // so we keep the data object focused per branch and let Prisma's
    // typed update do the rest. Cleaner than a "compute the field
    // names" helper because the type system catches typos here.
    const isSecondary = dto.slot === 2;

    if (user.role === 'STAFF' && user.staffId) {
      await this.prisma.staff.update({
        where: { id: user.staffId },
        data: isSecondary
          ? {
              emergencyContact2Name: nameValue,
              emergencyContact2Phone: phoneValue,
              emergencyContact2Relationship: relValue,
            }
          : {
              emergencyContactName: nameValue,
              emergencyContactPhone: phoneValue,
              emergencyContactRelationship: relValue,
            },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: isSecondary
          ? {
              emergencyContact2Name: nameValue,
              emergencyContact2Phone: phoneValue,
              emergencyContact2Relationship: relValue,
            }
          : {
              emergencyContactName: nameValue,
              emergencyContactPhone: phoneValue,
              emergencyContactRelationship: relValue,
            },
      });
    }

    return this.getMyProfile(userId);
  }

  private generateOpaqueToken(): string {
    return [...Array(32)]
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
  }
}

// Shape returned by GET /auth/me/profile + PATCH /auth/me/profile.
// Unified across roles so the frontend renders one set of cards
// regardless of whether the underlying data lives on Staff or User.
//
// v2 fields (timezone via center, emergencyContact, timeFormat,
// createdAt, status, center) feed the new Hero / Contact Info /
// Center Info / Emergency Contact / Preferences cards.
export interface MyProfileResponse {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'DIRECTOR' | 'STAFF' | 'PARENT';
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  timeFormat: '12h' | '24h';
  // v3: address fields surfaced into the Personal Info card. Role-
  // dispatched at read time: STAFF reads from Staff satellite, others
  // read from User columns.
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  // v14: STAFF-only date of birth. Lives on Staff.dateOfBirth; null
  // for every other role since User has no DOB column. Serialized
  // as YYYY-MM-DD (date-only) so it round-trips through HTML
  // <input type="date"> without timezone shifts.
  dateOfBirth: string | null;
  // v6: primary + secondary contacts. Each is null when all three of
  // its fields (name/phone/relationship) are null in storage. The
  // frontend tabs deep-link off these — empty state per tab is "this
  // contact is null", populated state shows the three ProfileRows.
  emergencyContact1: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
  emergencyContact2: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
  center: {
    id: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    timezone: string;
  } | null;
}
