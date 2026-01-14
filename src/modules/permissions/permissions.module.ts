import { Module } from '@nestjs/common';
import { AssignPermissionUseCase } from './application/assign-permission.usecase';
import { DashboardController } from './presentation/dashboard.controller';
import { PermissionsController } from './presentation/permissions.controller';
import { RelatoriosController } from './presentation/relatorios.controller';

/**
 * Módulo de permissões (RBAC) e rotas protegidas de exemplo.
 */
@Module({
  controllers: [
    PermissionsController,
    DashboardController,
    RelatoriosController,
  ],
  providers: [AssignPermissionUseCase],
})
export class PermissionsModule {}
