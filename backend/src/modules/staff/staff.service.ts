import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BackgroundCheckStatus,
  CprStatus,
  Prisma,
  StaffRole,
  StaffStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { EmailService } from '../email/email.service';
import { staffInvitationTemplate } from '../email/templates/staff-invitation.template';
// PO QA #30 Opción E: manual create resurrected for SUPER_ADMIN. Flow
// creates Staff + User (password=null) + welcome setup token via
// auth.service.issueWelcomeSetupToken. The invitee gets an email and
// sets their own password — admin never sees it.
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  InvitationDto,
  InvitationInfoDto,
  InvitationStatus,
} from './dto/invitation-info.dto';
import { UpdateBackgroundCheckDto } from './dto/update-background-check.dto';
import { UpdateCprDto } from './dto/update-cpr.dto';
import { ComplianceSummaryDto } from './dto/compliance-summary.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// 7 days. Long because invitations are explicit (someone is waiting on them)
// rather than security-driven like password reset (1h). PO-confirmed.
const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Pre-fill shape persisted in StaffInvitationToken.prefillData (PO QA
// #28 Opción F). Validated at the DTO boundary already (InviteStaffDto);
// the read helper is just a defensive parser since Prisma stores it as
// arbitrary JSON.
type InvitationPrefillFields = {
  hireDate?: string;
  dateOfBirth?: string;
  employmentType?: 'full_time' | 'part_time';
  hourlyRate?: number;
  position?: string;
};

function readInvitationPrefill(
  raw: Prisma.JsonValue | null,
): InvitationPrefillFields {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as unknown as InvitationPrefillFields;
}

// Shared empty-result shape used by findAll when a Director has no
// center yet or a Staff user has no staffId yet. Keeps the paginated
// contract honest (always returns {data, pagination}) even on the
// empty path.
function emptyPaginatedStaff(query: { page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 25;
  return {
    data: [],
    pagination: { page, limit, total: 0, totalPages: 1 },
  };
}

// Per-invitation resend rate limit (PO QA #14 AJUSTE 3). 3 resends per
// 1h sliding window — pairs with @Throttle on the controller endpoint
// for an IP-level safety net so a malicious Director can't cycle through
// many invitations to bypass the per-row cap.
const RESEND_WINDOW_MS = 60 * 60 * 1000;
const RESEND_MAX_IN_WINDOW = 3;

// Derive lifecycle status from raw token timestamps. Precedence:
// CANCELLED > ACCEPTED > EXPIRED > PENDING.
function computeInvitationStatus(
  t: { usedAt: Date | null; cancelledAt: Date | null; expiresAt: Date },
  nowMs: number,
): InvitationStatus {
  if (t.cancelledAt) return 'CANCELLED';
  if (t.usedAt) return 'ACCEPTED';
  if (t.expiresAt.getTime() <= nowMs) return 'EXPIRED';
  return 'PENDING';
}

// PO QA #31: whitelisted relationship values shared between DTOs and the
// frontend i18n keys. Keep the order stable — the Select renders in this
// order. Add new values at the end; do NOT reorder.
export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  'father',
  'mother',
  'spouse',
  'partner',
  'sibling',
  'friend',
  'other',
] as const;
export type EmergencyContactRelationship =
  (typeof EMERGENCY_CONTACT_RELATIONSHIPS)[number];

// What every endpoint loads when returning a Staff. Keeps the API payload
// consistent and avoids leaking unrelated columns.
//
// email is sourced from the linked User (Staff.email column was dropped
// in the v2 schema — User.email is the single source of truth).
// Compliance fields are surfaced so the UI can render badges without a
// second fetch; the values are soft-tracked (no activation enforcement).
const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  position: true,
  status: true,
  hireDate: true,
  dateOfBirth: true,
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
  profileComplete: true,
  hourlyRate: true,
  employmentType: true,
  phone: true,
  notes: true,
  centerId: true,
  // PO QA #46: BG select reduced to status + approved. Date / expiry /
  // notes / verifier columns dropped from the schema.
  backgroundCheckStatus: true,
  backgroundCheckApproved: true,
  // PO QA #49: CPR now uses status enum (mirror of BG #46). cprCertified
  // boolean was dropped; aux fields (date / expiry / provider / notes /
  // verifier) RETAINED per PO.
  cprStatus: true,
  cprCertificationDate: true,
  cprExpiryDate: true,
  cprCertificationProvider: true,
  cprVerifiedById: true,
  cprNotes: true,
  cprVerifiedBy: {
    select: {
      email: true,
      staff: { select: { firstName: true, lastName: true } },
    },
  },
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  center: { select: { id: true, name: true } },
  user: { select: { email: true } },
} satisfies Prisma.StaffSelect;

type StaffWithCenter = Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * ARQUITECTURA STAFF (2026-05-18):
   * - Staff: business data (name, role, hire date, hourly rate, ...)
   * - User:  auth identity (email, password, role=STAFF)
   * - Link:  User.staffId @unique → Staff.id (User points to Staff, NOT
   *   the reverse — that's how the schema models it).
   * - Create flow: Staff record first, then User with staffId set,
   *   wrapped in a transaction so a partial create can never leave an
   *   orphan on either side.
   * - Scope: Staff.centerId = director.centerId on create. SUPER_ADMIN
   *   sees everything; DIRECTOR sees only their center; STAFF sees only
   *   their own record; PARENT cannot access staff.
   */
  // Manual `create()` was DELETED in PO QA #28 (Opción F) because the
  // flow generated a temp password logged to stdout.
  // RESURRECTED in PO QA #30 (Opción E) — SUPER_ADMIN-only, password=null
  // until the invitee sets it via the welcome setup email. This time
  // there's no zombie account problem because: (a) we never generate a
  // throwaway password, (b) the login flow null-guards before bcrypt
  // and returns the same generic error as wrong-password, (c) the
  // PasswordAdminAction audit row records who triggered the setup.
  async createWithSetupEmail(
    createStaffDto: CreateStaffDto,
    creatorId: string,
    creatorRole: UserRole,
    ipAddress?: string,
  ): Promise<StaffResponseDto> {
    // PO QA #55 (FEATURE 3): both SUPER_ADMIN and DIRECTOR call this
    // path now. resolveCenterIdForUser handles the role split:
    //   - SUPER_ADMIN: must pass centerId in body
    //   - DIRECTOR: defaults to their own centerId; if they pass a
    //     different one, must own it via Center.ownerId
    const centerId = await this.resolveCenterIdForUser(
      createStaffDto.centerId,
      creatorId,
      creatorRole,
    );

    // Email uniqueness lives on the User table. 409 here is cleaner than
    // a Prisma P2002 inside the transaction.
    const existing = await this.prisma.user.findUnique({
      where: { email: createStaffDto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Translate the form's compliance shortcuts into the schema's
    // discrete fields. PO QA #46 simplified BG: the `Completed` checkbox
    // now lands on status=COMPLETED + approved=true (no per-check date
    // or verifier any more).
    const now = new Date();
    const bgApplied = createStaffDto.backgroundCheckCompleted === true;
    const cprApplied = createStaffDto.cprCertified === true;

    const { staffId, userId } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          centerId,
          firstName: createStaffDto.firstName,
          lastName: createStaffDto.lastName,
          role: createStaffDto.role,
          position: createStaffDto.position ?? null,
          // PO QA #32 defaults: hireDate falls back to today, employment
          // type to 'full_time' when the admin doesn't set them on the
          // form. Both are still column-NOT-NULL in the schema; the
          // defaults preserve that invariant.
          hireDate: createStaffDto.hireDate
            ? new Date(createStaffDto.hireDate)
            : new Date(),
          dateOfBirth: createStaffDto.dateOfBirth
            ? new Date(createStaffDto.dateOfBirth)
            : null,
          employmentType: createStaffDto.employmentType ?? 'full_time',
          hourlyRate: createStaffDto.hourlyRate ?? null,
          phone: createStaffDto.phone ?? null,
          notes: createStaffDto.notes ?? null,
          // PO QA #31: address + emergency contacts collected at create
          // time. All optional — null when the admin skips them.
          street: createStaffDto.street ?? null,
          city: createStaffDto.city ?? null,
          state: createStaffDto.state ?? null,
          zipCode: createStaffDto.zipCode ?? null,
          emergencyContactName: createStaffDto.emergencyContactName ?? null,
          emergencyContactPhone: createStaffDto.emergencyContactPhone
            ? createStaffDto.emergencyContactPhone.replace(/\D/g, '')
            : null,
          emergencyContactRelationship:
            createStaffDto.emergencyContactRelationship ?? null,
          emergencyContact2Name: createStaffDto.emergencyContact2Name ?? null,
          emergencyContact2Phone: createStaffDto.emergencyContact2Phone
            ? createStaffDto.emergencyContact2Phone.replace(/\D/g, '')
            : null,
          emergencyContact2Relationship:
            createStaffDto.emergencyContact2Relationship ?? null,
          // PO QA #30: status=ACTIVE so the staff shows up in the list
          // immediately (Director can pre-assign classroom/etc before
          // the staff completes setup). User-side null-password gates
          // actual login.
          status: StaffStatus.ACTIVE,
          ...(bgApplied
            ? {
                backgroundCheckStatus: BackgroundCheckStatus.COMPLETED,
                backgroundCheckApproved: true,
              }
            : {}),
          // PO QA #49: the legacy `cprCertified` shortcut now maps to
          // status=ACTIVE + certificationDate=now. Without an expiry the
          // record is technically in violation of the ACTIVE rule
          // (ACTIVE requires future expiry), but the create flow doesn't
          // surface an expiry input — admin is expected to land on
          // /staff/[id]/edit and complete the expiry date afterwards.
          // The validator on /staff/:id/cpr will then catch any save
          // attempt that leaves ACTIVE+no-expiry. Documented edge case.
          ...(cprApplied
            ? {
                cprStatus: CprStatus.ACTIVE,
                cprCertificationDate: now,
                cprVerifiedById: creatorId,
              }
            : {}),
        },
        select: { id: true },
      });

      const user = await tx.user.create({
        data: {
          email: createStaffDto.email,
          // PO QA #30 Opción E: password=null until the staff completes
          // setup via the welcome email link. The null guard in
          // auth.service.login() ensures this never grants access.
          password: null,
          role: UserRole.STAFF,
          // status=ACTIVE so the user record is fully provisioned; the
          // password-null check is what blocks login. Avoids tying the
          // login gate to two different signals.
          status: UserStatus.ACTIVE,
          centerId,
          staffId: created.id,
          activatedAt: new Date(),
        },
        select: { id: true },
      });

      return { staffId: created.id, userId: user.id };
    });

    // Look up actor + center for the welcome email copy. The inviter
    // name comes from the actor's Staff record if they have one
    // (DIRECTOR with a self-Staff link), or falls back to their email.
    const [actor, center] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: creatorId },
        select: {
          email: true,
          staff: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.center.findUnique({
        where: { id: centerId },
        select: { name: true },
      }),
    ]);
    const inviterName = actor?.staff
      ? `${actor.staff.firstName} ${actor.staff.lastName}`
      : (actor?.email ?? 'A KinderCtrl admin');
    const centerName = center?.name ?? 'your center';

    // Fire the welcome setup email + audit. Failures inside this method
    // are logged but don't roll back the Staff create — the admin can
    // re-trigger via "Send Password Reset" on the staff detail page.
    void this.authService.issueWelcomeSetupToken(userId, creatorId, {
      inviterName,
      centerName,
      ipAddress,
    });

    // Re-fetch with the standard select so toResponseDto() sees the
    // populated user.email.
    const staff = await this.prisma.staff.findUniqueOrThrow({
      where: { id: staffId },
      select: STAFF_SELECT,
    });
    return this.toResponseDto(staff);
  }

  /**
   * Director/SUPER_ADMIN-triggered password reset (PO QA #28 Opción F).
   * Issues a PasswordResetToken + sends the same email as the self-service
   * forgot-password flow. The actor never sees the new password — the
   * staff sets it themselves via the email link. Action is audited in
   * password_admin_actions for compliance.
   */
  async sendPasswordReset(
    staffId: string,
    actorId: string,
    actorRole: UserRole,
    ipAddress?: string,
  ): Promise<{ success: true; email: string }> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        centerId: true,
        user: { select: { id: true, email: true } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    if (!staff.user) {
      // Staff exists but has no linked User yet — they're mid-invitation.
      // Resending the invitation is the correct action there, not a
      // password reset (no password to reset).
      throw new BadRequestException(
        'Staff has not accepted their invitation yet — resend the invitation instead.',
      );
    }
    // Authz: STAFF/PARENT denied at the role gate. DIRECTOR scoped to
    // owned centers; SUPER_ADMIN gets through unconditionally.
    if (
      actorRole !== UserRole.DIRECTOR &&
      actorRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    if (actorRole === UserRole.DIRECTOR) {
      const ownsCenter = await this.prisma.center.findFirst({
        where: { id: staff.centerId, ownerId: actorId },
        select: { id: true },
      });
      if (!ownsCenter) {
        throw new ForbiddenException(
          'Cannot reset password for staff in another center',
        );
      }
    }

    await this.authService.triggerPasswordResetByAdmin(
      staff.user.id,
      actorId,
      ipAddress,
    );

    return { success: true, email: staff.user.email };
  }

  async findAll(
    userId: string,
    userRole: UserRole,
    query: { page?: number; limit?: number; search?: string } = {},
  ): Promise<{
    data: StaffResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let where: Prisma.StaffWhereInput;

    if (userRole === UserRole.SUPER_ADMIN) {
      where = {};
    } else if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (!director?.centerId) {
        return emptyPaginatedStaff(query);
      }
      where = { centerId: director.centerId };
    } else if (userRole === UserRole.STAFF) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { staffId: true },
      });
      if (!user?.staffId) {
        return emptyPaginatedStaff(query);
      }
      where = { id: user.staffId };
    } else {
      throw new ForbiddenException('Parents cannot access staff list');
    }

    // PO QA #19: paginate to match the /centers list pattern. Defaults
    // mirror centers (page=1, limit=25). totalPages floors at 1 so the
    // UI's "Page X of Y" never reads "of 0" for empty result sets.
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const fullWhere: Prisma.StaffWhereInput = {
      ...where,
      // TERMINATED is the soft-delete tombstone — hidden from all reads.
      status: { not: StaffStatus.TERMINATED },
    };

    // Free-text search across firstName / lastName / linked User email.
    // Inline OR because user.email is a relation field — buildSearchWhere
    // (utils/search.ts) only handles top-level scalars.
    const searchTerm = query.search?.trim();
    if (searchTerm) {
      fullWhere.OR = [
        { firstName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { user: { email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where: fullWhere,
        select: STAFF_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.staff.count({ where: fullWhere }),
    ]);

    return {
      data: list.map((s) => this.toResponseDto(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<StaffResponseDto> {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: STAFF_SELECT,
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    await this.assertCanAccess(staff.centerId, staff.id, userId, userRole);

    return this.toResponseDto(staff);
  }

  async update(
    id: string,
    dto: UpdateStaffDto,
    userId: string,
    userRole: UserRole,
    ipAddress?: string,
  ): Promise<StaffResponseDto> {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        centerId: true,
        user: { select: { id: true, email: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Staff not found');
    }

    await this.assertCanAccess(
      existing.centerId,
      existing.id,
      userId,
      userRole,
    );

    // PO QA #45: detect email + center change so we can apply the extra
    // SUPER_ADMIN-only effects (uniqueness check, session revoke, welcome
    // setup email for email; center validation for center). Both fields
    // remain `undefined` in the data block when no change is requested,
    // which Prisma treats as "leave alone" (PATCH semantics).
    const normalizedNewEmail = dto.email?.trim().toLowerCase();
    const currentEmail = existing.user?.email.toLowerCase() ?? '';
    const isEmailChange =
      normalizedNewEmail !== undefined &&
      normalizedNewEmail !== '' &&
      normalizedNewEmail !== currentEmail;

    const isCenterChange =
      dto.centerId !== undefined && dto.centerId !== existing.centerId;

    // PO QA #55 (FEATURE 2): email is now editable by DIRECTOR too —
    // they have the same destructive effect (session revoke + setup
    // email) but limited to staff in their own center (assertCanAccess
    // above already enforces that). Center reassignment stays
    // SUPER_ADMIN-only because moving staff between centers is a
    // cross-center operation a Director can't perform.
    if (isCenterChange && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can change center assignment',
      );
    }
    if (
      isEmailChange &&
      userRole !== UserRole.SUPER_ADMIN &&
      userRole !== UserRole.DIRECTOR
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to change email',
      );
    }

    if (isEmailChange) {
      if (!existing.user) {
        throw new BadRequestException(
          'Cannot change email — staff has no linked user account yet (invitation still pending).',
        );
      }
      const conflict = await this.prisma.user.findUnique({
        where: { email: normalizedNewEmail },
        select: { id: true },
      });
      if (conflict && conflict.id !== existing.user.id) {
        throw new ConflictException('Email already registered');
      }
    }

    if (isCenterChange) {
      const targetCenter = await this.prisma.center.findUnique({
        where: { id: dto.centerId },
        select: { id: true },
      });
      if (!targetCenter) {
        throw new NotFoundException('Target center not found');
      }
    }

    // Compliance fields (background check, CPR) have their own dedicated
    // PATCH endpoints; they are NOT writable through this generic update.
    const updated = await this.prisma.$transaction(async (tx) => {
      // PO QA #45: email change is a destructive identity rotation.
      // - User.email moves to the new address
      // - password is nulled so the staff must re-establish credentials
      //   via the welcome setup email (issued post-tx below)
      // - all Session rows for that user are deleted (revokes refresh
      //   tokens → live JWT sessions go stale on next refresh)
      // The Staff row keeps its email-derived state via the user
      // relation; no Staff column to update.
      if (isEmailChange && existing.user) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            email: normalizedNewEmail,
            password: null,
          },
        });
        await tx.session.deleteMany({
          where: { userId: existing.user.id },
        });
      }

      return tx.staff.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          position: dto.position,
          status: dto.status,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          dateOfBirth: dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : dto.dateOfBirth === null
              ? null
              : undefined,
          employmentType: dto.employmentType,
          hourlyRate: dto.hourlyRate,
          phone: dto.phone,
          notes: dto.notes,
          // PO QA #45: centerId becomes writable here (was silently
          // dropped before). The SUPER_ADMIN gate above is the only
          // authorized path; DIRECTOR PATCHes leave centerId undefined
          // and Prisma no-ops the column.
          centerId: isCenterChange ? dto.centerId : undefined,
          // PO QA #31 — pass-through address + emergency fields. Prisma
          // treats `undefined` as "leave alone" (PATCH semantics), which
          // matches what we want when the form doesn't dirty a field.
          street: dto.street,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone
            ? dto.emergencyContactPhone.replace(/\D/g, '')
            : dto.emergencyContactPhone,
          emergencyContactRelationship: dto.emergencyContactRelationship,
          emergencyContact2Name: dto.emergencyContact2Name,
          emergencyContact2Phone: dto.emergencyContact2Phone
            ? dto.emergencyContact2Phone.replace(/\D/g, '')
            : dto.emergencyContact2Phone,
          emergencyContact2Relationship: dto.emergencyContact2Relationship,
        },
        select: STAFF_SELECT,
      });
    });

    // PO QA #45: dispatch the welcome-setup email AFTER the transaction
    // commits — email failure must not roll back the email rotation. The
    // setup token is the staff's only way back in now that their password
    // was nulled and their sessions revoked, so this MUST run.
    if (isEmailChange && existing.user) {
      const [actor, center] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.center.findUnique({
          where: { id: updated.centerId },
          select: { name: true },
        }),
      ]);
      const inviterName = actor?.staff
        ? `${actor.staff.firstName} ${actor.staff.lastName}`
        : (actor?.email ?? 'A KinderCtrl admin');
      const centerName = center?.name ?? 'your center';
      void this.authService.issueWelcomeSetupToken(existing.user.id, userId, {
        inviterName,
        centerName,
        ipAddress,
      });
    }

    return this.toResponseDto(updated);
  }

  async remove(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        centerId: true,
        user: { select: { id: true } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    if (
      userRole !== UserRole.DIRECTOR &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (director?.centerId !== staff.centerId) {
        throw new ForbiddenException(
          'Cannot delete staff from other centers',
        );
      }
    }

    // Soft delete on both sides. Both writes in the same tx so we never
    // leave Staff TERMINATED while User is still ACTIVE (or vice versa).
    await this.prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id },
        data: { status: StaffStatus.TERMINATED },
      });
      if (staff.user) {
        await tx.user.update({
          where: { id: staff.user.id },
          data: { status: UserStatus.DELETED, deletedAt: new Date() },
        });
      }
    });
  }

  /**
   * Issues a staff invitation token + sends the email.
   * - DIRECTOR: centerId defaults to their User.centerId; if they pass a
   *   different centerId, we verify they own it via Center.ownerId (supports
   *   multi-center DIRECTORs per ARCHITECTURE.md).
   * - SUPER_ADMIN: must pass centerId explicitly.
   * - Role on the invitation defaults to TEACHER (PO decision Q2). The
   *   Director can change it via PATCH /staff/:id after the invitee accepts.
   * - Any prior unused unexpired invitation for the same email is soft-
   *   invalidated (marked used=now) so each email has at most one live
   *   invitation at a time.
   */
  async invite(
    dto: InviteStaffDto,
    inviterId: string,
    inviterRole: UserRole,
  ): Promise<{ success: true; email: string; expiresAt: Date }> {
    const email = dto.email.trim().toLowerCase();

    const centerId = await this.resolveCenterIdForUser(
      dto.centerId,
      inviterId,
      inviterRole,
    );

    // Reject early if there's already a User with this email — the accept
    // flow would fail later on the @unique constraint, but a 409 here saves
    // us from issuing a doomed token and from sending an email that the
    // invitee can never act on.
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Soft-invalidate prior active invitations for the same email. Bulk
    // updateMany is fine — there can only realistically be 0 or 1 active
    // tokens at a time given this check runs on every invite. PO QA #13:
    // also exclude cancelled tokens (cancelledAt) — those are already done.
    // We mark prior actives as cancelled (not used) so the list view shows
    // them under CANCELLED, not ACCEPTED.
    await this.prisma.staffInvitationToken.updateMany({
      where: {
        email,
        usedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { cancelledAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TOKEN_TTL_MS);

    // PO QA #28 Opción F: optional operational fields the inviter can
    // pre-populate. Stored as JSON on the token; merged into the Staff
    // record at accept-time. Validated at the DTO boundary already; we
    // serialize to a plain object so Prisma's Json type accepts it.
    const prefillData = dto.prefill
      ? (JSON.parse(JSON.stringify(dto.prefill)) as Prisma.JsonObject)
      : undefined;

    await this.prisma.staffInvitationToken.create({
      data: {
        token,
        email,
        centerId,
        // PO Q2: role defaults to TEACHER, Director adjusts later if needed.
        role: StaffRole.TEACHER,
        invitedById: inviterId,
        expiresAt,
        ...(prefillData ? { prefillData } : {}),
      },
    });

    // Fire-and-forget — email failure must not block the response. The
    // invitation row is already in the DB, so a Director can re-trigger
    // the email later if the user reports they never received it.
    void this.sendInvitationEmail(email, token, centerId, expiresAt);

    return { success: true, email, expiresAt };
  }

  /**
   * Public preflight for the invitation accept page. The frontend hits this
   * with the token from the URL to render "You were invited by X to join Y".
   * All failure modes (missing/used/expired) return 404 per PO Q3 — security-
   * friendly, mirrors PasswordResetToken posture.
   */
  async getInvitationInfo(token: string): Promise<InvitationInfoDto> {
    const invitation = await this.prisma.staffInvitationToken.findUnique({
      where: { token },
      select: {
        email: true,
        expiresAt: true,
        usedAt: true,
        cancelledAt: true,
        center: {
          select: {
            name: true,
            owner: {
              select: {
                email: true,
                staff: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (
      !invitation ||
      invitation.usedAt ||
      invitation.cancelledAt ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation not found or no longer valid');
    }

    return {
      email: invitation.email,
      centerName: invitation.center.name,
      directorName: this.resolveDirectorName(invitation.center.owner),
      directorEmail: invitation.center.owner.email,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Consumes an invitation token: creates Staff + User atomically, marks the
   * token used, then issues JWT tokens via AuthService so the new user lands
   * straight in the dashboard.
   *
   * Order matters: Staff first, then User with staffId, because User.staffId
   * is the @unique 1:1 link (User points to Staff). Same pattern as create().
   *
   * Status of new Staff: ACTIVE (PO QA #52). Previously INVITED with the
   * Director expected to flip to ACTIVE manually post-compliance, but in
   * practice that left every accepted invitation stuck in a stale state
   * (staff could log in, but the list/cards rendered them as still
   * "Invited" until someone noticed). Compliance tracking (background
   * check, CPR) is independent of activation — those fields default to
   * PENDING and the Director updates them via their dedicated endpoints
   * without ever needing to touch staff.status.
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<AuthResponseDto> {
    const invitation = await this.prisma.staffInvitationToken.findUnique({
      where: { token: dto.token },
      select: {
        id: true,
        email: true,
        centerId: true,
        role: true,
        expiresAt: true,
        usedAt: true,
        cancelledAt: true,
        prefillData: true,
      },
    });
    if (
      !invitation ||
      invitation.usedAt ||
      invitation.cancelledAt ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation not found or no longer valid');
    }

    // Defensive: a User with this email could have been created via
    // /auth/register between invite-time and accept-time. Re-check here
    // so we 409 cleanly instead of crashing inside the transaction.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // PO QA #28 Opción F: pull pre-fill (hireDate/employmentType/etc) from
    // the token. The invitee's own input (firstName/lastName/phone/password)
    // always wins; pre-fill only fills the slots the invitee doesn't supply.
    // Defaults remain (hireDate=now, employmentType=full_time) when no
    // prefill provided — matches the previous behavior.
    const prefill = readInvitationPrefill(invitation.prefillData);

    let createdUserId: string;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const staff = await tx.staff.create({
          data: {
            centerId: invitation.centerId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: invitation.role,
            hireDate: prefill.hireDate
              ? new Date(prefill.hireDate)
              : new Date(),
            dateOfBirth: prefill.dateOfBirth
              ? new Date(prefill.dateOfBirth)
              : null,
            employmentType: prefill.employmentType ?? 'full_time',
            hourlyRate: prefill.hourlyRate ?? null,
            position: prefill.position ?? null,
            phone: dto.phone,
            // PO QA #52: accept = ACTIVE. The invitee just supplied their
            // password and is about to receive JWTs — they're a real,
            // logged-in user, so INVITED is misleading on every list/card
            // it touches. Compliance fields are separate (PENDING default).
            status: StaffStatus.ACTIVE,
            // backgroundCheckStatus + cprStatus both default to PENDING
            // per schema (PO QA #46 + #49 simplifications).
          },
          select: { id: true },
        });

        const user = await tx.user.create({
          data: {
            email: invitation.email,
            password: hashedPassword,
            role: UserRole.STAFF,
            status: UserStatus.ACTIVE,
            centerId: invitation.centerId,
            staffId: staff.id,
            activatedAt: new Date(),
          },
          select: { id: true },
        });

        await tx.staffInvitationToken.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() },
        });

        return { userId: user.id };
      });
      createdUserId = result.userId;
    } catch (err) {
      // P2002 = Prisma unique-constraint violation. Triggered by a race:
      // two parallel accepts of the same token, or a User created via
      // /auth/register between our pre-check and the transaction commit.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }

    // Issue tokens AFTER the transaction commits — generateTokens creates
    // a Session row which is a side effect of "you are logged in now",
    // not part of the user-creation invariant.
    return this.authService.issueTokensForUser(createdUserId);
  }

  /**
   * PATCH /staff/:id/background-check.
   *
   * PO QA #46 simplified: status (Pending / Completed / Cancelled) +
   * approved (Boolean | null). `approved` is only meaningful when
   * status === COMPLETED — for PENDING / CANCELLED the service nulls it
   * out so a stale outcome can't leak after a lifecycle transition.
   *
   * Soft-track per PO Q1 — does NOT block staff activation when status
   * is non-COMPLETED. The endpoint is purely audit + UI badge wiring.
   */
  async updateBackgroundCheck(
    staffId: string,
    dto: UpdateBackgroundCheckDto,
    userId: string,
    userRole: UserRole,
  ): Promise<StaffResponseDto> {
    const existing = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, centerId: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff not found');
    }
    await this.assertCanAccess(
      existing.centerId,
      existing.id,
      userId,
      userRole,
    );

    // Outcome is only retained when the lifecycle says we have one.
    // Non-COMPLETED states wipe approved so the column always reflects
    // a consistent (status, approved) pair.
    const approved =
      dto.status === BackgroundCheckStatus.COMPLETED
        ? (dto.approved ?? null)
        : null;

    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        backgroundCheckStatus: dto.status,
        backgroundCheckApproved: approved,
      },
      select: STAFF_SELECT,
    });

    return this.toResponseDto(updated);
  }

  /**
   * PATCH /staff/:id/cpr — PO QA #49 4-state model.
   *
   * Validation rules per spec:
   *   ACTIVE   → expiryDate REQUIRED and must be strictly in the future
   *   EXPIRED  → expiryDate REQUIRED and must be in the past (or today)
   *   PENDING  → expiryDate optional, no temporal constraint
   *   CANCELLED → expiryDate optional, no temporal constraint
   *
   * Aux fields (certificationDate / provider / notes) accept partial
   * PATCH semantics (undefined = leave alone). Sets cprVerifiedById to
   * the current user on every call — mirrors the BG verifier audit
   * pattern that QA #46 retired for BG but kept for CPR.
   */
  async updateCpr(
    staffId: string,
    dto: UpdateCprDto,
    userId: string,
    userRole: UserRole,
  ): Promise<StaffResponseDto> {
    const existing = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, centerId: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff not found');
    }
    await this.assertCanAccess(
      existing.centerId,
      existing.id,
      userId,
      userRole,
    );

    // Temporal validation. Done in the service (not the DTO) so error
    // messages can reference the *business* rule rather than a
    // class-validator implementation detail.
    if (dto.status === CprStatus.ACTIVE) {
      if (!dto.expiryDate) {
        throw new BadRequestException(
          'expiryDate is required when status is ACTIVE',
        );
      }
      const expiry = new Date(dto.expiryDate);
      if (expiry.getTime() <= Date.now()) {
        throw new BadRequestException(
          'ACTIVE status requires a future expiryDate',
        );
      }
    }
    if (dto.status === CprStatus.EXPIRED) {
      if (!dto.expiryDate) {
        throw new BadRequestException(
          'expiryDate is required when status is EXPIRED',
        );
      }
      const expiry = new Date(dto.expiryDate);
      if (expiry.getTime() > Date.now()) {
        throw new BadRequestException(
          'EXPIRED status requires a past expiryDate',
        );
      }
    }

    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        cprStatus: dto.status,
        cprCertificationDate: dto.certificationDate
          ? new Date(dto.certificationDate)
          : undefined,
        cprExpiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        cprCertificationProvider: dto.provider,
        cprNotes: dto.notes,
        cprVerifiedById: userId,
      },
      select: STAFF_SELECT,
    });

    return this.toResponseDto(updated);
  }

  /**
   * GET /staff/invitations — list invitations with computed lifecycle
   * status (PO QA #13). Scoped by role:
   *   - SUPER_ADMIN: sees all (or ?centerId filter).
   *   - DIRECTOR: sees only invitations for centers they own.
   * Optional ?status param filters to one lifecycle state; omitting it
   * returns the full history with the status computed per row.
   */
  async getInvitations(
    userId: string,
    userRole: UserRole,
    query: {
      page?: number;
      limit?: number;
      status?: InvitationStatus;
      centerId?: string;
    } = {},
  ): Promise<{
    data: InvitationDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const where: Prisma.StaffInvitationTokenWhereInput = {};
    if (userRole === UserRole.SUPER_ADMIN) {
      if (query.centerId) where.centerId = query.centerId;
    } else if (userRole === UserRole.DIRECTOR) {
      where.center = { ownerId: userId };
      if (query.centerId) where.centerId = query.centerId;
    } else {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Translate the requested status to the matching timestamp predicates.
    // The 4 states are mutually exclusive when computed from these 3 cols:
    //   cancelledAt set        → CANCELLED  (precedence: even if usedAt
    //                            also somehow set, cancellation wins)
    //   usedAt set, !cancelled → ACCEPTED
    //   !used, !cancelled, expired → EXPIRED
    //   !used, !cancelled, !expired → PENDING
    if (query.status === 'PENDING') {
      where.usedAt = null;
      where.cancelledAt = null;
      where.expiresAt = { gt: new Date() };
    } else if (query.status === 'ACCEPTED') {
      where.usedAt = { not: null };
      where.cancelledAt = null;
    } else if (query.status === 'EXPIRED') {
      where.usedAt = null;
      where.cancelledAt = null;
      where.expiresAt = { lte: new Date() };
    } else if (query.status === 'CANCELLED') {
      where.cancelledAt = { not: null };
    }

    // PO QA #22: paginate to match the centers + /staff list pattern.
    // Defaults are page=1, limit=15 (DESKTOP_LIMIT). Frontend overrides
    // to 10 on mobile via useMediaQuery.
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.staffInvitationToken.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          centerId: true,
          role: true,
          usedAt: true,
          cancelledAt: true,
          resendCount: true,
          lastResendAt: true,
          createdAt: true,
          expiresAt: true,
          center: { select: { name: true } },
          invitedBy: {
            select: {
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.staffInvitationToken.count({ where }),
    ]);

    const now = Date.now();
    const data = rows.map((r) => ({
      id: r.id,
      email: r.email,
      centerId: r.centerId,
      centerName: r.center.name,
      role: r.role,
      status: computeInvitationStatus(r, now),
      invitedByName: r.invitedBy
        ? this.resolveDirectorName(r.invitedBy)
        : '(unknown)',
      invitedByEmail: r.invitedBy?.email ?? '',
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      // Surface raw counter values; frontend computes "is the bucket
      // stale" from lastResendAt vs now and decides button disabled state.
      resendCount: r.resendCount,
      lastResendAt: r.lastResendAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * POST /staff/invitations/:id/resend — issues a NEW token for the same
   * invitation (invalidates the old one) and re-sends the email. Security
   * choice: rotate the token so the original email link goes 404 — if
   * someone forwarded the original by mistake, the link can't be replayed.
   */
  async resendInvitation(
    invitationId: string,
    inviterId: string,
    inviterRole: UserRole,
  ): Promise<{
    success: true;
    expiresAt: Date;
    resendCount: number;
  }> {
    const existing = await this.prisma.staffInvitationToken.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        email: true,
        centerId: true,
        role: true,
        usedAt: true,
        cancelledAt: true,
        lastResendAt: true,
        resendCount: true,
        center: { select: { ownerId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Invitation not found');
    }
    if (existing.usedAt) {
      throw new BadRequestException(
        'Invitation has already been accepted',
      );
    }
    if (existing.cancelledAt) {
      throw new BadRequestException(
        'Invitation was cancelled — send a new one instead',
      );
    }
    if (
      inviterRole === UserRole.DIRECTOR &&
      existing.center.ownerId !== inviterId
    ) {
      throw new ForbiddenException(
        'Cannot resend an invitation for a center you do not own',
      );
    }

    // Per-invitation sliding-window rate limit (PO QA #14 AJUSTE 3).
    // SUPER_ADMIN bypasses the cap entirely (PO QA #17 AJUSTE 2) AND
    // intentionally does NOT bump lastResendAt/resendCount — otherwise a
    // SUPER_ADMIN poke would keep the Director's bucket "fresh" forever
    // and lock the Director out of resending their own invitation. The
    // counter therefore stays a faithful record of Director-context
    // activity only; SUPER_ADMIN actions are silent from a quota POV.
    const isSuperAdmin = inviterRole === UserRole.SUPER_ADMIN;
    const now = new Date();
    let nextResendCount = existing.resendCount;
    if (!isSuperAdmin) {
      const windowStart = new Date(now.getTime() - RESEND_WINDOW_MS);
      const bucketStillFresh =
        existing.lastResendAt && existing.lastResendAt > windowStart;
      if (bucketStillFresh && existing.resendCount >= RESEND_MAX_IN_WINDOW) {
        throw new BadRequestException(
          `Too many resend attempts. Wait before trying again — limit is ${RESEND_MAX_IN_WINDOW} per hour.`,
        );
      }
      nextResendCount = bucketStillFresh ? existing.resendCount + 1 : 1;
    }

    // Update-in-place (PO QA #14 AJUSTE 3): same row, new token bytes +
    // fresh expiry. For Director, also bump the quota counters; for
    // SUPER_ADMIN, leave them untouched per the lock-out rationale above.
    // The old token bytes are gone from the DB so the previous email
    // link can't be replayed regardless of role.
    const newToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + INVITATION_TOKEN_TTL_MS);
    await this.prisma.staffInvitationToken.update({
      where: { id: invitationId },
      data: isSuperAdmin
        ? { token: newToken, expiresAt }
        : {
            token: newToken,
            expiresAt,
            lastResendAt: now,
            resendCount: nextResendCount,
          },
    });

    void this.sendInvitationEmail(
      existing.email,
      newToken,
      existing.centerId,
      expiresAt,
    );

    return { success: true, expiresAt, resendCount: nextResendCount };
  }

  /**
   * DELETE /staff/invitations/:id — revoke a pending invitation. Soft-
   * invalidates by setting usedAt=now (token can never be redeemed). Row
   * stays in DB for audit purposes (who invited whom and when).
   */
  async revokeInvitation(
    invitationId: string,
    inviterId: string,
    inviterRole: UserRole,
  ): Promise<void> {
    const existing = await this.prisma.staffInvitationToken.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        usedAt: true,
        cancelledAt: true,
        center: { select: { ownerId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Invitation not found');
    }
    if (existing.usedAt) {
      throw new BadRequestException(
        'Invitation has already been accepted',
      );
    }
    if (existing.cancelledAt) {
      throw new BadRequestException(
        'Invitation has already been cancelled',
      );
    }
    if (
      inviterRole === UserRole.DIRECTOR &&
      existing.center.ownerId !== inviterId
    ) {
      throw new ForbiddenException(
        'Cannot revoke an invitation for a center you do not own',
      );
    }

    // PO QA #13: revoke now uses cancelledAt (was usedAt) so the lifecycle
    // status query can distinguish CANCELLED from ACCEPTED.
    await this.prisma.staffInvitationToken.update({
      where: { id: invitationId },
      data: { cancelledAt: new Date() },
    });
  }

  /**
   * GET /staff/me/profile — staff fetches their own profile. Per PO QA #8
   * (Opción C), the invitation flow drops the user into /profile/complete
   * after accept; this powers that page's pre-fill.
   *
   * The route is exposed only to STAFF (controller @Roles) — DIRECTOR /
   * SUPER_ADMIN don't have their own Staff record in the common case and
   * would get 404 here anyway.
   */
  async getMyProfile(userId: string): Promise<StaffResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    if (!user?.staffId) {
      throw new NotFoundException('No staff profile for this user');
    }
    const staff = await this.prisma.staff.findUnique({
      where: { id: user.staffId },
      select: STAFF_SELECT,
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }
    return this.toResponseDto(staff);
  }

  /**
   * PATCH /staff/me/profile — staff self-updates the optional fields they
   * skipped at invitation time. Any successful save flips profileComplete=true
   * (drives the dashboard banner). Empty / omitted fields are skipped — the
   * "Skip for now" button submits an empty body, which still sets the flag.
   *
   * Compliance fields are NOT writable through this endpoint (those go via
   * PATCH /staff/:id/background-check + /cpr, gated to DIRECTOR/SUPER_ADMIN).
   */
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<StaffResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    if (!user?.staffId) {
      throw new NotFoundException('No staff profile for this user');
    }

    const updated = await this.prisma.staff.update({
      where: { id: user.staffId },
      data: {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        // Empty string → undefined (don't overwrite). Real values pass through.
        // A future v2 could distinguish "" (clear) from undefined (no-op) if
        // explicit field-clearing UX is added.
        street: dto.street?.trim() ? dto.street.trim() : undefined,
        city: dto.city?.trim() ? dto.city.trim() : undefined,
        state: dto.state?.trim() ? dto.state.trim().toUpperCase() : undefined,
        zipCode: dto.zipCode?.trim() ? dto.zipCode.trim() : undefined,
        emergencyContactName: dto.emergencyContactName?.trim()
          ? dto.emergencyContactName.trim()
          : undefined,
        emergencyContactPhone: dto.emergencyContactPhone?.trim()
          ? dto.emergencyContactPhone.trim()
          : undefined,
        profileComplete: true,
      },
      select: STAFF_SELECT,
    });
    return this.toResponseDto(updated);
  }

  /**
   * GET /staff/compliance-summary.
   * One findMany + JS aggregation. Center staff counts are small (rarely
   * >50), so the JS-side switch is cheaper than 9 separate count queries.
   * Excludes TERMINATED staff (they're tombstones — same as findAll).
   *
   * centerId resolution mirrors invite: SUPER_ADMIN must pass it; DIRECTOR
   * defaults to their primary, or validates ownership if they pass another.
   */
  async getComplianceSummary(
    bodyCenterId: string | undefined,
    userId: string,
    userRole: UserRole,
  ): Promise<ComplianceSummaryDto> {
    const centerId = await this.resolveCenterIdForUser(
      bodyCenterId,
      userId,
      userRole,
    );

    const rows = await this.prisma.staff.findMany({
      where: {
        centerId,
        status: { not: StaffStatus.TERMINATED },
      },
      select: {
        backgroundCheckStatus: true,
        backgroundCheckApproved: true,
        cprStatus: true,
      },
    });

    // PO QA #46 + #49: 4 buckets per compliance domain aligned with the
    // simplified lifecycle models. Both badges derive from stored
    // status, so the widget reads the column directly — no
    // derived-from-date calculations any more.
    const summary: ComplianceSummaryDto = {
      total: rows.length,
      backgroundCheck: {
        completedApproved: 0,
        completedNotApproved: 0,
        pending: 0,
        cancelled: 0,
      },
      cpr: { pending: 0, active: 0, expired: 0, cancelled: 0 },
    };

    for (const r of rows) {
      switch (r.backgroundCheckStatus) {
        case BackgroundCheckStatus.COMPLETED:
          if (r.backgroundCheckApproved === true) {
            summary.backgroundCheck.completedApproved++;
          } else {
            summary.backgroundCheck.completedNotApproved++;
          }
          break;
        case BackgroundCheckStatus.PENDING:
          summary.backgroundCheck.pending++;
          break;
        case BackgroundCheckStatus.CANCELLED:
          summary.backgroundCheck.cancelled++;
          break;
      }

      switch (r.cprStatus) {
        case CprStatus.PENDING:
          summary.cpr.pending++;
          break;
        case CprStatus.ACTIVE:
          summary.cpr.active++;
          break;
        case CprStatus.EXPIRED:
          summary.cpr.expired++;
          break;
        case CprStatus.CANCELLED:
          summary.cpr.cancelled++;
          break;
      }
    }

    return summary;
  }

  private async sendInvitationEmail(
    email: string,
    token: string,
    centerId: string,
    expiresAt: Date,
  ): Promise<void> {
    // Trace breadcrumb — mirror the BUG-031 pattern so an audit can tell
    // "email never attempted" from "Resend rejected".
    this.logger.log('Sending staff invitation email');
    // PO QA #12 Issue 3B — also log the URL so a dev can recover the
    // invite link from `tail -f backend.log` without needing the email
    // to actually arrive (useful when Resend test-mode silently drops
    // delivery to unverified inboxes).
    const baseUrlForLog =
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3003';
    this.logger.log(
      `  invitation link: ${baseUrlForLog}/accept-invitation?token=${token}`,
    );
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: {
        name: true,
        owner: {
          select: {
            email: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!center) {
      this.logger.warn(`Invitation email skipped — center ${centerId} not found`);
      return;
    }

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3003';
    // Public route lives at /accept-invitation (in the frontend (auth)
    // route group), NOT /staff/accept-invitation — the latter falls through
    // to the dashboard's staff/[id] catch-all and 400s on ParseUUIDPipe.
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

    const tpl = staffInvitationTemplate({
      centerName: center.name,
      directorName: this.resolveDirectorName(center.owner),
      directorEmail: center.owner.email,
      invitationUrl,
      expiresAt,
    });
    try {
      await this.emailService.send({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch {
      // EmailService logs failures with context; the invitation row in DB
      // is the source of truth, the email is just a heads-up.
    }
  }

  /**
   * Display name for the Director of a Center, used in invitation copy.
   * Falls back to email when the Director User has no linked Staff record
   * (which is the common case today — Directors aren't usually in Staff).
   */
  private resolveDirectorName(owner: {
    email: string;
    staff: { firstName: string; lastName: string } | null;
  }): string {
    if (owner.staff) {
      return `${owner.staff.firstName} ${owner.staff.lastName}`;
    }
    return owner.email;
  }

  /**
   * Resolves a centerId scoped to the current user, applying role-based
   * authority rules. Used by /staff/invite and /staff/compliance-summary —
   * both need the same "which center can this user act on" answer.
   *   - SUPER_ADMIN: must provide centerId; we verify it exists.
   *   - DIRECTOR: defaults to their User.centerId if omitted; if provided
   *     and different, we verify they own it via Center.ownerId (multi-
   *     center DIRECTORs per ARCHITECTURE.md).
   *   - Anyone else: 403 (the controller @Roles already blocks the writer
   *     endpoints, but defense in depth).
   */
  private async resolveCenterIdForUser(
    bodyCenterId: string | undefined,
    inviterId: string,
    inviterRole: UserRole,
  ): Promise<string> {
    if (inviterRole === UserRole.SUPER_ADMIN) {
      if (!bodyCenterId) {
        throw new BadRequestException('centerId is required for SUPER_ADMIN');
      }
      const center = await this.prisma.center.findUnique({
        where: { id: bodyCenterId },
        select: { id: true },
      });
      if (!center) {
        throw new NotFoundException('Center not found');
      }
      return bodyCenterId;
    }

    if (inviterRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { centerId: true },
      });
      const defaultCenterId = director?.centerId ?? null;

      if (!bodyCenterId) {
        if (!defaultCenterId) {
          throw new ForbiddenException(
            'Director has no center assigned; cannot invite staff',
          );
        }
        return defaultCenterId;
      }

      if (bodyCenterId === defaultCenterId) {
        return bodyCenterId;
      }

      // Multi-center DIRECTOR: confirm ownership via Center.ownerId.
      const owned = await this.prisma.center.findFirst({
        where: { id: bodyCenterId, ownerId: inviterId },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException(
          'Director does not own the specified center',
        );
      }
      return bodyCenterId;
    }

    throw new ForbiddenException('Insufficient permissions to invite staff');
  }

  private async assertCanAccess(
    staffCenterId: string,
    staffId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) return;

    if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (director?.centerId !== staffCenterId) {
        throw new ForbiddenException(
          'Cannot access staff from other centers',
        );
      }
      return;
    }

    if (userRole === UserRole.STAFF) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { staffId: true },
      });
      if (user?.staffId !== staffId) {
        throw new ForbiddenException('Can only access your own profile');
      }
      return;
    }

    throw new ForbiddenException('Parents cannot access staff');
  }

  private toResponseDto(staff: StaffWithCenter): StaffResponseDto {
    return {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      // Sourced from linked User. The relation is optional in the type
      // (Staff can exist mid-invitation before User is created), so we
      // fall back to '' rather than crashing in the rare orphan case.
      email: staff.user?.email ?? '',
      role: staff.role,
      position: staff.position,
      status: staff.status,
      hireDate: staff.hireDate,
      dateOfBirth: staff.dateOfBirth,
      street: staff.street,
      city: staff.city,
      state: staff.state,
      zipCode: staff.zipCode,
      emergencyContactName: staff.emergencyContactName,
      emergencyContactPhone: staff.emergencyContactPhone,
      emergencyContactRelationship: staff.emergencyContactRelationship,
      emergencyContact2Name: staff.emergencyContact2Name,
      emergencyContact2Phone: staff.emergencyContact2Phone,
      emergencyContact2Relationship: staff.emergencyContact2Relationship,
      profileComplete: staff.profileComplete,
      hourlyRate: staff.hourlyRate ? Number(staff.hourlyRate) : null,
      employmentType: staff.employmentType,
      phone: staff.phone,
      notes: staff.notes,
      centerId: staff.centerId,
      centerName: staff.center?.name,
      backgroundCheckStatus: staff.backgroundCheckStatus,
      backgroundCheckApproved: staff.backgroundCheckApproved,
      cprStatus: staff.cprStatus,
      cprCertificationDate: staff.cprCertificationDate,
      cprExpiryDate: staff.cprExpiryDate,
      cprCertificationProvider: staff.cprCertificationProvider,
      cprVerifiedById: staff.cprVerifiedById,
      cprVerifiedByName: this.resolveVerifierName(staff.cprVerifiedBy),
      cprNotes: staff.cprNotes,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      activatedAt: staff.activatedAt,
    };
  }

  // PO QA #45: display name for the compliance Verifier shown read-only
  // on /staff/[id]/edit Compliance section. Same fallback strategy as
  // resolveDirectorName: prefer the linked Staff full name, fall back
  // to the User email when the verifier has no Staff record (admins).
  private resolveVerifierName(
    verifier: {
      email: string;
      staff: { firstName: string; lastName: string } | null;
    } | null,
  ): string | null {
    if (!verifier) return null;
    if (verifier.staff) {
      return `${verifier.staff.firstName} ${verifier.staff.lastName}`;
    }
    return verifier.email;
  }
}
