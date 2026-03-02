# Estrutura da API (Migracao Appwrite -> API Propria)

## Objetivo
Definir a API HTTP que substitui Appwrite com foco em:
- compatibilidade com o modelo atual do app (desktop/mobile)
- sincronizacao confiavel
- suporte facil para markdown e imagens

## Stack sugerida
- Runtime: Node.js (Fastify/NestJS/Express)
- Banco: PostgreSQL
- Storage: S3/R2/MinIO
- Auth: JWT (access + refresh) com rotacao
- Contrato: OpenAPI 3.1

## Convencoes globais
- Base URL: `/v1`
- JSON UTF-8
- Datas em ISO-8601 UTC
- `Authorization: Bearer <access_token>`
- `X-Request-Id` para rastreabilidade
- `Idempotency-Key` para `POST` criticos

## Formato de resposta
Sucesso:
```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "cursor": "..."
  }
}
```

Erro:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo 'title' e obrigatorio",
    "details": [{ "field": "title", "issue": "required" }]
  }
}
```

## Autenticacao
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Resposta de login/refresh:
```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "expiresIn": 900,
    "user": { "id": "uuid", "email": "user@mail.com", "name": "Nome" }
  }
}
```

## Endpoints de upload (imagens, audio, arquivos)
1. Criar upload assinado:
- `POST /v1/assets/upload-url`
```json
{
  "fileName": "foto.png",
  "mimeType": "image/png",
  "sizeBytes": 245678,
  "category": "image"
}
```

2. Concluir upload:
- `POST /v1/assets/complete`
```json
{
  "uploadToken": "...",
  "storageKey": "users/<user_id>/assets/<uuid>-foto.png",
  "checksumSha256": "..."
}
```

3. Consultar e remover:
- `GET /v1/assets/:id`
- `DELETE /v1/assets/:id`

## Endpoints de notas/markdown
- `GET /v1/note-folders`
- `POST /v1/note-folders`
- `PATCH /v1/note-folders/:id`
- `DELETE /v1/note-folders/:id`

- `GET /v1/notes?folderId=&projectId=&q=&cursor=&limit=`
- `POST /v1/notes`
- `GET /v1/notes/:id`
- `PATCH /v1/notes/:id`
- `DELETE /v1/notes/:id`
- `GET /v1/notes/:id/revisions`
- `POST /v1/notes/:id/revisions`
- `POST /v1/notes/:id/assets` (vincular imagem/arquivo)

Payload de nota:
```json
{
  "title": "Resumo da semana",
  "contentMarkdown": "# Titulo\nTexto...\n![img](asset://<asset_id>)",
  "folderId": "uuid-ou-null",
  "projectId": "uuid-ou-null",
  "sortOrder": 0
}
```

## CRUD por dominio
Padrao para recursos principais:
- `GET /v1/<resource>` (lista com cursor)
- `POST /v1/<resource>`
- `GET /v1/<resource>/:id`
- `PATCH /v1/<resource>/:id`
- `DELETE /v1/<resource>/:id`

Recursos:
- `cards`, `calendar-events`
- `projects`, `project-links`
- `shortcuts`, `shortcut-folders`, `paths`
- `color-palettes`
- `clipboard-categories`, `clipboard-items`
- `apps`, `app-macros`, `app-macro-items`
- `habits`, `habit-entries`
- `finance/bills`, `finance/expenses`, `finance/incomes`, `finance/budget-categories`, `finance/savings-goals`, `finance/config`
- `crm/contacts`, `crm/tags`, `crm/interactions`, `crm/contact-links`
- `playbooks`, `playbook-dialogs`
- `study/config`, `study/media-items`, `study/goals`, `study/sessions`
- `meetings`
- `quick-access`
- `settings`

## Sincronizacao (desktop/mobile)
### Pull incremental
- `GET /v1/sync/changes?since=2026-03-01T00:00:00Z&limit=500`

Resposta:
```json
{
  "data": {
    "serverTime": "2026-03-01T12:00:00Z",
    "nextCursor": "2026-03-01T12:00:00Z#98765",
    "changes": [
      {
        "resource": "notes",
        "id": "uuid",
        "operation": "upsert",
        "updatedAt": "2026-03-01T11:58:00Z",
        "payload": { "id": "uuid", "title": "..." }
      },
      {
        "resource": "cards",
        "id": "uuid2",
        "operation": "delete",
        "updatedAt": "2026-03-01T11:59:00Z"
      }
    ]
  }
}
```

### Push em lote
- `POST /v1/sync/batch`
```json
{
  "clientId": "desktop-01",
  "baseCursor": "2026-03-01T10:00:00Z#12345",
  "operations": [
    {
      "resource": "cards",
      "operation": "upsert",
      "id": "uuid",
      "payload": { "title": "Nova tarefa", "status": "todo" },
      "clientUpdatedAt": "2026-03-01T10:20:00Z"
    }
  ]
}
```

### Politica de conflito
- Regra padrao: `last_write_wins` por `updated_at` (servidor)
- Opcional por recurso critico (notas): retornar `409 CONFLICT` com `serverVersion` para merge manual

## Seguranca
- Todas as queries filtradas por `user_id`
- Rate limit por IP + usuario
- Validacao de payload com schema (Zod/Joi/TypeBox)
- Sanitizacao de markdown/html
- URLs assinadas com expiração curta (5-15 min)
- Log de auditoria para login, delecao e importacao

## Performance e confiabilidade
- Cursor pagination (nao usar offset para listas grandes)
- ETag/If-Match para updates concorrentes
- Timeout e retry com backoff no cliente
- Observabilidade: logs estruturados, metricas, tracing

## Plano de migracao do Appwrite
1. Exportar dados atuais (ou usar `store.json` como base).
2. Rodar script de importacao para tabelas PostgreSQL (upsert por `id`).
3. Migrar notas: `mdPath/content` -> `notes.content_markdown`.
4. Migrar arquivos/imagens para object storage + tabela `assets`.
5. Habilitar API nova em paralelo (feature flag).
6. Validar sync incremental em desktop e mobile.
7. Desligar Appwrite apos periodo de dupla escrita.

## Prompt completo para implementacao (copiar e usar)
```text
Voce e um arquiteto backend senior. Quero implementar uma API para substituir o Appwrite do projeto Organon.

Contexto funcional:
- O app hoje usa um store JSON com dominios: cards, calendarEvents, projects, notes, files, shortcuts, habits, financeiro, CRM, playbooks, study, meetings, quickAccess e settings.
- Preciso de PostgreSQL como banco principal e object storage para imagens/arquivos/audio.
- Preciso de API REST versionada em /v1 com JWT (access + refresh), validacao forte de payload, paginacao por cursor e suporte a sync incremental (pull/push) para desktop/mobile.

Requisitos de banco:
- Modelar tabelas normalizadas por dominio com user_id em tudo (multi-tenant).
- Incluir created_at, updated_at e soft delete quando aplicavel.
- Notas em markdown devem ser faceis de armazenar/editar (TEXT no banco), com revisoes opcionais.
- Imagens e binarios devem ficar em object storage com metadados em tabela assets.
- Criar constraints e indexes para performance e integridade.

Requisitos de API:
- Endpoints de auth: register/login/refresh/logout/me.
- CRUD completo por dominio.
- Endpoints para upload via URL assinada e confirmacao de upload.
- Endpoints de sync: GET /sync/changes e POST /sync/batch.
- Padrao de erro consistente, idempotencia e controle de concorrencia.

Entregaveis esperados:
1) SQL de migrations inicial (PostgreSQL).
2) OpenAPI 3.1 completo.
3) Estrutura de pastas backend (modulos por dominio).
4) Exemplos de requests/responses.
5) Script de migracao dos dados atuais (store.json -> Postgres + assets).
6) Checklist de testes (unitario, integracao, contrato, carga basica).

Aplique melhores praticas de mercado, codigo limpo e foco em manutencao.
```
