import { IsString, MinLength } from 'class-validator';

/**
 * DTO para renovação de token via refresh token.
 */
export class RefreshDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
