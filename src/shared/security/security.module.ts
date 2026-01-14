import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JweAuthGuard } from './jwe-auth.guard';
import { PermissionsGuard } from './permissions.guard';

/**
 * Módulo de segurança:
 * - TokenService (JWT + JWE)
 * - Guards globais (Auth e RBAC)
 */
@Module({
  providers: [TokenService, JweAuthGuard, PermissionsGuard],
  exports: [TokenService, JweAuthGuard, PermissionsGuard],
})
export class SecurityModule {}
