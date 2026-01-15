import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta padrão do Auth para login/registro/refresh:
 * retorna novo access token e um refresh token (rotação).
 */
export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação em português.',
    example: 'Login realizado com sucesso',
  })
  message!: string;

  @ApiProperty({
    description:
      'Access token para uso em `Authorization: Bearer <token>` (formato JWE com JWT interno).',
    example:
      'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiSldUIiwidHlwIjoiSldFIn0...<snip>',
  })
  token!: string;

  @ApiProperty({
    description:
      'Refresh token (use apenas em `/auth/refresh`). Persistido no banco apenas como hash (SHA-256).',
    example:
      'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiSldUIiwidHlwIjoiSldFIn0...<snip>',
  })
  refreshToken!: string;
}


