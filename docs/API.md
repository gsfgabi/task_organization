# Contrato HTTP — Task Org (frontend)

Documento para alinhar com o backend **ASP.NET**. O front usa `VITE_API_BASE_URL` como prefixo (ex.: `https://api.exemplo.com`) e envia `Authorization: Bearer <token>` em pedidos autenticados.

| Versão doc | Data       | Notas |
|------------|------------|--------|
| 0.1.0      | 2026-04-22 | Lista inicial de rotas e modelos; espelha `src/types` e stores. |

Especificação máquina-legível: [`openapi.yaml`](./openapi.yaml).

---

## Convenções

- **Formato**: JSON, `Content-Type: application/json` (exceto upload de ficheiros).
- **IDs**: strings (`id`, foreign keys).
- **Datas**: ISO 8601 (`createdAt`, `updatedAt`, `dueDate`, `date` em registos de tempo).
- **Permissões**: o front conhece as chaves em `src/types/index.ts`; o backend deve validá-las por rota.
- **Prefixo de caminho**: exemplos abaixo usam `/api/...`. Se a API usar outro prefixo, documentar e ajustar o cliente no front.

---

## Rotas por área

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

Detalhe de propriedades e exemplos: ver `components/schemas` em `openapi.yaml`.

---

## CORS e produção

Permitir origem do front (ex.: domínio Vercel) e métodos utilizados (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`).

---

## Alterações futuras

Incrementar a coluna **Versão doc** no topo ao mudar contratos; manter `openapi.yaml` sincronizado.
