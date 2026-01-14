import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { CompactEncrypt, compactDecrypt, jwtVerify, SignJWT } from 'jose';

export type TokenPayload = {
  userId: number;
  roleId: number;
  roleName: string;
  email: string;
  tokenVersion: number;
};

export type TokenType = 'access' | 'refresh';

export type VerifiedToken = {
  tokenType: TokenType;
  payload: TokenPayload;
};

/**
 * Serviço de token usando JWT (JWS) + JWE (nested JWT).
 *
 * Por que nested?
 * - Mantém compatibilidade com o conceito de "JWT" do enunciado (claims e validação padrão)
 * - Adiciona confidencialidade (JWE) para evitar expor claims no cliente/logs
 *
 * Enterprise:
 * - `tokenVersion`: permite invalidar access tokens sem blacklist (logout/revogação)
 * - `jti`: identificador único por token (útil para auditoria/telemetria)
 */
@Injectable()
export class TokenService {
  private readonly jwtKey: Uint8Array;
  private readonly jweKey: Uint8Array;
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    const jwtSecret = process.env.JWT_SECRET ?? 'dev-jwt-secret';
    const jweSecret = process.env.JWE_SECRET ?? 'dev-jwe-secret';

    this.issuer = process.env.TOKEN_ISSUER ?? 'secure-rbac-auth-api-bnc';
    this.audience = process.env.TOKEN_AUDIENCE ?? 'secure-rbac-auth-api-bnc';

    if (isProd) {
      // Em produção, falhe rápido se secrets estiverem ausentes ou fracos.
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET ausente/fraco (produção exige >= 32 chars).');
      }
      if (!process.env.JWE_SECRET || process.env.JWE_SECRET.length < 32) {
        throw new Error('JWE_SECRET ausente/fraco (produção exige >= 32 chars).');
      }
      if (!process.env.TOKEN_ISSUER) {
        throw new Error('TOKEN_ISSUER ausente (obrigatório em produção).');
      }
      if (!process.env.TOKEN_AUDIENCE) {
        throw new Error('TOKEN_AUDIENCE ausente (obrigatório em produção).');
      }
    }

    this.jwtKey = createHash('sha256').update(jwtSecret).digest();
    this.jweKey = createHash('sha256').update(jweSecret).digest();

    this.accessExpiresInSeconds = Number(
      process.env.JWT_EXPIRES_IN_SECONDS ?? 900, // 15 min default
    );
    this.refreshExpiresInSeconds = Number(
      process.env.REFRESH_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7, // 7 dias
    );
  }

  /**
   * Gera token de acesso (Bearer).
   */
  async signAccess(payload: TokenPayload): Promise<string> {
    return this.sign(payload, 'access', this.accessExpiresInSeconds);
  }

  /**
   * Gera refresh token para rotação/renovação.
   */
  async signRefresh(
    payload: TokenPayload,
  ): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(
      Date.now() + this.refreshExpiresInSeconds * 1000,
    );
    const token = await this.sign(
      payload,
      'refresh',
      this.refreshExpiresInSeconds,
    );
    return { token, expiresAt };
  }

  /**
   * Retorna o hash (SHA-256) do refresh token para persistência segura no banco.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sign(
    payload: TokenPayload,
    tokenType: TokenType,
    expiresInSeconds: number,
  ): Promise<string> {
    const jwt = await new SignJWT({
      userId: payload.userId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      email: payload.email,
      tokenVersion: payload.tokenVersion,
      tokenType,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setSubject(String(payload.userId))
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
      .setJti(crypto.randomUUID())
      .sign(this.jwtKey);

    const jwe = await new CompactEncrypt(new TextEncoder().encode(jwt))
      .setProtectedHeader({
        alg: 'dir',
        enc: 'A256GCM',
        cty: 'JWT',
        typ: 'JWE',
      })
      .encrypt(this.jweKey);

    return jwe;
  }

  /**
   * Valida token Bearer:
   * - Decripta JWE
   * - Verifica assinatura/exp do JWT interno
   * Retorna payload tipado ou lança erro.
   */
  async verify(token: string): Promise<VerifiedToken> {
    const { plaintext } = await compactDecrypt(token, this.jweKey);
    const innerJwt = new TextDecoder().decode(plaintext);

    const { payload } = await jwtVerify(innerJwt, this.jwtKey, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    });

    const userId = Number(payload.userId);
    const roleId = Number(payload.roleId);
    const roleName =
      typeof payload.roleName === 'string' ? payload.roleName : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const tokenVersion = Number(payload.tokenVersion);
    const tokenType = payload.tokenType;
    if (tokenType !== 'access' && tokenType !== 'refresh') {
      throw new Error('TokenType inválido');
    }

    if (!userId || !roleId || !roleName || !email || Number.isNaN(tokenVersion)) {
      throw new Error('Payload inválido');
    }

    return {
      tokenType,
      payload: { userId, roleId, roleName, email, tokenVersion },
    };
  }
}
