import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CentersService } from './centers.service';
import { CentersController } from './centers.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SetupCompleteGuard } from './guards/setup-complete.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CentersController],
  providers: [
    CentersService,
    {
      provide: APP_GUARD,
      useClass: SetupCompleteGuard,
    },
  ],
  exports: [CentersService],
})
export class CentersModule {}
