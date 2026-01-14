import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { normalizeResource } from '../../../shared/security/security.utils';
import { ApiMessages } from '../../../shared/http/api-messages';

/**
 * Caso de uso: atribuir permissão a um role.
 * Regras:
 * - roleId deve existir
 * - não pode duplicar (roleId + resource + action)
 * - registrar data/hora (assignedAt) e auditoria (audit)
 */
@Injectable()
export class AssignPermissionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    actorUserId: number;
    roleId: number;
    resource: string;
    action: string;
  }): Promise<{
    roleId: number;
    resource: string;
    action: string;
    assignedAt: Date;
  }> {
    const roleId = Number(input.roleId);
    const resource = normalizeResource(input.resource);
    const action = String(input.action ?? '')
      .trim()
      .toUpperCase();

    if (!['GET', 'POST', 'PUT', 'DELETE', '*'].includes(action)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: ApiMessages.INVALID_ACTION,
        details: { allowed: ['GET', 'POST', 'PUT', 'DELETE', '*'] },
      });
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: ApiMessages.ROLE_NOT_FOUND,
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const permission = await tx.permission.create({
          data: { roleId, resource, action },
        });

        await tx.permissionAssignmentAudit.create({
          data: {
            actorUserId: input.actorUserId,
            roleId,
            resource,
            action,
          },
        });

        return permission;
      });

      return {
        roleId: result.roleId,
        resource: result.resource,
        action: result.action,
        assignedAt: result.assignedAt,
      };
    } catch (e: any) {
      // Prisma unique constraint
      if (e?.code === 'P2002') {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.PERMISSION_ALREADY_EXISTS,
          details: { roleId, resource, action },
        });
      }
      throw e;
    }
  }
}
