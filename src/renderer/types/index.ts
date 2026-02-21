// Tipos do aplicativo Organon

// Dias da semana (abreviados)
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

// Períodos do dia
export type Period = 'morning' | 'afternoon' | 'night'

// Prioridade dos cards
export type CardPriority = 'P1' | 'P2' | 'P3' | 'P4'

// Status dos cards
export type CardStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

// Checklist item dentro de um card
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

// Labels de prioridade
export const PRIORITY_LABELS: Record<CardPriority, string> = {
  P1: 'Critico',
  P2: 'Alto',
  P3: 'Medio',
  P4: 'Baixo',
}

export const PRIORITY_COLORS: Record<CardPriority, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#6b7280',
}

// Labels de status
export const STATUS_LABELS: Record<CardStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  blocked: 'Bloqueado',
  done: 'Feito',
}

export const STATUS_COLORS: Record<CardStatus, string> = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  blocked: '#ef4444',
  done: '#22c55e',
}

export const STATUS_ORDER: CardStatus[] = ['todo', 'in_progress', 'blocked', 'done']

// Localização de um card (null = backlog)
export interface CardLocation {
  day: Day | null
  period: Period | null
}

// Card individual
export interface Card {
  id: string
  title: string
  descriptionHtml: string
  location: CardLocation
  order: number
  date: string | null      // ISO date "2026-02-03" ou null
  time: string | null      // "HH:MM" ou null
  hasDate: boolean         // true = com data (limpa no reset), false = sem data (mantém)
  priority: CardPriority | null  // P1-P4 ou null
  status: CardStatus             // todo, in_progress, blocked, done
  checklist: ChecklistItem[]     // subtarefas
  projectId: string | null       // vinculo com projeto
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
}

// Tipos de atalhos
export type ShortcutKind = 'url'

export type ShortcutIconKind = 'favicon' | 'builtin' | 'emoji'

export interface ShortcutIcon {
  kind: ShortcutIconKind
  value: string
}

export interface ShortcutFolder {
  id: string
  name: string
  parentId: string | null
  order: number
}

export interface ShortcutItem {
  id: string
  folderId: string | null
  title: string
  kind: ShortcutKind
  value: string
  icon: ShortcutIcon | null
  order: number
}

// Links de projeto (repo, docs, staging, producao, etc.)
export interface ProjectLink {
  id: string
  label: string
  url: string
}

// Projetos de desenvolvimento
export interface Project {
  id: string
  name: string
  path: string               // diretorio do projeto (pode ser vazio)
  description: string
  color: string              // cor de acento hex
  links: ProjectLink[]       // links importantes (repo, docs, staging, etc.)
  preferredIdeId: string | null
  createdAt: string
  updatedAt: string
  order: number
}

// IDEs registradas
export interface RegisteredIDE {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  args: string               // template: "{folder}" substituido pelo path
  order: number
}

// Caminhos salvos
export interface PathItem {
  id: string
  title: string
  path: string
  order: number
}

// Eventos do calendário
export interface CalendarEvent {
  id: string
  title: string
  date: string           // ISO date "2026-02-03"
  time: string | null    // "HH:MM" ou null
  recurrence: CalendarRecurrence | null
  reminder: CalendarReminder | null
  description: string
  color: string          // Cor do evento (hex)
  createdAt: string
  updatedAt: string
}

export type CalendarRecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

export interface CalendarRecurrence {
  frequency: CalendarRecurrenceFrequency
  interval: number           // >= 1
  until: string | null       // ISO date ou null (sem fim)
}

export interface CalendarReminder {
  enabled: boolean
  offsetMinutes: number      // 0 = na hora, 60 = 1h antes, etc
}

// Notas - pastas
export interface NoteFolder {
  id: string
  name: string
  parentId: string | null  // Para pastas aninhadas
  order: number
}

// Notas - item
export interface Note {
  id: string
  title: string
  mdPath: string           // Caminho relativo do arquivo .md
  folderId: string | null
  projectId: string | null // vinculo com projeto
  createdAt: string
  updatedAt: string
  order: number
}

// Reuniões - gravação e transcrição
export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  createdAt: string
  updatedAt: string
  order: number
}

export interface Meeting {
  id: string
  title: string
  transcription: string
  audioPath: string | null  // caminho relativo do arquivo de áudio
  duration: number          // segundos
  createdAt: string
  updatedAt: string
}
export interface PlaybookDialog {
  id: string
  title: string
  text: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Playbook {
  id: string
  title: string
  sector: string
  category: string
  summary: string
  content: string
  dialogs: PlaybookDialog[]
  order: number
  createdAt: string
  updatedAt: string
}

// Clipboard - categoria
export interface ClipboardCategory {
  id: string
  name: string
  order: number
}

// Clipboard - item
export interface ClipboardItem {
  id: string
  title: string
  content: string
  isPinned: boolean
  categoryId: string | null
  createdAt: string
  updatedAt: string
  order: number
}

// Arquivos - item
export interface FileItem {
  id: string
  name: string
  path: string           // Caminho relativo de dataDir/files/
  type: 'image' | 'pdf' | 'docx' | 'other'
  size: number
  createdAt: string
}

// Apps - item
export interface AppItem {
  id: string
  name: string
  exePath: string        // Caminho completo do .exe
  iconPath: string | null // Ícone extraído ou personalizado
  order: number
}

// Apps - macro
export interface AppMacro {
  id: string
  name: string
  appIds: string[]       // IDs dos apps para executar
  mode: 'sequential' | 'simultaneous'
  order: number
}

// Habitos / Rotinas
export type HabitType = 'boolean' | 'count' | 'time' | 'quantity'
export type HabitFrequency = 'daily' | 'weekly'

export interface Habit {
  id: string
  name: string
  type: HabitType
  target: number            // meta: 1 para boolean, N para count/quantity, minutos para time
  frequency: HabitFrequency
  weeklyTarget: number      // quantas vezes por semana (se frequency=weekly)
  weekDays: number[]        // 0=dom, 1=seg, ..., 6=sab (se frequency=weekly com dias fixos)
  trigger: string           // gatilho opcional ("depois de escovar os dentes")
  reason: string            // motivo opcional
  minimumTarget: number     // meta minima (modo minimo)
  color: string
  order: number
  createdAt: string
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string              // ISO date
  value: number             // 1 para boolean (feito), N para count/quantity/time
  skipped: boolean          // pulou hoje
  skipReason: string        // motivo do pulo
}

// Financeiro
export type ExpenseCategory = 'alimentacao' | 'transporte' | 'lazer' | 'moradia' | 'saude' | 'educacao' | 'outro'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alimentacao: 'Alimentacao',
  transporte: 'Transporte',
  lazer: 'Lazer',
  moradia: 'Moradia',
  saude: 'Saude',
  educacao: 'Educacao',
  outro: 'Outro',
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  alimentacao: '#22c55e',
  transporte: '#3b82f6',
  lazer: '#f97316',
  moradia: '#8b5cf6',
  saude: '#ef4444',
  educacao: '#eab308',
  outro: '#6b7280',
}

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number            // dia do vencimento (1-31)
  category: ExpenseCategory
  recurrence: 'monthly' | 'yearly'
  isPaid: boolean
  paidDate: string | null
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string              // ISO date
  installments: number      // 1 = avista, >1 = parcelado
  currentInstallment: number
  parentId: string | null   // ID da compra original (para parcelas)
  note: string
  createdAt: string
}

export interface BudgetCategory {
  category: ExpenseCategory
  limit: number             // limite mensal
}

export type IncomeKind = 'fixed' | 'extra'

export interface IncomeEntry {
  id: string
  source: string
  amount: number
  date: string              // ISO date
  kind: IncomeKind
  recurrenceMonths: number  // 1 = entrada unica, >1 = gerada em serie
  recurrenceIndex: number   // indice da serie (1..N)
  recurrenceGroupId: string | null
  note: string
  createdAt: string
}

export interface FinancialConfig {
  monthlyIncome: number        // valor base mensal esperado
  monthlySpendingLimit: number // teto de gastos do mes
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null   // ISO date
  createdAt: string
}

// ==========================================
// CRM - Pipeline de Vendas/Contatos
// ==========================================

export type CRMPriority = 'alta' | 'media' | 'baixa'

export const CRM_PRIORITY_LABELS: Record<CRMPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export const CRM_PRIORITY_COLORS: Record<CRMPriority, string> = {
  alta: '#ef4444',
  media: '#f97316',
  baixa: '#22c55e',
}

// Estágios fixos do pipeline (não editáveis)
export type CRMStageId =
  | 'prospeccao'
  | 'qualificado'
  | 'primeiro-contato'
  | 'analise'
  | 'proposta-enviada'
  | 'negociacao'
  | 'cliente-ativo'
  | 'perdeu'

export interface CRMStage {
  id: CRMStageId
  label: string
  description: string
  order: number
}

export const CRM_STAGES: CRMStage[] = [
  { id: 'prospeccao', label: 'Prospecção', description: 'Contato identificado, ainda sem entendimento da dor ou orçamento', order: 0 },
  { id: 'qualificado', label: 'Qualificado', description: 'Dor clara, necessidade validada e capacidade de pagamento confirmada', order: 1 },
  { id: 'primeiro-contato', label: 'Primeiro Contato', description: 'Mensagem enviada ou conversa inicial em andamento', order: 2 },
  { id: 'analise', label: 'Análise', description: 'Entendimento de escopo, prazo, viabilidade e orçamento', order: 3 },
  { id: 'proposta-enviada', label: 'Proposta Enviada', description: 'Valor, prazo e condições comerciais definidos', order: 4 },
  { id: 'negociacao', label: 'Negociação', description: 'Ajustes, dúvidas, objeções e alinhamentos finais', order: 5 },
  { id: 'cliente-ativo', label: 'Cliente Ativo', description: 'Contrato fechado e projeto em execução', order: 6 },
  { id: 'perdeu', label: 'Perdeu', description: 'Negócio não fechado (motivo registrado)', order: 7 },
]

export type CRMStageOrder = CRMStageId[]

// Tags do CRM (livres, criadas pelo usuário)
export interface CRMTag {
  id: string
  name: string
  color: string
  createdAt: string
}

// Tipo de interação
export type CRMInteractionType = 'nota' | 'ligacao' | 'email' | 'reuniao' | 'mensagem' | 'outro'

export const CRM_INTERACTION_TYPES: Record<CRMInteractionType, string> = {
  nota: 'Nota',
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  mensagem: 'Mensagem',
  outro: 'Outro',
}

// Interação com o contato
export interface CRMInteraction {
  id: string
  contactId: string
  type: CRMInteractionType
  content: string
  date: string           // ISO date
  time: string           // HH:MM
  createdAt: string
}

// Vínculos do contato
export interface CRMContactLinks {
  noteIds: string[]      // IDs das notas vinculadas
  calendarEventIds: string[]  // IDs dos eventos do calendário
  fileIds: string[]      // IDs dos arquivos
  cardIds: string[]      // IDs dos cards do planejamento
  projectIds: string[]   // IDs dos projetos
}

// Card de contato no CRM
export interface CRMContact {
  id: string
  name: string
  company: string | null
  role: string | null
  phone: string | null
  email: string | null
  socialMedia: string | null
  context: string | null      // Onde conheceu
  interests: string | null
  priority: CRMPriority
  tags: string[]             // IDs das tags
  stageId: CRMStageId
  description: string        // Notas/descrição
  followUpDate: string | null // ISO date
  links: CRMContactLinks
  createdAt: string
  updatedAt: string
  order: number
}

// Configurações do CRM
export interface CRMSettings {
  stageOrder: CRMStageOrder
  defaultStageId: CRMStageId
}

// Configuracoes e tema
export interface ThemeSettings {
  primary: string
  background: string
  surface: string
  text: string
}

// Nomes dos temas disponíveis
export type ThemeName = 
  | 'dark-default' 
  | 'dark-vscode' 
  | 'light-1' 
  | 'light-2'
  | 'dark-matcha'
  | 'light-rose'
  | 'dark-cyberpunk'
  | 'dark-purple-neon'
  | 'light-orange-soft'
  | 'dark-blue-professional'
  | 'light-matcha-soft'
  | 'dark-graphite-minimal'
  | 'light-ice-blue'
  | 'dark-deep-red'
  | 'dark-solarized-dark'
  | 'light-solarized-light'
  | 'dark-forest'
  | 'dark-midnight-pink'
  | 'dark-dracula'
  | 'dark-dracula-yellow'

// Temas pré-definidos
export const THEMES: Record<ThemeName, ThemeSettings> = {
  'dark-default': {
    primary: '#6366f1',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
  },
  'dark-vscode': {
    primary: '#007acc',
    background: '#1e1e1e',
    surface: '#252526',
    text: '#d4d4d4',
  },
  'light-1': {
    primary: '#6366f1',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
  },
  'light-2': {
    primary: '#059669',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
  },
  'dark-matcha': {
    primary: '#4caf50',
    background: '#0f1f17',
    surface: '#162a21',
    text: '#e6f4ea',
  },
  'light-rose': {
    primary: '#ec4899',
    background: '#fdf2f8',
    surface: '#ffffff',
    text: '#3f1d2e',
  },
  'dark-cyberpunk': {
    primary: '#00e5ff',
    background: '#0a0a0f',
    surface: '#141421',
    text: '#e5e7eb',
  },
  'dark-purple-neon': {
    primary: '#8b5cf6',
    background: '#0f0b1a',
    surface: '#1b1530',
    text: '#f5f3ff',
  },
  'light-orange-soft': {
    primary: '#f97316',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#3a1f0f',
  },
  'dark-blue-professional': {
    primary: '#2563eb',
    background: '#0b1220',
    surface: '#111a2e',
    text: '#e5edff',
  },
  'light-matcha-soft': {
    primary: '#4caf50',
    background: '#f6fbf7',
    surface: '#ffffff',
    text: '#1f3d2b',
  },
  'dark-graphite-minimal': {
    primary: '#9ca3af',
    background: '#0f0f10',
    surface: '#1a1a1d',
    text: '#f3f4f6',
  },
  'light-ice-blue': {
    primary: '#38bdf8',
    background: '#f0f9ff',
    surface: '#ffffff',
    text: '#0f172a',
  },
  'dark-deep-red': {
    primary: '#ef4444',
    background: '#140a0a',
    surface: '#1f1111',
    text: '#fde8e8',
  },
  'dark-solarized-dark': {
    primary: '#268bd2',
    background: '#002b36',
    surface: '#073642',
    text: '#fdf6e3',
  },
  'light-solarized-light': {
    primary: '#b58900',
    background: '#fdf6e3',
    surface: '#ffffff',
    text: '#073642',
  },
  'dark-forest': {
    primary: '#22c55e',
    background: '#0b1f14',
    surface: '#123324',
    text: '#dcfce7',
  },
  'dark-midnight-pink': {
    primary: '#f472b6',
    background: '#0f0b14',
    surface: '#1a1324',
    text: '#fdf2f8',
  },
  'dark-dracula': {
    primary: '#bd93f9',
    background: '#282a36',
    surface: '#343746',
    text: '#f8f8f2',
  },
  'dark-dracula-yellow': {
    primary: '#a48cf8',
    background: '#282a36',
    surface: '#343746',
    text: '#f1f77e',
  },
}

// Labels dos temas em português
export const THEME_LABELS: Record<ThemeName, string> = {
  'dark-default': 'Escuro (Padrão)',
  'dark-vscode': 'Escuro (VS Code)',
  'light-1': 'Claro (Azul)',
  'light-2': 'Claro (Verde)',
  'dark-matcha': 'Escuro — Matcha',
  'light-rose': 'Claro — Rosa',
  'dark-cyberpunk': 'Escuro — Cyberpunk',
  'dark-purple-neon': 'Escuro — Roxo Neon',
  'light-orange-soft': 'Claro — Laranja Suave',
  'dark-blue-professional': 'Escuro — Azul Profissional',
  'light-matcha-soft': 'Claro — Matcha (Suave)',
  'dark-graphite-minimal': 'Escuro — Grafite Minimal',
  'light-ice-blue': 'Claro — Azul Gelo',
  'dark-deep-red': 'Escuro — Vermelho Profundo',
  'dark-solarized-dark': 'Escuro — Solarized Dark',
  'light-solarized-light': 'Claro — Solarized Light',
  'dark-forest': 'Escuro — Forest',
  'dark-midnight-pink': 'Escuro — Midnight Pink',
  'dark-dracula': 'Escuro — Dracula',
  'dark-dracula-yellow': 'Escuro — Dracula (Amarelo)',
}

export interface KeyboardShortcut {
  id: string
  action: string
  description: string
  keys: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
    key: string
  }
}

export interface Settings {
  themeName: ThemeName
  dataDir: string | null
  installerCompleted: boolean
  weekStart: string | null
  keyboardShortcuts?: KeyboardShortcut[]
  backupEnabled?: boolean
  backupIntervalMinutes?: number
}

// Acesso Rápido (atalhos para views da aplicação)
export interface QuickAccessItem {
  id: string
  view: string  // AppView como string
  label: string
  order: number
}

// Estudos
export interface StudyGoal {
  id: string
  title: string
  description: string
  priority: CardPriority | null
  status: CardStatus
  checklist: ChecklistItem[]
  linkedPlanningCardId: string | null
  createdAt: string
  updatedAt: string
}

export interface StudyMediaItem {
  id: string
  title: string
  url: string
  kind: 'youtube' | 'audio'
  youtubeVideoId: string | null
  volume: number
  loop: boolean
  showDock: boolean
}

export interface StudySessionLog {
  id: string
  completedAt: string
  focusSeconds: number
}

export interface StudyState {
  wallpaperUrl: string
  focusMinutes: number
  breakMinutes: number
  muteSound: boolean
  mediaItems: StudyMediaItem[]
  goals: StudyGoal[]
  sessions: StudySessionLog[]
}

// Store completo (persistido em JSON)
export interface Store {
  version: number
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  paths: PathItem[]
  projects: Project[]
  registeredIDEs: RegisteredIDE[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
  files: FileItem[]
  apps: AppItem[]
  macros: AppMacro[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  incomes: IncomeEntry[]
  financialConfig: FinancialConfig
  savingsGoals: SavingsGoal[]
  quickAccess: QuickAccessItem[]
  meetings: Meeting[]
  playbooks: Playbook[]
  crmContacts: CRMContact[]
  crmInteractions: CRMInteraction[]
  crmTags: CRMTag[]
  study: StudyState
  settings: Settings
}

export const DEFAULT_THEME: ThemeSettings = THEMES['dark-default']

export const DEFAULT_SETTINGS: Settings = {
  themeName: 'dark-default',
  dataDir: null,
  installerCompleted: false,
  weekStart: null,
  keyboardShortcuts: [
    {
      id: 'quick-search',
      action: 'Abrir busca rápida',
      description: 'Buscar cards, eventos, atalhos e notas',
      keys: { ctrl: true, key: 'k' },
    },
    {
      id: 'reduced-mode',
      action: 'Alternar modo reduzido',
      description: 'Reduz paineis da view atual por niveis (pressione novamente para o proximo nivel)',
      keys: { ctrl: true, shift: true, key: 'm' },
    },
  ],
  backupEnabled: true,
  backupIntervalMinutes: 15,
}

export const DEFAULT_STUDY_STATE: StudyState = {
  wallpaperUrl: '',
  focusMinutes: 25,
  breakMinutes: 5,
  muteSound: false,
  mediaItems: [],
  goals: [],
  sessions: [],
}

// Mapeamento de dias para labels em português
export const DAY_LABELS: Record<Day, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
}

// Array ordenado dos dias da semana
export const DAYS_ORDER: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Mapeamento de períodos para labels em português
export const PERIOD_LABELS: Record<Period, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
}

// Array ordenado dos períodos
export const PERIODS_ORDER: Period[] = ['morning', 'afternoon', 'night']

// Identificador de uma célula (combinação de dia e período, ou backlog)
export type CellId = `${Day}-${Period}` | 'backlog'

// Helper para criar ID de célula
export const getCellId = (day: Day | null, period: Period | null): CellId => {
  if (day === null || period === null) {
    return 'backlog'
  }
  return `${day}-${period}`
}

// Helper para parsear ID de célula
export const parseCellId = (cellId: CellId): CardLocation => {
  if (cellId === 'backlog') {
    return { day: null, period: null }
  }
  const [day, period] = cellId.split('-') as [Day, Period]
  return { day, period }
}

// Declaração global para a API do Electron
declare global {
  interface Window {
    electronAPI: {
      loadStore: () => Promise<Store>
      saveStore: (store: Store) => Promise<boolean>
      openExternal: (url: string) => Promise<boolean>
      openPath: (path: string) => Promise<boolean>
      selectPath: () => Promise<string | null>
      readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>
      copyToClipboard: (text: string) => Promise<boolean>
      getDataDir: () => Promise<{ current: string; custom: string | null }>
      setDataDir: (path: string | null) => Promise<boolean>
      selectDataDir: () => Promise<string | null>
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>
      // APIs do instalador
      isPackaged: () => Promise<boolean>
      isInstallerCompleted: () => Promise<boolean>
      completeInstaller: (dataDir: string | null, themeName: ThemeName) => Promise<{ success: boolean; error?: string }>
      // Notes (conteudo em .md)
      readNote: (mdPath: string) => Promise<string>
      writeNote: (mdPath: string, content: string) => Promise<boolean>
      deleteNote: (mdPath: string) => Promise<boolean>
      // Files (organizador)
      selectFilesToImport: () => Promise<string[]>
      importFile: (sourcePath: string) => Promise<{ success: boolean; item?: FileItem; error?: string }>
      openFile: (relativePath: string) => Promise<boolean>
      deleteFile: (relativePath: string) => Promise<boolean>
      getFileUrl: (relativePath: string) => Promise<string>
      // Paths extra
      renamePath: (oldPath: string, newPath: string) => Promise<boolean>
      getAbsoluteFileUrl: (absolutePath: string) => Promise<string>
      // Apps & Macros
      selectExe: () => Promise<{ exePath: string; name: string; iconDataUrl: string | null } | null>
      launchExe: (exePath: string) => Promise<boolean>
      launchExeWithArgs: (exePath: string, args: string[]) => Promise<boolean>
      launchMany: (exePaths: string[], mode: 'sequential' | 'simultaneous') => Promise<boolean>
      // Meetings (gravação e transcrição)
      saveMeetingAudio: (meetingId: string, audioBase64: string) => Promise<string | null>
      deleteMeetingAudio: (audioPath: string) => Promise<boolean>
      transcribeAudio: (audioPath: string) => Promise<string>
      // Backup
      createBackup: () => Promise<{ success: boolean; backupPath?: string; error?: string }>
      listBackups: () => Promise<Array<{ name: string; path: string; date: string; size: number }>>
      restoreBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>
      mergeDataFromOldPath: (oldDataPath: string) => Promise<{ success: boolean; merged: number; error?: string }>
      selectOldDataPath: () => Promise<string | null>
      importMarkdowns: (sourceDir: string) => Promise<{ success: boolean; imported: number; files: Array<{ path: string; name: string; content: string }>; error?: string }>
      selectJsonFile: () => Promise<string | null>
      importPlanningData: (storeJsonPath: string) => Promise<{ success: boolean; cards: number; events: number; cardsData: any[]; eventsData: any[]; error?: string }>
    }
  }
}

