import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { AdminOnly } from '../../../shared/security/admin-only.decorator';
import { AssignPermissionUseCase } from '../application/assign-permission.usecase';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import {
  ApiErrorResponseDto,
  ApiSuccessResponseDto,
} from '../../../shared/http/swagger/api-response.dto';
import { AssignPermissionResponseDto } from './dto/assign-permission.response.dto';

/**
 * Controller de permissões (RBAC).
 */
@ApiTags('RBAC / Permissões')
@ApiBearerAuth('BearerAuth')
@ApiExtraModels(
  ApiSuccessResponseDto,
  ApiErrorResponseDto,
  AssignPermissionDto,
  AssignPermissionResponseDto,
)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly assignPermission: AssignPermissionUseCase) {}

  /**
   * Atribui uma permissão a um role.
   * Acesso: apenas ADMIN (validado pelo guard).
   */
  @AdminOnly()
  @Post('assign')
  @ApiOperation({
    summary: 'Atribuir permissão a um role (ADMIN)',
    description: [
      'Cria uma permissão `(roleId, resource, action)` para um perfil.',
      '',
      'Regras importantes:',
      '- `action` permitido: `GET`, `POST`, `PUT`, `DELETE` ou `*`.',
      '- `resource` é normalizado (sempre começa com `/`). Use `*` para liberar qualquer recurso.',
      '- A rota é **ADMIN-only** e ainda passa pelo RBAC: o ADMIN precisa ter permissão para `POST /permissions/assign` (ou `*/*`).',
    ].join('\n'),
  })
  @ApiBody({ type: AssignPermissionDto })
  @ApiCreatedResponse({
    description: 'Permissão atribuída com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AssignPermissionResponseDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'Parâmetros inválidos (ex.: action inválida), roleId inexistente ou permissão duplicada.',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiUnauthorizedResponse({
    description:
      'Não autenticado (Authorization ausente ou token inválido/expirado).',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
  })
  @ApiForbiddenResponse({
    description:
      'Sem permissão (não é ADMIN e/ou não possui a permissão requerida).',
    schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
    content: {
      'application/json': {
        example: {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para acessar este recurso',
            details: {
              requiredPermission: {
                resource: '/permissions/assign',
                action: 'POST',
              },
              yourPermissions: [{ resource: '/dashboard', action: 'GET' }],
            },
          },
        },
      },
    },
  })
  async assign(@Body() dto: AssignPermissionDto, @Req() req: any) {
    return this.assignPermission.execute({
      actorUserId: req.user.userId,
      roleId: dto.roleId,
      resource: dto.resource,
      action: dto.action,
    });
  }
}
