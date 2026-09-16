import { Card, SprintCard, SprintColumn, SprintColumnGroup, SprintColumnSection, SprintSwimLane, SprintMetadata, SprintBoardConfig, AgendaCategory, CalendarEvent } from './planner.types'
import { NoteFolder, Note, NoteTemplate, CanvasFolder, CanvasVersionEntry } from './notes.types'
import { Project, RegisteredIDE } from './projects.types'
import { Bill, Expense, BudgetCategory, IncomeEntry, FinancialConfig, SavingsGoal, Investment } from './financial.types'
import { CRMContact, CRMInteraction, CRMTag, CRMSnapshot } from './crm.types'
import { StudyState } from './study.types'

export type { PlannerPreferences } from './planner.types'
export type { FinancialCategory, FinancialTag } from './financial.types'

export type AppView =
  | 'today'
  | 'agenda'
  | 'planner'
  | 'calendar'
  | 'playbook'
  | 'colors'
  | 'shortcuts'
  | 'projects'
  | 'notes'
  | 'clipboard'
  | 'apps'
  | 'habits'
  | 'study'
  | 'financial'
  | 'canvas'
  | 'transcripts'
  | 'audio'
  | 'library'
  | 'okrs'
  | 'workflow'
  | 'system-design'
  | 'history'
  | 'settings'
  | 'whisper'
  | string

export interface ShortcutKind {
  kind: 'url'
}

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
  kind: 'url'
  value: string
  icon: ShortcutIcon | null
  order: number
  description?: string
  tags?: string[]
  openCount?: number
  lastOpenedAt?: string | null
  isFavorite?: boolean
}

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
  audioPath: string | null
  duration: number
  createdAt: string
  updatedAt: string
}

export type PlaybookVariableType = 'text' | 'number' | 'date' | 'choice' | 'email' | 'phone' | 'cpf'

export interface PlaybookVariable {
  key: string
  label: string
  type: PlaybookVariableType
  choices?: string[]
  defaultValue?: string
  required?: boolean
}

export interface PlaybookDialog {
  id: string
  title: string
  text: string
  order: number
  createdAt: string
  updatedAt: string
  variables?: PlaybookVariable[]
  copyCount?: number
  copyCountByMonth?: Record<string, number>
  tags?: string[]
}

export interface PlaybookVersion {
  id: string
  createdAt: string
  content: string
  dialogs: PlaybookDialog[]
}

export interface PlaybookFolder {
  id: string
  name: string
  color: string
  order: number
  createdAt: string
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
  isFavorite?: boolean
  isArchived?: boolean
  folderId?: string | null
  viewCount?: number
  versions?: PlaybookVersion[]
}

export const PLAYBOOK_VERSIONS_LIMIT = 10

export interface ClipboardCategory {
  id: string
  name: string
  order: number
}

export type ClipboardContentType = 'color' | 'url' | 'email' | 'password' | 'code' | 'json' | 'sql' | 'markdown' | 'phone' | 'document' | 'text'

export interface ClipboardItem {
  id: string
  title: string
  content: string
  isPinned: boolean
  categoryId: string | null
  createdAt: string
  updatedAt: string
  order: number
  copyCount: number
  contentType: ClipboardContentType
  isSnippet?: boolean
  contentHash?: string
}

export interface ClipboardConfig {
  retentionDays: number
}

export const DEFAULT_CLIPBOARD_CONFIG: ClipboardConfig = {
  retentionDays: 30,
}

export type DashboardWidgetType =
  | 'hub-planner' | 'hub-calendar' | 'hub-crm' | 'hub-playbook'
  | 'hub-projects' | 'hub-notes' | 'hub-habits' | 'hub-study'
  | 'hub-financial' | 'hub-shortcuts' | 'hub-apps' | 'hub-clipboard' | 'hub-colors'
  | 'report-tasks' | 'report-events' | 'report-week' | 'report-financial'
  | 'report-knowledge' | 'report-tools' | 'report-system'
  | 'widget-search' | 'widget-datetime'

export type DashboardWidgetColSpan = 1 | 2 | 3

export interface DashboardWidget {
  id: string
  type: DashboardWidgetType
  colSpan: DashboardWidgetColSpan
  order: number
  visible: boolean
}

export type DashboardLayoutMode = 'hub' | 'custom'

export interface DashboardTemplate {
  id: string
  name: string
  isBuiltin?: boolean
  widgets: DashboardWidget[]
}

export interface AppItem {
  id: string
  name: string
  exePath: string
  iconPath: string | null
  order: number
  args?: string
  workingDir?: string
  envVars?: string
  groupId?: string | null
  autoLaunch?: boolean
  launchCount?: number
  lastLaunchedAt?: string | null
  tags?: string[]
  isFavorite?: boolean
  isPinned?: boolean
  description?: string
}

export interface AppGroup {
  id: string
  name: string
  color: string
  order: number
  createdAt: string
  parentId?: string | null
  isExpanded?: boolean
  icon?: string
}

export interface AppTag {
  id: string
  name: string
  color: string
}

export type MacroStepType = 'launch' | 'wait' | 'wait-until-closed'

export interface MacroStep {
  id: string
  type: MacroStepType
  appId?: string
  waitMs?: number
}

export interface AppMacro {
  id: string
  name: string
  appIds: string[]
  mode: 'sequential' | 'simultaneous'
  order: number
  steps?: MacroStep[]
}

export interface AppLaunchLog {
  id: string
  appId: string | null
  macroId: string | null
  launchedAt: string
  status?: string
}

export type HabitType = 'check' | 'measurable' | 'timer' | 'routine'
export type HabitTypeLegacy = 'boolean' | 'count' | 'time' | 'quantity' | 'series'
export type HabitFrequency = 'daily' | 'weekly'
export type HabitSeriesPattern = 'manual' | 'rotating'
export type HabitUnit = 'vezes' | 'min' | 'pag' | 'kg' | 'ml' | 'km' | 'rep' | 'cal' | string

export interface HabitProgressiveTarget {
  startValue: number
  endValue: number
  incrementPerWeek: number
  startDate: string
}

export const HABIT_LEVEL_THRESHOLDS = [0, 100, 500, 1500, 3000] as const
export const HABIT_LEVEL_NAMES = ['Iniciante', 'Regular', 'Consistente', 'Dedicado', 'Mestre'] as const
export const HABIT_MILESTONES = [7, 30, 60, 100, 365] as const

export interface HabitMilestone {
  habitId: string
  milestone: number
  date: string
}

export interface Habit {
  id: string
  name: string
  type: HabitType
  target: number
  frequency: HabitFrequency
  weeklyTarget: number
  weekDays: number[]
  trigger: string
  reason: string
  minimumTarget: number
  color: string
  order: number
  createdAt: string
  category?: string
  isArchived?: boolean
  seriesLabels?: string[]
  seriesPattern?: HabitSeriesPattern
  seriesColors?: Record<string, string>
  routineSchedule?: Record<string, number[]>
  unit?: HabitUnit
  progressiveTarget?: HabitProgressiveTarget
  stackAfter?: string
  pausedUntil?: string
  reminderTime?: string
  reminderEnabled?: boolean
  xp?: number
  level?: number
  instructions?: string
  videoUrl?: string
  imageUrl?: string
  externalUrl?: string
  steps?: Array<{ id: string; text: string; done?: boolean }>
  objectiveId?: string | null
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string
  value: number
  skipped: boolean
  skipReason: string
  note?: string
  seriesLabel?: string
}

export interface ThemeSettings {
  primary: string
  background: string
  surface: string
  text: string
}

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
  | 'dark-black-and-white'

export const THEMES: Record<ThemeName, ThemeSettings> = {
  'dark-default': { primary: '#6366f1', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9' },
  'dark-vscode': { primary: '#007acc', background: '#1e1e1e', surface: '#252526', text: '#d4d4d4' },
  'light-1': { primary: '#6366f1', background: '#f8fafc', surface: '#ffffff', text: '#1e293b' },
  'light-2': { primary: '#059669', background: '#f9fafb', surface: '#ffffff', text: '#111827' },
  'dark-matcha': { primary: '#4caf50', background: '#0f1f17', surface: '#162a21', text: '#e6f4ea' },
  'light-rose': { primary: '#ec4899', background: '#fdf2f8', surface: '#ffffff', text: '#3f1d2e' },
  'dark-cyberpunk': { primary: '#00e5ff', background: '#0a0a0f', surface: '#141421', text: '#e5e7eb' },
  'dark-purple-neon': { primary: '#8b5cf6', background: '#0f0b1a', surface: '#1b1530', text: '#f5f3ff' },
  'light-orange-soft': { primary: '#f97316', background: '#fff7ed', surface: '#ffffff', text: '#3a1f0f' },
  'dark-blue-professional': { primary: '#2563eb', background: '#0b1220', surface: '#111a2e', text: '#e5edff' },
  'light-matcha-soft': { primary: '#4caf50', background: '#f6fbf7', surface: '#ffffff', text: '#1f3d2b' },
  'dark-graphite-minimal': { primary: '#9ca3af', background: '#0f0f10', surface: '#1a1a1d', text: '#f3f4f6' },
  'light-ice-blue': { primary: '#38bdf8', background: '#f0f9ff', surface: '#ffffff', text: '#0f172a' },
  'dark-deep-red': { primary: '#ef4444', background: '#140a0a', surface: '#1f1111', text: '#fde8e8' },
  'dark-solarized-dark': { primary: '#268bd2', background: '#002b36', surface: '#073642', text: '#fdf6e3' },
  'light-solarized-light': { primary: '#b58900', background: '#fdf6e3', surface: '#ffffff', text: '#073642' },
  'dark-forest': { primary: '#22c55e', background: '#0b1f14', surface: '#123324', text: '#dcfce7' },
  'dark-midnight-pink': { primary: '#f472b6', background: '#0f0b14', surface: '#1a1324', text: '#fdf2f8' },
  'dark-dracula': { primary: '#bd93f9', background: '#282a36', surface: '#343746', text: '#f8f8f2' },
  'dark-dracula-yellow': { primary: '#a48cf8', background: '#282a36', surface: '#343746', text: '#f1f77e' },
  'dark-black-and-white': { primary: '#e4e4e7', background: '#09090b', surface: '#18181b', text: '#fafafa' },
}

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
  'dark-black-and-white': 'Escuro — Preto & Branco (Monocromático)',
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
  } | string[] | any
}

export type NavbarGroupId = 'organization' | 'work' | 'tools' | 'content' | 'personal'

export type NavbarView =
  | 'agenda' | 'planner' | 'calendar' | 'crm' | 'playbook' | 'projects'
  | 'colors' | 'shortcuts' | 'apps' | 'notes' | 'clipboard' | 'habits'
  | 'study' | 'financial' | 'audio' | 'transcripts' | 'workflows' | 'system-design'

export type NavIconId =
  | 'agenda' | 'planner' | 'calendar' | 'shortcuts' | 'projects' | 'notes'
  | 'clipboard' | 'apps' | 'habits' | 'study' | 'financial' | 'organization'
  | 'content' | 'tools' | 'personal' | 'crm' | 'playbook' | 'colors'
  | 'transcripts' | 'audio' | 'dashboard' | 'system-design'

export interface NavbarGroupConfig {
  id: NavbarGroupId
  label: string
  iconId: NavIconId
  enabled: boolean
  order: number
}

export interface NavbarItemConfig {
  view: NavbarView
  label: string
  iconId: NavIconId
  groupId: NavbarGroupId | null
  order: number
}

export interface NavbarConfig {
  groups: NavbarGroupConfig[]
  items: NavbarItemConfig[]
}

export interface Settings {
  themeName: ThemeName
  dataDir: string | null
  installerCompleted: boolean
  weekStart: string | null
  keyboardShortcuts?: KeyboardShortcut[]
  navbarConfig?: NavbarConfig
  backupEnabled?: boolean
  backupIntervalMinutes?: number
  apiToken?: string
  apiBaseUrl?: string
  apiEmail?: string
  apiRefreshToken?: string
  apiUserName?: string
  profilePhotoDataUrl?: string
  dashboardLayout?: DashboardLayoutMode
  dashboardWidgets?: DashboardWidget[]
  dashboardTemplates?: DashboardTemplate[]
  density?: SettingsDensity
  accentColor?: string | null
  themeAutoMode?: SettingsThemeAutoMode
  reportsDir?: string | null
  debugHudTitlebar?: boolean
  debugHudInline?: boolean
  debugHudHover?: boolean
}

export type SettingsDensity = 'compact' | 'default' | 'comfort'
export type SettingsThemeAutoMode = 'off' | 'by-system' | 'by-time'

export interface QuickAccessItem {
  id: string
  view: string
  label: string
  order: number
}

export interface SyncErrorLog {
  timestamp: string
  summary: string
  rawText: string
  failures: Array<{
    resource: string
    batchIndex?: number
    totalBatches?: number
    status?: string | number
    count?: number
    message: string
  }>
}

export interface Store {
  version: number
  storeUpdatedAt?: string
  lastSyncAt?: string
  lastSyncError?: SyncErrorLog | null
  pendingDeletes?: Array<{ resource: string; id: string }>
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  projects: Project[]
  registeredIDEs: RegisteredIDE[]
  calendarEvents: CalendarEvent[]
  calendarCategories?: AgendaCategory[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
  apps: AppItem[]
  macros: AppMacro[]
  appGroups?: AppGroup[]
  appLaunchLogs?: AppLaunchLog[]
  appTags?: AppTag[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  incomes: IncomeEntry[]
  financialConfig: FinancialConfig
  savingsGoals: SavingsGoal[]
  investments: Investment[]
  quickAccess: QuickAccessItem[]
  meetings: Meeting[]
  playbooks: Playbook[]
  playbookFolders?: PlaybookFolder[]
  crmContacts: CRMContact[]
  crmInteractions: CRMInteraction[]
  crmTags: CRMTag[]
  crmSnapshots?: CRMSnapshot[]
  study: StudyState
  settings: Settings
  noteTemplates?: NoteTemplate[]
  canvasFolders?: CanvasFolder[]
  canvasFolderAssignments?: Record<string, string | null>
  canvasVersions?: Record<string, CanvasVersionEntry[]>
  sprintCards?: SprintCard[]
  sprintColumns?: SprintColumn[]
  sprintColumnGroups?: SprintColumnGroup[]
  sprintColumnSections?: SprintColumnSection[]
  sprintSwimLanes?: SprintSwimLane[]
  sprintMetadata?: SprintMetadata[]
  sprintBoardConfig?: SprintBoardConfig
  projectSprints?: SprintMetadata[]
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
    {
      id: 'notes-new',
      action: 'Nova nota',
      description: 'Cria uma nova nota (disponível na view Notas)',
      keys: { ctrl: true, key: 'n' },
    },
    {
      id: 'notes-search',
      action: 'Buscar notas',
      description: 'Abre a busca de notas (disponível na view Notas)',
      keys: { ctrl: true, key: 'f' },
    },
    {
      id: 'views-navigator',
      action: 'Navegador de telas',
      description: 'Abre o modal de navegação rápida entre todas as telas',
      keys: { ctrl: true, key: 'g' },
    },
    {
      id: 'clipboard-modal',
      action: 'Clipboard rápido',
      description: 'Abre o modal de clipboard de qualquer lugar do sistema',
      keys: { ctrl: true, shift: true, key: 'v' },
    },
  ],
  backupEnabled: true,
  backupIntervalMinutes: 15,
  density: 'default',
  accentColor: null,
  themeAutoMode: 'off',
  debugHudTitlebar: false,
  debugHudInline: false,
  debugHudHover: true,
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'w-report-tasks',     type: 'report-tasks',     colSpan: 1, order: 0,  visible: true },
  { id: 'w-report-events',    type: 'report-events',    colSpan: 1, order: 1,  visible: true },
  { id: 'w-report-week',      type: 'report-week',      colSpan: 1, order: 2,  visible: true },
  { id: 'w-report-financial', type: 'report-financial', colSpan: 1, order: 3,  visible: true },
  { id: 'w-report-knowledge', type: 'report-knowledge', colSpan: 1, order: 4,  visible: true },
  { id: 'w-report-tools',     type: 'report-tools',     colSpan: 1, order: 5,  visible: true },
  { id: 'w-report-system',    type: 'report-system',    colSpan: 1, order: 6,  visible: true },
  { id: 'w-hub-planner',      type: 'hub-planner',      colSpan: 1, order: 7,  visible: true },
  { id: 'w-hub-calendar',     type: 'hub-calendar',     colSpan: 1, order: 8,  visible: true },
  { id: 'w-hub-notes',        type: 'hub-notes',        colSpan: 1, order: 9,  visible: true },
  { id: 'w-hub-habits',       type: 'hub-habits',       colSpan: 1, order: 10, visible: true },
  { id: 'w-hub-study',        type: 'hub-study',        colSpan: 1, order: 11, visible: true },
  { id: 'w-hub-financial',    type: 'hub-financial',    colSpan: 1, order: 12, visible: true },
  { id: 'w-hub-crm',          type: 'hub-crm',          colSpan: 1, order: 13, visible: false },
  { id: 'w-hub-projects',     type: 'hub-projects',     colSpan: 1, order: 14, visible: false },
  { id: 'w-hub-playbook',     type: 'hub-playbook',     colSpan: 1, order: 15, visible: false },
  { id: 'w-hub-shortcuts',    type: 'hub-shortcuts',    colSpan: 1, order: 16, visible: false },
  { id: 'w-hub-apps',         type: 'hub-apps',         colSpan: 1, order: 17, visible: false },
  { id: 'w-hub-clipboard',    type: 'hub-clipboard',    colSpan: 1, order: 18, visible: false },
  { id: 'w-hub-colors',       type: 'hub-colors',       colSpan: 1, order: 19, visible: false },
  { id: 'w-widget-search',    type: 'widget-search',    colSpan: 2, order: 20, visible: false },
  { id: 'w-widget-datetime',  type: 'widget-datetime',  colSpan: 1, order: 21, visible: false },
]

export const BUILTIN_DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'builtin-focus',
    name: 'Foco do dia',
    isBuiltin: true,
    widgets: [
      { id: 'bt1-datetime', type: 'widget-datetime', colSpan: 2, order: 0, visible: true },
      { id: 'bt1-search',   type: 'widget-search',   colSpan: 1, order: 1, visible: true },
      { id: 'bt1-tasks',    type: 'report-tasks',    colSpan: 2, order: 2, visible: true },
      { id: 'bt1-events',   type: 'report-events',   colSpan: 1, order: 3, visible: true },
      { id: 'bt1-week',     type: 'report-week',     colSpan: 3, order: 4, visible: true },
    ],
  },
  {
    id: 'builtin-overview',
    name: 'Visão geral',
    isBuiltin: true,
    widgets: [
      { id: 'bt2-datetime',  type: 'widget-datetime',  colSpan: 1, order: 0, visible: true },
      { id: 'bt2-search',    type: 'widget-search',    colSpan: 2, order: 1, visible: true },
      { id: 'bt2-tasks',     type: 'report-tasks',     colSpan: 1, order: 2, visible: true },
      { id: 'bt2-events',    type: 'report-events',    colSpan: 1, order: 3, visible: true },
      { id: 'bt2-financial', type: 'report-financial', colSpan: 1, order: 4, visible: true },
      { id: 'bt2-week',      type: 'report-week',      colSpan: 2, order: 5, visible: true },
      { id: 'bt2-knowledge', type: 'report-knowledge', colSpan: 1, order: 6, visible: true },
    ],
  },
  {
    id: 'builtin-full',
    name: 'Completo',
    isBuiltin: true,
    widgets: [
      { id: 'bt3-datetime',  type: 'widget-datetime',  colSpan: 2, order: 0,  visible: true },
      { id: 'bt3-search',    type: 'widget-search',    colSpan: 1, order: 1,  visible: true },
      { id: 'bt3-tasks',     type: 'report-tasks',     colSpan: 1, order: 2,  visible: true },
      { id: 'bt3-events',    type: 'report-events',    colSpan: 1, order: 3,  visible: true },
      { id: 'bt3-week',      type: 'report-week',      colSpan: 1, order: 4,  visible: true },
      { id: 'bt3-financial', type: 'report-financial', colSpan: 1, order: 5,  visible: true },
      { id: 'bt3-knowledge', type: 'report-knowledge', colSpan: 1, order: 6,  visible: true },
      { id: 'bt3-tools',     type: 'report-tools',     colSpan: 1, order: 7,  visible: true },
      { id: 'bt3-planner',   type: 'hub-planner',      colSpan: 1, order: 8,  visible: true },
      { id: 'bt3-calendar',  type: 'hub-calendar',     colSpan: 1, order: 9,  visible: true },
      { id: 'bt3-notes',     type: 'hub-notes',        colSpan: 1, order: 10, visible: true },
      { id: 'bt3-system',    type: 'report-system',    colSpan: 1, order: 11, visible: true },
    ],
  },
  {
    id: 'builtin-minimal',
    name: 'Minimalista',
    isBuiltin: true,
    widgets: [
      { id: 'bt4-datetime', type: 'widget-datetime', colSpan: 3, order: 0, visible: true },
      { id: 'bt4-tasks',    type: 'report-tasks',    colSpan: 2, order: 1, visible: true },
      { id: 'bt4-events',   type: 'report-events',   colSpan: 1, order: 2, visible: true },
    ],
  },
]

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
      isPackaged: () => Promise<boolean>
      isInstallerCompleted: () => Promise<boolean>
      getInstallerStatus: () => Promise<{
        completed: boolean
        needsMigration: boolean
        currentPath: string
        suggestedPath: string
        layoutVersion: number
        migrationState: string
        summary: Record<string, number>
      }>
      completeInstaller: (dataDir: string | null, themeName: ThemeName) => Promise<{
        success: boolean
        dataRoot?: string
        summary?: Record<string, number>
        markdownFiles?: number
        recoveredFiles?: number
        warnings?: string[]
        error?: string
      }>
      readNote: (mdPath: string) => Promise<string>
      writeNote: (mdPath: string, content: string) => Promise<boolean>
      deleteNote: (mdPath: string) => Promise<boolean>
      analyzeTranscriptSelection: (request: { text: string; mode?: 'meeting' | 'interview' | 'prompt' }) => Promise<{
        intent: 'question' | 'decision' | 'action_item' | 'note' | 'prompt'
        summary: string
        suggestions: Array<{
          id: string
          label: string
          description: string
        }>
      }>
      generateTranscriptNote: (request: {
        title?: string
        transcript: string
        mode?: 'meeting' | 'interview' | 'prompt'
        selectedSnippets?: string[]
        customInstructions?: string
      }) => Promise<{
        title: string
        markdown: string
        summary: string
        highlights: string[]
        questions: string[]
        decisions: string[]
        actionItems: string[]
        words: number
        segments: number
      }>
      listProjectGraphs: () => Promise<any[]>
      addProjectGraph: (rootPath: string) => Promise<{ ok: boolean; project?: any; error?: string }>
      runProjectGraph: (projectId: string) => Promise<{ ok: boolean; project?: any; graph?: any; error?: string }>
      getProjectGraph: (projectId: string) => Promise<any>
      removeProjectGraph: (projectId: string) => Promise<boolean>
      getProjectGraphPrompt: (projectId: string) => Promise<{ command: string; prompt: string; graphPath: string } | null>
      renamePath: (oldPath: string, newPath: string) => Promise<boolean>
      getAbsoluteFileUrl: (absolutePath: string) => Promise<string>
      selectExe: () => Promise<{ exePath: string; name: string; iconDataUrl: string | null } | null>
      launchExe: (exePath: string) => Promise<boolean>
      launchExeWithArgs: (exePath: string, args: string[]) => Promise<boolean>
      launchMany: (exePaths: string[], mode: 'sequential' | 'simultaneous') => Promise<boolean>
      checkRunningApps: (exePaths: string[]) => Promise<string[]>
      getAppsMemory: (exePaths: string[]) => Promise<Record<string, number>>
      scanInstalledApps: () => Promise<Array<{ name: string; exePath: string }>>
      saveMeetingAudio: (meetingId: string, audioBase64: string) => Promise<string | null>
      deleteMeetingAudio: (audioPath: string) => Promise<boolean>
      transcribeAudio: (
        audioPath: string,
        modelId?: string,
        options?: {
          initialPrompt?: string
          mode?: 'meeting' | 'interview' | 'prompt'
          hotwords?: string[]
          projectName?: string
        }
      ) => Promise<string>
      listWhisperModels: () => Promise<Array<{
        id: string
        name: string
        sizeMb: number
        vramRequiredMb: number
        url: string
        downloaded: boolean
      }>>
      projectSelectFolder: () => Promise<{ name: string; path: string } | null>
      projectListFiles: (projectPath: string) => Promise<Array<{ relativePath: string; extension: string; sizeBytes: number }>>
      projectReadFile: (projectPath: string, relativePath: string) => Promise<string | null>
      projectSearchText: (projectPath: string, query: string) => Promise<Array<{ relativePath: string; line: number; lineContent: string }>>
      webSearch: (query: string) => Promise<Array<{ title: string; url: string; snippet: string }>>
      createBackup: () => Promise<{ success: boolean; backupPath?: string; error?: string }>
      listBackups: () => Promise<Array<{ name: string; path: string; date: string; size: number; category?: string; valid?: boolean; notes?: number }>>
      openBackupsFolder: () => Promise<boolean>
      restoreBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>
      mergeDataFromOldPath: (oldDataPath: string) => Promise<{ success: boolean; merged: number; error?: string }>
      selectOldDataPath: () => Promise<string | null>
      importMarkdowns: (sourceDir: string) => Promise<{ success: boolean; imported: number; files: Array<{ path: string; name: string; content: string }>; error?: string }>
      selectJsonFile: () => Promise<string | null>
      importPlanningData: (storeJsonPath: string) => Promise<{ success: boolean; cards: number; events: number; cardsData: any[]; eventsData: any[]; error?: string }>
      onClipboardContent: (callback: (event: unknown, text: string) => void) => void
      offClipboardContent: (callback: (event: unknown, text: string) => void) => void
      superWhisperShow: () => Promise<void>
      superWhisperHide: () => Promise<void>
      superWhisperToggle: () => Promise<void>
      superWhisperIsOpen: () => Promise<boolean>
      superWhisperSend: (text: string) => Promise<void>
      superWhisperGetTheme: () => Promise<{ primary: string; background: string; surface: string; text: string } | null>
      onSuperWhisperTranscript: (cb: (text: string) => void) => void
      offSuperWhisperTranscript: () => void
      getWakeWordConfig: () => Promise<{ enabled: boolean; keyword: string; sensitivity: number }>
      setWakeWordConfig: (config: { enabled?: boolean; keyword?: string; sensitivity?: number }) => Promise<{ enabled: boolean; keyword: string; sensitivity: number }>
      triggerWakeWord: () => Promise<{ triggered: boolean }>
      saveConversation?: (id: string, content: string) => Promise<string | null>
      setContentProtection?: (enabled: boolean) => Promise<boolean>
      onPlanningSync?: (callback: () => void) => () => void
    }
  }
}

export interface SettingsViewProps {
  [key: string]: any
}

export interface StoreSummary {
  [key: string]: any
}
