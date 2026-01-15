import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from '../../../shared/security/public.decorator';
import { LoginUseCase } from '../application/login.usecase';
import { LoginDto } from './dto/login.dto';
import { RegisterUseCase } from '../application/register.usecase';
import { RegisterDto } from './dto/register.dto';
import { RefreshUseCase } from '../application/refresh.usecase';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutUseCase } from '../application/logout.usecase';
import { SkipPermissions } from '../../../shared/security/skip-permissions.decorator';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from '../../../shared/http/swagger/api-response.dto';
import { AuthTokensResponseDto } from './dto/auth-tokens.response.dto';
import { LogoutResponseDto } from './dto/logout.response.dto';

/**
 * Controller de autenticação.
 */
@ApiTags('Autenticação')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  AuthTokensResponseDto,
  LogoutResponseDto,
)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  /**
   * Login do usuário.
   * Retorna token para uso em Authorization: Bearer <token>
   */
  @Public()
  @Throttle({ default: { ttl: 60, limit: 10 } })
  @Post('login')
  @ApiOperation({
    summary: 'Login (emite tokens)',
    description:
      'Valida e-mail/senha e emite **access token** (para `Authorization: Bearer <token>`) + **refresh token** (para rotação em `/auth/refresh`).',
  })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Login realizado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AuthTokensResponseDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Erro de validação do DTO.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
    content: {
      'application/json': {
        example: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Credenciais inválidas' },
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description:
      'Muitas tentativas em pouco tempo (rate limit). Aguarde e tente novamente.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  /**
   * Registro de usuário.
   * Observação: cria sempre com role USER.
   */
  @Public()
  @Throttle({ default: { ttl: 60, limit: 5 } })
  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuário (role USER)',
    description:
      'Cria um usuário novo **sempre** com o perfil USER e já emite tokens (mesma lógica do login).',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Registro realizado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AuthTokensResponseDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'Erro de validação do DTO (ex.: senha fraca) ou e-mail já cadastrado.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiTooManyRequestsResponse({
    description:
      'Muitas tentativas em pouco tempo (rate limit). Aguarde e tente novamente.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  /**
   * Renova tokens usando refresh token (rotação).
   */
  @Public()
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar tokens (refresh com rotação)',
    description:
      'Valida o refresh token e emite um novo access token + um novo refresh token. O refresh anterior é revogado (rotação).',
  })
  @ApiBody({ type: RefreshDto })
  @ApiCreatedResponse({
    description: 'Token renovado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AuthTokensResponseDto) },
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido ou expirado.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
    content: {
      'application/json': {
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token inválido ou expirado',
          },
        },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description:
      'Muitas tentativas em pouco tempo (rate limit). Aguarde e tente novamente.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  async refresh(@Body() dto: RefreshDto) {
    return this.refreshUseCase.execute({ refreshToken: dto.refreshToken });
  }

  /**
   * Logout (revoga refresh token atual).
   */
  @SkipPermissions()
  @Post('logout')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Logout (revoga refresh tokens e invalida access tokens)',
    description:
      'Revoga os refresh tokens ativos do usuário e incrementa `tokenVersion`, invalidando access tokens já emitidos (sem blacklist).',
  })
  @ApiCreatedResponse({
    description: 'Logout realizado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LogoutResponseDto) },
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Não autenticado (Authorization ausente ou token inválido/expirado).',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiForbiddenResponse({
    description:
      'Autenticado, porém bloqueado por política de segurança (ex.: usuário inativo ou `tokenVersion` divergente).',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  async logout(@Body() _body: unknown, @Req() req: any) {
    return this.logoutUseCase.execute({ userId: req.user.userId });
  }
}
