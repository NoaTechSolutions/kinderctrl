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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateMedicalInfoDto } from './dto/update-medical-info.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { ChildOwnershipGuard } from './guards/child-ownership.guard';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  centerId: string | null;
  sessionId: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post('centers/:centerId/children')
  async create(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() createChildDto: CreateChildDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.create(centerId, createChildDto, user.id);
  }

  @Get('centers/:centerId/children')
  async findAll(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Query() query: QueryChildrenDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.childrenService.findAll(centerId, query, user.id);
  }

  @Get('children/:id')
  @UseGuards(ChildOwnershipGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.childrenService.findOne(id);
  }

  @Patch('children/:id')
  @UseGuards(ChildOwnershipGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChildDto: UpdateChildDto,
  ) {
    return this.childrenService.update(id, updateChildDto);
  }

  @Delete('children/:id')
  @UseGuards(ChildOwnershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.childrenService.remove(id);
  }

  @Put('children/:id/medical-info')
  @UseGuards(ChildOwnershipGuard)
  async updateMedicalInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalInfoDto,
  ) {
    return this.childrenService.updateMedicalInfo(id, dto);
  }
}
