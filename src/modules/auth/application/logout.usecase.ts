import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Caso de uso: logout.
 * Revoga o refresh token atual do usuário (impede novas renovações).
 */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { userId: number }): Promise<{ message: string }> {
    const prisma = this.prisma as any;

    await prisma.$transaction(async (tx: any) => {
      // Revoga todos os refresh tokens ativos do usuário.
      await tx.refreshToken.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Invalida access tokens existentes imediatamente.
      await tx.user.update({
        where: { id: input.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    return { message: ApiMessages.LOGOUT_SUCCESS };
  }
}
