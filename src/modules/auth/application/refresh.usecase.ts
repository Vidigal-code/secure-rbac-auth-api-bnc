import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TokenService } from '../../../shared/security/token.service';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Caso de uso: renovar token usando refresh token (rotação - nível enterprise).
 *
 * Regras:
 * - refresh token deve ser válido e do tipo "refresh"
 * - o token nunca é persistido em claro; apenas o hash (SHA-256)
 * - ao renovar, gera NOVO refresh token e revoga o anterior (rotação)
 * - se um refresh token revogado for reapresentado => reuse (possível comprometimento)
 *   - revoga todos os refresh tokens ativos do usuário
 *   - incrementa tokenVersion (invalida access tokens existentes)
 */
@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: {
    refreshToken: string;
  }): Promise<{ message: string; token: string; refreshToken: string }> {
    const refreshToken = String(input.refreshToken ?? '').trim();

    try {
      const verified = await this.tokenService.verify(refreshToken);
      if (verified.tokenType !== 'refresh') {
        throw new Error('TokenType inválido');
      }

      const payload = verified.payload;
      //const userId = payload.userId;

      const prisma = this.prisma as any;
      const providedHash = this.tokenService.hashToken(refreshToken);

      // Busca o refresh token no banco (hash).
      const dbRefresh = await prisma.refreshToken.findUnique({
        where: { tokenHash: providedHash },
      });

      if (!dbRefresh) {
        throw new Error('Refresh não encontrado');
      }

      // Se o token já foi revogado e está sendo apresentado novamente => reuse (comprometimento).
      if (dbRefresh.revokedAt) {
        await prisma.$transaction(async (tx: any) => {
          await tx.refreshToken.updateMany({
            where: { userId: dbRefresh.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.user.update({
            where: { id: dbRefresh.userId },
            data: { tokenVersion: { increment: 1 } },
          });
        });
        throw new Error('Refresh reutilizado');
      }

      if (new Date(dbRefresh.expiresAt).getTime() < Date.now()) {
        // Expirado: revoga e falha.
        await prisma.refreshToken.update({
          where: { id: dbRefresh.id },
          data: { revokedAt: new Date() },
        });
        throw new Error('Refresh expirado');
      }

      // Carrega usuário atual (role + tokenVersion + isActive).
      const dbUser = await prisma.user.findUnique({
        where: { id: dbRefresh.userId },
        include: { role: true },
      });

      if (!dbUser?.isActive) {
        throw new Error('Usuário inativo');
      }

      // Se o usuário mudou tokenVersion, tokens antigos devem falhar.
      if (Number(payload.tokenVersion) !== Number(dbUser.tokenVersion)) {
        throw new Error('TokenVersion inválido');
      }

      // Emite novos tokens e rotaciona refresh.
      const newAccessToken = await this.tokenService.signAccess({
        userId: dbUser.id,
        roleId: dbUser.roleId,
        roleName: dbUser.role.name,
        email: dbUser.email,
        tokenVersion: dbUser.tokenVersion,
      });

      const newRefresh = await this.tokenService.signRefresh({
        userId: dbUser.id,
        roleId: dbUser.roleId,
        roleName: dbUser.role.name,
        email: dbUser.email,
        tokenVersion: dbUser.tokenVersion,
      });

      const newHash = this.tokenService.hashToken(newRefresh.token);
      await prisma.$transaction(async (tx: any) => {
        await tx.refreshToken.update({
          where: { id: dbRefresh.id },
          data: { revokedAt: new Date(), replacedByTokenHash: newHash },
        });
        await tx.refreshToken.create({
          data: {
            userId: dbUser.id,
            tokenHash: newHash,
            expiresAt: newRefresh.expiresAt,
          },
        });
      });

      return {
        message: ApiMessages.REFRESH_SUCCESS,
        token: newAccessToken,
        refreshToken: newRefresh.token,
      };
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_REFRESH_TOKEN,
      });
    }
  }
}
