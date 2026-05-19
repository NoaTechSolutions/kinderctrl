import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';

// What every endpoint loads when returning a Staff. Keeps the API payload
// consistent and avoids leaking unrelated columns.
const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  hireDate: true,
  hourlyRate: true,
  employmentType: true,
  phone: true,
  notes: true,
  centerId: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  center: { select: { id: true, name: true } },
} satisfies Prisma.StaffSelect;

type StaffWithCenter = Prisma.StaffGetPayload<{ select: typeof STAFF_SELECT }>;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

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
    directorId: string,
  ): Promise<StaffResponseDto> {
    const director = await this.prisma.user.findUnique({
      where: { id: directorId },
      select: { centerId: true },
    });
    if (!director?.centerId) {
      throw new ForbiddenException(
        'Director must have a center assigned before creating staff',
      );
    }

    // Email uniqueness lives on the User table (Staff.email is not unique
    // in schema). Check upstream so we get a 409 instead of a Prisma error.
    const existing = await this.prisma.user.findUnique({
      where: { email: createStaffDto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const staff = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          centerId: director.centerId!,
          firstName: createStaffDto.firstName,
          lastName: createStaffDto.lastName,
          email: createStaffDto.email,
          role: createStaffDto.role,
          hireDate: new Date(createStaffDto.hireDate),
          employmentType: createStaffDto.employmentType,
          hourlyRate: createStaffDto.hourlyRate ?? null,
          phone: createStaffDto.phone ?? null,
          notes: createStaffDto.notes ?? null,
          // status defaults to INVITED per schema
        },
        select: STAFF_SELECT,
      });

      await tx.user.create({
        data: {
          email: createStaffDto.email,
          password: hashedPassword,
          role: UserRole.STAFF,
          status: UserStatus.PENDING_ACTIVATION,
          centerId: director.centerId,
          staffId: created.id, // ← the @unique 1:1 link
        },
      });

      return created;
    });

    // TODO: email tempPassword + activation link to the new staff member.
    // Logged for now so manual testing can recover it from server output.
    // eslint-disable-next-line no-console
    console.log(`[staff] created ${staff.email} — temp password: ${tempPassword}`);

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

    // `email` is intentionally omitted from this map — changing the Staff
    // email without also rotating the linked User.email (which is @unique)
    // would desynchronize the two records. Email rotation should land as
    // its own endpoint when the requirement appears.
    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: dto.status,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
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
      email: staff.email,
      role: staff.role,
      status: staff.status,
      hireDate: staff.hireDate,
      hourlyRate: staff.hourlyRate ? Number(staff.hourlyRate) : null,
      employmentType: staff.employmentType,
      phone: staff.phone,
      notes: staff.notes,
      centerId: staff.centerId,
      centerName: staff.center?.name,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      activatedAt: staff.activatedAt,
    };
  }
}
