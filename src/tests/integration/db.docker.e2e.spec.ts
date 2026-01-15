/**
 * Teste de integração (com DB real via Docker).
 *
 * Objetivo:
 * - Validar a API ponta-a-ponta com Prisma real + SQL Server
 *
 * Como rodar:
 * - Suba o SQL Server: `docker compose up -d mssql`
 * - Crie os bancos: `npm run docker:db:init`
 * - Rode com:
 *   - RUN_DB_TESTS=true
 *   - DATABASE_URL apontando para um DB de teste (ex.: `secure_rbac_auth_test`)
 *
 * Observação:
 * - Fica `skip` por padrão (para não exigir Docker em todo ambiente CI/local).
 */
import { execSync } from 'child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

const { PrismaClient } = require('@prisma/client');

import { AppModule } from '../../app.module';
import { ApiExceptionFilter } from '../../shared/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../shared/http/api-response.interceptor';
import { JweAuthGuard } from '../../shared/security/jwe-auth.guard';
import { PermissionsGuard } from '../../shared/security/permissions.guard';

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);

describeIf(process.env.RUN_DB_TESTS === 'true')(
  'integration (docker db): real Prisma + SQL Server',
  () => {
    let app: INestApplication;
    let prisma: any;

    beforeAll(async () => {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          'DATABASE_URL não definido (necessário para RUN_DB_TESTS=true).',
        );
      }

      // Garante schema atualizado no DB alvo.
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });

      prisma = new PrismaClient();

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalGuards(app.get(JweAuthGuard), app.get(PermissionsGuard));
      app.useGlobalInterceptors(new ApiResponseInterceptor());
      app.useGlobalFilters(new ApiExceptionFilter());
      await app.init();
    }, 120_000);

    afterAll(async () => {
      await prisma?.$disconnect();
      await app?.close();
    });

    it('register -> cria usuário real no DB e consegue acessar /dashboard após criar permission no DB', async () => {
      const email = `it_${Date.now()}@local.test`;
      const password = 'Test1245@!'; // forte (RegisterDto)

      // register
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email, password })
        .expect(201);

      const accessToken = reg.body?.data?.token;
      expect(typeof accessToken).toBe('string');

      // sem permissão ainda => 403
      await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // concede permissão GET /dashboard para role USER do usuário criado (direto no DB)
      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });
      expect(user).toBeTruthy();

      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: user.roleId,
            resource: '/dashboard',
            action: 'GET',
          },
        },
        update: {},
        create: { roleId: user.roleId, resource: '/dashboard', action: 'GET' },
      });

      // agora deve permitir
      await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // cleanup (apenas o que criamos)
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.permissionAssignmentAudit.deleteMany({
        where: { roleId: user.roleId },
      });
      await prisma.permission.deleteMany({
        where: { roleId: user.roleId, resource: '/dashboard', action: 'GET' },
      });
      await prisma.user.delete({ where: { id: user.id } });
      // role USER é compartilhada; não deletamos.
    });
  },
);
