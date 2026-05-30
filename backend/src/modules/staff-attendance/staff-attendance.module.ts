import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StaffAttendanceService } from './staff-attendance.service';
import { StaffAttendanceController } from './staff-attendance.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [PrismaModule],
  controllers: [StaffAttendanceController],
  providers: [StaffAttendanceService, PayrollService],
  exports: [StaffAttendanceService, PayrollService],
})
export class StaffAttendanceModule {}
