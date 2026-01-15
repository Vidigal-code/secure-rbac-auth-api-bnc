import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta da atribuição de permissão a um role.
 */
export class AssignPermissionResponseDto {
  @ApiProperty({
    description: 'Identificador do role (perfil).',
    example: 1,
  })
  roleId!: number;

  @ApiProperty({
    description:
      'Resource normalizado (sempre começa com "/"). Use "*" para liberar tudo.',
    example: '/dashboard',
  })
  resource!: string;

  @ApiProperty({
    description:
      'Ação (método HTTP) em maiúsculas. Use "*" para liberar qualquer método.',
    example: 'GET',
  })
  action!: string;

  @ApiProperty({
    description: 'Data/hora em que a permissão foi atribuída.',
    example: '2026-01-15T12:00:00.000Z',
  })
  assignedAt!: Date;
}


