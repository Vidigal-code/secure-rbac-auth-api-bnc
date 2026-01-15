import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JweAuthGuard } from './shared/security/jwe-auth.guard';
import { PermissionsGuard } from './shared/security/permissions.guard';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { ApiResponseInterceptor } from './shared/http/api-response.interceptor';
import { PrismaService } from './shared/prisma/prisma.service';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // CORS (restrito por env). Em produção, configure CORS_ORIGINS com domínios permitidos.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
  });

  // Headers de segurança.
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true, preload: true }
          : false,
      contentSecurityPolicy:
        process.env.HELMET_CSP_ENABLED === 'true' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Guards globais (ordem importa): autenticação antes de autorização.
  app.useGlobalGuards(app.get(JweAuthGuard), app.get(PermissionsGuard));

  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  // Swagger (OpenAPI) - em PT-BR.
  // Em produção, é recomendado desabilitar (SWAGGER_ENABLED=false) ou proteger o endpoint.
  // Obs.: durante testes (Jest), desabilitamos para evitar depender de um HttpAdapter real.
  const isJest = typeof process.env.JEST_WORKER_ID !== 'undefined';
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED !== 'false' &&
    process.env.NODE_ENV !== 'production' &&
    !isJest;

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Secure RBAC Auth API')
      .setDescription(
        [
          'API de autenticação (JWT interno assinado + JWE criptografado) e autorização RBAC por (resource, action).',
          '',
          '## Envelope de resposta (padrão)',
          '',
          '**Sucesso**',
          '```json',
          '{',
          '  "success": true,',
          '  "data": {',
          '    "...": "..."',
          '  }',
          '}',
          '```',
          '',
          '**Erro**',
          '```json',
          '{',
          '  "success": false,',
          '  "error": {',
          '    "code": "FORBIDDEN",',
          '    "message": "Você não tem permissão para acessar este recurso",',
          '    "details": {',
          '      "...": "..."',
          '    }',
          '  }',
          '}',
          '```',
          '',
          '## Visão geral (como a requisição é processada)',
          '- **Prefixo global**: todas as rotas da API começam com `/api`.',
          '- **Guard 1 (Auth)**: valida Bearer e preenche `req.user`.',
          '- **Guard 2 (RBAC)**: valida `req.user` contra permissões no banco (role -> permissions).',
          '- **Interceptor**: em sucesso, envelopa a resposta no padrão acima.',
          '- **Exception filter**: em erro, envelopa a resposta no padrão acima.',
          '',
          '## Autenticação',
          '- Envie o access token no header:',
          '```http',
          'Authorization: Bearer <token>',
          '```',
          '- O token Bearer é um **JWE** contendo um **JWT interno** (nested JWT).',
          '- O access token **sempre** deve ter `tokenType="access"` (refresh tokens não funcionam como Bearer).',
          '- Rotas públicas: marcadas como **Public** (não exigem Bearer).',
          '',
          '### Tokens (JWS + JWE / nested JWT)',
          '- O servidor assina um JWT interno (HS256) com claims: `userId`, `roleId`, `roleName`, `email`, `tokenVersion`, `tokenType`.',
          '- Em seguida, criptografa esse JWT em um JWE (`A256GCM`, `alg=dir`), para não expor claims no cliente/logs.',
          '- `issuer` e `audience` são validados no verify.',
          '',
          '### Refresh token (rotação / enterprise)',
          '- O refresh token é persistido no banco **somente como hash SHA-256**.',
          '- Ao renovar, um novo refresh é emitido e o anterior é revogado (rotação).',
          '- Se um refresh revogado for reapresentado (reuse), o sistema revoga todos os refresh tokens ativos do usuário e incrementa `tokenVersion` (invalida access tokens).',
          '',
          '### Invalidação sem blacklist (tokenVersion)',
          '- Em rotas protegidas, o guard consulta o usuário no banco e compara `req.user.tokenVersion` com `user.tokenVersion`.',
          '- Se divergir, o acesso é bloqueado (evita uso de tokens antigos).',
          '',
          '## RBAC (permissões)',
          '- O `resource` é derivado automaticamente da rota, removendo o prefixo global `/api` (ex.: `GET /api/dashboard` => `resource="/dashboard"`).',
          '- O `action` é o método HTTP (GET/POST/PUT/DELETE).',
          '- Uma permissão permite acesso se `resource` bater exatamente ou for `*` **e** `action` bater exatamente ou for `*`.',
          '- O erro 403 retorna em `details`: `requiredPermission` + `yourPermissions` para facilitar troubleshooting.',
          '',
          '**Exemplo de `details` em 403 (FORBIDDEN)**',
          '```json',
          '{',
          '  "requiredPermission": { "resource": "/dashboard", "action": "GET" },',
          '  "yourPermissions": [',
          '    { "resource": "/relatorios", "action": "GET" }',
          '  ]',
          '}',
          '```',
          '',
          '### Decorators de segurança',
          '- **Public**: pula autenticação (sem Bearer).',
          '- **SkipPermissions**: exige autenticação, mas pula a checagem RBAC.',
          '- **AdminOnly**: exige roleName = `ADMIN` (além das demais regras).',
          '',
          '## Rate limiting (Throttler)',
          '- Existe limite global (por IP) e limites específicos em alguns endpoints de auth.',
          '- Em excesso: HTTP 429 (Too Many Requests).',
          '',
          '## Códigos de erro comuns',
          '- `BAD_REQUEST`: validação de DTO, parâmetros inválidos, duplicidade, etc.',
          '- `UNAUTHORIZED`: Bearer ausente/ inválido/ expirado, credenciais inválidas, refresh inválido.',
          '- `FORBIDDEN`: autenticado, porém sem permissão (RBAC) ou bloqueado por política (ex.: tokenVersion divergente).',
          '- `INTERNAL_SERVER_ERROR`: erro inesperado.',
          '',
          '## Swagger',
          '- UI: `/docs`',
          '- JSON: `/docs-json`',
          '- **Dica**: clique em **Authorize** e cole **apenas o access token** (sem o prefixo "Bearer ").',
        ].join('\n'),
      )
      .setVersion('1.0.0')
      .addServer('/', 'Servidor padrão (as rotas já incluem o prefixo /api)')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWE',
          description:
            'Token de acesso retornado em /auth/login e /auth/refresh. Envie como: `Authorization: Bearer <token>`',
        },
        'BearerAuth',
      )
      .addTag('Autenticação', 'Login, registro, refresh token e logout')
      .addTag('RBAC / Permissões', 'Gestão de permissões e rotas protegidas')
      .addTag(
        'Recursos protegidos (exemplos)',
        'Rotas de exemplo que exigem permissões (resource/action)',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
      jsonDocumentUrl: 'docs-json',
    });
  }

  // Encerramento do Prisma/conexões.
  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

// Evita side-effects durante testes unitários/integrados.
if (process.env.NODE_ENV !== 'test') {
  void bootstrap();
}
