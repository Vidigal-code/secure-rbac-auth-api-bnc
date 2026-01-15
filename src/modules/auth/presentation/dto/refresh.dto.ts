import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para renovação de token via refresh token.
 */
export class RefreshDto {
  @ApiProperty({
    description:
      'Refresh token emitido no login/registro/refresh anterior. Em caso de rotação, o token antigo é revogado.',
    example:
      'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiSldUIiwidHlwIjoiSldFIn0...<snip>',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
