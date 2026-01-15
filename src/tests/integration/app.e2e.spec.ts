/**
 * Teste de integração (sem DB real).
 *
 * Objetivo:
 * - Validar o pipeline real do Nest (prefixo, pipes, guards, interceptor e filter)
 * - Exercitar cenários 401/403/200 sem depender do SQL Server
 *
 * Estratégia:
 * - Sobe o AppModule em memória
 * - Override de `PrismaService` e `TokenService` com mocks controláveis
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { ApiExceptionFilter } from '../../shared/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../shared/http/api-response.interceptor';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JweAuthGuard } from '../../shared/security/jwe-auth.guard';
import { PermissionsGuard } from '../../shared/security/permissions.guard';
import { TokenService } from '../../shared/security/token.service';

describe('integration: app pipeline', () => {
  let app: INestApplication;
  let prismaMock: any;
  let tokenServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: { findUnique: jest.fn() },
      permission: { findMany: jest.fn() },
    };
    tokenServiceMock = {
      verify: jest.fn(),
      // usecases também dependem disso; aqui só precisamos do verify para o guard
      signAccess: jest.fn(() => 'ACCESS'),
      signRefresh: jest.fn(() => ({
        token: 'REFRESH',
        expiresAt: new Date('2030-01-01'),
      })),
      hashToken: jest.fn(() => 'HASH'),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(TokenService)
      .useValue(tokenServiceMock)
      .compile();

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/dashboard -> 401 sem Authorization', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard')
      .expect(401)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('UNAUTHORIZED');
      });
  });

  it('GET /api/dashboard -> 403 quando não tem permissão', async () => {
    tokenServiceMock.verify.mockResolvedValueOnce({
      tokenType: 'access',
      payload: {
        userId: 1,
        roleId: 2,
        roleName: 'USER',
        email: 'u@local.test',
        tokenVersion: 0,
      },
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      isActive: true,
      tokenVersion: 0,
      roleId: 2,
      role: { name: 'USER' },
    });
    prismaMock.permission.findMany.mockResolvedValueOnce([
      { resource: '/relatorios', action: 'GET' },
    ]);

    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', 'Bearer TOKEN')
      .expect(403)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('FORBIDDEN');
        expect(body.error.details.requiredPermission).toEqual({
          resource: '/dashboard',
          action: 'GET',
        });
      });
  });

  it('GET /api/dashboard -> 200 quando tem permissão (resource "*") e resposta passa por interceptor', async () => {
    tokenServiceMock.verify.mockResolvedValueOnce({
      tokenType: 'access',
      payload: {
        userId: 1,
        roleId: 2,
        roleName: 'USER',
        email: 'u@local.test',
        tokenVersion: 0,
      },
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1,
      isActive: true,
      tokenVersion: 0,
      roleId: 2,
      role: { name: 'USER' },
    });
    prismaMock.permission.findMany.mockResolvedValueOnce([
      { resource: '*', action: 'GET' },
    ]);

    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', 'Bearer TOKEN')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: true,
          data: { message: expect.any(String), content: {} },
        });
      });
  });

  it('POST /api/auth/register valida DTO (400) e passa pelo exception filter', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-email', password: '123' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('BAD_REQUEST');
        expect(String(body.error.message)).toContain('email');
      });
  });
});
