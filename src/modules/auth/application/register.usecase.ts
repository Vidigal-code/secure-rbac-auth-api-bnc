import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TokenService } from '../../../shared/security/token.service';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Caso de uso: registrar usuário.
 * Regras:
 * - usuário criado SEMPRE com role USER
 * - valida e-mail único
 * - senha armazenada com hash seguro
 * - retorna token Bearer (mesma lógica do login)
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: {
    email: string;
    password: string;
  }): Promise<{ message: string; token: string; refreshToken: string }> {
    const email = String(input.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(input.password ?? '');

    const prisma = this.prisma as any;

    // Garante que exista a role USER (robustez para ambiente sem seed).
    const userRole = await prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: { name: 'USER' },
    });

    const passwordHash = await argon2.hash(password);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          roleId: userRole.id,
        },
        include: { role: true },
      });

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
        message: ApiMessages.REGISTER_SUCCESS,
        token: accessToken,
        refreshToken: refresh.token,
      };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.EMAIL_ALREADY_EXISTS,
        });
      }
      throw e;
    }
  }
}
