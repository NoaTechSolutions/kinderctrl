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
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationInfoDto } from './dto/invitation-info.dto';
import { UpdateBackgroundCheckDto } from './dto/update-background-check.dto';
import { UpdateCprDto } from './dto/update-cpr.dto';
import { ComplianceSummaryDto } from './dto/compliance-summary.dto';

// CPR alert window (PO Q3): certifications expiring within 60 days are
// flagged "expiring" in the summary. The cron alert was descoped in v2,
// but the window stays here so the dashboard widget paints the same warning.
const CPR_EXPIRING_WINDOW_DAYS = 60;

// 7 days. Long because invitations are explicit (someone is waiting on them)
// rather than security-driven like password reset (1h). PO-confirmed.
const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  hourlyRate: true,
  employmentType: true,
  phone: true,
  notes: true,
  centerId: true,
  backgroundCheckStatus: true,
  backgroundCheckDate: true,
  backgroundCheckExpiryDate: true,
  backgroundCheckVerifiedById: true,
  backgroundCheckNotes: true,
  cprCertified: true,
  cprCertificationDate: true,
  cprExpiryDate: true,
  cprCertificationProvider: true,
  cprVerifiedById: true,
  cprNotes: true,
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
  async create(
    createStaffDto: CreateStaffDto,
    creatorId: string,
    creatorRole: UserRole,
  ): Promise<StaffResponseDto> {
    // SUPER_ADMIN must pick a centerId in the body; DIRECTOR defaults to
    // their own (with ownership validation if they pass another). Same
    // helper used by /staff/invite — single source of truth for "which
    // center can this user act on".
    const centerId = await this.resolveCenterIdForUser(
      createStaffDto.centerId,
      creatorId,
      creatorRole,
    );

    // Email uniqueness lives on the User table (Staff.email column was
    // dropped in v2). Check upstream so we get a 409 instead of a Prisma
    // error after Staff is already created mid-transaction.
    const existing = await this.prisma.user.findUnique({
      where: { email: createStaffDto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Translate the form's compliance shortcuts into the schema's discrete
    // fields. When the Director ticks "background check completed" on the
    // create form, they're attesting they verified it — so we stamp the
    // date + verifier alongside the APPROVED status. The dedicated PATCH
    // endpoints are the right path for everything richer (expiry, notes).
    const now = new Date();
    const bgApplied = createStaffDto.backgroundCheckCompleted === true;
    const cprApplied = createStaffDto.cprCertified === true;

    const staffId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          centerId,
          firstName: createStaffDto.firstName,
          lastName: createStaffDto.lastName,
          // email goes only to the linked User (single source of truth).
          role: createStaffDto.role,
          position: createStaffDto.position ?? null,
          hireDate: new Date(createStaffDto.hireDate),
          dateOfBirth: createStaffDto.dateOfBirth
            ? new Date(createStaffDto.dateOfBirth)
            : null,
          employmentType: createStaffDto.employmentType,
          hourlyRate: createStaffDto.hourlyRate ?? null,
          phone: createStaffDto.phone ?? null,
          notes: createStaffDto.notes ?? null,
          // status defaults to INVITED per schema
          ...(bgApplied
            ? {
                backgroundCheckStatus: BackgroundCheckStatus.APPROVED,
                backgroundCheckDate: now,
                backgroundCheckVerifiedById: creatorId,
              }
            : {}),
          ...(cprApplied
            ? {
                cprCertified: true,
                cprCertificationDate: now,
                cprVerifiedById: creatorId,
              }
            : {}),
        },
        select: { id: true },
      });

      await tx.user.create({
        data: {
          email: createStaffDto.email,
          password: hashedPassword,
          role: UserRole.STAFF,
          status: UserStatus.PENDING_ACTIVATION,
          centerId,
          staffId: created.id, // ← the @unique 1:1 link
        },
      });

      return created.id;
    });

    // Re-fetch AFTER the transaction commits so the User-side fields
    // (notably user.email used by toResponseDto) are populated. Inside the
    // tx, Staff is created before User, so a STAFF_SELECT inside would
    // return user=null and the response would surface email=''.
    const staff = await this.prisma.staff.findUniqueOrThrow({
      where: { id: staffId },
      select: STAFF_SELECT,
    });

    // TODO: deprecated path — use POST /staff/invite for the invitation flow.
    // This console log lets manual testing recover the temp password until
    // the UI is migrated to the invitation flow. createStaffDto.email is the
    // source (staff.user would be null inside the just-finished transaction).
    // eslint-disable-next-line no-console
    console.log(`[staff] created ${createStaffDto.email} — temp password: ${tempPassword}`);

    return this.toResponseDto(staff);
  }

  async findAll(
    userId: string,
    userRole: UserRole,
  ): Promise<StaffResponseDto[]> {
    let where: Prisma.StaffWhereInput;

    if (userRole === UserRole.SUPER_ADMIN) {
      where = {};
    } else if (userRole === UserRole.DIRECTOR) {
      const director = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { centerId: true },
      });
      if (!director?.centerId) return [];
      where = { centerId: director.centerId };
    } else if (userRole === UserRole.STAFF) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { staffId: true },
      });
      if (!user?.staffId) return [];
      where = { id: user.staffId };
    } else {
      throw new ForbiddenException('Parents cannot access staff list');
    }

    const list = await this.prisma.staff.findMany({
      where: {
        ...where,
        // TERMINATED is the soft-delete tombstone — hidden from all reads.
        status: { not: StaffStatus.TERMINATED },
      },
      select: STAFF_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return list.map((s) => this.toResponseDto(s));
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
  ): Promise<StaffResponseDto> {
    const existing = await this.prisma.staff.findUnique({
      where: { id },
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

    // `email` is intentionally omitted — the Staff.email column was
    // dropped in v2, and rotating User.email requires its own dedicated
    // endpoint (uniqueness check, audit, etc.). Email edits silently no-op.
    // Compliance fields (background check, CPR) have their own dedicated
    // PATCH endpoints; they are NOT writable through this generic update.
    const updated = await this.prisma.staff.update({
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
      },
      select: STAFF_SELECT,
    });

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
    // tokens at a time given this check runs on every invite.
    await this.prisma.staffInvitationToken.updateMany({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TOKEN_TTL_MS);

    await this.prisma.staffInvitationToken.create({
      data: {
        token,
        email,
        centerId,
        // PO Q2: role defaults to TEACHER, Director adjusts later if needed.
        role: StaffRole.TEACHER,
        invitedById: inviterId,
        expiresAt,
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
   * Status of new Staff: INVITED (NOT ACTIVE). PO decision Q1 — activation
   * is decoupled from compliance; the Director flips it to ACTIVE later via
   * PATCH /staff/:id once they've done the background check.
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
      },
    });
    if (
      !invitation ||
      invitation.usedAt ||
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

    let createdUserId: string;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const staff = await tx.staff.create({
          data: {
            centerId: invitation.centerId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: invitation.role,
            position: dto.position ?? null,
            // PO Q1 defaults: invitee fills only personal info; Director
            // edits hireDate / employmentType later via PATCH /staff/:id.
            hireDate: new Date(),
            employmentType: 'full_time',
            phone: dto.phone,
            status: StaffStatus.INVITED,
            // backgroundCheckStatus defaults to NOT_STARTED per schema.
            // cprCertified defaults to false per schema.
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
   * Soft-track per PO Q1 — does NOT block staff activation when status is
   * non-APPROVED. The activation rule we discussed in the spec was rejected
   * by PO; this endpoint is purely audit + UI badge wiring.
   *
   * Sets backgroundCheckVerifiedById = current user on every call (any
   * Director touching the record is recorded as the most recent verifier;
   * full audit history is out of scope).
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

    // Conditional validation lives here (not in DTO) so the message ties
    // to the *business* rule rather than a class-validator side effect.
    if (
      dto.status === BackgroundCheckStatus.APPROVED &&
      !dto.date
    ) {
      throw new BadRequestException(
        'date is required when status is APPROVED',
      );
    }

    // Prisma treats `undefined` as "leave column alone"; we exploit that so
    // PATCH semantics work (omitted fields stay put). To clear a date, a
    // future endpoint can accept explicit null — out of scope for v1.
    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        backgroundCheckStatus: dto.status,
        backgroundCheckDate: dto.date ? new Date(dto.date) : undefined,
        backgroundCheckExpiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : undefined,
        backgroundCheckNotes: dto.notes,
        backgroundCheckVerifiedById: userId,
      },
      select: STAFF_SELECT,
    });

    return this.toResponseDto(updated);
  }

  /**
   * PATCH /staff/:id/cpr. Same soft-track posture as updateBackgroundCheck.
   * Sets cprVerifiedById = current user. Setting `certified=false` keeps
   * historical date/provider fields intact (they're stored history, not
   * current state) — the Director can update them in the same call if they
   * want to wipe.
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

    if (dto.certified && !dto.certificationDate) {
      throw new BadRequestException(
        'certificationDate is required when certified=true',
      );
    }

    const updated = await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        cprCertified: dto.certified,
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
        cprCertified: true,
        cprExpiryDate: true,
      },
    });

    const now = new Date();
    const expiringCutoff = new Date(
      Date.now() + CPR_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const summary: ComplianceSummaryDto = {
      total: rows.length,
      backgroundCheck: {
        approved: 0,
        pending: 0,
        notStarted: 0,
        rejected: 0,
        expired: 0,
      },
      cpr: { valid: 0, expiring: 0, expired: 0, missing: 0 },
    };

    for (const r of rows) {
      switch (r.backgroundCheckStatus) {
        case BackgroundCheckStatus.APPROVED:
          summary.backgroundCheck.approved++;
          break;
        case BackgroundCheckStatus.PENDING:
          summary.backgroundCheck.pending++;
          break;
        case BackgroundCheckStatus.NOT_STARTED:
          summary.backgroundCheck.notStarted++;
          break;
        case BackgroundCheckStatus.REJECTED:
          summary.backgroundCheck.rejected++;
          break;
        case BackgroundCheckStatus.EXPIRED:
          summary.backgroundCheck.expired++;
          break;
      }

      if (!r.cprCertified) {
        summary.cpr.missing++;
      } else if (r.cprExpiryDate && r.cprExpiryDate <= now) {
        summary.cpr.expired++;
      } else if (r.cprExpiryDate && r.cprExpiryDate <= expiringCutoff) {
        summary.cpr.expiring++;
      } else {
        // certified && (no expiry OR expiry > 60d out)
        summary.cpr.valid++;
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
    const invitationUrl = `${baseUrl}/staff/accept-invitation?token=${token}`;

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

  /**
   * Generates a 12-character password that satisfies the auth registration
   * rule (uppercase + lowercase + digit/special). Built by always picking
   * one character from each required category, then shuffling.
   */
  private generateTempPassword(): string {
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // skip I, L, O (ambiguous)
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789'; // skip 0, 1
    const specials = '!@#$%';
    const all = upper + lower + digits + specials;

    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    const seed =
      pick(upper) + pick(lower) + pick(digits) + pick(specials);
    let rest = '';
    for (let i = 0; i < 8; i++) rest += pick(all);
    return (seed + rest)
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
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
      hourlyRate: staff.hourlyRate ? Number(staff.hourlyRate) : null,
      employmentType: staff.employmentType,
      phone: staff.phone,
      notes: staff.notes,
      centerId: staff.centerId,
      centerName: staff.center?.name,
      backgroundCheckStatus: staff.backgroundCheckStatus,
      backgroundCheckDate: staff.backgroundCheckDate,
      backgroundCheckExpiryDate: staff.backgroundCheckExpiryDate,
      backgroundCheckVerifiedById: staff.backgroundCheckVerifiedById,
      backgroundCheckNotes: staff.backgroundCheckNotes,
      cprCertified: staff.cprCertified,
      cprCertificationDate: staff.cprCertificationDate,
      cprExpiryDate: staff.cprExpiryDate,
      cprCertificationProvider: staff.cprCertificationProvider,
      cprVerifiedById: staff.cprVerifiedById,
      cprNotes: staff.cprNotes,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      activatedAt: staff.activatedAt,
    };
  }
}
