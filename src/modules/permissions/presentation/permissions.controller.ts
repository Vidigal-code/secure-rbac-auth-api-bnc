import { Body, Controller, Post, Req } from '@nestjs/common';
import { AdminOnly } from '../../../shared/security/admin-only.decorator';
import { AssignPermissionUseCase } from '../application/assign-permission.usecase';
import { AssignPermissionDto } from './dto/assign-permission.dto';

/**
 * Controller de permissões (RBAC).
 */
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly assignPermission: AssignPermissionUseCase) {}

  /**
   * Atribui uma permissão a um role.
   * Acesso: apenas ADMIN (validado pelo guard).
   */
  @AdminOnly()
  @Post('assign')
  async assign(@Body() dto: AssignPermissionDto, @Req() req: any) {
    return this.assignPermission.execute({
      actorUserId: req.user.userId,
      roleId: dto.roleId,
      resource: dto.resource,
      action: dto.action,
    });
  }
}
