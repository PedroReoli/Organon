export interface CardLocation {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null
  period: 'morning' | 'afternoon' | 'night' | null
}

export interface Card {
  id: string
  title: string
  descriptionHtml?: string
  location: CardLocation
  order: number
  date: string | null
  hasDate: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string

  // Next-Gen Planning Engine Properties (Backward Compatible)
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived'
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  time?: string | null // "HH:mm"
  durationMinutes?: number
  projectId?: string | null
  sprintId?: string | null
  coverColor?: string | null
  iconEmoji?: string | null
  tags?: string[]
  storyPoints?: number
  checklist?: Array<{
    id: string
    title: string
    completed: boolean
  }>
  reminder?: {
    triggerAt: string
    preset: 'at_time' | '5m' | '15m' | '1h' | '1d'
    hasFired: boolean
    snoozedUntil?: string | null
  } | null
}

export interface ProjectSprint {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  projectIds: string[]
  status: 'planning' | 'active' | 'completed' | 'archived'
  targetStoryPoints?: number
  createdAt: string
  updatedAt: string
}

export type ShortcutKind = 'url'
export type LegacyShortcutKind = 'url' | 'path' | 'clipboard'

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
  order: number
}

export type ShortcutItemInput = Omit<ShortcutItem, 'kind'> & { kind?: LegacyShortcutKind }

export type ThemeName = 'dark-default' | 'dark-vscode' | 'light-1' | 'light-2'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface NoteFolder {
  id: string
  name: string
  parentId: string | null
  order: number
}

export interface Note {
  id: string
  title: string
  mdPath: string
  folderId: string | null
  isLocked: boolean
  createdAt: string
  updatedAt: string
  order: number
}

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  createdAt: string
  updatedAt: string
  order: number
}

export interface ClipboardItem {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  order: number
}

export interface AppItem {
  id: string
  name: string
  exePath: string
  iconPath: string | null
  order: number
}

export interface AppMacro {
  id: string
  name: string
  appIds: string[]
  mode: 'sequential' | 'simultaneous'
  order: number
}

export interface Settings {
  themeName: ThemeName
  dataDir: string | null
  installerCompleted: boolean
  weekStart: string | null
  apiToken?: string
  apiBaseUrl?: string
  apiEmail?: string
  apiRefreshToken?: string
  keyboardShortcuts?: Array<{
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
  }>
  backupEnabled?: boolean
  backupIntervalMinutes?: number
  debugHudTitlebar?: boolean
  debugHudInline?: boolean
  debugHudHover?: boolean
}

export interface Habit {
  id: string
  name: string
  type: 'check' | 'measurable' | 'timer' | 'routine'
  target: number
  frequency: 'daily' | 'weekly'
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
  seriesPattern?: 'manual' | 'rotating'
  seriesColors?: Record<string, string>
  routineSchedule?: Record<string, number[]>
  unit?: string
  progressiveTarget?: { startValue: number; endValue: number; incrementPerWeek: number; startDate: string }
  stackAfter?: string
  pausedUntil?: string
  reminderTime?: string
  reminderEnabled?: boolean
  xp?: number
  level?: number
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

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  category: string
  recurrence: 'monthly' | 'yearly'
  isPaid: boolean
  paidDate: string | null
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  installments: number
  currentInstallment: number
  parentId: string | null
  note: string
  createdAt: string
}

export interface BudgetCategory {
  category: string
  limit: number
}

export interface IncomeEntry {
  id: string
  source: string
  amount: number
  date: string
  kind: 'fixed' | 'extra'
  recurrenceMonths: number
  recurrenceIndex: number
  recurrenceGroupId: string | null
  note: string
  createdAt: string
}

export interface FinancialConfig {
  monthlyIncome: number
  monthlySpendingLimit: number
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  createdAt: string
}

export type InvestmentType = 'renda_fixa' | 'renda_variavel' | 'cripto' | 'fundo' | 'outro'

export interface Investment {
  id: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: number
  currentValue: number
  date: string
  notes: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  path: string
  description: string
  color: string
  links: Array<{ id: string; label: string; url: string }>
  preferredIdeId: string | null
  createdAt: string
  updatedAt: string
  order: number
}

export interface RegisteredIDE {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  args: string
  order: number
}

export interface ClipboardCategory {
  id: string
  name: string
  order: number
}

export interface QuickAccessItem {
  id: string
  view: string
  label: string
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

export interface StudyChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface StudyGoal {
  id: string
  title: string
  description: string
  priority: 'P1' | 'P2' | 'P3' | 'P4' | null
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  checklist: StudyChecklistItem[]
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

export interface Canvas {
  id: string
  name: string
  snapshot: Record<string, unknown>
  thumbnail: string | null
  createdAt: string
  updatedAt: string
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
  /** Registro do ultimo erro de sincronizacao; null/undefined quando sucesso. */
  lastSyncError?: SyncErrorLog | null
  pendingDeletes?: Array<{ resource: string; id: string }>
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  projects: Project[]
  registeredIDEs: RegisteredIDE[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
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
  investments: Investment[]
  quickAccess: QuickAccessItem[]
  meetings: Meeting[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playbooks: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crmContacts: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crmInteractions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  crmTags: any[]
  study: StudyState
  canvases: Canvas[]
  settings: Settings

  // Next-Gen Planning Engine
  projectSprints?: ProjectSprint[]
}

export interface AppConfig {
  version: number
  dataDir: string | null
  installerCompleted: boolean
  storageLayoutVersion?: number
  dedicatedStorageCompleted?: boolean
  dedicatedStorageCompletedAt?: string
  migrationState?: 'pending' | 'analyzing' | 'copying' | 'validating' | 'completed' | 'failed'
  migrationSourceDir?: string | null
  migrationError?: string | null
}

export interface BackupManifest {
  formatVersion: number
  createdAt: string
  completedAt?: string
  category?: 'automatic' | 'daily' | 'weekly' | 'monthly' | 'manual' | 'emergency' | 'pre-update'
  appVersion?: string
  storageLayoutVersion?: number
  storeRoot: string
  jsonFiles: string[]
  sourceJsonFiles: string[]
  notesRoot: string
  meetingsRoot: string
  notesLinkedBy: string
  counts?: Record<string, number>
  files?: Array<{ path: string; size: number; sha256: string }>
  complete?: boolean
}

export interface BackupListItem {
  name: string
  path: string
  date: string
  size: number
  category?: string
  valid?: boolean
  notes?: number
}
