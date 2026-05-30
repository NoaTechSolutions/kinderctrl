import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPayrollSettingsDto } from './dto/payroll-settings.dto';
import { CreatePayrollPeriodDto } from './dto/payroll-period.dto';
import * as XLSX from 'xlsx';

// ============================================ types

interface DayCalc {
  date: string;
  clockIn: Date | null;
  clockOut: Date | null;
  breakIn: Date | null;
  breakOut: Date | null;
  totalMs: number;
  breakMs: number;
  workedMs: number;
  regularHours: number;
  overtimeHours: number;
}

interface StaffPayroll {
  staff: { id: string; firstName: string; lastName: string; hourlyRate: number | null };
  days: DayCalc[];
  totalRegular: number;
  totalOvertime: number;
  totalPay: number;
}

export interface PayrollReport {
  period: { id: string; startDate: string; endDate: string; status: string };
  settings: { frequency: string; breakPaid: boolean; overtimeDailyThreshold: number; overtimeWeeklyThreshold: number; overtimeRate: number };
  staff: StaffPayroll[];
  totals: { regularHours: number; overtimeHours: number; totalPay: number };
}

// ============================================ service

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------- settings

  async getSettings(centerId: string) {
    return this.prisma.payrollSettings.findUnique({ where: { centerId } });
  }

  async upsertSettings(centerId: string, dto: UpsertPayrollSettingsDto) {
    return this.prisma.payrollSettings.upsert({
      where: { centerId },
      create: { centerId, ...dto },
      update: dto,
    });
  }

  // ------------------------------------------------- periods

  async createPeriod(centerId: string, dto: CreatePayrollPeriodDto) {
    const startDate = new Date(dto.startDate + 'T00:00:00.000Z');
    const endDate = new Date(dto.endDate + 'T00:00:00.000Z');

    if (endDate <= startDate)
      throw new BadRequestException('endDate must be after startDate');

    const overlap = await this.prisma.payrollPeriod.findFirst({
      where: {
        centerId,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });
    if (overlap)
      throw new BadRequestException('Period overlaps with an existing one');

    return this.prisma.payrollPeriod.create({
      data: { centerId, startDate, endDate },
    });
  }

  async listPeriods(centerId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { centerId },
      orderBy: { startDate: 'desc' },
    });
  }

  async approvePeriod(id: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Period not found');
    if (period.status !== 'OPEN')
      throw new BadRequestException('Period is not open');

    return this.prisma.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  // ------------------------------------------------- report

  async generateReport(periodId: string, centerId: string): Promise<PayrollReport> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Period not found');
    if (period.centerId !== centerId)
      throw new BadRequestException('Period does not belong to this center');

    const settings = await this.prisma.payrollSettings.findUnique({
      where: { centerId },
    });
    if (!settings)
      throw new BadRequestException(
        'Configure payroll settings before generating reports',
      );

    const staffMembers = await this.prisma.staff.findMany({
      where: { centerId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hourlyRate: true,
        timeEntries: {
          where: {
            date: { gte: period.startDate, lte: period.endDate },
          },
          orderBy: [{ date: 'asc' }, { deviceTimestamp: 'asc' }],
        },
      },
    });

    const staffPayrolls: StaffPayroll[] = staffMembers.map((s) => {
      const grouped: Record<string, typeof s.timeEntries> = {};
      for (const e of s.timeEntries) {
        const key = new Date(e.date).toISOString().split('T')[0];
        (grouped[key] ??= []).push(e);
      }

      const days: DayCalc[] = Object.entries(grouped).map(([date, entries]) => {
        const ci = entries.find((e) => e.type === 'CLOCK_IN');
        const co = entries.find((e) => e.type === 'CLOCK_OUT');
        const bi = entries.find((e) => e.type === 'BREAK_IN');
        const bo = entries.find((e) => e.type === 'BREAK_OUT');

        const clockIn = ci?.deviceTimestamp ?? null;
        const clockOut = co?.deviceTimestamp ?? null;
        const breakIn = bi?.deviceTimestamp ?? null;
        const breakOut = bo?.deviceTimestamp ?? null;

        let totalMs = 0;
        let breakMs = 0;
        if (clockIn && clockOut) {
          totalMs = clockOut.getTime() - clockIn.getTime();
          if (breakIn && breakOut) {
            breakMs = breakOut.getTime() - breakIn.getTime();
          }
        }

        const workedMs = settings.breakPaid
          ? totalMs
          : totalMs - breakMs;

        const workedHours = workedMs / 3_600_000;
        const regularHours = Math.min(workedHours, settings.overtimeDailyThreshold);
        const overtimeHours = Math.max(0, workedHours - settings.overtimeDailyThreshold);

        return {
          date,
          clockIn,
          clockOut,
          breakIn,
          breakOut,
          totalMs,
          breakMs,
          workedMs,
          regularHours,
          overtimeHours,
        };
      });

      let totalRegular = days.reduce((s, d) => s + d.regularHours, 0);
      let totalOvertime = days.reduce((s, d) => s + d.overtimeHours, 0);

      // Weekly overtime: if total regular > weekly threshold, move excess to overtime
      if (totalRegular > settings.overtimeWeeklyThreshold) {
        const weeklyExcess = totalRegular - settings.overtimeWeeklyThreshold;
        totalRegular = settings.overtimeWeeklyThreshold;
        totalOvertime += weeklyExcess;
      }

      const rate = s.hourlyRate ? Number(s.hourlyRate) : 0;
      const totalPay =
        totalRegular * rate +
        totalOvertime * rate * settings.overtimeRate;

      return {
        staff: {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          hourlyRate: rate,
        },
        days,
        totalRegular,
        totalOvertime,
        totalPay,
      };
    });

    return {
      period: {
        id: period.id,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
        status: period.status,
      },
      settings: {
        frequency: settings.frequency,
        breakPaid: settings.breakPaid,
        overtimeDailyThreshold: settings.overtimeDailyThreshold,
        overtimeWeeklyThreshold: settings.overtimeWeeklyThreshold,
        overtimeRate: settings.overtimeRate,
      },
      staff: staffPayrolls,
      totals: {
        regularHours: staffPayrolls.reduce((s, p) => s + p.totalRegular, 0),
        overtimeHours: staffPayrolls.reduce((s, p) => s + p.totalOvertime, 0),
        totalPay: staffPayrolls.reduce((s, p) => s + p.totalPay, 0),
      },
    };
  }

  // ------------------------------------------------- export

  generateExcel(report: PayrollReport): Buffer {
    const rows = report.staff.map((s) => ({
      'Staff': `${s.staff.firstName} ${s.staff.lastName}`,
      'Hourly Rate': s.staff.hourlyRate ?? 0,
      'Regular Hours': Math.round(s.totalRegular * 100) / 100,
      'Overtime Hours': Math.round(s.totalOvertime * 100) / 100,
      'Total Pay': Math.round(s.totalPay * 100) / 100,
    }));

    rows.push({
      'Staff': 'TOTAL',
      'Hourly Rate': 0,
      'Regular Hours': Math.round(report.totals.regularHours * 100) / 100,
      'Overtime Hours': Math.round(report.totals.overtimeHours * 100) / 100,
      'Total Pay': Math.round(report.totals.totalPay * 100) / 100,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    // Detail sheet per staff
    for (const s of report.staff) {
      const dayRows = s.days.map((d) => ({
        'Date': d.date,
        'Clock In': d.clockIn ? new Date(d.clockIn).toLocaleTimeString() : '',
        'Clock Out': d.clockOut ? new Date(d.clockOut).toLocaleTimeString() : '',
        'Break (min)': Math.round(d.breakMs / 60_000),
        'Regular': Math.round(d.regularHours * 100) / 100,
        'Overtime': Math.round(d.overtimeHours * 100) / 100,
      }));
      const detailWs = XLSX.utils.json_to_sheet(dayRows);
      const sheetName = `${s.staff.firstName} ${s.staff.lastName}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, detailWs, sheetName);
    }

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  generatePdf(report: PayrollReport): Buffer {
    // jsPDF in Node requires the constructor from the module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Payroll Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${report.period.startDate} — ${report.period.endDate}`, 14, 28);
    doc.text(`Status: ${report.period.status}`, 14, 34);

    let y = 44;
    doc.setFontSize(9);

    // Header
    doc.setFont(undefined, 'bold');
    doc.text('Staff', 14, y);
    doc.text('Rate', 70, y);
    doc.text('Regular', 95, y);
    doc.text('OT', 125, y);
    doc.text('Pay', 150, y);
    doc.setFont(undefined, 'normal');
    y += 6;

    for (const s of report.staff) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${s.staff.firstName} ${s.staff.lastName}`, 14, y);
      doc.text(`$${s.staff.hourlyRate?.toFixed(2) ?? '0.00'}`, 70, y);
      doc.text(`${s.totalRegular.toFixed(1)}h`, 95, y);
      doc.text(`${s.totalOvertime.toFixed(1)}h`, 125, y);
      doc.text(`$${s.totalPay.toFixed(2)}`, 150, y);
      y += 5;
    }

    y += 3;
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL', 14, y);
    doc.text(`${report.totals.regularHours.toFixed(1)}h`, 95, y);
    doc.text(`${report.totals.overtimeHours.toFixed(1)}h`, 125, y);
    doc.text(`$${report.totals.totalPay.toFixed(2)}`, 150, y);

    return Buffer.from(doc.output('arraybuffer'));
  }
}
