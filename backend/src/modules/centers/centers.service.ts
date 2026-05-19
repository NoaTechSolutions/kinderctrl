import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CenterStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { SetCenterHoursDto } from './dto/center-hours.dto';
import { FindAllCentersDto } from './dto/find-all-centers.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 15;

@Injectable()
export class CentersService {
  constructor(private prisma: PrismaService) {}

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
      where = { ownerId: userId };
    } else {
      where = { users: { some: { id: userId } } };
    }

    if (query.status) {
      where = { ...where, status: query.status };
    }

    // Run page + count in parallel — they hit the same predicate, the DB
    // can plan them concurrently and we shave one round-trip of latency.
    const [data, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        include: { owner: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
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
        owner: { select: { id: true, email: true } },
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

  async remove(id: string) {
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
}
