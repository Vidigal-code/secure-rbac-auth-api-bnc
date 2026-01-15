import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Modelos base para documentação Swagger.
 *
 * Observação: a API usa um envelope consistente:
 * - Sucesso: { success: true, data: ... }
 * - Erro:    { success: false, error: { code, message, details? } }
 *
 * Esses DTOs existem apenas para o Swagger refletir corretamente esse contrato.
 */

export class ApiErrorInfoDto {
  @ApiProperty({
    description: 'Código do erro (ex.: UNAUTHORIZED, FORBIDDEN, BAD_REQUEST).',
    example: 'FORBIDDEN',
  })
  code!: string;

  @ApiProperty({
    description: 'Mensagem de erro em português.',
    example: 'Você não tem permissão para acessar este recurso',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      'Detalhes opcionais do erro (estrutura varia por endpoint/validação).',
    example: {
      requiredPermission: { resource: '/dashboard', action: 'GET' },
      yourPermissions: [{ resource: '*', action: '*' }],
    },
  })
  details?: unknown;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorInfoDto })
  error!: ApiErrorInfoDto;
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({
    description: 'Conteúdo retornado pelo endpoint.',
  })
  data!: unknown;
}
