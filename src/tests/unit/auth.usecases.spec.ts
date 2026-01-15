/**
 * Testes unitários dos usecases de Auth.
 *
 * Objetivo:
 * - Cobrir regras de negócio e erros padronizados (401/400)
 * - Não depender do banco: Prisma é mockado e argon2 é mockado
 */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ApiMessages } from '../../shared/http/api-messages';
import { LoginUseCase } from '../../modules/auth/application/login.usecase';
import { RegisterUseCase } from '../../modules/auth/application/register.usecase';
import { RefreshUseCase } from '../../modules/auth/application/refresh.usecase';
import { LogoutUseCase } from '../../modules/auth/application/logout.usecase';

jest.mock('argon2', () => ({
  hash: jest.fn(() => 'HASHED'),
  verify: jest.fn(() => true),
}));

describe('auth usecases', () => {
  const tokenService: any = {
    signAccess: jest.fn(() => 'ACCESS'),
    signRefresh: jest.fn(() => ({
      token: 'REFRESH',
      expiresAt: new Date('2030-01-01'),
    })),
    hashToken: jest.fn(() => 'REFRESH_HASH'),
    verify: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginUseCase', () => {
    it('falha quando usuário não existe', async () => {
      const prisma: any = { user: { findUnique: jest.fn(() => null) } };
      const uc = new LoginUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: 'x', password: 'y' }),
      ).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_CREDENTIALS,
        }),
      );
    });

    it('falha quando usuário inativo', async () => {
      const prisma: any = {
        user: { findUnique: jest.fn(() => ({ isActive: false })) },
      };
      const uc = new LoginUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: 'x', password: 'y' }),
      ).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_CREDENTIALS,
        }),
      );
    });

    it('falha quando senha inválida', async () => {
      (argon2.verify as any).mockResolvedValueOnce(false);
      const prisma: any = {
        user: {
          findUnique: jest.fn(() => ({
            id: 1,
            email: 'a@b.c',
            passwordHash: 'HASH',
            isActive: true,
            roleId: 2,
            tokenVersion: 0,
            role: { name: 'USER' },
          })),
        },
      };
      const uc = new LoginUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: 'x', password: 'y' }),
      ).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_CREDENTIALS,
        }),
      );
    });

    it('sucesso cria refreshToken no banco e retorna tokens', async () => {
      const prisma: any = {
        user: {
          findUnique: jest.fn(() => ({
            id: 1,
            email: 'Admin@Local.Test',
            passwordHash: 'HASH',
            isActive: true,
            roleId: 2,
            tokenVersion: 1,
            role: { name: 'ADMIN' },
          })),
        },
        refreshToken: { create: jest.fn(() => ({})) },
      };
      const uc = new LoginUseCase(prisma, tokenService);
      const out = await uc.execute({
        email: '  ADMIN@LOCAL.TEST ',
        password: 'p',
      });

      expect(out).toEqual({
        message: ApiMessages.LOGIN_SUCCESS,
        token: 'ACCESS',
        refreshToken: 'REFRESH',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@local.test' },
        include: { role: true },
      });
      expect(tokenService.hashToken).toHaveBeenCalledWith('REFRESH');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          tokenHash: 'REFRESH_HASH',
          expiresAt: new Date('2030-01-01'),
        },
      });
    });

    it('normaliza input quando email/password são undefined', async () => {
      const prisma: any = { user: { findUnique: jest.fn(() => null) } };
      const uc = new LoginUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: undefined as any, password: undefined as any }),
      ).rejects.toBeTruthy();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: '' },
        include: { role: true },
      });
    });

    it('normaliza input quando email/password são null', async () => {
      const prisma: any = { user: { findUnique: jest.fn(() => null) } };
      const uc = new LoginUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: null as any, password: null as any }),
      ).rejects.toBeTruthy();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: '' },
        include: { role: true },
      });
    });
  });

  describe('RegisterUseCase', () => {
    it('sucesso upsert role USER, cria usuário e refresh no banco', async () => {
      const prisma: any = {
        role: { upsert: jest.fn(() => ({ id: 99 })) },
        user: {
          create: jest.fn(() => ({
            id: 10,
            email: 'new@local.test',
            passwordHash: 'HASHED',
            roleId: 99,
            tokenVersion: 0,
            role: { name: 'USER' },
          })),
        },
        refreshToken: { create: jest.fn(() => ({})) },
      };
      const uc = new RegisterUseCase(prisma, tokenService);
      const out = await uc.execute({
        email: ' New@Local.Test ',
        password: 'X',
      });

      expect(out).toEqual({
        message: ApiMessages.REGISTER_SUCCESS,
        token: 'ACCESS',
        refreshToken: 'REFRESH',
      });
      expect(prisma.role.upsert).toHaveBeenCalled();
      expect(argon2.hash).toHaveBeenCalledWith('X');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('traduz erro P2002 para BAD_REQUEST (email já existe)', async () => {
      const prisma: any = {
        role: { upsert: jest.fn(() => ({ id: 99 })) },
        user: {
          create: jest.fn(() => {
            const err: any = new Error('dup');
            err.code = 'P2002';
            throw err;
          }),
        },
      };
      const uc = new RegisterUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: 'a', password: 'b' }),
      ).rejects.toMatchObject(
        new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.EMAIL_ALREADY_EXISTS,
        }),
      );
    });

    it('re-throw para erro desconhecido', async () => {
      const prisma: any = {
        role: { upsert: jest.fn(() => ({ id: 99 })) },
        user: {
          create: jest.fn(() => {
            const err: any = new Error('x');
            err.code = 'OTHER';
            throw err;
          }),
        },
      };
      const uc = new RegisterUseCase(prisma, tokenService);
      await expect(
        uc.execute({ email: 'a', password: 'b' }),
      ).rejects.toMatchObject({ message: 'x' });
    });

    it('normaliza input quando email/password são nullish', async () => {
      const prisma: any = {
        role: { upsert: jest.fn(() => ({ id: 99 })) },
        user: {
          create: jest.fn(() => ({
            id: 10,
            email: '',
            passwordHash: 'HASHED',
            roleId: 99,
            tokenVersion: 0,
            role: { name: 'USER' },
          })),
        },
        refreshToken: { create: jest.fn(() => ({})) },
      };
      const uc = new RegisterUseCase(prisma, tokenService);
      await uc.execute({ email: null as any, password: null as any });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: '' }),
        }),
      );
    });
  });

  describe('RefreshUseCase', () => {
    it('401 quando token não é refresh', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'access',
        payload: {},
      });
      const prisma: any = {};
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_REFRESH_TOKEN,
        }),
      );
    });

    it('401 quando refresh não existe no banco', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const prisma: any = {
        refreshToken: { findUnique: jest.fn(() => null) },
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_REFRESH_TOKEN,
        }),
      );
    });

    it('reuse detection: revoga tudo + incrementa tokenVersion e retorna 401', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const tx: any = {
        refreshToken: { updateMany: jest.fn(() => ({})) },
        user: { update: jest.fn(() => ({})) },
      };
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            tokenHash: 'H',
            revokedAt: new Date(),
            expiresAt: new Date('2030-01-01'),
          })),
        },
        $transaction: jest.fn((fn: any) => fn(tx)),
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_REFRESH_TOKEN,
        }),
      );
      expect(tx.refreshToken.updateMany).toHaveBeenCalled();
      expect(tx.user.update).toHaveBeenCalled();
    });

    it('expirado: revoga e retorna 401', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            revokedAt: null,
            expiresAt: new Date(Date.now() - 1000),
          })),
          update: jest.fn(() => ({})),
        },
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_REFRESH_TOKEN,
        }),
      );
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });

    it('tokenVersion inválido: 401', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            revokedAt: null,
            expiresAt: new Date('2030-01-01'),
          })),
        },
        user: {
          findUnique: jest.fn(() => ({
            id: 1,
            isActive: true,
            tokenVersion: 9,
            roleId: 2,
            email: 'u@local.test',
            role: { name: 'USER' },
          })),
        },
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toMatchObject(
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: ApiMessages.INVALID_REFRESH_TOKEN,
        }),
      );
    });

    it('sucesso: rotaciona refresh e retorna novos tokens', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: {
          userId: 1,
          tokenVersion: 0,
          roleId: 2,
          roleName: 'USER',
          email: 'u@local.test',
        },
      });
      const tx: any = {
        refreshToken: {
          update: jest.fn(() => ({})),
          create: jest.fn(() => ({})),
        },
      };
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            revokedAt: null,
            expiresAt: new Date('2030-01-01'),
          })),
        },
        user: {
          findUnique: jest.fn(() => ({
            id: 1,
            isActive: true,
            tokenVersion: 0,
            roleId: 2,
            email: 'u@local.test',
            role: { name: 'USER' },
          })),
        },
        $transaction: jest.fn((fn: any) => fn(tx)),
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      const out = await uc.execute({ refreshToken: 'X' });
      expect(out).toEqual({
        message: ApiMessages.REFRESH_SUCCESS,
        token: 'ACCESS',
        refreshToken: 'REFRESH',
      });
      expect(tx.refreshToken.update).toHaveBeenCalled();
      expect(tx.refreshToken.create).toHaveBeenCalled();
    });

    it('usuário inativo (ou inexistente): 401', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            revokedAt: null,
            expiresAt: new Date('2030-01-01'),
          })),
        },
        user: {
          findUnique: jest.fn(() => null),
        },
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toBeTruthy();
    });

    it('refreshToken nullish => 401', async () => {
      const prisma: any = {};
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(
        uc.execute({ refreshToken: undefined as any }),
      ).rejects.toBeTruthy();
    });

    it('usuário existe mas está inativo => 401', async () => {
      tokenService.verify.mockResolvedValueOnce({
        tokenType: 'refresh',
        payload: { userId: 1, tokenVersion: 0 },
      });
      const prisma: any = {
        refreshToken: {
          findUnique: jest.fn(() => ({
            id: 1,
            userId: 1,
            revokedAt: null,
            expiresAt: new Date('2030-01-01'),
          })),
        },
        user: {
          findUnique: jest.fn(() => ({
            id: 1,
            isActive: false,
            tokenVersion: 0,
            roleId: 2,
            email: 'u@local.test',
            role: { name: 'USER' },
          })),
        },
      };
      const uc = new RefreshUseCase(prisma, tokenService);
      await expect(uc.execute({ refreshToken: 'X' })).rejects.toBeTruthy();
    });
  });

  describe('LogoutUseCase', () => {
    it('revoga refresh tokens e incrementa tokenVersion via transaction', async () => {
      const tx: any = {
        refreshToken: { updateMany: jest.fn(() => ({})) },
        user: { update: jest.fn(() => ({})) },
      };
      const prisma: any = { $transaction: jest.fn((fn: any) => fn(tx)) };
      const uc = new LogoutUseCase(prisma);
      const out = await uc.execute({ userId: 1 });
      expect(out).toEqual({ message: ApiMessages.LOGOUT_SUCCESS });
      expect(tx.refreshToken.updateMany).toHaveBeenCalled();
      expect(tx.user.update).toHaveBeenCalled();
    });
  });
});
