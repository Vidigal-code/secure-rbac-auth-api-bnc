import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

/**
 * DTO de registro de usuário.
 * Observação: o usuário criado SEMPRE será do perfil USER (role = USER).
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo. Ex: Test1245@!',
    },
  )
  password!: string;
}
