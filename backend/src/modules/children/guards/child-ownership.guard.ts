import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChildOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const childId = request.params.id;

    if (!childId) {
      return true;
    }

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        center: { select: { ownerId: true } },
      },
    });

    if (!child || child.center.ownerId !== user.id) {
      throw new NotFoundException('Child not found');
    }

    return true;
  }
}
