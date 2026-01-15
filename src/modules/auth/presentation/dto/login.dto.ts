import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de login.
 */
export class LoginDto {
  @ApiProperty({
    description: 'E-mail do usuário (case-insensitive).',
    example: 'admin@local.test',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário.',
    example: 'Admin@123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
