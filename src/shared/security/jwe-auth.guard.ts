import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from './token.service';
import { IS_PUBLIC_KEY } from './security.constants';
import { ApiMessages } from '../http/api-messages';

/**
 * Guard de autenticação:
 * - Exige Authorization: Bearer <token> em rotas protegidas
 * - Valida token (JWE + JWT interno)
 * - Em erro: 401 com mensagem padronizada
 */
@Injectable()
export class JweAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = String(req.headers?.authorization ?? '');
    const [type, token] = auth.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_OR_EXPIRED_TOKEN,
      });
    }

    try {
      const verified = await this.tokenService.verify(token);
      if (verified.tokenType !== 'access') {
        throw new Error('TokenType inválido');
      }

      const payload = verified.payload;
      req.user = {
        userId: payload.userId,
        roleId: payload.roleId,
        roleName: payload.roleName,
        email: payload.email,
        tokenVersion: payload.tokenVersion,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: ApiMessages.INVALID_OR_EXPIRED_TOKEN,
      });
    }
  }
}
