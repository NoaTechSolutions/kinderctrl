import {
  BadRequestException,
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
import { CreatePayrollPeriodDto, SetPeriodFrequencyDto } from './dto/payroll-period.dto';
import { AdjustHoursDto } from './dto/adjust-hours.dto';
import { PayrollService } from './payroll.service';
import { PayrollSeedService } from './payroll-seed.service';
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
    private readonly payrollSeed: PayrollSeedService,
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
    @Query('centerId') centerId?: string,
  ) {
    return this.service.createSchedule(dto, user.id, centerId);
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
  async getPayrollSettings(
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    const resolved = await this.service.resolveDirectorCenter(
      user.id,
      centerId,
    );
    return this.payroll.getSettings(resolved);
  }

  @Patch('payroll/settings')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async upsertPayrollSettings(
    @Body() dto: UpsertPayrollSettingsDto,
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    const resolved = await this.service.resolveDirectorCenter(
      user.id,
      centerId,
    );
    return this.payroll.upsertSettings(resolved, dto);
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

  /**
   * POST /attendance/payroll/period/set-frequency?centerId=
   * Upserts PayrollSettings.frequency, deletes OPEN period(s), creates a
   * new OPEN period whose range matches the requested frequency around TODAY.
   */
  @Post('payroll/period/set-frequency')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async setPeriodFrequency(
    @Body() dto: SetPeriodFrequencyDto,
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.setPeriodFrequency(resolved, dto);
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

  /**
   * GET /attendance/payroll/report/range?from=YYYY-MM-DD&to=YYYY-MM-DD&centerId=
   * Director/SA: payroll report (view, not export) over an arbitrary date range.
   * Powers "View Full Report" so it can show a whole month (or month-to-date).
   */
  @Get('payroll/report/range')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getRangeReport(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('centerId') centerId: string | undefined,
  ) {
    if (!from || !to)
      throw new BadRequestException('from and to query params are required');
    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T00:00:00.000Z');
    if (toDate < fromDate) throw new BadRequestException('to must be >= from');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.generateRangeReport(resolved, from, to);
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

  // ================================================ PAYROLL READ ENDPOINTS

  /**
   * GET /attendance/payroll/summary?month=YYYY-MM&centerId=
   * 4 stat cards for the dashboard.
   */
  @Get('payroll/summary')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollSummary(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.getMonthlySummary(resolved, month);
  }

  /**
   * GET /attendance/payroll/chart/monthly?months=3&centerId=
   * Cost-trend line chart — last N months.
   */
  @Get('payroll/chart/monthly')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollChartMonthly(
    @CurrentUser() user: AuthUser,
    @Query('months') monthsRaw?: string,
    @Query('centerId') centerId?: string,
  ) {
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    const months = monthsRaw ? parseInt(monthsRaw, 10) : 3;
    return this.payroll.getMonthlyChart(resolved, months);
  }

  /**
   * GET /attendance/payroll/chart/weekly?month=YYYY-MM&centerId=
   * Weekly-hours bar chart for a given month.
   */
  @Get('payroll/chart/weekly')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollChartWeekly(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.getWeeklyChart(resolved, month);
  }

  /**
   * GET /attendance/payroll/team?month=YYYY-MM&centerId=
   * Per-staff rows for the payroll team table.
   */
  @Get('payroll/team')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollTeam(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.getTeamPayroll(resolved, month);
  }

  /**
   * GET /attendance/payroll/staff/:staffId?month=YYYY-MM&centerId=
   * One staff member's month detail (director view).
   */
  @Get('payroll/staff/:staffId')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getPayrollStaffDetail(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.getStaffMonthPayroll(resolved, staffId, month);
  }

  /**
   * PATCH /attendance/payroll/hours
   * Director manually overrides a staff member's clock/break timestamps for a
   * given day. Creates or replaces the PayrollAdjustment record (latest edit
   * wins) and returns the updated DayCalc for immediate UI refresh.
   */
  @Patch('payroll/hours')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async adjustPayrollHours(
    @Body() dto: AdjustHoursDto,
    @CurrentUser() user: AuthUser,
    @Query('centerId') centerId?: string,
  ) {
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.adjustHours(resolved, dto, user.id);
  }

  /**
   * GET /attendance/payroll/staff/:staffId/adjustments?month=YYYY-MM&centerId=
   * Audit log: all PayrollAdjustment rows for a staff member in a given month,
   * newest first. Each row includes adjuster { firstName, lastName }.
   */
  @Get('payroll/staff/:staffId/adjustments')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async getStaffAdjustments(
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.getStaffAdjustments(resolved, staffId, month);
  }

  /**
   * POST /attendance/payroll/approve-all?month=YYYY-MM&centerId=
   * Bulk-approves all pending days that have punches and no open correction
   * requests. Skips already-APPROVED days and days with PENDING corrections.
   * Returns { approved: number, skipped: number }.
   */
  @Post('payroll/approve-all')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async bulkApproveMonth(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Query('centerId') centerId?: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    return this.payroll.bulkApproveMonth(resolved, month, user.id);
  }

  /**
   * GET /attendance/payroll/my?month=YYYY-MM
   * A staff member's own month payroll.
   */
  @Get('payroll/my')
  @Roles(UserRole.STAFF)
  async getMyPayroll(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    return this.payroll.getMyMonthPayroll(user.id, month);
  }

  /**
   * GET /attendance/payroll/my/export/pdf?month=YYYY-MM
   * A staff member exports their own monthly payroll as PDF.
   */
  @Get('payroll/my/export/pdf')
  @Roles(UserRole.STAFF)
  async exportMyPayrollPdf(
    @CurrentUser() user: AuthUser,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    if (!month) throw new BadRequestException('month query param is required');
    const payroll = await this.payroll.getMyMonthPayroll(user.id, month);
    const buffer = this.payroll.generatePersonalPdf(payroll, month);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=my-payroll-${month}.pdf`);
    res.send(buffer);
  }

  /**
   * GET /attendance/payroll/export/range?from=YYYY-MM-DD&to=YYYY-MM-DD&format=xlsx|pdf&centerId=
   * Director/SA exports payroll over an arbitrary date range.
   */
  @Get('payroll/export/range')
  @Roles(UserRole.DIRECTOR, UserRole.SUPER_ADMIN)
  async exportRangePayroll(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Query('centerId') centerId: string | undefined,
    @Res() res: Response,
  ) {
    if (!from || !to) throw new BadRequestException('from and to query params are required');
    if (!format || !['xlsx', 'pdf'].includes(format))
      throw new BadRequestException('format must be xlsx or pdf');

    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T00:00:00.000Z');
    if (toDate < fromDate) throw new BadRequestException('to must be >= from');

    const resolved = await this.service.resolveDirectorCenter(user.id, centerId);
    const report = await this.payroll.generateRangeReport(resolved, from, to);

    if (format === 'xlsx') {
      const buffer = this.payroll.generateExcel(report);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-${from}_${to}.xlsx`);
      res.send(buffer);
    } else {
      const buffer = this.payroll.generatePdf(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-${from}_${to}.pdf`);
      res.send(buffer);
    }
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

  // ─────────────────────────────────────────── DEV-ONLY: payroll seed / reset

  /**
   * POST /attendance/dev/seed-payroll
   * Seeds realistic payroll data for the Sunshine Learning Academy center
   * (4 staff, 4 weekly periods, punches, approvals, one correction, one adjustment).
   * Idempotent — runs reset first. SUPER_ADMIN-gated (JWT required) on top of
   * the NODE_ENV guard, so a misconfigured non-prod env can't be hit anonymously.
   */
  @Post('dev/seed-payroll')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async devSeedPayroll() {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.payrollSeed.seedPayroll();
  }

  /**
   * DELETE /attendance/dev/reset-payroll-seed
   * Deletes all payroll seed data (periods, settings, punches, approvals,
   * corrections, adjustments) for the Sunshine Learning Academy center.
   * Leaves staff/users intact but nulls their hourlyRate. SUPER_ADMIN-gated
   * (JWT required) on top of the NODE_ENV guard.
   */
  @Delete('dev/reset-payroll-seed')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async devResetPayrollSeed() {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.payrollSeed.resetPayrollSeed();
  }
}
