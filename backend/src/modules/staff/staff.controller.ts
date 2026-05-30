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
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateBackgroundCheckDto } from './dto/update-background-check.dto';
import { UpdateCprDto } from './dto/update-cpr.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FindAllStaffQueryDto } from './dto/find-all-staff-query.dto';
import { FindAllInvitationsQueryDto } from './dto/find-all-invitations-query.dto';
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

  // PO QA #30 Opción E + #55 (FEATURE 3): manual create with setup
  // email. Creates Staff (status=ACTIVE) + User (password=null) +
  // sends welcome email with tokenized setup link. DIRECTOR is now
  // also allowed (was SUPER_ADMIN-only) — the service uses the
  // caller's role to resolve centerId (Director defaults to their
  // own; SUPER_ADMIN must supply it explicitly).
  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  create(
    @Body() createStaffDto: CreateStaffDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.staffService.createWithSetupEmail(
      createStaffDto,
      user.id,
      user.role,
      req.ip,
    );
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

  // Invitations management with optional lifecycle-status filter +
  // pagination (PO QA #13 + #22). Declared BEFORE `:id` routes for
  // routing precedence. Returns `{data, pagination}` matching the
  // /centers + /staff list shape.
  @Get('invitations')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getInvitations(
    @CurrentUser() user: AuthUser,
    @Query() query: FindAllInvitationsQueryDto,
  ) {
    return this.staffService.getInvitations(user.id, user.role, query);
  }

  // PO QA #17 AJUSTE 2: dropped the IP-level @Throttle. The per-invitation
  // DB cap in the service is the primary defense and is already strict
  // (3/hour per row for Director); the IP backstop was conservative noise
  // and would have caught a SUPER_ADMIN doing legitimate batch work.
  @Post('invitations/:id/resend')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.resendInvitation(id, user.id, user.role);
  }

  @Delete('invitations/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.staffService.revokeInvitation(id, user.id, user.role);
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

  // Staff self-service endpoints (PO QA #8 Opción C). Declared BEFORE
  // `@Get(':id')` so "me" wins routing. STAFF-only — DIRECTOR/SUPER_ADMIN
  // don't have their own Staff record in the common case and have no
  // /profile UI; restricting here keeps the surface clean.
  @Get('me/profile')
  @Roles(UserRole.STAFF)
  getMyProfile(@CurrentUser() user: AuthUser) {
    return this.staffService.getMyProfile(user.id);
  }

  @Patch('me/profile')
  @Roles(UserRole.STAFF)
  updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.staffService.updateMyProfile(user.id, dto);
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
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: FindAllStaffQueryDto,
  ) {
    return this.staffService.findAll(user.id, user.role, query);
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
    @Req() req: Request,
  ) {
    // PO QA #45: pass req.ip so an email-change rotation can audit the
    // setup-token issuance with the actor's source IP (same audit hook
    // SUPER_ADMIN create uses for the initial welcome email).
    return this.staffService.update(
      id,
      updateStaffDto,
      user.id,
      user.role,
      req.ip,
    );
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

  // PO QA #28 Opción F: admin-triggered password reset. Director / SUPER_ADMIN
  // clicks "Send Password Reset" on a staff detail page → backend issues a
  // PasswordResetToken (1h expiry) + sends the standard reset email to the
  // staff member + records the action in password_admin_actions. The actor
  // never sees the resulting password.
  @Post(':id/send-password-reset')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  sendPasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.staffService.sendPasswordReset(
      id,
      user.id,
      user.role,
      req.ip,
    );
  }
}
