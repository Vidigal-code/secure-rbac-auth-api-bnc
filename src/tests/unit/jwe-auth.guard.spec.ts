/**
 * Testes unitários do `JweAuthGuard`.
 *
 * Objetivo:
 * - Cobrir 401 para headers inválidos/ausentes e verify falhando
 * - Cobrir 200 com `req.user` preenchido quando token válido (access)
 */
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { JweAuthGuard } from '../../shared/security/jwe-auth.guard';
import { ApiMessages } from '../../shared/http/api-messages';

describe('JweAuthGuard', () => {
  function createCtx(req: any) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
  }

  it('libera rota pública', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => true),
    } as unknown as Reflector;
    const tokenService: any = { verify: jest.fn() };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(guard.canActivate(createCtx({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(tokenService.verify).not.toHaveBeenCalled();
  });

  it('401 quando Authorization não é Bearer', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = { verify: jest.fn() };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(
      guard.canActivate(createCtx({ headers: { authorization: 'Basic x' } })),
    ).rejects.toMatchObject(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_OR_EXPIRED_TOKEN,
      }),
    );
  });

  it('401 quando header é "Bearer" sem token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = { verify: jest.fn() };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(
      guard.canActivate(createCtx({ headers: { authorization: 'Bearer' } })),
    ).rejects.toBeTruthy();
  });

  it('401 quando headers é undefined', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = { verify: jest.fn() };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(guard.canActivate(createCtx({}))).rejects.toBeTruthy();
  });

  it('401 quando verify falha', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = {
      verify: jest.fn(() => {
        throw new Error('bad');
      }),
    };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(
      guard.canActivate(createCtx({ headers: { authorization: 'Bearer x' } })),
    ).rejects.toMatchObject(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_OR_EXPIRED_TOKEN,
      }),
    );
  });

  it('401 quando tokenType != access', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = {
      verify: jest.fn(() => ({ tokenType: 'refresh', payload: {} })),
    };
    const guard = new JweAuthGuard(reflector, tokenService);

    await expect(
      guard.canActivate(createCtx({ headers: { authorization: 'Bearer x' } })),
    ).rejects.toMatchObject(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_OR_EXPIRED_TOKEN,
      }),
    );
  });

  it('popula req.user e permite quando token válido', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const tokenService: any = {
      verify: jest.fn(() => ({
        tokenType: 'access',
        payload: {
          userId: 1,
          roleId: 2,
          roleName: 'USER',
          email: 'u@local.test',
          tokenVersion: 0,
        },
      })),
    };
    const guard = new JweAuthGuard(reflector, tokenService);
    const req: any = { headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(createCtx(req))).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: 1,
      roleId: 2,
      roleName: 'USER',
      email: 'u@local.test',
      tokenVersion: 0,
    });
  });
});
