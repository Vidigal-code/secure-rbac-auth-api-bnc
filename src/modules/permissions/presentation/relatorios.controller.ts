import { Controller, Get } from '@nestjs/common';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Exemplo de rota protegida.
 * Requer permissão automática: resource="/relatorios" e action="GET" (ou '*').
 */
@Controller('relatorios')
export class RelatoriosController {
  @Get()
  getRelatorios() {
    return { message: ApiMessages.ACCESS_RELATORIOS, content: {} };
  }
}
