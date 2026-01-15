import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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
