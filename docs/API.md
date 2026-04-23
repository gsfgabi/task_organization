# Contrato HTTP — Task Org (frontend)

Especificação OpenAPI: [`openapi.yaml`](./openapi.yaml).

## Ver o OpenAPI no browser

1. **Dentro da aplicação (recomendado para a equipa):** com sessão iniciada, abre **API (Swagger)** no menu lateral — rota **`/api-docs`**. Carrega o mesmo `docs/openapi.yaml`, usa `VITE_API_BASE_URL` como servidor e envia o **Bearer** da sessão nos «Try it out». O backend precisa de **CORS** para a origem do front.
2. **Servidor estático só da pasta `docs`:** `npm run docs:openapi` → **http://localhost:5555/swagger-viewer.html** (ou a raiz **http://localhost:5555/**).
3. **Swagger Editor (online):** [editor.swagger.io](https://editor.swagger.io) → **File → Import URL** → URL `raw.githubusercontent.com/.../docs/openapi.yaml` (repo público) ou ficheiro local.

Repositório **privado:** o link raw do GitHub não funciona sem autenticação; usa a rota **`/api-docs`** na app, o servidor local da pasta `docs`, ou o Swagger Editor com ficheiro colado/importado.

## Convenções

- **Formato**: JSON, `Content-Type: application/json` (exceto upload de ficheiros).
- **IDs**: strings (`id`, foreign keys).
- **Datas**: ISO 8601 para `createdAt` / `updatedAt` (instantes). `dueDate` e `TimeEntry.date` como **string `YYYY-MM-DD`** (como no mock do front).
- **CamelCase**: o front TypeScript usa **camelCase** nos JSON (`assigneeId`, `roleIds`, `permissionKeys`, etc.). Se o backend devolver PascalCase, será preciso um adaptador ou configuração JSON no ASP.NET em **camelCase**.
- **Permissões**: o front conhece as chaves em `src/types/index.ts`; o backend deve devolver **403** (ou 401 se não autenticado) quando o token não tiver permissão para a rota. A matriz sugerida está em cada rota abaixo.
- **Prefixo de caminho**: exemplos usam `/api/...`. Se a API usar outro prefixo, documentar e ajustar `VITE_API_BASE_URL` ou paths no cliente.
- **Erros**: respostas de erro em JSON com corpo opcional `{ "message": "..." }` ou RFC problem details — o front ainda não fixa um formato; convém documentar o escolhido.

---

## O que o front espera de cada rota

Legenda: **Auth** = cabeçalho `Authorization: Bearer <token>` obrigatório. **Perm.** = permissão mínima sugerida no backend (alinhar com `PermissionKey`).

### Autenticação

#### `POST /api/auth/login`

| | |
|--|--|
| **Auth** | Não (sem `Bearer`). |
| **Corpo** | JSON livre acordado (ex.: `email`, `password`). |
| **200** | JSON com **`token`** (string JWT ou opaco) e **`user`** no formato `User` (ver secção Modelos). O front guarda ambos em `localStorage` (`auth_token`, `auth_user`). |
| **401** | Credenciais inválidas. |

#### `POST /api/auth/logout`

| | |
|--|--|
| **Auth** | Sim. |
| **Corpo** | Vazio ou ignorado. |
| **204** | Sucesso (sem corpo). **200** com corpo vazio também é aceitável se preferirem. |

#### `GET /api/auth/me`

| | |
|--|--|
| **Auth** | Sim. |
| **200** | Objeto **`User`** completo e coerente com o token (incl. `roleIds` para o router calcular permissões). |
| **401** | Token em falta ou inválido. |

---

### Organização

#### `GET /api/directorates`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.read`. |
| **200** | Array de **`Directorate`**: `{ id, name, code }[]`. Lista vazia `[]` é válida. |

#### `POST /api/directorates`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **Corpo** | Objeto diretoria: pode omitir `id` se o servidor gera; se enviar `id`, deve ser o definitivo. Campos `name`, `code` obrigatórios. |
| **201** | **`Directorate`** criada (com `id`). |

#### `PATCH /api/directorates/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **Corpo** | Parcial: pelo menos os campos a alterar (`name`, `code`, …). |
| **200** | **`Directorate`** atualizada. |
| **404** | `id` inexistente. |

#### `DELETE /api/directorates/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **204** | Removida. |

#### `GET /api/sectors`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.read`. |
| **Query** | Opcional: `directorateId` — filtrar setores dessa diretoria. |
| **200** | Array de **`Sector`**: `{ id, name, code, directorateId }[]`. |

#### `POST /api/sectors`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **Corpo** | **`Sector`** (pode omitir `id` se gerado no servidor). `directorateId` obrigatório. |
| **201** | **`Sector`** criada. |

#### `PATCH /api/sectors/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **200** | **`Sector`** atualizada. |

#### `DELETE /api/sectors/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.manage`. |
| **204** | Removida. |

#### `GET /api/users`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `org.read` (listagem) ou `admin.users` se a política for mais restrita. |
| **200** | Array de **`User`**. Paginação (`page`, `pageSize`, `total`) pode ser query + cabeçalhos ou envelope JSON — **definir e documentar**; o front hoje assume lista completa em memória. |

#### `POST /api/users`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `admin.users` ou `org.manage` (conforme política). |
| **Corpo** | **`User`** sem `id` ou com `id` gerado; `roleIds`, `sectorId`, `directorateId`, `active` coerentes. |
| **201** | **`User`** criado. |

#### `PATCH /api/users/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `admin.users` ou `org.manage`. |
| **Corpo** | Parcial de **`User`**. |
| **200** | **`User`** atualizado. |

#### `DELETE /api/users/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `admin.users`. |
| **204** | Removido. |

---

### Papéis

#### `GET /api/roles`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `admin.roles` para edição; para outras áreas pode ser necessário ler papéis com `org.read` — alinhar. |
| **200** | Array de **`Role`**: `{ id, name, description, permissionKeys }[]`. Cada `permissionKey` deve ser um dos valores em `PERMISSIONS` no front (`tasks.read`, …). |

#### `PATCH /api/roles/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `admin.roles`. |
| **Corpo** | Parcial de **`Role`** (tipicamente `permissionKeys`, `name`, `description`). |
| **200** | **`Role`** completo após atualização. |

---

### Tarefas

#### `GET /api/tasks`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `tasks.read`. |
| **Query** | Opcional no contrato atual: filtros (`status`, `assigneeId`, …) podem ser acrescentados; o stub do front não envia query. |
| **200** | Array de **`TaskItem`** (ver modelo completo abaixo). **Ordem**: não especificada no front; definir (ex.: `updatedAt` desc). |

#### `GET /api/tasks/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `tasks.read`. |
| **200** | Um **`TaskItem`**. |
| **404** | Tarefa inexistente. |

#### `POST /api/tasks`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `tasks.create`. |
| **Corpo** | Campos de criação alinhados a `TaskItemCreate` no `openapi.yaml`: título, estado, prioridade, setores, tags, checklist, anexos, horas estimadas, `dueDate`, etc. **Sem** `id` / `createdAt` / `updatedAt` (geridos no servidor) ou com valores ignorados. |
| **201** | **`TaskItem`** completo (incl. `id`, `loggedHours`, datas). |

#### `PATCH /api/tasks/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `tasks.update`. |
| **Corpo** | **Objeto parcial** com qualquer subconjunto de campos de `TaskItem` (como `Partial<TaskItem>` em `tasks.stub.ts`). O servidor deve devolver o documento **completo** após o merge. |
| **200** | **`TaskItem`** completo atualizado. |
| **404** | Tarefa inexistente. |

#### `DELETE /api/tasks/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `tasks.delete`. |
| **204** | Eliminada. |
| **404** | Tarefa inexistente. |

**Modelo `TaskItem` (resposta):** `id`, `title`, `description`, `status` (`backlog` \| `todo` \| `in_progress` \| `review` \| `done` \| `cancelled`), `difficulty` (`trivial` \| `easy` \| `medium` \| `hard` \| `epic`), `priority` (`low` \| `medium` \| `high` \| `urgent`), `assigneeId`, `sectorId`, `directorateId`, `tags` (string[]), `checklist` (`{ id, label, done }[]`), `attachments` (`{ id, name, mime, size, dataUrl }[]` — em produção `dataUrl` pode ser URL), `estimatedHours`, `loggedHours`, `dueDate` (`null` ou string data), `createdAt`, `updatedAt` (ISO).

---

### Registo de tempo

#### `GET /api/time-entries`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `time.read`. |
| **Query** | Opcional: `userId`, `taskId`, `from`, `to` (datas **`YYYY-MM-DD`**). |
| **200** | Array de **`TimeEntry`**: `id`, `taskId`, `userId`, `date`, `hours`, `note`, `createdAt`. |

#### `POST /api/time-entries`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `time.create`. |
| **Corpo** | `taskId`, `userId`, `date`, `hours`, `note` (sem `id`/`createdAt` ou ignorados). |
| **201** | **`TimeEntry`** completo. |

#### `PATCH /api/time-entries/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `time.update`. |
| **Corpo** | Parcial: tipicamente `date`, `hours`, `note`. |
| **200** | **`TimeEntry`** completo. |

#### `DELETE /api/time-entries/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `time.delete`. |
| **204** | Removido. |

---

### Relatórios

#### `GET /api/reports/summary`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `reports.read`. |
| **Query** | Recomendado: `from`, `to` (`YYYY-MM-DD`) e outros filtros acordados (setor, utilizador). |
| **200** | Array de **`ReportRow`**: `userId`, `userName`, `sectorName`, `hours`, `tasksCompleted` (números como JSON number). |

#### `GET /api/reports/export`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `reports.export`. |
| **Query** | Mesmos filtros que `/summary` (ou subconjunto documentado). |
| **200** | Corpo **`text/csv`** (ficheiro para download). UTF-8 com BOM é compatível com o export local do front (`\uFEFF`). |

---

### Auditoria

#### `GET /api/audit`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `audit.read`. |
| **Query** | Recomendado: paginação (`page`, `pageSize`), `from`, `to`, `action`, `actorId`. |
| **200** | Array de entradas: `id`, `ts` (ISO), `actorId` (string ou `null`), `actorName`, `action`, `message`, `level` (`info` \| `success` \| `warning` \| `danger`), `marked` (boolean), `detail` (objeto JSON opcional). |

#### `PATCH /api/audit/{id}`

| | |
|--|--|
| **Auth** | Sim. **Perm.:** `audit.read` (ou permissão dedicada se existir). |
| **Corpo** | Ex.: `{ "marked": true }`. |
| **200** | Entrada atualizada. |

---

### Personificação (opcional)

#### `POST /api/admin/impersonation/start`

| | |
|--|--|
| **Auth** | Sim. Permissão administrativa acordada. |
| **Corpo** | Ex.: `{ "targetUserId": "<id>" }`. |
| **200** | Política acordada: novo `token` + `user` alvo, ou só confirmação se o token for o mesmo (o front hoje simula só no cliente). |

#### `POST /api/admin/impersonation/stop`

| | |
|--|--|
| **Auth** | Sim. |
| **204** ou **200** | Restaurar sessão original conforme política. |

---

## Rotas por área (resumo)

### Autenticação

| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | `/api/auth/login` | Login; corpo com credenciais; resposta com token + `User`. |
| POST | `/api/auth/logout` | Opcional: invalidar sessão/refresh no servidor. |
| GET | `/api/auth/me` | Opcional: utilizador atual a partir do token. |

### Organização

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/directorates` | Lista diretorias. |
| POST | `/api/directorates` | Criar diretoria. |
| PUT/PATCH | `/api/directorates/{id}` | Atualizar. |
| DELETE | `/api/directorates/{id}` | Remover (regras de negócio a definir). |
| GET | `/api/sectors` | Lista setores (query opcional: `directorateId`). |
| POST | `/api/sectors` | Criar setor. |
| PUT/PATCH | `/api/sectors/{id}` | Atualizar. |
| DELETE | `/api/sectors/{id}` | Remover. |
| GET | `/api/users` | Lista utilizadores (paginação/filtros a definir). |
| POST | `/api/users` | Criar utilizador. |
| PUT/PATCH | `/api/users/{id}` | Atualizar utilizador. |
| DELETE | `/api/users/{id}` | Opcional / soft-delete. |

### Papéis

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/roles` | Lista papéis com permissões. |
| PUT/PATCH | `/api/roles/{id}` | Atualizar papel (nome, descrição, `permissionKeys`). |

### Tarefas

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/tasks` | Lista tarefas (**já referenciado** em `src/api/http/tasks.stub.ts`). |
| GET | `/api/tasks/{id}` | Detalhe. |
| POST | `/api/tasks` | Criar. |
| PATCH | `/api/tasks/{id}` | Atualização parcial (**já referenciado** no stub). |
| DELETE | `/api/tasks/{id}` | Eliminar. |

Sub-recursos (alternativa: incluir no PATCH da tarefa):

- Checklist / anexos: definir URIs ou campos embutidos; uploads costumam ser `multipart/form-data` noutro endpoint.

### Tempo

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/time-entries` | Lista (filtros: utilizador, tarefa, intervalo de datas). |
| POST | `/api/time-entries` | Criar registo. |
| PATCH | `/api/time-entries/{id}` | Atualizar. |
| DELETE | `/api/time-entries/{id}` | Remover. |

### Relatórios

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/reports/summary` | Agregados (utilizador, setor, horas, tarefas concluídas, etc.). |
| GET | `/api/reports/export` | Export CSV (mesmos filtros; permissão `reports.export`). |

### Auditoria

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/audit` | Lista paginada / filtros. |
| PATCH | `/api/audit/{id}` | Opcional: atualizar `marked`. |

### Personificação (opcional)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | `/api/admin/impersonation/start` | Iniciar personificação (novo token ou política acordada). |
| POST | `/api/admin/impersonation/stop` | Terminar personificação. |

---

## Modelos (resumo)

Alinhados a `src/types/index.ts` e `src/types/report-filters.ts` onde aplicável.

- **User**: `id`, `name`, `email`, `avatarUrl?`, `roleIds[]`, `sectorId`, `directorateId`, `managedSectorIds?`, `active`
- **Role**: `id`, `name`, `description`, `permissionKeys[]`
- **Directorate**: `id`, `name`, `code`
- **Sector**: `id`, `name`, `code`, `directorateId`
- **TaskItem**: inclui `status`, `difficulty`, `priority`, `assigneeId`, setores, `tags`, `checklist`, `attachments`, horas, `dueDate`, metadados de tempo
- **TimeEntry**: `taskId`, `userId`, `date`, `hours`, `note`, `createdAt`
- **ReportRow** (exemplo agregado): `userId`, `userName`, `sectorName`, `hours`, `tasksCompleted`
