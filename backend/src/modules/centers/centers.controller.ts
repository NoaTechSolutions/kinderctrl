import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { SetCenterHoursDto } from './dto/center-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CenterOwnershipGuard } from './guards/center-ownership.guard';
import { SkipSetupCheck } from './decorators/skip-setup-check.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  centerId: string | null;
  sessionId: string;
}

@Controller('centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Post()
  @SkipSetupCheck()
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async create(
    @Body() createCenterDto: CreateCenterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.centersService.create(createCenterDto, user.id);
  }

  @Get()
  @SkipSetupCheck()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.centersService.findAll(user.id, user.role);
  }

  @Get(':id')
  @SkipSetupCheck()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.centersService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @SkipSetupCheck()
  @UseGuards(CenterOwnershipGuard)
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCenterDto: UpdateCenterDto,
  ) {
    return this.centersService.update(id, updateCenterDto);
  }

  @Delete(':id')
  @SkipSetupCheck()
  @UseGuards(CenterOwnershipGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.centersService.remove(id);
  }

  @Post(':id/hours')
  @SkipSetupCheck()
  @UseGuards(CenterOwnershipGuard)
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async setCenterHours(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() setCenterHoursDto: SetCenterHoursDto,
  ) {
    return this.centersService.setCenterHours(id, setCenterHoursDto);
  }
}
