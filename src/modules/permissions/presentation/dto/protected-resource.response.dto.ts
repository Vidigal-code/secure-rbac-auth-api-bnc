import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta simples usada nas rotas protegidas de exemplo (/dashboard e /relatorios).
 */
export class ProtectedResourceResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação em português.',
    example: 'Acesso autorizado ao dashboard',
  })
  message!: string;

  @ApiProperty({
    description: 'Payload do recurso (exemplo).',
    example: {},
  })
  content!: Record<string, unknown>;
}
