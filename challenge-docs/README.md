# CASE TÉCNICO

Em aplicações web, um problema comum de segurança ocorre quando o usuário não possui permissão funcional, mas consegue acessar um recurso digitando diretamente a URL no navegador ou chamando a rota via API.

Neste caso, você irá implementar uma API backend que garanta que nenhuma rota sensível possa ser acessada sem autorização explícita, independentemente do frontend.

Você deve construir uma API RESTful que implemente um sistema de autenticação e autorização baseado em perfis e permissões (**RBAC - Role-Based Access Control**).

---

## REGRAS TÉCNICAS

- Toda requisição a rotas protegidas deve incluir o header `Authorization: Bearer {token}`
- Extrair e validar o JWT antes de verificar permissões
- Retornar erro **401** se o token for inválido ou expirado
- Retornar erro **403** se o usuário não tiver a permissão necessária
- Stack: Node.js (NestJS) com TypeScript, ORM (TypeORM ou Prisma), SQL Server, JWT e Docker.

---

## ROTAS OBRIGATÓRIAS

### POST `/api/auth/login`

- Autentica um usuário no sistema e retorna um **token JWT** que será usado nas próximas requisições.
- Campos mínimos:
  - `email` (string): Email do usuário
  - `password` (string): Senha do usuário

### POST `/api/permissions/assign`

- Atribui permissões a um perfil (role) específico. Esta rota deve ser acessível apenas por administradores.
- Obrigatório passar o `Authorization: Bearer {token}`
- Campos mínimos:
  - `roleId` (integer): ID do perfil que receberá a permissão
  - `resource` (string): Recurso/rota a ser liberada (ex: `/usuarios`, `/dashboard`)
  - `action` (string): Ação permitida (ex: `GET`, `POST`, `PUT`, `DELETE`, ou `*` para todas)
- Regras de negócio:
  - Somente usuários com perfil de administrador podem executar esta ação
  - Validar se o `roleId` existe
  - Validar se a combinação `resource + action` já não existe para aquele perfil
  - Registrar data/hora da atribuição

---

## REGRAS GERAIS

- O código deve seguir boas práticas como funções coesas, tipagem correta, e separação por responsabilidade.
- A solução da API deve rodar em Docker.
- É obrigatório subir o código no GitHub, contendo:
  - `README.md` com passo a passo para execução local e via Docker,
  - Estrutura clara de pastas (`src/`, `logs/`, `docker/`, etc),
  - `Dockerfile` funcional,
  - explicação das limitações técnicas e da abordagem adotada.

---

## EXEMPLOS (ROTAS PROTEGIDAS COM RBAC)

A partir disso, **todas as rotas protegidas** devem validar automaticamente se o usuário autenticado possui a permissão necessária para acessar aquele recurso. Por exemplo:

### GET `/api/dashboard` (sucesso)

```json
{
  "success": true,
  "data": {
    "message": "Acesso autorizado ao dashboard",
    "content": {}
  }
}
```

### GET `/api/relatorios` (sem permissão)

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


