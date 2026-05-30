import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class KioskGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-kiosk-token'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing kiosk session token');
    }

    const kiosk = await this.prisma.kioskSettings.findFirst({
      where: { kioskSessionToken: token, isEnabled: true },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            timezone: true,
            latitude: true,
            longitude: true,
            geoFenceRadiusMeters: true,
          },
        },
      },
    });

    if (!kiosk) {
      throw new UnauthorizedException('Invalid or expired kiosk session');
    }

    request.kioskCenter = kiosk.center;
    return true;
  }
}
