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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
    return this.staffService.create(createStaffDto, user.id);
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
}
