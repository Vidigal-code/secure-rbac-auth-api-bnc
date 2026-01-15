import { SetMetadata } from '@nestjs/common';
import { SKIP_PERMISSIONS_KEY } from './security.constants';

/**
 * Marca uma rota como "apenas autenticada":
 * - Mantém o `JweAuthGuard` (exige Bearer token válido)
 * - Pula o `PermissionsGuard` (não exige permissão RBAC específica)
 *
 * Útil para rotas como `/auth/logout`, que devem ser acessíveis a qualquer usuário autenticado.
 */
export const SkipPermissions = () => SetMetadata(SKIP_PERMISSIONS_KEY, true);
