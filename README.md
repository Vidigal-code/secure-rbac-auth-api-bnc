# secure-rbac-auth-api-bnc

API REST (NestJS + TypeScript) com **RBAC** (roles + permissions).

- Rotas protegidas exigem `Authorization: Bearer <token>`
- **401**: token inválido/expirado
- **403**: token válido, mas sem permissão `{ resource, action }`

## Rodar com Docker (recomendado)

Configure variáveis (opcional): veja `env.example`.

```bash
docker compose up --build
```

API: `http://localhost:3000/api`

### Produção (segurança)

Em `NODE_ENV=production`, o app **falha no boot** se:
- `JWT_SECRET` / `JWE_SECRET` não estiverem definidos com **>= 32 chars**
- `TOKEN_ISSUER` / `TOKEN_AUDIENCE` não estiverem definidos

### Enterprise (tokens)

- **Access token**: inclui `tokenVersion` (invalidação imediata sem blacklist).
- **Refresh token**: tabela `RefreshToken` com **rotação**, **revogação** e **detecção de reuse** (se um refresh já revogado for apresentado, revoga tudo do usuário).

## Rodar local (usando o SQL Server do Docker)

Copie as variáveis de ambiente de `env.local` para seu `.env` (ou exporte no shell).  
Observação: este repo bloqueia `.env` por padrão, então mantemos um `env.local` versionado para facilitar avaliação.

```bash
docker compose up -d mssql
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

## Credenciais (seed)

- **Admin**: `admin@local.test` / `Admin@123`
- **User**: `user@local.test` / `User@123`

## Rotas

- `POST /api/auth/login`
- `POST /api/auth/register` (**cria sempre com role USER**)
- `POST /api/auth/refresh` (renova tokens com rotação)
- `POST /api/auth/logout` (revoga refresh token atual)
- `POST /api/permissions/assign` (**apenas ADMIN**)
- `GET /api/dashboard` (rota protegida de exemplo)
- `GET /api/relatorios` (rota protegida de exemplo)

## Exemplos (curl)

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@local.test\",\"password\":\"Admin@123\"}"
```

Register (senha forte exemplo: `Deusmeama16#`):

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"novo@local.test\",\"password\":\"Deusmeama16#\"}"
```

Refresh:

```bash
curl -X POST http://localhost:3000/api/auth/refresh ^
  -H "Content-Type: application/json" ^
  -d "{\"refreshToken\":\"REFRESH_TOKEN\"}"
```

Logout (substitua TOKEN):

```bash
curl -X POST http://localhost:3000/api/auth/logout ^
  -H "Authorization: Bearer TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

Dashboard (substitua TOKEN):

```bash
curl http://localhost:3000/api/dashboard ^
  -H "Authorization: Bearer TOKEN"
```

Assign permission (admin):

```bash
curl -X POST http://localhost:3000/api/permissions/assign ^
  -H "Authorization: Bearer TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"roleId\":2,\"resource\":\"/relatorios\",\"action\":\"GET\"}"
```

## Arquitetura (resumo)

- `src/modules/auth`: login + register (hash `argon2`)
- `src/modules/permissions`: assign + rotas protegidas de exemplo
- `src/shared/security`: `TokenService` (JWE com JWT interno), `JweAuthGuard` (401) e `PermissionsGuard` (403)
- `src/shared/http`: respostas e mensagens centralizadas (`ApiMessages`, interceptor e exception filter)
- Fluxo: valida Bearer/JWE → `req.user` → RBAC automático por `{ resource, action }`

## Decisões de segurança (curto e direto)

### JWE (por que usar)
O enunciado pede JWT (Bearer). Aqui o token é um **JWE** contendo um **JWT assinado** (nested JWT):
- **Prós**: confidencialidade (claims não ficam legíveis no cliente/logs)
- **Contras**: mais complexidade e custo; **não substitui HTTPS**

### Refresh token (enterprise)
- **Armazenamento**: hash (SHA-256) no banco (nunca o token puro)
- **Rotação**: cada `refresh` gera um novo token e revoga o anterior
- **Reuse detection**: se um refresh revogado reaparecer, tratamos como comprometimento e revogamos todos os refresh tokens do usuário + incrementamos `tokenVersion`

### Headers (helmet)
Ativado para reduzir superfície de ataque:
- **clickjacking**: bloqueio de frame
- **XSS/headers**: headers recomendados (`noSniff`, `referrer-policy`, etc)
- **CSP**: opcional (habilite com `HELMET_CSP_ENABLED=true` quando fizer sentido)

### Rate limit
- Global via `@nestjs/throttler`
- Login com limite mais restrito