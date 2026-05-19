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
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthException } from './exceptions/auth.exception';
import { EmailService } from '../email/email.service';
import { passwordResetTemplate } from '../email/templates/password-reset.template';
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
  center: { select: { id: true, name: true } },
  staff: {
    select: { id: true, firstName: true, lastName: true, role: true },
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

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

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

    // Atomic: rotate password, mark the token used, clear any lockout state.
    // Clearing lockedUntil/failedLoginAttempts is intentional — a successful
    // reset is implicit proof the user controls the inbox, so any prior
    // lockout from forgotten-password retries should be released too.
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
    ]);
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

  private generateOpaqueToken(): string {
    return [...Array(32)]
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
  }
}
