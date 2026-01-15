import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para atribuição de permissão a um role.
 */
export class AssignPermissionDto {
  @ApiProperty({
    description:
      'ID do role (perfil) que receberá a permissão. Ex.: 1=ADMIN, 2=USER (depende do seed).',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  roleId!: number;

  @ApiProperty({
    description:
      'Resource (rota lógica) no padrão do guard. Sempre começa com "/". Use "*" para liberar todos os recursos.',
    example: '/dashboard',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  resource!: string;

  @ApiProperty({
    description:
      'Ação (método HTTP) em maiúsculas: GET/POST/PUT/DELETE ou "*".',
    example: 'GET',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  action!: string;
}
