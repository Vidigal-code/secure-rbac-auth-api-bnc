/**
 * Testes unitários de decorators/constants e mensagens.
 *
 * Objetivo:
 * - Garantir que `@Public()` e `@AdminOnly()` setam metadata corretamente
 * - Smoke test em `ApiMessages` (evita regressão por remoção acidental)
 */
import {
  ADMIN_ONLY_KEY,
  IS_PUBLIC_KEY,
} from '../../shared/security/security.constants';
import { AdminOnly } from '../../shared/security/admin-only.decorator';
import { Public } from '../../shared/security/public.decorator';
import { ApiMessages } from '../../shared/http/api-messages';

describe('security decorators/constants + ApiMessages', () => {
  it('Public() define metadata IS_PUBLIC_KEY', () => {
    class C {
      method() {}
    }
    Public()(
      C.prototype,
      'method',
      Object.getOwnPropertyDescriptor(C.prototype, 'method')!,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, C.prototype.method)).toBe(true);
  });

  it('AdminOnly() define metadata ADMIN_ONLY_KEY', () => {
    class C {
      method() {}
    }
    AdminOnly()(
      C.prototype,
      'method',
      Object.getOwnPropertyDescriptor(C.prototype, 'method')!,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Reflect.getMetadata(ADMIN_ONLY_KEY, C.prototype.method)).toBe(true);
  });

  it('ApiMessages tem chaves esperadas (smoke)', () => {
    expect(ApiMessages.LOGIN_SUCCESS).toBeTruthy();
    expect(ApiMessages.INVALID_OR_EXPIRED_TOKEN).toBeTruthy();
  });
});
