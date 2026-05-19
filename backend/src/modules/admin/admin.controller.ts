import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// All admin endpoints sit under /admin and require SUPER_ADMIN. Routes are
// scoped narrowly (no broad /admin/users — that would invite scope creep).
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/locked')
  listLocked(@CurrentUser() user: AuthUser) {
    return this.adminService.listLockedUsers(user.role);
  }

  @Post('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.unlockUser(id, user.id, user.role);
  }
}
