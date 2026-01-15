import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiMessages } from '../../../shared/http/api-messages';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from '../../../shared/http/swagger/api-response.dto';
import { ProtectedResourceResponseDto } from './dto/protected-resource.response.dto';

/**
 * Exemplo de rota protegida.
 * Requer permissão automática: resource="/dashboard" e action="GET" (ou '*').
 */
@ApiTags('Recursos protegidos (exemplos)')
@ApiBearerAuth('BearerAuth')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  ProtectedResourceResponseDto,
)
@Controller('dashboard')
export class DashboardController {
  @Get()
  @ApiOperation({
    summary: 'Dashboard (exemplo de rota protegida por RBAC)',
    description: [
      'Rota protegida por autenticação + RBAC.',
      '',
      'Permissão requerida (calculada automaticamente):',
      '- `resource`: `/dashboard`',
      '- `action`: `GET`',
      '',
      'Dica: para liberar este endpoint a um perfil, crie uma permissão com `resource="/dashboard"` e `action="GET"` (ou `*`).',
    ].join('\n'),
  })
  @ApiOkResponse({
    description: 'Acesso autorizado ao dashboard.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(ProtectedResourceResponseDto) },
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Não autenticado (Authorization ausente ou token inválido/expirado).',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiForbiddenResponse({
    description:
      'Autenticado, porém sem permissão. O `details` retorna a permissão exigida e a lista atual do usuário.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  getDashboard() {
    return { message: ApiMessages.ACCESS_DASHBOARD, content: {} };
  }
}
