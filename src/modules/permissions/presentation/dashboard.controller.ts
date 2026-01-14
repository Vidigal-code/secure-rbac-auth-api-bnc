import { Controller, Get } from '@nestjs/common';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Exemplo de rota protegida.
 * Requer permissão automática: resource="/dashboard" e action="GET" (ou '*').
 */
@Controller('dashboard')
export class DashboardController {
  @Get()
  getDashboard() {
    return { message: ApiMessages.ACCESS_DASHBOARD, content: {} };
  }
}
