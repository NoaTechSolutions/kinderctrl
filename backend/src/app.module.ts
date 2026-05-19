import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CentersModule } from './modules/centers/centers.module';
import { ChildrenModule } from './modules/children/children.module';
import { StaffModule } from './modules/staff/staff.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { EmailAwareThrottlerGuard } from './modules/auth/guards/email-aware-throttler.guard';
import { ThrottlerExceptionFilter } from './modules/auth/filters/throttler-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Default policy: 60 req/min per IP, applied to every endpoint as the
    // safety net. Auth endpoints override with stricter @Throttle decorators.
    // In-memory storage is fine for a single-instance deployment; swap to
    // @nestjs/throttler-storage-redis when going horizontal.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    CentersModule,
    ChildrenModule,
    StaffModule,
    AdminModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard order matters: throttler runs first so we 429 abusers before
    // doing the JWT lookup, which means brute-force attempts on /auth/login
    // don't even reach the bcrypt compare. EmailAwareThrottlerGuard composes
    // the tracker key as (ip + email) when the body carries one, so a single
    // bad actor on shared IPs (NAT, localhost) doesn't block other accounts.
    {
      provide: APP_GUARD,
      useClass: EmailAwareThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
  ],
})
export class AppModule {}
