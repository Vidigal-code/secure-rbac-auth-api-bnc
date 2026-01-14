import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
const { PrismaClient } = require('@prisma/client');

/**
 * PrismaService centraliza o acesso ao banco via Prisma.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Habilita encerramento gracioso da aplicação.
   * Observação: usamos eventos do Node para evitar divergências de tipagem entre versões do Prisma.
   */
  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
