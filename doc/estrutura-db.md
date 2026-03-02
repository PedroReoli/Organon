# Estrutura de Banco de Dados (Migracao Appwrite -> API Propria)

## Objetivo
Definir um modelo relacional robusto para substituir o Appwrite mantendo compatibilidade com o JSON atual (`store.json`) e melhorando consistencia, performance e evolucao futura.

## Fonte de verdade atual (JSON)
O `store.json` hoje concentra os dominios:
- `cards`, `calendarEvents`, `projects`, `notes`, `files`
- `shortcutFolders`, `shortcuts`, `paths`, `apps`, `macros`
- `habits`, `habitEntries`
- `bills`, `expenses`, `budgetCategories`, `incomes`, `financialConfig`, `savingsGoals`
- `crmContacts`, `crmInteractions`, `crmTags`
- `playbooks`, `study`, `meetings`, `quickAccess`
- `settings`, `clipboardCategories`, `clipboardItems`, `colorPalettes`

## Decisoes de arquitetura
- Banco principal: PostgreSQL 16+
- Armazenamento de binarios (imagens/audio/pdf/docx): S3/R2/MinIO
- IDs: `uuid` (`gen_random_uuid()`)
- Multi-tenant por usuario com `user_id` em todas as tabelas de dominio
- Soft delete com `deleted_at` (quando fizer sentido)
- Auditoria minima: `created_at`, `updated_at`
- Versionamento de conteudo para notas: tabela de revisoes

## Convencoes
- Nomes em `snake_case`
- Datas em `timestamptz`
- Campos de ordenacao visual: `sort_order int`
- Enums com `CHECK` (evita acoplamento forte de tipo enum no banco)
- JSONB apenas para estruturas realmente flexiveis

## DDL base
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  password_hash text, -- se auth propria; se auth externa, pode ficar null
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme_name text NOT NULL DEFAULT 'dark-default',
  data_dir text,
  installer_completed boolean NOT NULL DEFAULT false,
  week_start text,
  backup_enabled boolean NOT NULL DEFAULT true,
  backup_interval_minutes int NOT NULL DEFAULT 15,
  keyboard_shortcuts jsonb NOT NULL DEFAULT '[]'::jsonb,
  navbar_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Planejamento e calendario
```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6366f1',
  preferred_ide_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE project_links (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE cards (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description_html text NOT NULL DEFAULT '',
  location_day text,
  location_period text,
  sort_order int NOT NULL DEFAULT 0,
  date date,
  time time,
  has_date boolean NOT NULL DEFAULT false,
  priority text,
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  CHECK (priority IN ('P1','P2','P3','P4') OR priority IS NULL),
  CHECK (status IN ('todo','in_progress','blocked','done')),
  CHECK (location_day IN ('mon','tue','wed','thu','fri','sat','sun') OR location_day IS NULL),
  CHECK (location_period IN ('morning','afternoon','night') OR location_period IS NULL)
);

CREATE TABLE card_checklist_items (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  time time,
  recurrence jsonb,
  reminder jsonb,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
```

## Notas, markdown e assets
```sql
CREATE TABLE note_folders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES note_folders(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE notes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES note_folders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  content_markdown text NOT NULL DEFAULT '',
  content_html text,
  current_revision int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE note_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  revision_number int NOT NULL,
  content_markdown text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, revision_number)
);

CREATE TABLE assets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL, -- image, audio, pdf, docx, other
  mime_type text NOT NULL,
  file_name text NOT NULL,
  extension text,
  size_bytes bigint NOT NULL,
  checksum_sha256 text,
  storage_bucket text NOT NULL,
  storage_key text NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL,
  deleted_at timestamptz,
  UNIQUE (storage_bucket, storage_key)
);

CREATE TABLE note_assets (
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, asset_id)
);
```

## CRM
```sql
CREATE TABLE crm_tags (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL,
  UNIQUE (user_id, lower(name))
);

CREATE TABLE crm_contacts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  role text,
  phone text,
  email text,
  social_media text,
  context text,
  interests text,
  priority text NOT NULL DEFAULT 'media',
  stage_id text NOT NULL DEFAULT 'prospeccao',
  description text NOT NULL DEFAULT '',
  follow_up_date date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  CHECK (priority IN ('alta','media','baixa')),
  CHECK (stage_id IN ('prospeccao','qualificado','primeiro-contato','analise','proposta-enviada','negociacao','cliente-ativo','perdeu'))
);

CREATE TABLE crm_contact_tags (
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE crm_interactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (type IN ('nota','ligacao','email','reuniao','mensagem','outro'))
);

CREATE TABLE crm_contact_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- note, event, file, card, project
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, target_type, target_id)
);
```

## Habitos, financeiro, estudo e outros
```sql
CREATE TABLE habits (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  target numeric(12,2) NOT NULL DEFAULT 1,
  frequency text NOT NULL,
  weekly_target int NOT NULL DEFAULT 7,
  week_days int[] NOT NULL DEFAULT '{}',
  trigger text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  minimum_target numeric(12,2) NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  CHECK (type IN ('boolean','count','time','quantity')),
  CHECK (frequency IN ('daily','weekly'))
);

CREATE TABLE habit_entries (
  id uuid PRIMARY KEY,
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date date NOT NULL,
  value numeric(12,2) NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  skip_reason text NOT NULL DEFAULT '',
  UNIQUE (habit_id, date)
);

CREATE TABLE finance_bills (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_day int NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category text NOT NULL,
  recurrence text NOT NULL DEFAULT 'monthly',
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  created_at timestamptz NOT NULL,
  CHECK (recurrence IN ('monthly','yearly'))
);

CREATE TABLE finance_expenses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text NOT NULL,
  date date NOT NULL,
  installments int NOT NULL DEFAULT 1,
  current_installment int NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES finance_expenses(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL
);

CREATE TABLE finance_budget_categories (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  limit_amount numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE finance_incomes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,
  amount numeric(12,2) NOT NULL,
  date date NOT NULL,
  kind text NOT NULL,
  recurrence_months int NOT NULL DEFAULT 1,
  recurrence_index int NOT NULL DEFAULT 1,
  recurrence_group_id uuid,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  CHECK (kind IN ('fixed','extra'))
);

CREATE TABLE finance_config (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_income numeric(12,2) NOT NULL DEFAULT 0,
  monthly_spending_limit numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance_savings_goals (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL,
  current_amount numeric(12,2) NOT NULL DEFAULT 0,
  deadline date,
  created_at timestamptz NOT NULL
);
```

## Outras tabelas (mesma convencao)
- `shortcut_folders`, `shortcuts`
- `paths`
- `color_palettes`
- `clipboard_categories`, `clipboard_items`
- `apps`, `app_macros`, `app_macro_items`
- `meetings` (com `asset_id` para audio)
- `playbooks`, `playbook_dialogs`
- `study_config`, `study_media_items`, `study_goals`, `study_sessions`
- `quick_access_items`

## Indices recomendados
```sql
CREATE INDEX idx_cards_user_date ON cards(user_id, date);
CREATE INDEX idx_cards_user_status ON cards(user_id, status);
CREATE INDEX idx_events_user_date ON calendar_events(user_id, date);
CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC);
CREATE INDEX idx_expenses_user_date ON finance_expenses(user_id, date DESC);
CREATE INDEX idx_crm_contacts_user_stage ON crm_contacts(user_id, stage_id, sort_order);
CREATE INDEX idx_habit_entries_habit_date ON habit_entries(habit_id, date DESC);
CREATE INDEX idx_assets_user_created ON assets(user_id, created_at DESC);
```

## Estrategia para markdown e imagens (facil + escalavel)
- Markdown: salvar em `notes.content_markdown` (`TEXT`) para leitura/escrita direta e simples.
- Revisoes: salvar snapshots em `note_revisions` a cada alteracao relevante.
- Imagens/arquivos: subir para object storage e guardar metadados em `assets`.
- Vinculo nota<->imagem: `note_assets`; no markdown usar referencia por `asset_id` ou URL assinada curta.
- Beneficio: consulta simples, backup claro, sem inflar o banco com binario.

## Mapeamento JSON -> banco
- `cards` -> `cards` + `card_checklist_items`
- `calendarEvents` -> `calendar_events`
- `projects` -> `projects` + `project_links`
- `notes`/`noteFolders` -> `notes` + `note_folders` (+ `note_revisions`)
- `files` -> `assets`
- `crmContacts`/`crmTags`/`crmInteractions` -> `crm_contacts` + `crm_tags` + `crm_contact_tags` + `crm_interactions` + `crm_contact_links`
- `habits`/`habitEntries` -> `habits` + `habit_entries`
- `bills`/`expenses`/`budgetCategories`/`incomes`/`financialConfig`/`savingsGoals` -> tabelas `finance_*`
- `settings` -> `user_settings`
- `study` -> `study_config` + `study_media_items` + `study_goals` + `study_sessions`

## Boas praticas obrigatorias
- Transacoes em operacoes com multiplas tabelas
- `updated_at` sempre atualizado no backend (nao confiar no cliente)
- `UPSERT` por `id` para migracao/importacao
- Paginacao por cursor para listas grandes
- Limite e sanitizacao de HTML/markdown no backend
- Backups diarios + restore testado
- Migrations versionadas (Prisma/Knex/Drizzle/Flyway)
