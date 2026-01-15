/**
 * Testes unitários do `PermissionsGuard` (RBAC).
 *
 * Objetivo:
 * - Cobrir 403 em cenários de negação (sem user, inativo, tokenVersion, adminOnly, sem permissão)
 * - Cobrir 200 quando há permissão (inclui wildcards)
 */
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '../../shared/security/permissions.guard';
import { ApiMessages } from '../../shared/http/api-messages';

describe('PermissionsGuard', () => {
  function createCtx(req: any) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
  }

  function expectForbidden(p: Promise<boolean>) {
    return expect(p).rejects.toMatchObject(
      new ForbiddenException({
        code: 'FORBIDDEN',
        message: ApiMessages.FORBIDDEN_RESOURCE,
      }),
    );
  }

  it('libera rota pública', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => true),
    } as unknown as Reflector;
    const prisma: any = {};
    const guard = new PermissionsGuard(reflector, prisma);
    await expect(guard.canActivate(createCtx({}))).resolves.toBe(true);
  });

  it('nega quando não há userId', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = { user: { findUnique: jest.fn() } };
    const guard = new PermissionsGuard(reflector, prisma);
    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'GET',
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: {},
        }),
      ),
    );
  });

  it('nega quando usuário não existe', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: { findUnique: jest.fn(() => null) },
      permission: { findMany: jest.fn() },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'GET',
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });

  it('nega quando usuário inativo', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: false,
          tokenVersion: 0,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: { findMany: jest.fn() },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'GET',
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });

  it('nega quando tokenVersion diverge', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 2,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: { findMany: jest.fn() },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'GET',
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });

  it('nega quando adminOnly e role não é ADMIN', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'adminOnly') return true;
        return false;
      }),
    } as unknown as Reflector;

    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 0,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: { findMany: jest.fn() },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'POST',
          baseUrl: '/permissions',
          route: { path: '/assign' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });

  it('nega quando não tem permissão', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 0,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: {
        findMany: jest.fn(() => [{ resource: '/relatorios', action: 'GET' }]),
      },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: 'GET',
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });

  it('permite quando há wildcard de resource ou action', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 0,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: {
        findMany: jest.fn(() => [
          { resource: '*', action: 'GET' },
          { resource: '/dashboard', action: '*' },
        ]),
      },
    };
    const guard = new PermissionsGuard(reflector, prisma);
    const req: any = {
      method: 'GET',
      baseUrl: '/dashboard',
      route: { path: '/' },
      user: { userId: 1, tokenVersion: 0 },
    };

    await expect(guard.canActivate(createCtx(req))).resolves.toBe(true);
    // atualiza role no req.user
    expect(req.user.roleId).toBe(2);
    expect(req.user.roleName).toBe('USER');
  });

  it('adminOnly permite quando role é ADMIN e permissão existe', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'adminOnly') return true;
        return false;
      }),
    } as unknown as Reflector;

    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 0,
          roleId: 1,
          role: { name: 'ADMIN' },
        })),
      },
      permission: {
        findMany: jest.fn(() => [
          { resource: '/permissions/assign', action: 'POST' },
        ]),
      },
    };
    const guard = new PermissionsGuard(reflector, prisma);
    const req: any = {
      method: 'post',
      baseUrl: '/permissions',
      route: { path: '/assign' },
      user: { userId: 1, tokenVersion: 0 },
    };

    await expect(guard.canActivate(createCtx(req))).resolves.toBe(true);
  });

  it('nega quando req.method é undefined (action vira "")', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const prisma: any = {
      user: {
        findUnique: jest.fn(() => ({
          id: 1,
          isActive: true,
          tokenVersion: 0,
          roleId: 2,
          role: { name: 'USER' },
        })),
      },
      permission: {
        findMany: jest.fn(() => [{ resource: '*', action: 'GET' }]),
      },
    };
    const guard = new PermissionsGuard(reflector, prisma);

    await expectForbidden(
      guard.canActivate(
        createCtx({
          method: undefined,
          baseUrl: '/dashboard',
          route: { path: '/' },
          user: { userId: 1, tokenVersion: 0 },
        }),
      ),
    );
  });
});
