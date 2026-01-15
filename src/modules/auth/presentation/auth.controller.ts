import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../shared/security/public.decorator';
import { LoginUseCase } from '../application/login.usecase';
import { LoginDto } from './dto/login.dto';
import { RegisterUseCase } from '../application/register.usecase';
import { RegisterDto } from './dto/register.dto';
import { RefreshUseCase } from '../application/refresh.usecase';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutUseCase } from '../application/logout.usecase';
import { SkipPermissions } from '../../../shared/security/skip-permissions.decorator';

/**
 * Controller de autenticação.
 */
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
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  /**
   * Renova tokens usando refresh token (rotação).
   */
  @Public()
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.refreshUseCase.execute({ refreshToken: dto.refreshToken });
  }

  /**
   * Logout (revoga refresh token atual).
   */
  @SkipPermissions()
  @Post('logout')
  async logout(@Body() _body: unknown, @Req() req: any) {
    return this.logoutUseCase.execute({ userId: req.user.userId });
  }
}
