import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CenterStatus } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { SKIP_SETUP_CHECK } from '../decorators/skip-setup-check.decorator';

@Injectable()
export class SetupCompleteGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SETUP_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (skipCheck) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role !== 'DIRECTOR') return true;

    const completeCenters = await this.prisma.center.count({
      where: {
        ownerId: user.id,
        status: {
          in: [
            CenterStatus.ACTIVE,
            CenterStatus.SUSPENDED,
            CenterStatus.CLOSED,
          ],
        },
      },
    });

    if (completeCenters > 0) return true;

    const pendingCenter = await this.prisma.center.findFirst({
      where: {
        ownerId: user.id,
        status: CenterStatus.SETUP_PENDING,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    throw new ForbiddenException({
      statusCode: 403,
      message: 'Complete at least one center setup first',
      error: 'Setup Required',
      redirectTo: pendingCenter
        ? `/centers/${pendingCenter.id}`
        : '/centers/new',
    });
  }
}
