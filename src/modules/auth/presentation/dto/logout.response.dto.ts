import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta do logout.
 */
export class LogoutResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação em português.',
    example: 'Logout realizado com sucesso',
  })
  message!: string;
}


