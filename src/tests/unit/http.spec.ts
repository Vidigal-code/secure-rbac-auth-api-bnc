/**
 * Testes unitários de `shared/http`.
 *
 * Objetivo:
 * - `ApiResponseInterceptor`: envelopar respostas de sucesso
 * - `ApiExceptionFilter`: padronizar erros (HttpException e erro desconhecido)
 */
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { ApiExceptionFilter } from '../../shared/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../shared/http/api-response.interceptor';
import { ApiMessages } from '../../shared/http/api-messages';

describe('shared/http', () => {
  describe('ApiResponseInterceptor', () => {
    it('padroniza sucesso: { success:true, data }', (done) => {
      const interceptor = new ApiResponseInterceptor();
      const next: any = { handle: () => of({ ok: 1 }) };

      interceptor.intercept({} as any, next).subscribe((value) => {
        expect(value).toEqual({ success: true, data: { ok: 1 } });
        done();
      });
    });
  });

  describe('ApiExceptionFilter', () => {
    function createRes() {
      const res: any = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    }

    function createHost(res: any) {
      return {
        switchToHttp: () => ({
          getResponse: () => res,
        }),
      } as any;
    }

    it('normaliza HttpException com response string', () => {
      const filter = new ApiExceptionFilter();
      const res = createRes();
      filter.catch(new HttpException('nope', 401), createHost(res));

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'nope' },
      });
    });

    it('normaliza HttpException com response object + message array (join)', () => {
      const filter = new ApiExceptionFilter();
      const res = createRes();
      filter.catch(
        new BadRequestException({ message: ['a', 'b'], details: { x: 1 } }),
        createHost(res),
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'a; b', details: { x: 1 } },
      });
    });

    it('normaliza HttpException com code customizado', () => {
      const filter = new ApiExceptionFilter();
      const res = createRes();
      filter.catch(
        new ForbiddenException({
          code: 'FORBIDDEN',
          message: ApiMessages.FORBIDDEN_RESOURCE,
          details: { requiredPermission: { resource: '/', action: 'GET' } },
        }),
        createHost(res),
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: ApiMessages.FORBIDDEN_RESOURCE,
          details: { requiredPermission: { resource: '/', action: 'GET' } },
        },
      });
    });

    it('fallback de message para "Erro" quando response object não tem message string/array', () => {
      const filter = new ApiExceptionFilter();
      const res = createRes();
      // status não mapeado explicitamente => defaultCode "ERROR"
      const ex = new HttpException({ details: { a: 1 } }, 418);
      filter.catch(ex, createHost(res));

      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'ERROR', message: 'Erro', details: { a: 1 } },
      });
    });

    it('normaliza erro desconhecido como 500', () => {
      const filter = new ApiExceptionFilter();
      const res = createRes();
      filter.catch(new Error('boom'), createHost(res));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: ApiMessages.INTERNAL_ERROR,
        },
      });
    });
  });
});
