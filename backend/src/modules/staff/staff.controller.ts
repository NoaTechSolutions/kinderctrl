import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateBackgroundCheckDto } from './dto/update-background-check.dto';
import { UpdateCprDto } from './dto/update-cpr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  create(
    @Body() createStaffDto: CreateStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.create(createStaffDto, user.id, user.role);
  }

  // 3 invites per hour, keyed by EmailAwareThrottlerGuard as (IP, invited-
  // email). A Director batch-onboarding 8 staff hits 8 different keys — no
  // collision. Only spamming the SAME email gets throttled.
  @Post('invite')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  invite(
    @Body() dto: InviteStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.invite(dto, user.id, user.role);
  }

  // Public preflight for the invitation accept page. Declared BEFORE
  // `@Get(':id')` so the more-specific 2-segment path wins routing.
  @Public()
  @Get('invitation/:token')
  getInvitationInfo(@Param('token') token: string) {
    return this.staffService.getInvitationInfo(token);
  }

  // Aggregated compliance counts for the dashboard widget. Declared BEFORE
  // `@Get(':id')` for the same path-specificity reason. SUPER_ADMIN must
  // pass ?centerId; DIRECTOR defaults to their primary (or owns-validated).
  @Get('compliance-summary')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getComplianceSummary(
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    return this.staffService.getComplianceSummary(
      centerId,
      user.id,
      user.role,
    );
  }

  // 5 attempts per 15 min per IP (body has no email so the throttler falls
  // back to IP-only via EmailAwareThrottlerGuard). Caps brute-force on the
  // token form while leaving fat-finger password retries plenty of room.
  @Public()
  @Post('accept-invitation')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.staffService.acceptInvitation(dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.staffService.findAll(user.id, user.role);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.update(id, updateStaffDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.staffService.remove(id, user.id, user.role);
  }

  // Compliance writers. @Roles caps non-DIRECTOR/SUPER_ADMIN at the gate;
  // service additionally scopes DIRECTORs to their own center via
  // assertCanAccess. STAFF cannot self-verify (PO decision).
  @Patch(':id/background-check')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  updateBackgroundCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBackgroundCheckDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.updateBackgroundCheck(
      id,
      dto,
      user.id,
      user.role,
    );
  }

  @Patch(':id/cpr')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  updateCpr(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCprDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.updateCpr(id, dto, user.id, user.role);
  }
}
