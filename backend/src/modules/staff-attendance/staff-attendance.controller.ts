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
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { StaffAttendanceService } from './staff-attendance.service';
import { CreatePunchDto } from './dto/create-punch.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { ApproveCorrectionDto } from './dto/approve-correction.dto';
import { RejectCorrectionDto } from './dto/reject-correction.dto';
import {
  ApproveOrRejectDayDto,
  ApproveOrRejectWeekDto,
} from './dto/attendance-approval.dto';
import { UpsertPayrollSettingsDto } from './dto/payroll-settings.dto';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  centerId?: string;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffAttendanceController {
  constructor(
    private readonly service: StaffAttendanceService,
    private readonly payroll: PayrollService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================= PUNCH

  @Post('punch')
  @Roles(UserRole.STAFF)
  punch(@Body() dto: CreatePunchDto, @CurrentUser() user: AuthUser) {
    return this.service.punch(dto, user.id);
  }

  @Get('today')
  @Roles(UserRole.STAFF)
  getMyToday(@CurrentUser() user: AuthUser) {
    return this.service.getMyToday(user.id);
  }

  @Get('team/today')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getTeamToday(
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    return this.service.getTeamToday(user.id, centerId);
  }

  @Get('team/week')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getTeamWeek(
    @CurrentUser() user: AuthUser,
    @Query('weekStart') weekStart: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.service.getTeamWeek(user.id, weekStart, centerId);
  }

  // ========================================================= SCHEDULES

  @Post('schedules')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  createSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createSchedule(dto, user.id);
  }

  @Get('schedules')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  findSchedules(
    @CurrentUser() user: AuthUser,
    @Query('staffId') staffId?: string,
    @Query('status') status?: 'DRAFT' | 'APPROVED',
    @Query('centerId') centerId?: string,
  ) {
    return this.service.findSchedules(user.id, { staffId, status, centerId });
  }

  @Get('my-schedule')
  @Roles(UserRole.STAFF)
  getMySchedule(@CurrentUser() user: AuthUser) {
    return this.service.getMySchedule(user.id);
  }

  @Get('schedules/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  findScheduleById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findScheduleById(id, user.id);
  }

  @Patch('schedules/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateSchedule(id, dto, user.id);
  }

  @Delete('schedules/:id')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  deleteSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteSchedule(id, user.id);
  }

  @Patch('schedules/:id/approve')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  approveSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveSchedule(id, user.id);
  }

  @Post('schedules/:id/duplicate')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  duplicateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.duplicateSchedule(id, user.id);
  }

  // ======================================================= CORRECTIONS

  @Post('corrections')
  @Roles(UserRole.STAFF)
  createCorrection(
    @Body() dto: CreateCorrectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createCorrection(dto, user.id);
  }

  @Get('corrections/my')
  @Roles(UserRole.STAFF)
  getMyCorrections(@CurrentUser() user: AuthUser) {
    return this.service.getMyCorrections(user.id);
  }

  @Get('corrections')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  getCenterCorrections(
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    return this.service.getCenterCorrections(user.id, centerId);
  }

  @Patch('corrections/:id/approve')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  approveCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCorrectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveCorrection(id, dto, user.id);
  }

  @Patch('corrections/:id/reject')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  rejectCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCorrectionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.rejectCorrection(id, dto, user.id);
  }

  // =========================================================== APPROVALS

  @Post('approvals/day')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  approveOrRejectDay(
    @Body() dto: ApproveOrRejectDayDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveOrRejectDay(dto, user.id);
  }

  @Post('approvals/week')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  approveOrRejectWeek(
    @Body() dto: ApproveOrRejectWeekDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approveOrRejectWeek(dto, user.id);
  }

  @Get('approvals')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  listCenterApprovals(
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.service.getCenterApprovals(user.id, centerId, weekStart);
  }

  @Get('approvals/my')
  @Roles(UserRole.STAFF)
  listMyApprovals(
    @CurrentUser() user: AuthUser,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.service.getMyApprovals(user.id, weekStart);
  }

  // ============================================================= HISTORY

  @Get('history')
  @Roles(UserRole.STAFF)
  getMyHistory(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMyHistory(user.id, from, to);
  }

  // =========================================================== PAYROLL

  @Get('payroll/settings')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollSettings(@CurrentUser() user: AuthUser) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    return this.payroll.getSettings(centerId);
  }

  @Patch('payroll/settings')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async upsertPayrollSettings(
    @Body() dto: UpsertPayrollSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    return this.payroll.upsertSettings(centerId, dto);
  }

  @Post('payroll/periods')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async createPayrollPeriod(
    @Body() dto: CreatePayrollPeriodDto,
    @CurrentUser() user: AuthUser,
  ) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    return this.payroll.createPeriod(centerId, dto);
  }

  @Get('payroll/periods')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async listPayrollPeriods(@CurrentUser() user: AuthUser) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    return this.payroll.listPeriods(centerId);
  }

  @Patch('payroll/periods/:id/approve')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async approvePayrollPeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.payroll.approvePeriod(id, user.id);
  }

  @Get('payroll/periods/:id/report')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    return this.payroll.generateReport(id, centerId);
  }

  @Get('payroll/periods/:id/export/xlsx')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async exportXlsx(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    const report = await this.payroll.generateReport(id, centerId);
    const buffer = this.payroll.generateExcel(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${report.period.startDate}.xlsx`);
    res.send(buffer);
  }

  @Get('payroll/periods/:id/export/pdf')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async exportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const centerId = await this.service.resolveDirectorCenter(user.id);
    const report = await this.payroll.generateReport(id, centerId);
    const buffer = this.payroll.generatePdf(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${report.period.startDate}.pdf`);
    res.send(buffer);
  }

  // ====================================================== DEV-ONLY RESET

  @Delete('dev/reset-my-punches')
  @Roles(UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async resetMyPunches(@CurrentUser() user: AuthUser) {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.service.devResetPunches(user.id);
  }
}
