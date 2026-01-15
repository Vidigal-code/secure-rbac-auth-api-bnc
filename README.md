## secure-rbac-auth-api-bnc

API REST (NestJS + TypeScript) com **RBAC** (roles + permissions) e SQL Server.

- **Auth**: `Authorization: Bearer <token>`
- **401**: token inválido/expirado
- **403**: token válido, sem permissão `{ resource, action }`

## Swagger (OpenAPI)

- **UI**: `http://localhost:3000/docs`
- **OpenAPI JSON**: `http://localhost:3000/docs-json`

> Observação: o Swagger roda por padrão fora de produção. Em `NODE_ENV=production`, ele fica desabilitado.

## Formato de resposta (padrão)

- **Sucesso**: `{"success": true, "data": ...}`
- **Erro**: `{"success": false, "error": { "code": "...", "message": "...", "details"?: ... }}`

## Como rodar (Docker)

```bash
docker compose up --build
```

API: `http://localhost:3000/api`

## Como rodar (local)

1) Copie `env.example` para `.env` e ajuste o necessário.

2) Instale dependências:

```bash
npm install
```

3) Suba:

```bash
npm run start:dev
```

## Como testar (TDD ponta a ponta via Docker)

- **Unit + integração (sem DB)**:

```bash
docker compose run --rm test
```

- **Unit + integração + SQL Server real (ponta a ponta)**:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from test-db test-db
```

- **Cobertura**:
  - `./coverage` (sem DB)
  - `./coverage-db` (com DB)

## Credenciais (seed)

- **Admin**: `admin@local.test` / `Admin@123`
- **User**: `user@local.test` / `User@123`

## Rotas

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- **RBAC**: `POST /api/permissions/assign` (**apenas ADMIN**)
- **Exemplos protegidos**: `GET /api/dashboard`, `GET /api/relatorios`

## CURLs de teste (Windows)

> Use `curl.exe` no Windows (evita o alias do PowerShell).

Login (admin):

```bash
curl.exe -s -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@local.test\",\"password\":\"Admin@123\"}"
```

Dashboard (substitua TOKEN):

```bash
curl.exe -s http://localhost:3000/api/dashboard ^
  -H "Authorization: Bearer TOKEN"
```

Assign permission (admin):

```bash
curl.exe -s -X POST http://localhost:3000/api/permissions/assign ^
  -H "Authorization: Bearer TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"roleId\":2,\"resource\":\"/relatorios\",\"action\":\"GET\"}"
```

## Arquitetura (resumo)

- **`src/modules/auth`**: use cases (login/register/refresh/logout) + controller + DTOs
- **`src/modules/permissions`**: `assign` + controllers protegidos de exemplo
- **`src/shared/security`**: `TokenService` (JWE com JWT interno), `JweAuthGuard` (401), `PermissionsGuard` (403 e RBAC automático)
- **`src/shared/http`**: mensagens, interceptor de resposta e exception filter
- **Fluxo**: Bearer → valida token → `req.user` → valida `{resource, action}` no DB

## Segurança (objetivo)

### Produção (secrets)
Em `NODE_ENV=production`, o app falha no boot se `JWT_SECRET`/`JWE_SECRET` (**>= 32 chars**) e `TOKEN_ISSUER`/`TOKEN_AUDIENCE` não estiverem definidos.

### Variáveis de ambiente (principais)

- **`PORT`**: porta da API (default 3000)
- **`CORS_ORIGINS`**: origens permitidas (separadas por vírgula)
- **`HELMET_CSP_ENABLED`**: habilita CSP do Helmet (`true/false`)
- **`SWAGGER_ENABLED`**: habilita Swagger fora de produção (`true/false`)
- **`JWT_SECRET` / `JWE_SECRET`**: secrets dos tokens (produção exige >= 32 chars)
- **`JWT_EXPIRES_IN_SECONDS` / `REFRESH_EXPIRES_IN_SECONDS`**: expiração dos tokens
- **`TOKEN_ISSUER` / `TOKEN_AUDIENCE`**: issuer/audience validados no verify (obrigatórios em produção)
- **`DATABASE_URL`**: conexão SQL Server (opcional fora do docker compose)

### Tokens (enterprise)
- **Access token**: inclui `tokenVersion` (invalidação imediata no logout/revogação, sem blacklist).
- **Refresh token**: tabela `RefreshToken` com hash (SHA-256), rotação e **reuse detection**.

### Limitações
- **JWE não substitui HTTPS** (TLS é obrigatório em produção).