import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StaffAttendanceService } from './staff-attendance.service';
import { StaffAttendanceController } from './staff-attendance.controller';
import { PayrollService } from './payroll.service';
import { PayrollSeedService } from './payroll-seed.service';

@Module({
  imports: [PrismaModule],
  controllers: [StaffAttendanceController],
  providers: [StaffAttendanceService, PayrollService, PayrollSeedService],
  exports: [StaffAttendanceService, PayrollService, PayrollSeedService],
})
export class StaffAttendanceModule {}
