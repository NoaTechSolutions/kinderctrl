import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { KioskService } from './kiosk.service';
import { SetupKioskDto } from './dto/setup-kiosk.dto';
import { KioskPunchDto } from './dto/kiosk-punch.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { ResetPinConfirmDto } from './dto/reset-pin-confirm.dto';
import { KioskGuard } from './guards/kiosk.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('attendance/kiosk')
export class KioskController {
  constructor(
    private readonly service: KioskService,
    private readonly config: ConfigService,
  ) {}

  // ─── Director endpoints (require JWT auth) ────────────────────────

  @Post('setup')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  setup(@Body() dto: SetupKioskDto, @CurrentUser() user: any) {
    return this.service.setup(dto, user.id);
  }

  @Post('activate')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  activate(@CurrentUser() user: any) {
    return this.service.activate(user.id);
  }

  @Post('deactivate')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  deactivate(@CurrentUser() user: any) {
    return this.service.deactivate(user.id);
  }

  @Post('reset-pin')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  resetPin(@CurrentUser() user: any) {
    return this.service.resetPin(user.id);
  }

  @Get('settings')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  getSettings(@CurrentUser() user: any) {
    return this.service.getSettings(user.id);
  }

  @Get('activity')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  getActivity(@CurrentUser() user: any) {
    return this.service.getActivity(user.id);
  }

  // ─── Kiosk endpoints (require kiosk session token) ────────────────

  @Public()
  @UseGuards(KioskGuard)
  @Get('staff')
  getStaffList(@Req() req: any) {
    return this.service.getStaffList(req.kioskCenter);
  }

  @Public()
  @UseGuards(KioskGuard)
  @Post('punch')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  punch(@Body() dto: KioskPunchDto, @Req() req: any) {
    return this.service.punch(dto, req.kioskCenter);
  }

  @Public()
  @UseGuards(KioskGuard)
  @Post('verify-pin')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  verifyPin(@Body() dto: VerifyPinDto, @Req() req: any) {
    return this.service.verifyPin(dto.pin, req.kioskCenter.id);
  }

  // Exit-screen "Forgot PIN" — disables the kiosk + emails a reset link.
  @Public()
  @UseGuards(KioskGuard)
  @Post('request-reset')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  requestReset(@Req() req: any) {
    return this.service.requestReset(req.kioskCenter.id);
  }

  // ─── Public PIN-reset (no auth — token-gated) ─────────────────────

  @Public()
  @Get('reset-pin/info')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  getResetInfo(@Query('token') token: string) {
    return this.service.getResetInfo(token);
  }

  @Public()
  @Post('reset-pin/confirm')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  confirmResetPin(@Body() dto: ResetPinConfirmDto) {
    return this.service.confirmResetPin(dto.token, dto.newPin);
  }

  // ─── DEV-ONLY: reset kiosk seed data ──────────────────────────────

  @Delete('dev/reset-kiosk-data')
  @UseGuards(RolesGuard)
  @Roles('DIRECTOR' as any, 'SUPER_ADMIN' as any)
  @HttpCode(HttpStatus.OK)
  async devResetKioskData(@CurrentUser() user: any) {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.service.devResetKioskData(user.id);
  }
}
