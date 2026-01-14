/**
 * Mensagens padronizadas da API.
 * Centraliza textos para evitar divergências e facilitar manutenção.
 */
export const ApiMessages = {
  // Sucesso
  ACCESS_DASHBOARD: 'Acesso autorizado ao dashboard',
  ACCESS_RELATORIOS: 'Acesso autorizado aos relatórios',
  LOGIN_SUCCESS: 'Login realizado com sucesso',
  REGISTER_SUCCESS: 'Registro realizado com sucesso',
  PERMISSION_ASSIGNED: 'Permissão atribuída com sucesso',
  REFRESH_SUCCESS: 'Token renovado com sucesso',
  LOGOUT_SUCCESS: 'Logout realizado com sucesso',

  // Auth
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  INVALID_OR_EXPIRED_TOKEN: 'Token inválido ou expirado',
  WEAK_PASSWORD:
    'Senha fraca. Exemplo de senha forte: Test1245@! (mín. 8, maiúscula, minúscula, número e caractere especial)',
  EMAIL_ALREADY_EXISTS: 'E-mail já cadastrado',
  INVALID_REFRESH_TOKEN: 'Refresh token inválido ou expirado',

  // RBAC
  FORBIDDEN_RESOURCE: 'Você não tem permissão para acessar este recurso',
  ROLE_NOT_FOUND: 'roleId não encontrado',
  PERMISSION_ALREADY_EXISTS: 'Permissão já existe para este perfil',
  INVALID_ACTION: 'Action inválida',

  // Geral
  INTERNAL_ERROR: 'Erro interno',
} as const;
