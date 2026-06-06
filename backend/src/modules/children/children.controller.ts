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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChildrenService } from './children.service';
import { ChildrenSeedService } from './children-seed.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateMedicalInfoDto } from './dto/update-medical-info.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { ChildParentInputDto } from './dto/child-parent-input.dto';
import { UpdateChildParentDto } from './dto/update-child-parent.dto';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// Coarse role gating lives on the decorators (RolesGuard); the fine-grained
// tenant isolation + PARENT-owns-child checks live in ChildrenService
// (assertCanManageCenter / assertCanViewChild / assertCanManageChild).
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildrenController {
  constructor(
    private readonly childrenService: ChildrenService,
    private readonly childrenSeedService: ChildrenSeedService,
    private readonly config: ConfigService,
  ) {}

  // ── DEV seed (SUPER_ADMIN + NODE_ENV guard) ─────────────────────────────
  // Seeds a few children with linked parents into Sunshine for testing. The
  // 3-segment `children/dev/*` paths don't collide with `children/:id`.

  @Post('children/dev/seed')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  devSeedChildren() {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.childrenSeedService.seedChildren();
  }

  @Delete('children/dev/reset')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  devResetChildren() {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.childrenSeedService.resetChildren();
  }

  // ── Center-scoped (DIRECTOR own / SUPER_ADMIN any) ──────────────────────

  @Post('centers/:centerId/children')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  create(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() dto: CreateChildDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.create(centerId, dto, user.id, user.role);
  }

  @Get('centers/:centerId/children')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  findAll(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Query() query: QueryChildrenDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.findAll(centerId, query, user.id, user.role);
  }

  // ── Parent self-service. Declared BEFORE `children/:id` so the literal
  //    `mine` path wins routing over the :id param. ───────────────────────
  @Get('children/mine')
  @Roles(UserRole.PARENT)
  findMine(@CurrentUser() user: AuthUser) {
    return this.childrenService.findMine(user.id);
  }

  // ── Single child (DIRECTOR own / SA / PARENT own-child) ─────────────────

  @Get('children/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN, UserRole.PARENT)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.findOne(id, user.id, user.role);
  }

  @Patch('children/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChildDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.update(id, dto, user.id, user.role);
  }

  @Delete('children/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.childrenService.remove(id, user.id, user.role);
  }

  @Put('children/:id/medical-info')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  updateMedicalInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalInfoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.updateMedicalInfo(id, dto, user.id, user.role);
  }

  // ── Parent links (DIRECTOR own / SA) ────────────────────────────────────

  @Post('children/:id/parents')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  addParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChildParentInputDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.addParent(id, dto, user.id, user.role);
  }

  @Patch('children/:id/parents/:parentId')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  updateParentLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Body() dto: UpdateChildParentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.updateParentLink(
      id,
      parentId,
      dto,
      user.id,
      user.role,
    );
  }

  @Delete('children/:id/parents/:parentId')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.childrenService.removeParent(id, parentId, user.id, user.role);
  }
}
