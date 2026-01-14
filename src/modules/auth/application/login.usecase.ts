import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TokenService } from '../../../shared/security/token.service';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Caso de uso: autenticar usuário e emitir token Bearer (JWE com JWT interno).
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Valida credenciais e retorna o token para ser usado em Authorization: Bearer <token>.
   */
  async execute(input: {
    email: string;
    password: string;
  }): Promise<{ message: string; token: string; refreshToken: string }> {
    const email = String(input.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(input.password ?? '');

    const prisma = this.prisma as any;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_CREDENTIALS,
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_CREDENTIALS,
      });
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_CREDENTIALS,
      });
    }

    const accessToken = await this.tokenService.signAccess({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    const refresh = await this.tokenService.signRefresh({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    const refreshTokenHash = this.tokenService.hashToken(refresh.token);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refresh.expiresAt,
      },
    });

    return {
      message: ApiMessages.LOGIN_SUCCESS,
      token: accessToken,
      refreshToken: refresh.token,
    };
  }
}
