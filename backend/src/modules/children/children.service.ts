import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChildStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateMedicalInfoDto } from './dto/update-medical-info.dto';
import { QueryChildrenDto } from './dto/query-children.dto';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async create(centerId: string, dto: CreateChildDto, userId: string) {
    await this.assertCenterOwnership(centerId, userId);

    this.validateDateOfBirth(dto.dateOfBirth);

    return this.prisma.child.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        enrollmentDate: dto.enrollmentDate ?? new Date(),
        centerId,
        status: ChildStatus.ACTIVE,
      },
      include: {
        center: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(centerId: string, query: QueryChildrenDto, userId: string) {
    await this.assertCenterOwnership(centerId, userId);

    const where: Prisma.ChildWhereInput = { centerId };

    if (query.status && query.status.length > 0) {
      where.status = { in: query.status };
    } else {
      where.status = ChildStatus.ACTIVE;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.classroomId) {
      where.classroomChildren = {
        some: { classroomId: query.classroomId },
      };
    }

    return this.prisma.child.findMany({
      where,
      include: {
        center: { select: { id: true, name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true } },
        medicalInfo: true,
        childParents: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return child;
  }

  async update(id: string, dto: UpdateChildDto) {
    if (dto.dateOfBirth) {
      this.validateDateOfBirth(dto.dateOfBirth);
    }

    return this.prisma.child.update({
      where: { id },
      data: dto,
      include: {
        center: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.child.update({
      where: { id },
      data: { status: ChildStatus.WITHDRAWN },
    });
  }

  async updateMedicalInfo(childId: string, dto: UpdateMedicalInfoDto) {
    const data = {
      allergies: (dto.allergies ?? []) as Prisma.InputJsonValue,
      medications: (dto.medications ?? []) as Prisma.InputJsonValue,
      medicalConditions: (dto.medicalConditions ?? []) as Prisma.InputJsonValue,
      doctorName: dto.doctorName ?? null,
      doctorPhone: dto.doctorPhone ?? null,
      insuranceProvider: dto.insuranceProvider ?? null,
      insurancePolicy: dto.insurancePolicy ?? null,
    };

    return this.prisma.childMedicalInfo.upsert({
      where: { childId },
      create: { childId, ...data },
      update: data,
    });
  }

  private async assertCenterOwnership(centerId: string, userId: string) {
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { ownerId: true },
    });

    if (!center || center.ownerId !== userId) {
      throw new NotFoundException('Center not found');
    }
  }

  private validateDateOfBirth(dateOfBirth: Date) {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const now = new Date();

    if (dateOfBirth > now) {
      throw new BadRequestException(
        'Date of birth cannot be in the future',
      );
    }

    if (dateOfBirth < tenYearsAgo) {
      throw new BadRequestException(
        'Child must be born within the last 10 years',
      );
    }
  }
}
