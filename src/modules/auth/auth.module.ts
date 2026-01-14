import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase } from './application/login.usecase';
import { RegisterUseCase } from './application/register.usecase';
import { RefreshUseCase } from './application/refresh.usecase';
import { LogoutUseCase } from './application/logout.usecase';
import { SecurityModule } from '../../shared/security/security.module';

/**
 * Módulo de autenticação.
 */
@Module({
  imports: [SecurityModule],
  controllers: [AuthController],
  providers: [LoginUseCase, RegisterUseCase, RefreshUseCase, LogoutUseCase],
})
export class AuthModule {}
