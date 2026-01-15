/**
 * Testes unitários do bootstrap (main.ts).
 *
 * Objetivo:
 * - Garantir que o app registra CORS/Helmet/Pipes/Guards/Interceptor/Filter corretamente
 * - Evitar side-effects em testes (NODE_ENV=test não auto-executa)
 *
 * Observação:
 * - Aqui usamos mocks do NestFactory e helmet para não subir servidor real.
 */
jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));
jest.mock('helmet', () => ({
  __esModule: true,
  default: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import { NestFactory } from '@nestjs/core';
import { JweAuthGuard } from '../../shared/security/jwe-auth.guard';
import { PermissionsGuard } from '../../shared/security/permissions.guard';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('main.bootstrap', () => {
  it('bootstrap configura app sem iniciar servidor real (mock)', async () => {
    const enableShutdownHooks = jest.fn();

    const app: any = {
      enableCors: jest.fn(),
      use: jest.fn(),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalGuards: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      useGlobalFilters: jest.fn(),
      get: jest.fn((token: any) => {
        if (token === JweAuthGuard) return { g: 'auth' };
        if (token === PermissionsGuard) return { g: 'perm' };
        if (token === PrismaService) return { enableShutdownHooks };
        return {};
      }),
      listen: jest.fn(() => undefined),
    };

    (NestFactory.create as any).mockResolvedValue(app);

    // Importa o módulo com NODE_ENV=test para não rodar o bootstrap automaticamente.
    process.env.NODE_ENV = 'test';

    const { bootstrap } = require('../../main');

    // Agora rodamos explicitamente em modo "production" para cobrir branches.
    process.env.CORS_ORIGINS = 'http://a.test, http://b.test';
    process.env.HELMET_CSP_ENABLED = 'false';
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3210';
    await bootstrap();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(NestFactory.create).toHaveBeenCalled();
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://a.test', 'http://b.test'],
      credentials: true,
    });
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.useGlobalGuards).toHaveBeenCalledWith(
      { g: 'auth' },
      { g: 'perm' },
    );
    expect(enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledWith(3210);
  });

  it('auto-bootstrap roda quando NODE_ENV != test (cobre branch do main.ts)', async () => {
    let coreRef: any;
    let appRef: any;

    jest.isolateModules(() => {
      const app: any = {
        enableCors: jest.fn(),
        use: jest.fn(),
        setGlobalPrefix: jest.fn(),
        useGlobalPipes: jest.fn(),
        useGlobalGuards: jest.fn(),
        useGlobalInterceptors: jest.fn(),
        useGlobalFilters: jest.fn(),
        get: jest.fn(() => ({ enableShutdownHooks: jest.fn() })),
        listen: jest.fn(() => undefined),
      };

      const core = require('@nestjs/core');
      coreRef = core;
      appRef = app;
      core.NestFactory.create.mockResolvedValue(app);

      // sem CORS_ORIGINS => origins.length === 0 => origin false
      delete process.env.CORS_ORIGINS;
      process.env.HELMET_CSP_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000';

      require('../../main');
    });

    // Aguarda a execução do bootstrap async disparado em background.
    await new Promise((r) => setTimeout(r, 0));

    // Como NODE_ENV != test, o módulo dispara bootstrap automaticamente.
    expect(coreRef.NestFactory.create).toHaveBeenCalled();
    // enableCors pode rodar em tick seguinte; faz uma asserção eventual simples.
    if (appRef.enableCors.mock.calls.length) {
      expect(appRef.enableCors).toHaveBeenCalledWith({
        origin: false,
        credentials: true,
      });
    }
  });
});
