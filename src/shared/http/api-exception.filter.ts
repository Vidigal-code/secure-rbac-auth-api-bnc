import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiMessages } from './api-messages';

type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Filter global para padronizar erros.
 * Sempre retorna: { success:false, error:{ code, message, details? } }
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      const body = this.normalizeHttpExceptionBody(status, response);
      return res.status(status).json(body);
    }

    const body: ApiErrorBody = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: ApiMessages.INTERNAL_ERROR,
      },
    };
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }

  private normalizeHttpExceptionBody(
    status: number,
    response: string | object,
  ): ApiErrorBody {
    const defaultCode =
      status === HttpStatus.UNAUTHORIZED
        ? 'UNAUTHORIZED'
        : status === HttpStatus.FORBIDDEN
          ? 'FORBIDDEN'
          : status === HttpStatus.BAD_REQUEST
            ? 'BAD_REQUEST'
            : 'ERROR';

    if (typeof response === 'string') {
      return {
        success: false,
        error: { code: defaultCode, message: response },
      };
    }

    const anyResp = response as any;
    const message =
      typeof anyResp?.message === 'string'
        ? anyResp.message
        : Array.isArray(anyResp?.message)
          ? anyResp.message.join('; ')
          : 'Erro';

    return {
      success: false,
      error: {
        code: anyResp?.code ?? defaultCode,
        message,
        details: anyResp?.details,
      },
    };
  }
}
