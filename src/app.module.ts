import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { SecurityModule } from './shared/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60,
        limit: 120,
      },
    ]),
    PrismaModule,
    SecurityModule,
    AuthModule,
    PermissionsModule,
  ],
})
export class AppModule {}
