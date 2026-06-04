import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { ChangeDirectorDto } from './dto/change-director.dto';
import { SetCenterHoursDto } from './dto/center-hours.dto';
import { FindAllCentersDto } from './dto/find-all-centers.dto';
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
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: FindAllCentersDto,
  ) {
    return this.centersService.findAll(user.id, user.role, query);
  }

  // Global stats for SUPER_ADMIN's dashboard view: top-level counts, critical
  // alerts (corrections >48h, payroll overdue, staff with no clock-in 7d), and
  // the centers list with director + per-center counts. Single round-trip.
  // Must be declared before @Get(':id') — Nest matches in declaration order
  // and 'global-stats' would otherwise be captured as an :id param.
  @Get('global-stats')
  @SkipSetupCheck()
  @Roles(UserRole.SUPER_ADMIN)
  getGlobalStats() {
    return this.centersService.getGlobalStats();
  }

  @Get(':id')
  @SkipSetupCheck()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.centersService.findOne(id, user.id, user.role);
  }

  // Per-center stats for the SUPER_ADMIN detail page Overview tab. Returns
  // counts (active staff/children, schedules, pending corrections) plus the
  // critical-alerts subset scoped to this center. Ownership check protects
  // Director access; SUPER_ADMIN passes through.
  @Get(':id/stats')
  @SkipSetupCheck()
  @UseGuards(CenterOwnershipGuard)
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getCenterStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.centersService.getCenterStats(id);
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

  // Transfer Director access to another system user. SUPER_ADMIN only —
  // NO CenterOwnershipGuard here (the SA is not the owner; that's the point).
  @Patch(':id/director')
  @SkipSetupCheck()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async changeDirector(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeDirectorDto,
  ) {
    return this.centersService.changeDirector(id, dto.newDirectorUserId);
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
