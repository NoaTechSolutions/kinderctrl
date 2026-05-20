import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';

// AuthModule is imported so StaffService can call AuthService.issueTokensForUser
// during /staff/accept-invitation. EmailModule is @Global (auto-injectable),
// so no explicit import needed.
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
