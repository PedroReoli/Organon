# Decisões Finais — Organon Mobile

> Documento definitivo de escopo e decisões técnicas.
> Substitui e consolida `decisoes-tecnicas.md`.
> Última atualização: 2026-02-27

---

## 1. Stack final (confirmada)

| Camada | Tecnologia | Motivo |
|---|---|---|
| Framework | React Native + Expo SDK 51+ | Mesmo React do desktop, Expo abstrai toolchain nativo |
| Linguagem | TypeScript | Mesmo padrão do desktop |
| Navegação | React Navigation 6 (Drawer + Stack) | Drawer substitui sidebar; Stack para drill-down |
| Estilização | NativeWind v4 | Mesma linguagem Tailwind do desktop |
| Dados estruturados | expo-sqlite | Substitui JSON files do Electron |
| Preferências simples | AsyncStorage | Tema, config de navbar, settings simples |
| Arquivos | expo-file-system | Conteúdo markdown das notas |
| Notificações | expo-notifications | Substitui notificações Electron |
| Auth + Sync | Appwrite SDK | **Mesmo projeto Appwrite do desktop** |
| Ícones | @expo/vector-icons (Feather) | Padrão Expo |
| Build | EAS Build (cloud) | Gera APK sem Android Studio, sem SDK local |

---

## 2. Build — EAS Cloud (decisão final)

### Por que EAS Cloud (sem `--local`)

O documento `build-e-release.md` original usava `eas build --local` no GitHub Actions.
**Decisão revista:** usar EAS Cloud Build (sem flag `--local`).

| | `--local` | EAS Cloud |
|---|---|---|
| Precisa de Android SDK | Sim (no runner) | Não |
| Tempo de build | ~20 min no runner | Gerenciado pela Expo |
| Falhas de ambiente | Possível | Não (ambiente controlado) |
| Limite gratuito | Ilimitado (usa runner) | 30 builds/mês |
| Complexidade | Alta | Baixa |

30 builds/mês é mais que suficiente para uso pessoal.

### Fluxo de build para APK

```bash
# Uma vez só: instalar EAS CLI e fazer login
npm install -g eas-cli
eas login

# Para gerar APK (rodar dentro de mobile/)
eas build -p android --profile preview
```

Resultado: link de download direto para instalar no celular. Sem Android Studio, sem SDK.

### Perfis de build (`eas.json`)

| Perfil | Uso | Formato |
|---|---|---|
| `development` | Dev com hot reload | APK com Expo Dev Client |
| `preview` | Testes e distribuição | APK instalável |
| `production` | Release pública | APK otimizado |

### Workflow GitHub Actions (corrigido)

O workflow cria release automaticamente ao dar push em `main` com mudanças em `mobile/**`.
Usa EAS Cloud (sem `--local`) — o APK é baixado via URL retornada pelo EAS CLI.

**Secrets necessários:**
- `EXPO_TOKEN` — gerado em expo.dev → Account Settings → Access Tokens

### Desenvolvimento (sem build)

```bash
cd mobile
npx expo start
# Instalar "Expo Go" no celular → escanear QR → app roda instantaneamente
```

---

## 3. Appwrite — integração completa

O app mobile usa **o mesmo projeto Appwrite do desktop**.
Mesma endpoint, mesmo PROJECT_ID, mesmo BUCKET_ID, mesmas collections.

### Configuração (igual ao desktop)

```ts
// src/api/appwrite.ts
endpoint: 'https://fra.cloud.appwrite.io/v1'
projectId: '69a04328002453254a38'
BUCKET_ID: 'organon-stores'
DATABASE_ID: 'organon-db'
```

### Funções a portar (`src/api/`)

#### `auth.ts` — Auth completo

| Função | O que faz |
|---|---|
| `signIn(email, password)` | Cria sessão email/senha |
| `signUp(email, password, name)` | Cria conta + login automático |
| `signOut()` | Deleta sessão atual |
| `getCurrentUser()` | Retorna usuário logado ou null |

#### `sync.ts` — Sync completo

| Função | O que faz |
|---|---|
| `uploadStore(store, userId)` | Upload completo do store como JSON no Storage |
| `downloadStore(userId)` | Download do store JSON do Storage |
| `syncCollectionsToCloud(store, userId)` | Sync granular por collection no Database |

#### Collections sincronizadas no Appwrite Database

Todas as collections abaixo precisam ser portadas no mobile:

| Collection | Campos principais |
|---|---|
| `cards` | title, description, priority, status, date, time, location, projectId, checklist, tags |
| `calendarEvents` | title, date, time, description, color, recurrence, reminder |
| `projects` | name, path, color, ideId, description, links, githubUrl |
| `notes` | title, folderId, projectId, mdPath, content, order |
| `noteFolders` | name, parentId, order |
| `habits` | name, type, frequency, color, unit, goal, active |
| `habitEntries` | habitId, date, value, skipped, skipReason |
| `crmContacts` | name, company, email, phone, stage, priority, tags, notes, followUpDate |
| `bills` | name, amount, dueDay, category, active, color |
| `expenses` | description, amount, date, category, type, installments, tags |
| `shortcuts` | title, url, folderId, favicon, order |
| `playbooks` | title, sector, category, summary, content, dialogs, order |
| `settings` | themeName, navbarConfig, keyboardShortcuts, backupEnabled |

### Estratégia de sync (igual ao desktop)

1. **Local-first**: app funciona 100% offline, login é opcional
2. **Na abertura**: se autenticado, compara `storeUpdatedAt` local vs cloud → baixa se cloud for mais novo
3. **A cada mudança**: sync automático com debounce de 10s
4. **Sem botões manuais**: sync totalmente automático quando autenticado

### Hook `useAppwrite` (equivalente ao `useAuth.ts` do desktop)

Retorna:
- `user` — usuário logado ou null
- `isLoadingAuth` — estado de carregamento inicial
- `authError` — mensagem de erro traduzida (PT-BR)
- `login(email, password)`
- `register(email, password, name)`
- `logout()`
- `clearAuthError()`
- `syncStatus` — `idle | pending | syncing | synced | error`

---

## 4. Telas — escopo completo

Todas as 19 telas do desktop são portadas para mobile.

| # | Tela | Appwrite Collections | Funcionalidades |
|---|---|---|---|
| 1 | **Today** (Dashboard) | cards, calendarEvents, habits, expenses | Cards do dia, próximos eventos, hábitos hoje, resumo financeiro |
| 2 | **Planner** | cards | Grid dia × período, CRUD de cards, drag-and-drop |
| 3 | **Calendário** | calendarEvents | Visualização mensal/semanal, CRUD eventos, recorrência |
| 4 | **Backlog** | cards | Lista de cards sem data, filtros por prioridade/status |
| 5 | **Notas** | notes, noteFolders | Hierarquia de pastas, editor rich text, CRUD |
| 6 | **CRM** | crmContacts | Pipeline, lista de contatos, detalhe do contato |
| 7 | **Playbook** | playbooks | Lista por setor/categoria, visualização e cópia |
| 8 | **Projetos** | projects, cards | CRUD projetos, cards vinculados |
| 9 | **Clipboard** | — (local only) | Snippets, cópia rápida, categorias |
| 10 | **Arquivos** | — (local only) | Import, preview, grid/lista |
| 11 | **Atalhos** | shortcuts | Hierarquia de pastas, abrir URL |
| 12 | **Caminhos** | — (adaptado) | Deeplinks para Google Drive/iCloud |
| 13 | **Apps** | — (adaptado) | Deeplinks para apps instalados (spotify://, notion://) |
| 14 | **Cores** | — (local only) | Paletas, copiar hex |
| 15 | **Hábitos** | habits, habitEntries | Tracking diário/semanal, CRUD |
| 16 | **Estudo** | — (local only) | Timer Pomodoro, sessões |
| 17 | **Financeiro** | bills, expenses | Despesas, receitas, contas, orçamento |
| 18 | **Histórico** | — (local only) | Log de atividades por domínio |
| 19 | **Configurações** | settings | Tema, auth, sync status, backup |

### Telas adaptadas (não idênticas ao desktop)

| Tela | Adaptação |
|---|---|
| **Caminhos** | Paths do sistema viram deeplinks (sandbox mobile não permite acesso ao FS) |
| **Apps** | Launcher vira deeplinks (`spotify://`, `notion://`, etc.) — sem macros |
| **Projetos** | Sem abertura de IDE (não disponível em mobile) |
| **Notas** | Editor full-screen (sem painel lateral) |
| **Planner** | Tabs de dias + tabs de período (sem grid 2D) |
| **CRM** | Pipeline como scroll horizontal (sem Kanban columns fixas) |

---

## 5. Armazenamento local

| Dado | Solução | Justificativa |
|---|---|---|
| Todos os domínios (cards, events, habits, etc.) | expo-sqlite | Consultas estruturadas, melhor performance que JSON |
| Settings, tema, navbarConfig | AsyncStorage | Key-value simples, sem necessidade de SQL |
| Conteúdo markdown das notas | expo-file-system | Arquivos .md no diretório do app |
| Arquivos importados (PDFs, imagens) | expo-file-system | Dentro do sandbox do app |

---

## 6. Módulos excluídos do mobile

| Funcionalidade | Motivo | Substituto |
|---|---|---|
| Execução de apps/macros | Sandbox do OS não permite | Deeplinks |
| Paths do sistema | FS sandboxed em mobile | Links para cloud storage |
| Abertura de IDE | Não disponível | Removido |
| Auto-updater (electron-updater) | Não se aplica | EAS OTA Update |
| IPC (Electron main/renderer) | Arquitetura diferente | Acesso direto às APIs Expo |

---

## 7. Referências do app original

| Arquivo | O que contém |
|---|---|
| `src/api/appwrite.ts` | Client, constants (BUCKET_ID, DATABASE_ID, PROJECT_ID) |
| `src/api/auth.ts` | signIn, signUp, signOut, getCurrentUser |
| `src/api/sync.ts` | uploadStore, downloadStore, syncCollectionsToCloud, helpers |
| `src/renderer/hooks/useAuth.ts` | Hook React com tradução de erros PT-BR |
| `src/renderer/types/index.ts` | Tipos TypeScript de todas as entidades |
| `src/renderer/hooks/useStore.ts` | Padrões de normalização e versão do store (v12) |
