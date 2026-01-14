import { SetMetadata } from '@nestjs/common';
import { ADMIN_ONLY_KEY } from './security.constants';

/**
 * Restringe a rota para usuários com perfil ADMIN.
 */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
