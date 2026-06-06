import { Module } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { ChildrenSeedService } from './children-seed.service';
import { ChildrenController } from './children.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// AuthModule provides AuthService.issueWelcomeSetupToken, used when a child is
// created/linked with a NEW parent (reusing the Staff welcome-setup flow).
// EmailModule + ConfigModule are @Global, so no explicit import is needed.
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildrenSeedService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
