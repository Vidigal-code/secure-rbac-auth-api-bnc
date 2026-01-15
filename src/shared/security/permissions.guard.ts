import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ApiMessages } from '../http/api-messages';
import {
  ADMIN_ONLY_KEY,
  IS_PUBLIC_KEY,
  SKIP_PERMISSIONS_KEY,
} from './security.constants';
import { extractResourceFromRequest } from './security.utils';

/**
 * Guard de autorização (RBAC):
 * - Roda APÓS o guard de autenticação (req.user já preenchido)
 * - Calcula permission automaticamente por (resource, action) a partir da rota
 * - Se não autorizado: 403 com requiredPermission + yourPermissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipPermissions = this.reflector.getAllAndOverride<boolean>(
      SKIP_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const requiredPermission = {
      resource: extractResourceFromRequest(req),
      action: String(req.method ?? '').toUpperCase(),
    };

    const userId = Number(user?.userId);
    if (!userId) {
      throw this.forbidden(requiredPermission, []);
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
        tokenVersion: true,
        roleId: true,
        role: { select: { name: true } },
      },
    });

    if (!dbUser) {
      throw this.forbidden(requiredPermission, []);
    }

    if (!dbUser.isActive) {
      throw this.forbidden(requiredPermission, []);
    }

    // Invalidação de access tokens sem blacklist:
    // se o usuário incrementou tokenVersion, tokens antigos deixam de valer.
    if (Number(req.user?.tokenVersion) !== Number(dbUser.tokenVersion)) {
      throw this.forbidden(requiredPermission, []);
    }

    req.user.roleId = dbUser.roleId;
    req.user.roleName = dbUser.role.name;

    if (skipPermissions) {
      return true;
    }

    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (adminOnly && dbUser.role.name !== 'ADMIN') {
      throw this.forbidden(requiredPermission, []);
    }

    const roleId = dbUser.roleId;

    const yourPermissions = await this.prisma.permission.findMany({
      where: { roleId },
      select: { resource: true, action: true },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const allowed = yourPermissions.some(
      (p: { resource: string; action: string }) => {
        const resourceOk =
          p.resource === requiredPermission.resource || p.resource === '*';
        const actionOk =
          p.action === requiredPermission.action || p.action === '*';
        return resourceOk && actionOk;
      },
    );

    if (!allowed) {
      throw this.forbidden(requiredPermission, yourPermissions);
    }

    return true;
  }

  private forbidden(
    requiredPermission: { resource: string; action: string },
    yourPermissions: Array<{ resource: string; action: string }>,
  ): ForbiddenException {
    return new ForbiddenException({
      code: 'FORBIDDEN',
      message: ApiMessages.FORBIDDEN_RESOURCE,
      details: {
        requiredPermission,
        yourPermissions,
      },
    });
  }
}
