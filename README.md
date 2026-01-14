# secure-rbac-auth-api-bnc

API REST para autenticação e autorização baseada em perfis e permissões (**RBAC – Role-Based Access Control**), garantindo que **nenhuma rota sensível** seja acessada sem autorização explícita, mesmo se o usuário tentar “forçar” a URL diretamente.


## Objetivo do case

Em aplicações web, um problema comum de segurança ocorre quando o usuário não possui permissão funcional, mas consegue acessar um recurso digitando diretamente a URL no navegador ou chamando a rota via API.  
Aqui, a API deve garantir que **todas as rotas protegidas validem JWT** e **chequem permissões (resource + action)** automaticamente.

## Regras técnicas (requisitos)

- Rotas protegidas devem exigir `Authorization: Bearer <token>`
- Extrair e validar o **JWT antes** de verificar permissões
- Retornar **401** se o token for inválido/expirado
- Retornar **403** se o usuário não tiver permissão necessária
- Stack alvo:
  - Node.js (**NestJS**) com TypeScript
  - ORM (**TypeORM** ou **Prisma**)
  - **SQL Server**
  - **JWT**
  - **Docker**

## Rotas obrigatórias

### `POST /api/auth/login`

Autentica um usuário e retorna um token JWT para ser usado nas próximas requisições.

- **Body (mínimo)**:
  - `email` (string)
  - `password` (string)

### `POST /api/permissions/assign`

Atribui permissões a um perfil (role) específico.

- **Acesso**: **apenas administradores**
- **Header obrigatório**: `Authorization: Bearer <token>`
- **Body (mínimo)**:
  - `roleId` (number): ID do perfil que receberá a permissão
  - `resource` (string): recurso/rota liberada (ex.: `/usuarios`, `/dashboard`)
  - `action` (string): ação permitida (`GET`, `POST`, `PUT`, `DELETE`, ou `*` para todas)
- **Regras de negócio**:
  - Somente usuários com perfil de administrador podem executar
  - Validar se `roleId` existe
  - Validar se a combinação `resource + action` **não** existe para aquele perfil
  - Registrar data/hora da atribuição

## Contrato de autorização (RBAC)

### Modelo de permissão

- **Permission**: `{ resource: string, action: string }`
  - `resource`: caminho lógico da rota (ex.: `/dashboard`, `/relatorios`, `/usuarios`)
  - `action`: método HTTP (`GET`, `POST`, `PUT`, `DELETE`) ou `*`

### Política sugerida

- Uma requisição `GET /api/dashboard` requer permissão:
  - `resource: "/dashboard"` e `action: "GET"` (ou `action: "*"`)
- O `resource` deve ser normalizado (ex.: sempre com `/` inicial)
- O `action` deve ser normalizado para maiúsculo

## Exemplos de resposta

### Exemplo (autorizado)

`GET /api/dashboard`

```json
{
  "success": true,
  "data": {
    "message": "Acesso autorizado ao dashboard",
    "content": {}
  }
}
```

### Exemplo (sem permissão – 403)

`GET /api/relatorios`

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Você não tem permissão para acessar este recurso",
    "details": {
      "requiredPermission": {
        "resource": "/usuarios",
        "action": "GET"
      },
      "yourPermissions": [
        { "resource": "/dashboard", "action": "GET" },
        { "resource": "/relatorios", "action": "GET" }
      ]
    }
  }
}
```

### Exemplo (token inválido/expirado – 401)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token inválido ou expirado"
  }
}
```

## Variáveis de ambiente (sugestão)

Crie um arquivo `.env` (ou configure via Docker):

```bash
# App
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=troque-este-segredo
JWT_EXPIRES_IN=1h

# SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_NAME=secure_rbac_auth
```

```bash
npm install
npm run start:dev
```

API (por padrão): `http://localhost:3000`

## Executando com Docker


```bash
docker compose up --build
```







