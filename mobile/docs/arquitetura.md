# Arquitetura — Organon Mobile

## Visão geral

Organon Mobile mantém a filosofia local-first do desktop.
A stack é React Native + Expo, com SQLite para dados estruturados e Appwrite para sync opcional.

A estrutura é mais simples do que o desktop: sem processo Electron, sem IPC bridge.
React Native acessa APIs nativas diretamente via módulos Expo.

---

## Camadas

### Interface (React Native)
Telas e componentes construídos em React Native com NativeWind.
Navegação via React Navigation (Drawer + Stack).
Estado global via custom hook `useMobileStore` (equivalente ao `useStore` do desktop).

### Estado e regras
Hook centralizado que gerencia todos os domínios: planejamento, calendário, notas, CRM, hábitos, finanças.
Mesmas regras de normalização e validação do desktop.
Persistência automática a cada mutação de estado.

### Persistência
- **expo-sqlite**: tabelas para cada domínio (cards, events, habits, financial, crm, etc.)
- **AsyncStorage**: configurações, preferências, navbar config, tema
- **expo-file-system**: conteúdo markdown das notas, arquivos importados

### Sync (opcional)
Mesma integração Appwrite do desktop.
O app funciona 100% offline. Login é opcional.
Sync automático quando conectado e autenticado.

---

## Estrutura de pastas

```
mobile/
├── app/                        # Telas (estrutura Expo Router ou React Navigation)
│   ├── (drawer)/               # Grupo de telas com drawer navigation
│   │   ├── today.tsx           # Dashboard
│   │   ├── planner.tsx         # Planejador semanal
│   │   ├── calendar.tsx        # Calendário
│   │   ├── backlog.tsx         # Backlog
│   │   ├── notes.tsx           # Notas
│   │   ├── crm.tsx             # CRM
│   │   ├── playbook.tsx        # Playbook
│   │   ├── projects.tsx        # Projetos
│   │   ├── clipboard.tsx       # Clipboard
│   │   ├── files.tsx           # Arquivos
│   │   ├── shortcuts.tsx       # Atalhos
│   │   ├── paths.tsx           # Caminhos
│   │   ├── apps.tsx            # Apps
│   │   ├── colors.tsx          # Cores
│   │   ├── habits.tsx          # Hábitos
│   │   ├── study.tsx           # Estudo
│   │   ├── financial.tsx       # Financeiro
│   │   ├── history.tsx         # Histórico
│   │   └── settings.tsx        # Configurações
│   └── _layout.tsx             # Root layout (DrawerNavigator)
├── components/                 # Componentes reutilizáveis
│   ├── drawer/
│   │   ├── AppDrawer.tsx       # Conteúdo do drawer (nav + busca)
│   │   ├── DrawerSection.tsx   # Seção colapsável no drawer
│   │   └── DrawerItem.tsx      # Item de navegação
│   ├── shared/
│   │   ├── Header.tsx          # Header com hamburger + título + ações
│   │   ├── SearchBar.tsx       # Campo de busca (dentro do drawer)
│   │   ├── Card.tsx            # Card de tarefa/evento
│   │   ├── Modal.tsx           # Modal base
│   │   ├── EmptyState.tsx      # Estado vazio
│   │   └── FAB.tsx             # Floating Action Button (criar novo item)
│   └── screens/                # Componentes específicos de cada tela
├── hooks/
│   ├── useMobileStore.ts       # Estado global (equivalente ao useStore do desktop)
│   ├── useAppwrite.ts          # Auth e sync com Appwrite
│   ├── useTheme.ts             # Tema atual (dark/light)
│   └── useSearch.ts            # Lógica de busca global
├── db/
│   ├── schema.ts               # Definição das tabelas SQLite
│   ├── migrations.ts           # Migrações de schema
│   └── queries/                # Queries por domínio
│       ├── cards.ts
│       ├── events.ts
│       ├── habits.ts
│       ├── financial.ts
│       ├── notes.ts
│       └── crm.ts
├── types/
│   └── index.ts                # Tipos TypeScript (mesmos do desktop, adaptados)
├── utils/
│   ├── storage.ts              # Helpers para AsyncStorage
│   ├── date.ts                 # Helpers de data
│   └── format.ts               # Formatação de texto/números
├── constants/
│   ├── colors.ts               # Paleta de cores e temas
│   ├── nav.ts                  # Configuração de navegação e ícones
│   └── config.ts               # Configurações globais
├── assets/                     # Imagens, ícones, splash screen
├── app.json                    # Configuração Expo
├── eas.json                    # Configuração EAS Build
├── package.json
├── tailwind.config.js          # NativeWind config
└── tsconfig.json
```

---

## Fluxo de dados

```
Tela → Handler no hook → Validação → Mutação de estado → Persistência SQLite/AsyncStorage
                                                        ↓
                                               Sync Appwrite (se autenticado)
```

Na abertura do app:
1. Carregar dados do SQLite
2. Normalizar e validar schema
3. Verificar se há versão mais nova no Appwrite (se autenticado)
4. Renderizar tela inicial (Today)

---

## Modelo de dados

Mantém os mesmos tipos do desktop (`/src/renderer/types/index.ts`), adaptados para SQLite.

Principais tabelas:
- `cards` — tarefas do planejador
- `calendar_events` — eventos e lembretes
- `notes` — metadados das notas (conteúdo em arquivo .md)
- `note_folders` — hierarquia de pastas de notas
- `crm_contacts` — contatos CRM com pipeline
- `crm_interactions` — interações dos contatos
- `habits` — hábitos e configurações
- `habit_entries` — registros diários de hábitos
- `financial_bills` — contas a pagar
- `financial_entries` — lançamentos (despesas/receitas)
- `financial_budgets` — orçamentos por categoria
- `playbooks` — templates de comunicação
- `projects` — projetos de desenvolvimento
- `shortcuts` — atalhos organizados
- `clipboard_items` — itens do clipboard
- `apps` — apps registrados
- `paths` — caminhos salvos
- `colors` — paletas de cores

---

## Diferenças de arquitetura em relação ao desktop

| Aspecto | Desktop | Mobile |
|---|---|---|
| Processo principal | Electron main + IPC | Sem separação de processo |
| Armazenamento | JSON files via Node.js FS | SQLite + expo-file-system |
| Notificações | Electron nativo | expo-notifications |
| Abertura de arquivos | shell.openPath | expo-sharing / expo-intent-launcher |
| Execução de apps | child_process.exec | Não disponível (removido) |
| Paths do sistema | Electron app.getPath | Caminhos relativos no sandbox |
| Auto-update | electron-updater | EAS Update (OTA) |

---

## Módulos removidos no mobile

Algumas funcionalidades do desktop não fazem sentido em mobile:

- **Apps** (launcher de aplicativos) — sandbox do OS não permite executar apps externos
- **Paths** (caminhos do sistema) — sistema de arquivos mobile é sandboxed
- **Macros** (execução sequencial de apps) — mesmo motivo acima

Estes módulos podem ser substituídos por equivalentes mobile:
- Apps → Links deeplink para apps (ex.: abrir Spotify, Notion, etc.)
- Paths → Links para pastas no Files/Google Drive
