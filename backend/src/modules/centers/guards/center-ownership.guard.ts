import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CenterOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const centerId = request.params.id || request.params.centerId;

    if (!centerId) {
      throw new ForbiddenException('Center ID is required');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { ownerId: true },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    if (center.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this center');
    }

    return true;
  }
}
