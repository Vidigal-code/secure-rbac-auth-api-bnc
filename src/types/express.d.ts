import 'express';

declare module 'express' {
  export interface Request {
    /**
     * Usuário autenticado (injetado pelo guard de autenticação).
     */
    user?: {
      userId: number;
      roleId: number;
      roleName: string;
      email: string;
      tokenVersion: number;
    };
  }
}
