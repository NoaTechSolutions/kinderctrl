import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CenterStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { SetCenterHoursDto } from './dto/center-hours.dto';
import { FindAllCentersDto } from './dto/find-all-centers.dto';
import { buildSearchWhere } from '../../common/utils/search';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 15;

@Injectable()
export class CentersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /**
   * ARQUITECTURA DIRECTOR-CENTER (BUG-018, 2026-05-18):
   * - Center.ownerId: 1:N ownership — un DIRECTOR puede ser owner de
   *   varios centers (no constraint @@unique a nivel DB).
   * - User.centerId: "primary/active center" — usado por la UI para
   *   routing (dashboard greeting, deep-link STAFF/PARENT, etc.).
   * - Comportamiento actual: 1:1 — la UI asume 1 center por DIRECTOR.
   * - Preparado para multi-center futuro: centerId solo se asigna en
   *   first-time setup (si ya tiene uno, NO se sobrescribe). Así un 2do
   *   center creado en el futuro no le rompe el "primary" actual.
   */
  async create(createCenterDto: CreateCenterDto, ownerId: string) {
    const center = await this.prisma.center.create({
      data: {
        ...createCenterDto,
        ownerId,
        status: CenterStatus.SETUP_PENDING,
      },
      include: {
        owner: {
          select: { id: true, email: true },
        },
      },
    });

    // Only link as the user's "primary" center if they don't have one
    // yet — first-time setup. Avoids stomping over an existing centerId
    // when a DIRECTOR creates a second center down the road.
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { centerId: true },
    });

    if (!owner?.centerId) {
      await this.prisma.user.update({
        where: { id: ownerId },
        data: { centerId: center.id },
      });
    }

    return center;
  }

  async findAll(userId: string, userRole: string, query: FindAllCentersDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    // Role-scoped base where. SUPER_ADMIN sees everything; DIRECTOR only
    // centers they own; STAFF/PARENT only their assigned center.
    let where: Prisma.CenterWhereInput;
    if (userRole === 'SUPER_ADMIN') {
      where = {};
    } else if (userRole === 'DIRECTOR') {
      // isAdminCenter is hidden from everyone but SUPER_ADMIN (a director
      // "in transit" is parked there but must not see it as a center).
      where = { ownerId: userId, isAdminCenter: false };
    } else {
      where = { users: { some: { id: userId } }, isAdminCenter: false };
    }

    if (query.status) {
      where = { ...where, status: query.status };
    }

    // Free-text search across name / city / state, case-insensitive.
    const searchWhere = buildSearchWhere(['name', 'city', 'state'], query.search);
    if (searchWhere) {
      where = { ...where, ...searchWhere };
    }

    // Run page + count in parallel — they hit the same predicate, the DB
    // can plan them concurrently and we shave one round-trip of latency.
    const [data, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        include: { owner: { select: { id: true, email: true } } },
        // Admin center always pinned first for SUPER_ADMIN; for other roles
        // it's filtered out above so this is a no-op for them.
        orderBy: [{ isAdminCenter: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.center.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        // Always at least 1 page so the UI's "Page X of Y" never reads "of 0".
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        // firstName/lastName power the Director card + Change Director dialog.
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        centerHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    if (userRole !== 'SUPER_ADMIN' && center.ownerId !== userId) {
      const userInCenter = await this.prisma.user.findFirst({
        where: { id: userId, centerId: id },
      });

      if (!userInCenter) {
        throw new NotFoundException('Center not found');
      }
    }

    return center;
  }

  async update(id: string, updateCenterDto: UpdateCenterDto) {
    const existing = await this.prisma.center.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Center not found');
    }

    if (existing.isAdminCenter) {
      throw new ForbiddenException(
        'The KinderCtrl Admin center cannot be modified',
      );
    }

    if (updateCenterDto.status) {
      this.validateStatusTransition(existing.status, updateCenterDto.status);
    }

    return this.prisma.center.update({
      where: { id },
      data: updateCenterDto,
      include: {
        owner: { select: { id: true, email: true } },
      },
    });
  }

  // SUPER_ADMIN transfers Director access of a center to another system
  // user. Atomic: the old owner is demoted to STAFF, the new user is
  // promoted to DIRECTOR and linked to this center, and ownership is
  // reassigned — so the center is never left without a valid owner.
  async changeDirector(centerId: string, newDirectorUserId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!center) {
      throw new NotFoundException('Center not found');
    }
    if (center.isAdminCenter) {
      throw new ForbiddenException(
        'The KinderCtrl Admin center has no Director to change',
      );
    }

    const newDirector = await this.prisma.user.findUnique({
      where: { id: newDirectorUserId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!newDirector) {
      throw new NotFoundException('Selected user not found');
    }
    if (center.ownerId === newDirectorUserId) {
      throw new ConflictException(
        'That user is already the Director of this center',
      );
    }

    // CAMBIO 3: the outgoing director is parked in the KinderCtrl Admin
    // center "in transit" until a SUPER_ADMIN reassigns them.
    const adminCenter = await this.prisma.center.findFirst({
      where: { isAdminCenter: true },
      select: { id: true },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      // Demote the outgoing director → STAFF and move them to the Admin
      // center (in transit). If the Admin center isn't seeded yet, leave
      // their centerId untouched rather than fail the transfer. No Staff
      // record is created here — out of scope for this transfer.
      await tx.user.update({
        where: { id: center.ownerId },
        data: {
          role: UserRole.STAFF,
          ...(adminCenter ? { centerId: adminCenter.id } : {}),
        },
      });
      await tx.user.update({
        where: { id: newDirectorUserId },
        data: { role: UserRole.DIRECTOR, centerId },
      });
      return tx.center.update({
        where: { id: centerId },
        data: { ownerId: newDirectorUserId },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          centerHours: { orderBy: { dayOfWeek: 'asc' } },
        },
      });
    });

    // Courtesy notifications — sent AFTER the transaction commits so an
    // email outage can't roll back the transfer. EmailService logs failures.
    const nameOf = (u: {
      firstName: string | null;
      lastName: string | null;
    }) => [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || 'there';

    void this.email
      .send({
        to: center.owner.email,
        subject: 'Your Director access has been transferred',
        html: `<p>Hi ${nameOf(center.owner)},</p><p>Your Director access for <strong>${center.name}</strong> has been transferred to another user by an administrator. Your account remains a Staff member of this center.</p>`,
      })
      .catch(() => undefined);
    void this.email
      .send({
        to: newDirector.email,
        subject: `You have been assigned as Director of ${center.name}`,
        html: `<p>Hi ${nameOf(newDirector)},</p><p>You have been assigned as the Director of <strong>${center.name}</strong>. You now have full management access to this center.</p>`,
      })
      .catch(() => undefined);

    return updated;
  }

  async remove(id: string) {
    const target = await this.prisma.center.findUnique({
      where: { id },
      select: { isAdminCenter: true },
    });
    if (target?.isAdminCenter) {
      throw new ForbiddenException(
        'The KinderCtrl Admin center cannot be deleted',
      );
    }

    const childrenCount = await this.prisma.child.count({
      where: {
        centerId: id,
        status: 'ACTIVE',
      },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        `Cannot close center with ${childrenCount} active children. Withdraw or graduate them first.`,
      );
    }

    return this.prisma.center.update({
      where: { id },
      data: { status: CenterStatus.CLOSED },
    });
  }

  async setCenterHours(centerId: string, setCenterHoursDto: SetCenterHoursDto) {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    if (center.isAdminCenter) {
      throw new ForbiddenException(
        'The KinderCtrl Admin center cannot be modified',
      );
    }

    for (const hour of setCenterHoursDto.hours) {
      if (hour.openTime >= hour.closeTime) {
        throw new BadRequestException(
          `Invalid hours for dayOfWeek=${hour.dayOfWeek}: opening time must be before closing time`,
        );
      }
    }

    const days = setCenterHoursDto.hours.map((h) => h.dayOfWeek);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new BadRequestException('Duplicate dayOfWeek entries are not allowed');
    }

    await this.prisma.centerHours.deleteMany({ where: { centerId } });

    await this.prisma.centerHours.createMany({
      data: setCenterHoursDto.hours.map((hour) => ({
        centerId,
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
      })),
    });

    if (center.status === CenterStatus.SETUP_PENDING) {
      await this.prisma.center.update({
        where: { id: centerId },
        data: { status: CenterStatus.ACTIVE },
      });
    }

    return this.prisma.centerHours.findMany({
      where: { centerId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  private validateStatusTransition(current: CenterStatus, next: CenterStatus) {
    // CLOSED -> ACTIVE / SETUP_PENDING allows reactivating temporarily
    // closed centers (seasonal, renovation, ownership changes). Authority
    // is gated upstream by @Roles(DIRECTOR, SUPER_ADMIN) + ownership guard.
    const validTransitions: Record<CenterStatus, CenterStatus[]> = {
      SETUP_PENDING: [CenterStatus.ACTIVE, CenterStatus.CLOSED],
      ACTIVE: [CenterStatus.SUSPENDED, CenterStatus.CLOSED],
      SUSPENDED: [CenterStatus.ACTIVE, CenterStatus.CLOSED],
      CLOSED: [CenterStatus.ACTIVE, CenterStatus.SETUP_PENDING],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${next}`,
      );
    }
  }

  // Per-center stats for the detail page Overview tab. Authorization is
  // enforced at the controller (Director scoped via CenterOwnershipGuard,
  // SUPER_ADMIN passes through). Single round-trip with 7 parallel queries.
  async getCenterStats(centerId: string) {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      staffCount,
      childrenCount,
      schedulesCount,
      pendingCorrectionsCount,
      oldCorrectionsCount,
      overduePayrollsCount,
      staffWithoutClockInCount,
    ] = await Promise.all([
      this.prisma.staff.count({ where: { centerId, status: 'ACTIVE' } }),
      this.prisma.child.count({ where: { centerId, status: 'ACTIVE' } }),
      this.prisma.schedule.count({ where: { centerId } }),
      this.prisma.correctionRequest.count({
        where: { centerId, status: 'PENDING' },
      }),
      this.prisma.correctionRequest.count({
        where: { centerId, status: 'PENDING', createdAt: { lt: fortyEightHoursAgo } },
      }),
      this.prisma.payrollPeriod.count({
        where: { centerId, status: 'OPEN', endDate: { lt: sevenDaysAgo } },
      }),
      this.prisma.staff.count({
        where: {
          centerId,
          status: 'ACTIVE',
          timeEntries: {
            none: { type: 'CLOCK_IN', date: { gte: sevenDaysAgo } },
          },
        },
      }),
    ]);

    return {
      counts: {
        staff: staffCount,
        children: childrenCount,
        schedules: schedulesCount,
        corrections: pendingCorrectionsCount,
      },
      alerts: {
        oldCorrections: oldCorrectionsCount,
        overduePayrolls: overduePayrollsCount,
        staffWithoutClockIn: staffWithoutClockInCount,
      },
    };
  }

  // SUPER_ADMIN's global stats. Single round-trip aggregating top-level
  // counts, critical-attention alerts (only counts; detail lists live in
  // their module endpoints), and the list of centers with per-center
  // active staff/children counts and owner info as the "director".
  // Authorization is enforced at the controller via @Roles(SUPER_ADMIN).
  async getGlobalStats() {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      centersCount,
      staffActiveCount,
      childrenActiveCount,
      directorsCount,
      centers,
      staffByCenter,
      childrenByCenter,
      oldCorrectionsCount,
      overduePayrollsCount,
      staffWithoutClockInCount,
    ] = await Promise.all([
      this.prisma.center.count(),
      this.prisma.staff.count({ where: { status: 'ACTIVE' } }),
      this.prisma.child.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: 'DIRECTOR' } }),
      this.prisma.center.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          city: true,
          state: true,
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      // _count.where isn't supported on related counts → groupBy + merge.
      this.prisma.staff.groupBy({
        by: ['centerId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.child.groupBy({
        by: ['centerId'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.correctionRequest.count({
        where: { status: 'PENDING', createdAt: { lt: fortyEightHoursAgo } },
      }),
      // Overdue = OPEN with endDate >7d ago. Threshold could become config.
      this.prisma.payrollPeriod.count({
        where: { status: 'OPEN', endDate: { lt: sevenDaysAgo } },
      }),
      this.prisma.staff.count({
        where: {
          status: 'ACTIVE',
          timeEntries: {
            none: { type: 'CLOCK_IN', date: { gte: sevenDaysAgo } },
          },
        },
      }),
    ]);

    const staffMap = new Map(staffByCenter.map((s) => [s.centerId, s._count._all]));
    const childMap = new Map(childrenByCenter.map((c) => [c.centerId, c._count._all]));

    return {
      counts: {
        centers: centersCount,
        staff: staffActiveCount,
        children: childrenActiveCount,
        directors: directorsCount,
      },
      alerts: {
        oldCorrections: oldCorrectionsCount,
        overduePayrolls: overduePayrollsCount,
        staffWithoutClockIn: staffWithoutClockInCount,
      },
      centers: centers.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        city: c.city,
        state: c.state,
        director: c.owner
          ? {
              id: c.owner.id,
              name: `${c.owner.firstName} ${c.owner.lastName}`,
              email: c.owner.email,
            }
          : null,
        staffCount: staffMap.get(c.id) ?? 0,
        childrenCount: childMap.get(c.id) ?? 0,
      })),
    };
  }
}
