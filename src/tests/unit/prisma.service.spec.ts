/**
 * Testes unitários do `PrismaService`.
 *
 * Objetivo:
 * - Garantir `onModuleInit()` chamando `$connect()`
 * - Garantir hook `beforeExit` fechando a aplicação (`app.close()`)
 *
 * Observação:
 * - `@prisma/client` é mockado para não depender de banco.
 */
jest.mock('@prisma/client', () => {
  class PrismaClientMock {
    $connect = jest.fn(() => undefined);
  }
  return { PrismaClient: PrismaClientMock };
});

import { PrismaService } from '../../shared/prisma/prisma.service';

describe('PrismaService', () => {
  it('onModuleInit conecta', async () => {
    const svc = new PrismaService() as any;
    await svc.onModuleInit();
    expect(svc.$connect).toHaveBeenCalledTimes(1);
  });

  it('enableShutdownHooks registra handler beforeExit e fecha o app', () => {
    const svc = new PrismaService();
    const onSpy = jest
      .spyOn(process, 'on')
      .mockImplementation((event: any, handler: any) => {
        if (event === 'beforeExit') handler();
        return process as any;
      });

    const app = { close: jest.fn() } as any;
    svc.enableShutdownHooks(app);

    expect(onSpy).toHaveBeenCalled();
    expect(app.close).toHaveBeenCalledTimes(1);
    onSpy.mockRestore();
  });
});
