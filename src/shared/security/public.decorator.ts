import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './security.constants';

/**
 * Marca uma rota como pública (sem autenticação/permissões).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
