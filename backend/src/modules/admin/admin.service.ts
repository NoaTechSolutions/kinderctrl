import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { accountUnlockedTemplate } from '../email/templates/account-unlocked.template';
import { LockedUserDto } from './dto/locked-user.dto';

// Identifies the kind of admin action in AdminAuditLog.action. Kept as a
// string-literal union (not an enum) because the audit table is intended
// to grow with new admin verbs over time without requiring a migration
// per addition. Convention: SCREAMING_SNAKE_CASE, verb-object.
export const ADMIN_ACTION = {
  UNLOCK_USER: 'UNLOCK_USER',
} as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // Defense in depth: controller already enforces SUPER_ADMIN via @Roles
  // + RolesGuard. The service-level check protects against future callers
  // that wire the service directly (background jobs, internal endpoints).
  private assertSuperAdmin(role: UserRole): void {
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('SUPER_ADMIN required');
    }
  }

  async listLockedUsers(actorRole: UserRole): Promise<LockedUserDto[]> {
    this.assertSuperAdmin(actorRole);

    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        lockedUntil: { gt: now },
      },
      select: {
        id: true,
        email: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        center: { select: { id: true, name: true } },
      },
      orderBy: { lockedUntil: 'asc' },
    });

    // lockedUntil is non-null here because the WHERE clause guaranteed it;
    // the cast trims Prisma's nullable type to match the DTO shape.
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      failedLoginAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil as Date,
      lastLoginAt: u.lastLoginAt,
      center: u.center,
    }));
  }

  async unlockUser(
    targetUserId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<{ success: true; userId: string }> {
    this.assertSuperAdmin(actorRole);

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // Both writes in the same tx so we never end up with the user unlocked
    // but no audit trail (or vice versa). The audit payload captures the
    // state BEFORE unlock so a future reviewer can see what was reset.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          actorId,
          action: ADMIN_ACTION.UNLOCK_USER,
          targetUserId,
          payload: {
            previousLockedUntil: target.lockedUntil?.toISOString() ?? null,
            previousFailedAttempts: target.failedLoginAttempts,
          },
        },
      }),
    ]);

    // Fire-and-forget — the unlock itself succeeded, the email is just a
    // courtesy heads-up. Failure to send must not block the admin's
    // response. EmailService already logs internally.
    void this.sendUnlockedEmail(target.email);

    return { success: true, userId: targetUserId };
  }

  private async sendUnlockedEmail(email: string): Promise<void> {
    const tpl = accountUnlockedTemplate();
    try {
      await this.emailService.send({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch {
      // Already logged by EmailService.
    }
  }
}
