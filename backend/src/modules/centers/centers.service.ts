import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CenterStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { SetCenterHoursDto } from './dto/center-hours.dto';

@Injectable()
export class CentersService {
  constructor(private prisma: PrismaService) {}

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

    await this.prisma.user.update({
      where: { id: ownerId },
      data: { centerId: center.id },
    });

    return center;
  }

  async findAll(userId: string, userRole: string) {
    if (userRole === 'SUPER_ADMIN') {
      return this.prisma.center.findMany({
        include: { owner: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (userRole === 'DIRECTOR') {
      return this.prisma.center.findMany({
        where: { ownerId: userId },
        include: { owner: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.center.findMany({
      where: { users: { some: { id: userId } } },
      include: { owner: { select: { id: true, email: true } } },
    });
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
    const validTransitions: Record<CenterStatus, CenterStatus[]> = {
      SETUP_PENDING: [CenterStatus.ACTIVE, CenterStatus.CLOSED],
      ACTIVE: [CenterStatus.SUSPENDED, CenterStatus.CLOSED],
      SUSPENDED: [CenterStatus.ACTIVE, CenterStatus.CLOSED],
      CLOSED: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${next}`,
      );
    }
  }
}
