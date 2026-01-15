/**
 * Testes unitários do `TokenService`.
 *
 * Objetivo:
 * - Garantir emissão e validação de tokens (JWE contendo JWT assinado)
 * - Cobrir cenários de erro (token inválido, secrets divergentes, payload/tokenType inválidos)
 */
import { TokenService } from '../../shared/security/token.service';
import { createHash } from 'crypto';
import { CompactEncrypt, SignJWT } from 'jose';

describe('TokenService', () => {
  const basePayload = {
    userId: 1,
    roleId: 2,
    roleName: 'USER',
    email: 'u@local.test',
    tokenVersion: 0,
  };

  it('signAccess + verify retorna tokenType=access e payload', async () => {
    const svc = new TokenService();
    const token = await svc.signAccess(basePayload);
    const verified = await svc.verify(token);

    expect(verified.tokenType).toBe('access');
    expect(verified.payload).toEqual(basePayload);
  });

  it('signRefresh + verify retorna tokenType=refresh e payload', async () => {
    const svc = new TokenService();
    const { token, expiresAt } = await svc.signRefresh(basePayload);
    const verified = await svc.verify(token);

    expect(expiresAt).toBeInstanceOf(Date);
    expect(verified.tokenType).toBe('refresh');
    expect(verified.payload).toEqual(basePayload);
  });

  it('hashToken é determinístico e não retorna token puro', async () => {
    const svc = new TokenService();
    const t = await svc.signAccess(basePayload);
    const h1 = svc.hashToken(t);
    const h2 = svc.hashToken(t);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(t);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verify falha com token inválido', async () => {
    const svc = new TokenService();
    await expect(svc.verify('not-a-token')).rejects.toBeTruthy();
  });

  it('verify falha quando tokenType é inválido (cobre branch)', async () => {
    process.env.JWT_SECRET = 'jwt';
    process.env.JWE_SECRET = 'jwe';
    process.env.TOKEN_ISSUER = 'iss';
    process.env.TOKEN_AUDIENCE = 'aud';
    const svc = new TokenService();

    const jwtKey = createHash('sha256').update(process.env.JWT_SECRET).digest();
    const jweKey = createHash('sha256').update(process.env.JWE_SECRET).digest();

    const inner = await new SignJWT({
      ...basePayload,
      tokenType: 'weird',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(process.env.TOKEN_ISSUER)
      .setAudience(process.env.TOKEN_AUDIENCE)
      .setSubject(String(basePayload.userId))
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .setJti('x')
      .sign(jwtKey);

    const jwe = await new CompactEncrypt(new TextEncoder().encode(inner))
      .setProtectedHeader({
        alg: 'dir',
        enc: 'A256GCM',
        cty: 'JWT',
        typ: 'JWE',
      })
      .encrypt(jweKey);

    await expect(svc.verify(jwe)).rejects.toBeTruthy();
  });

  it('verify falha quando payload é inválido (cobre branch)', async () => {
    process.env.JWT_SECRET = 'jwt2';
    process.env.JWE_SECRET = 'jwe2';
    process.env.TOKEN_ISSUER = 'iss2';
    process.env.TOKEN_AUDIENCE = 'aud2';
    const svc = new TokenService();

    const jwtKey = createHash('sha256').update(process.env.JWT_SECRET).digest();
    const jweKey = createHash('sha256').update(process.env.JWE_SECRET).digest();

    // payload sem campos obrigatórios
    const inner = await new SignJWT({ tokenType: 'access' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(process.env.TOKEN_ISSUER)
      .setAudience(process.env.TOKEN_AUDIENCE)
      .setSubject('1')
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .setJti('y')
      .sign(jwtKey);

    const jwe = await new CompactEncrypt(new TextEncoder().encode(inner))
      .setProtectedHeader({
        alg: 'dir',
        enc: 'A256GCM',
        cty: 'JWT',
        typ: 'JWE',
      })
      .encrypt(jweKey);

    await expect(svc.verify(jwe)).rejects.toBeTruthy();
  });

  it('verify falha quando secrets não batem', async () => {
    process.env.JWT_SECRET = 'a';
    process.env.JWE_SECRET = 'b';
    process.env.TOKEN_ISSUER = 'iss1';
    process.env.TOKEN_AUDIENCE = 'aud1';
    const svc1 = new TokenService();
    const token = await svc1.signAccess(basePayload);

    process.env.JWT_SECRET = 'a';
    process.env.JWE_SECRET = 'c';
    process.env.TOKEN_ISSUER = 'iss1';
    process.env.TOKEN_AUDIENCE = 'aud1';
    const svc2 = new TokenService();

    await expect(svc2.verify(token)).rejects.toBeTruthy();
  });

  it('em produção, falha rápido se envs obrigatórias estiverem ausentes/fracas', () => {
    const oldEnv = { ...process.env };
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.JWE_SECRET;
      delete process.env.TOKEN_ISSUER;
      delete process.env.TOKEN_AUDIENCE;
      expect(() => new TokenService()).toThrow(/JWT_SECRET/i);

      process.env.JWT_SECRET = 'x'.repeat(32);
      delete process.env.JWE_SECRET;
      expect(() => new TokenService()).toThrow(/JWE_SECRET/i);

      process.env.JWE_SECRET = 'y'.repeat(32);
      delete process.env.TOKEN_ISSUER;
      expect(() => new TokenService()).toThrow(/TOKEN_ISSUER/i);

      process.env.TOKEN_ISSUER = 'iss';
      delete process.env.TOKEN_AUDIENCE;
      expect(() => new TokenService()).toThrow(/TOKEN_AUDIENCE/i);
    } finally {
      process.env = oldEnv;
    }
  });
});
