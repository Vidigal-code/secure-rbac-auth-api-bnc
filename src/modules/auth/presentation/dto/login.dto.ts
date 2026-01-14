import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO de login.
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
