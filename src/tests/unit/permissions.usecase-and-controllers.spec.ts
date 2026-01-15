/**
 * Testes unitários de Permissions (usecase + controllers de exemplo).
 *
 * Objetivo:
 * - `AssignPermissionUseCase`: validações e tratamento de erro P2002
 * - Controllers: retorno de mensagens padronizadas
 */
import { BadRequestException } from '@nestjs/common';
import { ApiMessages } from '../../shared/http/api-messages';
import { AssignPermissionUseCase } from '../../modules/permissions/application/assign-permission.usecase';
import { DashboardController } from '../../modules/permissions/presentation/dashboard.controller';
import { RelatoriosController } from '../../modules/permissions/presentation/relatorios.controller';

describe('permissions usecase + controllers', () => {
  describe('DashboardController / RelatoriosController', () => {
    it('retorna mensagens padronizadas', () => {
      expect(new DashboardController().getDashboard()).toEqual({
        message: ApiMessages.ACCESS_DASHBOARD,
        content: {},
      });
      expect(new RelatoriosController().getRelatorios()).toEqual({
        message: ApiMessages.ACCESS_RELATORIOS,
        content: {},
      });
    });
  });

  describe('AssignPermissionUseCase', () => {
    it('valida action', async () => {
      const prisma: any = { role: { findUnique: jest.fn() } };
      const uc = new AssignPermissionUseCase(prisma);
      await expect(
        uc.execute({
          actorUserId: 1,
          roleId: 1,
          resource: '/x',
          action: 'PATCH',
        }),
      ).rejects.toMatchObject(
        new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.INVALID_ACTION,
        }),
      );
    });

    it('action undefined também é inválida (cobre branch do ??)', async () => {
      const prisma: any = { role: { findUnique: jest.fn() } };
      const uc = new AssignPermissionUseCase(prisma);
      await expect(
        uc.execute({
          actorUserId: 1,
          roleId: 1,
          resource: '/x',
          action: undefined as any,
        }),
      ).rejects.toBeTruthy();
    });

    it('valida roleId existente', async () => {
      const prisma: any = { role: { findUnique: jest.fn(() => null) } };
      const uc = new AssignPermissionUseCase(prisma);
      await expect(
        uc.execute({
          actorUserId: 1,
          roleId: 1,
          resource: '/x',
          action: 'GET',
        }),
      ).rejects.toMatchObject(
        new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.ROLE_NOT_FOUND,
        }),
      );
    });

    it('cria permission + audit via transaction', async () => {
      const now = new Date('2030-01-01');
      const tx: any = {
        permission: {
          create: jest.fn(() => ({
            roleId: 2,
            resource: '/relatorios',
            action: 'GET',
            assignedAt: now,
          })),
        },
        permissionAssignmentAudit: { create: jest.fn(() => ({})) },
      };
      const prisma: any = {
        role: { findUnique: jest.fn(() => ({ id: 2 })) },
        $transaction: jest.fn((fn: any) => fn(tx)),
      };
      const uc = new AssignPermissionUseCase(prisma);
      const out = await uc.execute({
        actorUserId: 1,
        roleId: 2,
        resource: 'relatorios/',
        action: 'get',
      });
      expect(out).toEqual({
        roleId: 2,
        resource: '/relatorios',
        action: 'GET',
        assignedAt: now,
      });
      expect(tx.permission.create).toHaveBeenCalled();
      expect(tx.permissionAssignmentAudit.create).toHaveBeenCalled();
    });

    it('traduz P2002 (duplicate) para BadRequest com details', async () => {
      const prisma: any = {
        role: { findUnique: jest.fn(() => ({ id: 2 })) },
        $transaction: jest.fn(() => {
          const err: any = new Error('dup');
          err.code = 'P2002';
          throw err;
        }),
      };
      const uc = new AssignPermissionUseCase(prisma);
      await expect(
        uc.execute({
          actorUserId: 1,
          roleId: 2,
          resource: '/relatorios',
          action: 'GET',
        }),
      ).rejects.toMatchObject(
        new BadRequestException({
          code: 'BAD_REQUEST',
          message: ApiMessages.PERMISSION_ALREADY_EXISTS,
          details: { roleId: 2, resource: '/relatorios', action: 'GET' },
        }),
      );
    });

    it('re-throw para erro desconhecido', async () => {
      const prisma: any = {
        role: { findUnique: jest.fn(() => ({ id: 2 })) },
        $transaction: jest.fn(() => {
          const err: any = new Error('boom');
          err.code = 'OTHER';
          throw err;
        }),
      };
      const uc = new AssignPermissionUseCase(prisma);
      await expect(
        uc.execute({
          actorUserId: 1,
          roleId: 2,
          resource: '/relatorios',
          action: 'GET',
        }),
      ).rejects.toMatchObject({ message: 'boom' });
    });
  });
});
