# Migração: Appwrite → Organon API

## Visão Geral

Substituição completa do Appwrite (auth + cloud sync) pela Organon API REST.
A API usa token fixo na URL, é single-user, e tem sync incremental via `/sync/changes` e `/sync/batch`.

- **Base URL**: `https://reolicodeapi.com`
- **Prefixo**: `/api/v1/organon/{token}`
- **Token**: configurado pelo usuário nas Settings (salvo em `settings.apiToken`)
- **Auth**: nenhuma — só o token na URL

---

## Estratégia de Sync

### Push (local → API)
- Upsert de todas as entidades via `POST /sync/batch`
- Lote de 100 operações por request
- `client_updated_at` em cada operação para last-write-wins
- Após push bem-sucedido: salvar `lastSyncAt = agora` no store

### Pull (startup)
1. `GET /sync/changes?since=lastSyncAt`
2. Se houver mudanças: baixar todos os recursos sincronizáveis por endpoint e aplicar ao store local
3. Se `lastSyncAt` for null (primeira vez): usar `2020-01-01T00:00:00.000Z`

### Formato do batch (confirmado do código real)
```json
{
  "operations": [
    {
      "resource": "cards",
      "operation": "upsert",
      "id": "uuid",
      "payload": { ... },
      "client_updated_at": "2026-03-04T10:00:00.000Z"
    },
    {
      "resource": "cards",
      "operation": "delete",
      "id": "uuid"
    }
  ]
}
```

### Formato do changes (confirmado do código real)
```json
{
  "data": {
    "serverTime": "2026-03-04T...",
    "nextCursor": "2026-03-04T...#uuid",
    "changes": [
      {
        "resource": "cards",
        "id": "uuid",
        "operation": "upsert",
        "updatedAt": "...",
        "payload": { ... }
      }
    ]
  }
}
```
- Cursor: `data.nextCursor` (não `meta.cursor`)
- Dados do item: `payload` (não `data`)
- Deletes: `updatedAt` (não `deleted_at`)

---

## Recursos Sincronizados via /sync/batch

Confirmados no `SYNC_TABLES` do backend:

| Recurso API | Store local |
|---|---|
| `cards` | `store.cards` |
| `projects` | `store.projects` |
| `calendar_events` | `store.calendarEvents` |
| `notes` | `store.notes` |
| `note_folders` | `store.noteFolders` |
| `habits` | `store.habits` |
| `habit_entries` | `store.habitEntries` |
| `crm_contacts` | `store.crmContacts` |
| `finance_bills` | `store.bills` |
| `finance_expenses` | `store.expenses` |
| `finance_incomes` | `store.incomes` |
| `finance_savings_goals` | `store.savingsGoals` |
| `playbooks` | `store.playbooks` |
| `study_media_items` | `store.study.mediaItems` |
| `study_goals` | `store.study.goals` |

**Ficam local (sem sync batch):**
- `shortcuts`, `shortcutFolders`, `paths`
- `clipboard`, `clipboardCategories`, `clipboardItems`
- `colorPalettes`
- `apps`, `macros`
- `registeredIDEs`
- `files`
- `settings`
- `study.sessions`, `study.wallpaperUrl`, `study.focusMinutes`, `study.breakMinutes`
- `crmInteractions` (API tem endpoint separado, fora do batch)
- `crmTags` (API tem endpoint separado, fora do batch)
- `meetings` (deixar para depois)

---

## Mapeamento de Campos: local → API

### Cards
| Local | API (payload) | Obs |
|---|---|---|
| `descriptionHtml` | `description_html` | |
| `location.day` | `location_day` | |
| `location.period` | `location_period` | |
| `order` | `sort_order` | |
| `projectId` | `project_id` | |
| `hasDate` | `has_date` | |
| `checklist` | `checklist` | JSON (array) |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |

### Notes
| Local | API | Obs |
|---|---|---|
| `folderId` | `folder_id` | |
| `parentNoteId` | `parent_note_id` | |
| `projectId` | `project_id` | |
| `isPinned` | `is_pinned` | |
| `isFavorite` | `is_favorite` | |
| `order` | `sort_order` | |
| `mdPath` (arquivo .md em disco) | `content_markdown` | Ler arquivo antes de enviar |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |

### Note Folders
| Local | API |
|---|---|
| `parentId` | `parent_id` |
| `order` | `sort_order` |
| `createdAt` | `created_at` |

### Projects
| Local | API |
|---|---|
| `preferredIdeId` | `preferred_ide_id` |
| `links` | `links` (JSON) |
| `order` | `sort_order` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### Calendar Events
| Local | API |
|---|---|
| `recurrence` | `recurrence` (JSON) |
| `reminder` | `reminder` (JSON) |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### Habits
| Local | API |
|---|---|
| `weeklyTarget` | `weekly_target` |
| `weekDays` | `week_days` (JSON array) |
| `minimumTarget` | `minimum_target` |
| `order` | `sort_order` |
| `createdAt` | `created_at` |

### Habit Entries
| Local | API |
|---|---|
| `habitId` | `habit_id` |
| `skipReason` | `skip_reason` |

### CRM Contacts
| Local | API | Obs |
|---|---|---|
| `socialMedia` | `social_media` | |
| `stageId` | `stage_id` | valores PT aceitos |
| `followUpDate` | `follow_up_date` | |
| `order` | `sort_order` | |
| `tags` | ❌ não vai no payload | via endpoint separado |
| `links` | ❌ não vai no payload | local only por ora |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |

### Finance Bills
| Local | API |
|---|---|
| `dueDay` | `due_day` |
| `isPaid` | `is_paid` |
| `paidDate` | `paid_date` |
| `createdAt` | `created_at` |

### Finance Expenses
| Local | API |
|---|---|
| `currentInstallment` | `current_installment` |
| `parentId` | `parent_id` |
| `createdAt` | `created_at` |

### Finance Incomes
| Local | API |
|---|---|
| `recurrenceMonths` | `recurrence_months` |
| `recurrenceIndex` | `recurrence_index` |
| `recurrenceGroupId` | `recurrence_group_id` |
| `createdAt` | `created_at` |

### Finance Savings Goals
| Local | API |
|---|---|
| `targetAmount` | `target_amount` |
| `currentAmount` | `current_amount` |
| `createdAt` | `created_at` |

### Playbooks
| Local | API | Obs |
|---|---|---|
| `title` | `name` | ⚠️ campo renomeado |
| `sector` | `description` | mapeado para description |
| `content` | `content` | adicionado pela API |
| `summary` | `summary` | adicionado pela API |
| `order` | `sort_order` | |
| `dialogs` | ❌ não vai no payload | endpoint separado (POST /playbooks/:id/dialogs) |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |

**⚠️ Dialogs não sincronizam no batch.** Por ora ficam local. Implementar depois via:
- Antes de push: DELETE /playbooks/:id/dialogs/:dialogId para cada dialog removido
- POST /playbooks/:id/dialogs para cada dialog novo/atualizado
- Mapeamento: local `title` → API `role`, local `text` → API `content`

### Study Goals (de `store.study.goals`)
| Local | API |
|---|---|
| `linkedPlanningCardId` | `linked_planning_card_id` |
| `checklist` | `checklist` (JSON) |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### Study Media Items (de `store.study.mediaItems`)
| Local | API | Obs |
|---|---|---|
| `kind` | `type` | ⚠️ campo renomeado |
| `youtubeVideoId` | `youtube_video_id` | adicionado pela API |
| `volume` | `volume` | adicionado pela API |
| `loop` | `loop` | adicionado pela API |
| `showDock` | ❌ não existe na API | local only |

---

## Arquivos do Desktop a Criar/Modificar

### Criar (novos)

#### `src/api/organon.ts`
Client HTTP base.
- Guarda `{ baseUrl, token }` em memória
- Função `configureOrganon(baseUrl, token)` chamada no boot e ao salvar token
- Função `organonApi.ping()` → GET /health/db-ping → retorna boolean
- `organonApi.sync.batch(operations[])` → POST /sync/batch
- `organonApi.sync.changes(since, cursor?, limit?)` → GET /sync/changes
- Exporta tipos: `SyncOperation`, `SyncBatchResult`, `SyncChangesResponse`, `SyncChange`

#### `src/renderer/hooks/useApiToken.ts`
Substitui `useAuth.ts`.
- Recebe `initialBaseUrl` e `initialToken` (dos settings do store)
- Chama `configureOrganon` no mount se token existir
- `configure(baseUrl, token)` → valida com ping → retorna boolean
- Estado: `isConfigured`, `isValidating`, `tokenError`
- Sem login/logout — token é só uma configuração

### Reescrever

#### `src/api/sync.ts`
Substitui sync do Appwrite completamente.

**Funções exportadas:**
```typescript
// Push: envia todo o store para a API via batch
pushAllToApi(store: Store, noteContents?: Map<string, string>): Promise<void>

// Pull: baixa mudanças desde lastSyncAt, retorna store parcial
pullFromApi(since?: string): Promise<{ data: PartialSyncedStore; serverTime: string }>

// Tipo com os recursos sincronizados (subset do Store)
interface PartialSyncedStore {
  cards: Card[]
  notes: Note[]
  noteFolders: NoteFolder[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  crmContacts: CRMContact[]
  bills: Bill[]
  expenses: Expense[]
  incomes: IncomeEntry[]
  savingsGoals: SavingsGoal[]
  playbooks: Playbook[]
  studyGoals: StudyGoal[]
  studyMediaItems: StudyMediaItem[]
}
```

**Estrutura interna:**
- `toApi_*` functions: convertem entidade local → payload API (snake_case, renames)
- `fromApi_*` functions: convertem payload API → entidade local (camelCase, defaults)
- `pushAllToApi`: monta `SyncOperation[]` para todos os recursos, envia em lotes de 100
- `pullFromApi`: pagina por `GET /sync/changes`, acumula por resource, converte com fromApi_*

### Modificar

#### `src/renderer/types/index.ts`

**No interface `Settings`** (linha ~764), adicionar:
```typescript
apiToken?: string
apiBaseUrl?: string
```

**No interface `Store`** (linha ~824), adicionar:
```typescript
lastSyncAt?: string   // ISO timestamp do último push bem-sucedido
```

**No `normalizeStore`** (em useStore.ts): garantir defaults para os novos campos.

#### `src/renderer/components/App.tsx`

**Remover:**
- Import de `useAuth` (linha 3)
- Import de `AuthModal` (linha 9)
- Import de `uploadStore`, `downloadStore`, `syncCollectionsToCloud` (linha 4)
- Estado `showAuthModal` (linha 180)
- Efeito de reset de sync ao fazer logout (linhas 191-196)
- Lógica de startup sync com `downloadStore` (linhas 199-223)
- Lógica de auto-sync com `uploadStore + syncCollectionsToCloud` (linhas 226-257)
- `useRef userRef` e `lastCheckedUserRef` (linhas 186-188)
- Renderização do `<AuthModal>` no JSX

**Adicionar:**
- Import de `useApiToken` de `../hooks/useApiToken`
- Import de `pushAllToApi`, `pullFromApi` de `../../api/sync`
- Import de `configureOrganon` de `../../api/organon`
- Hook: `const { isConfigured } = useApiToken(settings.apiBaseUrl ?? '', settings.apiToken ?? '')`
- Startup pull: se `isConfigured`, checar changes desde `store.lastSyncAt`; se houver, aplicar ao store e recarregar
- Auto-sync: se `isConfigured`, debounce 10s → `pushAllToApi` → salvar `lastSyncAt` via `updateSettings`

**Startup pull (substituição das linhas 199-223):**
```typescript
useEffect(() => {
  if (!isConfigured || isLoading) return
  // checar changes desde lastSyncAt
  const checkAndPull = async () => {
    try {
      const res = await organonApi.sync.changes(store.lastSyncAt ?? '2020-01-01T00:00:00.000Z', undefined, 1)
      if (res.data.changes.length > 0) {
        // há mudanças no servidor → pull completo
        const { data, serverTime } = await pullFromApi(store.lastSyncAt)
        const merged = mergeWithLocalStore(rawStore, data)
        merged.lastSyncAt = serverTime
        await window.electronAPI.saveStore(merged)
        window.location.reload()
      }
    } catch { /* silencioso */ }
  }
  void checkAndPull()
}, [isConfigured, isLoading])
```

**Auto-sync (substituição das linhas 226-257):**
```typescript
useEffect(() => {
  if (!isConfigured || !isElectron()) return
  setSyncStatus('pending')
  if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current)
  autoSyncTimerRef.current = setTimeout(async () => {
    setSyncStatus('syncing')
    try {
      const rawStore = await window.electronAPI.loadStore()
      const noteContents = new Map<string, string>()
      await Promise.all(rawStore.notes.map(async (n) => {
        const content = await window.electronAPI.readNote(n.mdPath)
        noteContents.set(n.id, content ?? '')
      }))
      await pushAllToApi(rawStore, noteContents)
      // Salvar lastSyncAt
      updateSettings({ ...rawStore.settings }) // trigger normalizeStore que vai pegar o lastSyncAt
      // Ou direto: window.electronAPI.saveStore({ ...rawStore, lastSyncAt: new Date().toISOString() })
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
    }
  }, 10000)
}, [storeVersion])
```

#### `src/renderer/components/SettingsView.tsx`

Seção "Conta & Sincronização" (em torno da linha 1061) precisa virar "API & Sincronização":

**Remover:**
- Import e uso de `useAuth` e `AuthModal`
- Todo o bloco de login/register/logout

**Adicionar:**
- Campos: `apiBaseUrl` (input text, default `https://reolicodeapi.com`) e `apiToken` (input password)
- Botão "Salvar & Testar" → chama `useApiToken.configure(baseUrl, token)` → se ok, salva em `updateSettings`
- Status de sync (igual ao atual: idle/pending/syncing/synced/error)
- Texto explicativo: "Sync automático. Mudanças são enviadas após 10s sem atividade."

### Deletar (depois de testar)
- `src/api/appwrite.ts`
- `src/api/auth.ts`
- `src/renderer/hooks/useAuth.ts`
- `src/renderer/components/AuthModal.tsx`

---

## Arquivos do Mobile a Criar/Modificar

### Criar

#### `mobile/src/api/organon.ts`
Idêntico ao desktop (React Native usa `fetch` nativo).
Sem `File()` (não existe no RN) — sem upload de store completo.

#### `mobile/src/api/sync.ts`
Similar ao desktop com diferenças:
- Sem `noteContents` (mobile armazena content inline)
- Note: campo `content` → `content_markdown` direto do store
- Sem acesso a `window.electronAPI`
- Função `pullFromApi` igual ao desktop

### Reescrever

#### `mobile/src/hooks/useAppwrite.ts` → renomear para `useOrganonSync.ts`
- Remove JWT/Appwrite session
- Remove hydration do Appwrite Storage
- Mantém: debounce 10s, `syncStatus`, `triggerSync(store)`
- Startup: pull desde `lastSyncAt` (salvo no AsyncStorage ou no store)
- Auto-sync: `pushAllToApi(store)` → atualiza `lastSyncAt`

#### `mobile/src/hooks/useAppwriteContext.tsx` → `useSyncContext.tsx`
- Remove AppwriteProvider
- Provider do novo hook de sync

### Modificar

#### `mobile/App.tsx`
- Remove AppwriteProvider, AppwriteContext
- Adiciona SyncProvider
- Remove StoreSyncBridge baseado em Appwrite (recria com novo hook)

#### `mobile/src/screens/SettingsScreen.tsx`
- Remove seção de login/conta Appwrite
- Adiciona campos apiToken e apiBaseUrl (ou hardcoded se single-user)

### Deletar (depois de testar)
- `mobile/src/api/appwrite.ts`
- `mobile/src/api/auth.ts`

---

## Dependências a Remover

### Desktop (`package.json`)
```
appwrite
```
Remover após implementação e testes.

### Mobile (`mobile/package.json`)
```
appwrite (ou react-native-appwrite)
```
Remover após implementação e testes.

---

## Ordem de Implementação Recomendada

1. **`src/renderer/types/index.ts`** — adicionar `apiToken`, `apiBaseUrl` em Settings; `lastSyncAt` em Store
2. **`src/api/organon.ts`** — client base (mais simples, sem dependências)
3. **`src/api/sync.ts`** — novo sync (depende do organon.ts e dos tipos)
4. **`src/renderer/hooks/useApiToken.ts`** — hook de token (depende do organon.ts)
5. **`src/renderer/components/App.tsx`** — trocar lógica de sync (depende de tudo acima)
6. **`src/renderer/components/SettingsView.tsx`** — seção de token (depende do useApiToken)
7. Testar desktop completamente
8. Deletar arquivos Appwrite do desktop
9. Repetir para mobile (mesma ordem)
10. Remover deps do package.json

---

## Notas Importantes

- **POST /sync/batch passa payload direto ao SQL** — campo com nome errado causa erro 500. Usar EXATAMENTE os nomes de coluna do DB.
- **Playbook title vs name** — local usa `title`, API usa `name`. Na conversão: `title → name` (push) e `name → title` (pull).
- **Study Goals e MediaItems são aninhados** — ficam em `store.study.goals[]` e `store.study.mediaItems[]` localmente, mas são top-level na API.
- **CRM tags e links** — não vão no payload do batch. Tags via `POST /crm/contacts/:id/tags`, links ficam local por ora.
- **Dialogs de Playbook** — não vão no batch. Ficam local na V1, implementar via endpoints separados depois.
- **Notes content** — desktop lê arquivo `.md` do disco antes de enviar (já existe no App.tsx atual).
- **lastSyncAt null** — primeira sync usa `since=2020-01-01T00:00:00.000Z`.
