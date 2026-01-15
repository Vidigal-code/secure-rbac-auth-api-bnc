/**
 * Testes unitários de controllers (delegação).
 *
 * Objetivo:
 * - Garantir que controllers apenas delegam para usecases e repassam payloads corretos.
 */
import { AuthController } from '../../modules/auth/presentation/auth.controller';
import { PermissionsController } from '../../modules/permissions/presentation/permissions.controller';

describe('controllers (unit)', () => {
  it('AuthController delega para usecases', async () => {
    const loginUseCase: any = { execute: jest.fn(() => ({ ok: 1 })) };
    const registerUseCase: any = { execute: jest.fn(() => ({ ok: 2 })) };
    const refreshUseCase: any = { execute: jest.fn(() => ({ ok: 3 })) };
    const logoutUseCase: any = { execute: jest.fn(() => ({ ok: 4 })) };

    const c = new AuthController(
      loginUseCase,
      registerUseCase,
      refreshUseCase,
      logoutUseCase,
    );

    await expect(
      c.login({ email: 'a', password: 'b' } as any),
    ).resolves.toEqual({ ok: 1 });
    await expect(
      c.register({ email: 'a', password: 'b' } as any),
    ).resolves.toEqual({ ok: 2 });
    await expect(c.refresh({ refreshToken: 'r' } as any)).resolves.toEqual({
      ok: 3,
    });
    await expect(
      c.logout({}, { user: { userId: 10 } } as any),
    ).resolves.toEqual({ ok: 4 });

    expect(loginUseCase.execute).toHaveBeenCalled();
    expect(registerUseCase.execute).toHaveBeenCalled();
    expect(refreshUseCase.execute).toHaveBeenCalledWith({ refreshToken: 'r' });
    expect(logoutUseCase.execute).toHaveBeenCalledWith({ userId: 10 });
  });

  it('PermissionsController delega para usecase com actorUserId', async () => {
    const assignPermission: any = { execute: jest.fn(() => ({ ok: 1 })) };
    const c = new PermissionsController(assignPermission);

    await expect(
      c.assign(
        { roleId: 2, resource: '/x', action: 'GET' } as any,
        { user: { userId: 1 } } as any,
      ),
    ).resolves.toEqual({ ok: 1 });
    expect(assignPermission.execute).toHaveBeenCalledWith({
      actorUserId: 1,
      roleId: 2,
      resource: '/x',
      action: 'GET',
    });
  });
});
