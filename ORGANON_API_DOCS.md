# Organon API — Documentação de Endpoints

**Base URL:** `https://reolicodeapi.com/api/v1/organon`
**Auth:** `Authorization: Bearer <accessToken>` (obrigatório em todos os endpoints exceto `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`)
**Erro padrão:** `{ "error": { "code": "...", "message": "..." } }`
**Lista paginada:** `{ "data": [...], "meta": { "cursor": "<opaco>|null", "limit": N } }`

---

## AUTH — `/auth`

| Método | Path | Body (obrigatório*) | Resposta 2xx |
|--------|------|---------------------|--------------|
| POST | `/auth/register` | `email*`, `password*` (≥8), `name?` | 201 `{ data: { user, accessToken, refreshToken } }` |
| POST | `/auth/login` | `email*`, `password*` | 200 `{ data: { user, accessToken, refreshToken } }` |
| POST | `/auth/refresh` | `refreshToken*` | 200 `{ data: { accessToken, refreshToken } }` |
| POST | `/auth/logout` | `refreshToken*` | 204 |
| GET  | `/auth/me` | — | 200 `{ data: { id, email, name, created_at } }` |

- `accessToken` expira em **15 min**
- `refreshToken` expira em **30 dias** (rotacionado a cada uso)

---

## SETTINGS — `/settings`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/settings` | — | 200 `{ data: { theme_name, week_start, backup_enabled, backup_interval_minutes, keyboard_shortcuts, navbar_config, ... } }` |
| PATCH | `/settings` | `theme_name?`, `data_dir?`, `installer_completed?`, `week_start?`, `backup_enabled?`, `backup_interval_minutes?`, `keyboard_shortcuts?`, `navbar_config?` | 200 `{ data: { ...settings } }` |

---

## PROJECTS — `/projects`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/projects` | QS: `limit?`, `cursor?` | 200 lista paginada |
| GET | `/projects/:id` | — | 200 `{ data: { ...project, links: [] } }` |
| POST | `/projects` | `name*`, `path?`, `description?`, `color?`, `sort_order?` | 201 |
| PATCH | `/projects/:id` | `name?`, `path?`, `description?`, `color?`, `sort_order?`, `preferred_ide_id?` | 200 |
| DELETE | `/projects/:id` | — | 204 (soft delete) |
| POST | `/projects/:id/links` | `label*`, `url*`, `sort_order?` | 201 `{ data: link }` |
| DELETE | `/projects/:id/links/:linkId` | — | 204 |

---

## CARDS — `/cards`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/cards` | QS: `limit?`, `cursor?`, `status?` | 200 lista paginada |
| GET | `/cards/:id` | — | 200 `{ data: { ...card, checklist: [] } }` |
| POST | `/cards` | `title*`, `description_html?`, `project_id?`, `location_day?` (mon–sun), `location_period?` (morning/afternoon/night), `date?`, `time?`, `priority?` (P1–P4), `status?` (todo/in_progress/blocked/done), `color?`, `sort_order?` | 201 |
| PATCH | `/cards/:id` | campos acima (todos opcionais) | 200 |
| DELETE | `/cards/:id` | — | 204 (soft delete) |
| POST | `/cards/:id/checklist` | `text*`, `sort_order?` | 201 |
| PATCH | `/cards/:id/checklist/:itemId` | `text?`, `done?`, `sort_order?` | 200 |
| DELETE | `/cards/:id/checklist/:itemId` | — | 204 |

---

## CALENDAR EVENTS — `/calendar-events`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/calendar-events` | QS: `limit?`, `cursor?` | 200 lista paginada |
| GET | `/calendar-events/:id` | — | 200 |
| POST | `/calendar-events` | `title*`, `date*` (YYYY-MM-DD), `time?`, `recurrence?` (jsonb), `reminder?` (jsonb), `description?`, `color?` | 201 |
| PATCH | `/calendar-events/:id` | campos acima (todos opcionais) | 200 |
| DELETE | `/calendar-events/:id` | — | 204 (soft delete) |

---

## NOTE FOLDERS — `/note-folders`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/note-folders` | QS: `limit?`, `cursor?` | 200 lista paginada |
| GET | `/note-folders/:id` | — | 200 |
| POST | `/note-folders` | `name*`, `parent_id?`, `sort_order?` | 201 |
| PATCH | `/note-folders/:id` | `name?`, `parent_id?`, `sort_order?` | 200 |
| DELETE | `/note-folders/:id` | — | 204 (soft delete) |

---

## NOTES — `/notes`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/notes` | QS: `limit?`, `cursor?`, `folder_id?`, `project_id?` | 200 lista paginada |
| GET | `/notes/:id` | — | 200 |
| POST | `/notes` | `title*`, `content_markdown?`, `folder_id?`, `project_id?`, `sort_order?` | 201 |
| PATCH | `/notes/:id` | `title?`, `content_markdown?`, `content_html?`, `folder_id?`, `project_id?`, `sort_order?` | 200 (salva revisão se content_markdown mudou) |
| DELETE | `/notes/:id` | — | 204 (soft delete) |
| GET | `/notes/:id/revisions` | — | 200 `{ data: [{ id, revision_number, created_at }] }` |
| POST | `/notes/:id/assets` | `asset_id*` | 201 |
| DELETE | `/notes/:id/assets/:assetId` | — | 204 |

---

## ASSETS — `/assets`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| POST | `/assets/upload-url` | `file_name*`, `mime_type*`, `size_bytes*`, `category?` | 200 `{ data: { uploadToken, uploadUrl, storageKey, expiresIn } }` |
| POST | `/assets/complete` | `upload_token*`, `storage_key*`, `file_name*`, `mime_type*`, `size_bytes*`, `checksum_sha256?`, `category?` | 201 `{ data: asset }` |
| GET | `/assets/:id` | — | 200 |
| DELETE | `/assets/:id` | — | 204 (soft delete) |

---

## HABITS — `/habits`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/habits` | QS: `limit?`, `cursor?` | 200 lista paginada |
| GET | `/habits/:id` | — | 200 |
| POST | `/habits` | `name*`, `type*` (boolean/count/time/quantity), `frequency*` (daily/weekly), `target?`, `weekly_target?`, `week_days?` (int[]), `trigger?`, `reason?`, `minimum_target?`, `color?`, `sort_order?` | 201 |
| PATCH | `/habits/:id` | campos acima (todos opcionais) | 200 |
| DELETE | `/habits/:id` | — | 204 |
| GET | `/habits/entries` | QS: `habit_id?`, `since?` (YYYY-MM-DD), `limit?` | 200 `{ data: [] }` |
| POST | `/habits/entries` | `habit_id*`, `date*`, `value?`, `skipped?`, `skip_reason?` | 201 (upsert por habit_id + date) |

---

## FINANCE — `/finance`

### Contas Fixas
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/bills` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/finance/bills` | `name*`, `amount*`, `due_day*` (1-31), `category*`, `recurrence?` (monthly/yearly), `is_paid?`, `paid_date?` | 201 |
| PATCH | `/finance/bills/:id` | campos acima opcionais | 200 |
| DELETE | `/finance/bills/:id` | — | 204 |

### Despesas
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/expenses` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/finance/expenses` | `description*`, `amount*`, `category*`, `date*`, `installments?`, `note?` | 201 |
| PATCH | `/finance/expenses/:id` | campos acima opcionais | 200 |
| DELETE | `/finance/expenses/:id` | — | 204 |

### Receitas
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/incomes` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/finance/incomes` | `source*`, `amount*`, `date*`, `kind*` (fixed/extra), `note?` | 201 |
| DELETE | `/finance/incomes/:id` | — | 204 |

### Categorias de Orçamento
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/budget-categories` | — | 200 `{ data: [] }` |
| PUT | `/finance/budget-categories/:category` | `limit_amount*` | 200 (upsert) |
| DELETE | `/finance/budget-categories/:category` | — | 204 |

### Configuração Financeira
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/config` | — | 200 `{ data: { monthly_income, monthly_spending_limit } }` |
| PATCH | `/finance/config` | `monthly_income?`, `monthly_spending_limit?` | 200 (upsert) |

### Metas de Economia
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/finance/savings-goals` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/finance/savings-goals` | `name*`, `target_amount*`, `current_amount?`, `deadline?` | 201 |
| PATCH | `/finance/savings-goals/:id` | campos acima opcionais | 200 |
| DELETE | `/finance/savings-goals/:id` | — | 204 |

---

## CRM — `/crm`

### Contatos
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/crm/contacts` | QS: `limit?`, `cursor?` | 200 lista |
| GET | `/crm/contacts/:id` | — | 200 `{ data: { ...contact, tags: [] } }` |
| POST | `/crm/contacts` | `name*`, `company?`, `role?`, `phone?`, `email?`, `priority?` (alta/media/baixa), `stage_id?`, `description?` | 201 |
| PATCH | `/crm/contacts/:id` | campos acima + `social_media?`, `context?`, `interests?`, `follow_up_date?`, `sort_order?` | 200 |
| DELETE | `/crm/contacts/:id` | — | 204 (soft delete) |

### Tags
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/crm/tags` | — | 200 |
| POST | `/crm/tags` | `name*`, `color?` | 201 (upsert por nome) |
| DELETE | `/crm/tags/:id` | — | 204 |

### Associação Contato ↔ Tag
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| POST | `/crm/contacts/:id/tags` | `tag_id*` | 201 |
| DELETE | `/crm/contacts/:id/tags/:tagId` | — | 204 |

### Interações
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/crm/contacts/:id/interactions` | — | 200 |
| POST | `/crm/contacts/:id/interactions` | `type*` (nota/ligacao/email/reuniao/mensagem/outro), `content*`, `occurred_at*` | 201 |
| DELETE | `/crm/interactions/:id` | — | 204 |

---

## SHORTCUTS — `/shortcuts`

### Pastas
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/shortcuts/folders` | — | 200 |
| POST | `/shortcuts/folders` | `name*`, `sort_order?` | 201 |
| PATCH | `/shortcuts/folders/:id` | `name?`, `sort_order?` | 200 |
| DELETE | `/shortcuts/folders/:id` | — | 204 |

### Atalhos
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/shortcuts` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/shortcuts` | `name*`, `url*`, `icon?`, `folder_id?`, `sort_order?` | 201 |
| PATCH | `/shortcuts/:id` | campos acima opcionais | 200 |
| DELETE | `/shortcuts/:id` | — | 204 |

### Paths do Sistema
| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/shortcuts/paths` | — | 200 |
| POST | `/shortcuts/paths` | `name*`, `path*`, `icon?`, `sort_order?` | 201 |
| PATCH | `/shortcuts/paths/:id` | campos acima opcionais | 200 |
| DELETE | `/shortcuts/paths/:id` | — | 204 |

---

## CLIPBOARD — `/clipboard`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/clipboard/categories` | — | 200 |
| POST | `/clipboard/categories` | `name*`, `sort_order?` | 201 |
| PATCH | `/clipboard/categories/:id` | `name?`, `sort_order?` | 200 |
| DELETE | `/clipboard/categories/:id` | — | 204 |
| GET | `/clipboard/items` | — | 200 |
| POST | `/clipboard/items` | `content*`, `label?`, `category_id?`, `sort_order?` | 201 |
| PATCH | `/clipboard/items/:id` | campos acima opcionais | 200 |
| DELETE | `/clipboard/items/:id` | — | 204 |

---

## COLOR PALETTES — `/color-palettes`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/color-palettes` | — | 200 |
| POST | `/color-palettes` | `name*`, `colors?` (array), `sort_order?` | 201 |
| PATCH | `/color-palettes/:id` | `name?`, `colors?`, `sort_order?` | 200 |
| DELETE | `/color-palettes/:id` | — | 204 |

---

## APPS & MACROS — `/apps`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/apps` | — | 200 |
| POST | `/apps` | `name*`, `path*`, `icon?`, `sort_order?` | 201 |
| PATCH | `/apps/:id` | campos acima opcionais | 200 |
| DELETE | `/apps/:id` | — | 204 |
| GET | `/apps/:id/macros` | — | 200 |
| POST | `/apps/:id/macros` | `name*`, `sort_order?` | 201 |
| DELETE | `/apps/:id/macros/:macroId` | — | 204 |
| GET | `/apps/:id/macros/:macroId/items` | — | 200 |
| POST | `/apps/:id/macros/:macroId/items` | `action_type*`, `value?`, `delay_ms?`, `sort_order?` | 201 |
| DELETE | `/apps/:id/macros/:macroId/items/:itemId` | — | 204 |

---

## MEETINGS — `/meetings`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/meetings` | QS: `limit?`, `cursor?` | 200 lista |
| GET | `/meetings/:id` | — | 200 |
| POST | `/meetings` | `title*`, `date*`, `time?`, `duration_min?`, `notes?`, `asset_id?` | 201 |
| PATCH | `/meetings/:id` | campos acima opcionais | 200 |
| DELETE | `/meetings/:id` | — | 204 (soft delete) |

---

## PLAYBOOKS — `/playbooks`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/playbooks` | QS: `limit?`, `cursor?` | 200 lista |
| GET | `/playbooks/:id` | — | 200 `{ data: { ...playbook, dialogs: [] } }` |
| POST | `/playbooks` | `name*`, `description?`, `content?`, `summary?`, `sort_order?` | 201 |
| PATCH | `/playbooks/:id` | campos acima opcionais | 200 |
| DELETE | `/playbooks/:id` | — | 204 (soft delete) |
| POST | `/playbooks/:id/dialogs` | `role*` (user/assistant/system), `content*`, `sort_order?` | 201 |
| DELETE | `/playbooks/:id/dialogs/:dialogId` | — | 204 |

---

## STUDY — `/study`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/study/config` | — | 200 `{ data: { daily_goal_minutes, pomodoro_work_min, pomodoro_break_min } }` |
| PATCH | `/study/config` | `daily_goal_minutes?`, `pomodoro_work_min?`, `pomodoro_break_min?` | 200 (upsert) |
| GET | `/study/media-items` | QS: `limit?`, `cursor?` | 200 lista |
| POST | `/study/media-items` | `title*`, `type*`, `url?`, `asset_id?`, `duration_s?`, `youtube_video_id?`, `volume?`, `loop?` | 201 |
| PATCH | `/study/media-items/:id` | campos acima + `progress_s?`, `completed?`, `sort_order?` | 200 |
| DELETE | `/study/media-items/:id` | — | 204 |
| GET | `/study/goals` | — | 200 |
| POST | `/study/goals` | `title*`, `target_date?`, `status?`, `priority?`, `checklist?`, `linked_planning_card_id?` | 201 |
| PATCH | `/study/goals/:id` | campos acima + `completed?`, `sort_order?` | 200 |
| DELETE | `/study/goals/:id` | — | 204 |
| GET | `/study/sessions` | — | 200 (últimas 200) |
| POST | `/study/sessions` | `started_at*`, `ended_at?`, `duration_s?`, `media_item_id?` | 201 |

---

## QUICK ACCESS — `/quick-access`

| Método | Path | Body | Resposta |
|--------|------|------|----------|
| GET | `/quick-access` | — | 200 |
| POST | `/quick-access` | `type*`, `target_id*` (uuid), `label*`, `sort_order?` | 201 |
| PATCH | `/quick-access/:id` | `label?`, `sort_order?` | 200 |
| DELETE | `/quick-access/:id` | — | 204 |

---

## SYNC — `/sync`

| Método | Path | Body/QS | Resposta |
|--------|------|---------|----------|
| GET | `/sync/changes` | QS: `since*` (ISO-8601), `limit?` | 200 `{ data: { serverTime, nextCursor, changes: [{ resource, id, operation: "upsert"\|"delete", updatedAt, payload? }] } }` |
| POST | `/sync/batch` | `operations*` (array de `{ resource, operation, id, payload?, client_updated_at? }`), `client_id?`, `base_cursor?` | 200 `{ data: { processed, results: [{ id, status }] } }` |

**Recursos sincronizáveis:** `cards`, `projects`, `calendar_events`, `notes`, `note_folders`, `habits`, `habit_entries`, `crm_contacts`, `finance_bills`, `finance_expenses`, `finance_incomes`, `finance_savings_goals`, `meetings`, `playbooks`, `study_media_items`, `study_goals`

---

## HEALTH — `/health`

| Método | Path | Resposta |
|--------|------|----------|
| GET | `/health/db-ping` | 200 `{ ok: true, project: "organon", db: "up", timestamp }` / 503 se DB offline |

---

## Exemplo de Fluxo Completo

```bash
# 1. Registrar
curl -X POST .../auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"eu@exemplo.com","password":"MinhaS3nha!"}'

# Resposta: { "data": { "user": {...}, "accessToken": "eyJ...", "refreshToken": "abc..." } }

# 2. Usar accessToken em todas as chamadas
curl .../projects \
  -H "Authorization: Bearer eyJ..."

# 3. Renovar token (quando access expirar)
curl -X POST .../auth/refresh \
  -d '{"refreshToken":"abc..."}'

# 4. Logout
curl -X POST .../auth/logout \
  -d '{"refreshToken":"abc..."}'
```

---

## Erros comuns

| Code | HTTP | Quando |
|------|------|--------|
| `UNAUTHORIZED` | 401 | Token ausente, inválido ou expirado |
| `FORBIDDEN` | 403 | Recurso existe mas não pertence ao usuário |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `CONFLICT` | 409 | E-mail já cadastrado |
| `BAD_REQUEST` | 400 | Nenhum campo para atualizar / validação falhou |
| `INTERNAL_ERROR` | 500 | Erro não tratado |
