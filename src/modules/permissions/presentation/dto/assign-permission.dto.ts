import { IsInt, IsString, Min, MinLength } from 'class-validator';

/**
 * DTO para atribuição de permissão a um role.
 */
export class AssignPermissionDto {
  @IsInt()
  @Min(1)
  roleId!: number;

  @IsString()
  @MinLength(1)
  resource!: string;

  @IsString()
  @MinLength(1)
  action!: string;
}
