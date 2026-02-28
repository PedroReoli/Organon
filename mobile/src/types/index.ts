// Tipos do Organon Mobile — portados do desktop

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type Period = 'morning' | 'afternoon' | 'night'
export type CardPriority = 'P1' | 'P2' | 'P3' | 'P4'
export type CardStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  P1: 'Critico', P2: 'Alto', P3: 'Medio', P4: 'Baixo',
}
export const PRIORITY_COLORS: Record<CardPriority, string> = {
  P1: '#ef4444', P2: '#f97316', P3: '#eab308', P4: '#6b7280',
}
export const STATUS_LABELS: Record<CardStatus, string> = {
  todo: 'A fazer', in_progress: 'Em andamento', blocked: 'Bloqueado', done: 'Feito',
}
export const STATUS_COLORS: Record<CardStatus, string> = {
  todo: '#6b7280', in_progress: '#3b82f6', blocked: '#ef4444', done: '#22c55e',
}
export const STATUS_ORDER: CardStatus[] = ['todo', 'in_progress', 'blocked', 'done']

export interface CardLocation {
  day: Day | null
  period: Period | null
}

export interface Card {
  id: string
  title: string
  descriptionHtml: string
  location: CardLocation
  order: number
  date: string | null
  time: string | null
  hasDate: boolean
  priority: CardPriority | null
  status: CardStatus
  checklist: ChecklistItem[]
  projectId: string | null
  calendarEventId?: string | null
  createdAt: string
  updatedAt: string
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
  icon: { kind: 'favicon' | 'builtin' | 'emoji'; value: string } | null
  order: number
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string | null
  recurrence: CalendarRecurrence | null
  reminder: CalendarReminder | null
  description: string
  color: string
  createdAt: string
  updatedAt: string
}

export type CalendarRecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

export interface CalendarRecurrence {
  frequency: CalendarRecurrenceFrequency
  interval: number
  until: string | null
}

export interface CalendarReminder {
  enabled: boolean
  offsetMinutes: number
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
  content: string           // Mobile: conteúdo inline (não em arquivo .md)
  folderId: string | null
  projectId: string | null
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

export type HabitType = 'boolean' | 'count' | 'time' | 'quantity'
export type HabitFrequency = 'daily' | 'weekly'

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
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string
  value: number
  skipped: boolean
  skipReason: string
}

export type ExpenseCategory = 'alimentacao' | 'transporte' | 'lazer' | 'moradia' | 'saude' | 'educacao' | 'outro'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  alimentacao: 'Alimentação', transporte: 'Transporte', lazer: 'Lazer',
  moradia: 'Moradia', saude: 'Saúde', educacao: 'Educação', outro: 'Outro',
}
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  alimentacao: '#22c55e', transporte: '#3b82f6', lazer: '#f97316',
  moradia: '#8b5cf6', saude: '#ef4444', educacao: '#eab308', outro: '#6b7280',
}

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
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
  date: string
  installments: number
  currentInstallment: number
  parentId: string | null
  note: string
  createdAt: string
}

export interface BudgetCategory {
  category: ExpenseCategory
  limit: number
}

export type IncomeKind = 'fixed' | 'extra'

export interface IncomeEntry {
  id: string
  source: string
  amount: number
  date: string
  kind: IncomeKind
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

export type CRMPriority = 'alta' | 'media' | 'baixa'

export const CRM_PRIORITY_LABELS: Record<CRMPriority, string> = {
  alta: 'Alta', media: 'Média', baixa: 'Baixa',
}
export const CRM_PRIORITY_COLORS: Record<CRMPriority, string> = {
  alta: '#ef4444', media: '#f97316', baixa: '#22c55e',
}

export type CRMStageId =
  | 'prospeccao' | 'qualificado' | 'primeiro-contato' | 'analise'
  | 'proposta-enviada' | 'negociacao' | 'cliente-ativo' | 'perdeu'

export interface CRMStage {
  id: CRMStageId
  label: string
  order: number
}

export const CRM_STAGES: CRMStage[] = [
  { id: 'prospeccao', label: 'Prospecção', order: 0 },
  { id: 'qualificado', label: 'Qualificado', order: 1 },
  { id: 'primeiro-contato', label: 'Primeiro Contato', order: 2 },
  { id: 'analise', label: 'Análise', order: 3 },
  { id: 'proposta-enviada', label: 'Proposta Enviada', order: 4 },
  { id: 'negociacao', label: 'Negociação', order: 5 },
  { id: 'cliente-ativo', label: 'Cliente Ativo', order: 6 },
  { id: 'perdeu', label: 'Perdeu', order: 7 },
]

export interface CRMTag {
  id: string
  name: string
  color: string
  createdAt: string
}

export type CRMInteractionType = 'nota' | 'ligacao' | 'email' | 'reuniao' | 'mensagem' | 'outro'

export const CRM_INTERACTION_TYPES: Record<CRMInteractionType, string> = {
  nota: 'Nota', ligacao: 'Ligação', email: 'E-mail',
  reuniao: 'Reunião', mensagem: 'Mensagem', outro: 'Outro',
}

export interface CRMInteraction {
  id: string
  contactId: string
  type: CRMInteractionType
  content: string
  date: string
  time: string
  createdAt: string
}

export interface CRMContactLinks {
  noteIds: string[]
  calendarEventIds: string[]
  cardIds: string[]
}

export interface CRMContact {
  id: string
  name: string
  company: string | null
  role: string | null
  phone: string | null
  email: string | null
  socialMedia: string | null
  context: string | null
  interests: string | null
  priority: CRMPriority
  tags: string[]
  stageId: CRMStageId
  description: string
  followUpDate: string | null
  links: CRMContactLinks
  createdAt: string
  updatedAt: string
  order: number
}

export interface StudyGoal {
  id: string
  title: string
  status: CardStatus
  createdAt: string
}

export interface StudySessionLog {
  id: string
  completedAt: string
  focusSeconds: number
}

export interface StudyState {
  focusMinutes: number
  breakMinutes: number
  goals: StudyGoal[]
  sessions: StudySessionLog[]
}

export type ThemeName =
  | 'dark-default' | 'dark-vscode' | 'light-1' | 'light-2'
  | 'dark-matcha' | 'light-rose' | 'dark-cyberpunk' | 'dark-purple-neon'
  | 'dark-blue-professional' | 'dark-graphite-minimal' | 'dark-forest'
  | 'dark-midnight-pink' | 'dark-dracula'

export interface ThemeSettings {
  primary: string
  background: string
  surface: string
  text: string
}

export const THEMES: Record<ThemeName, ThemeSettings> = {
  'dark-default':           { primary: '#6366f1', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9' },
  'dark-vscode':            { primary: '#007acc', background: '#1e1e1e', surface: '#252526', text: '#d4d4d4' },
  'light-1':                { primary: '#6366f1', background: '#f8fafc', surface: '#ffffff', text: '#1e293b' },
  'light-2':                { primary: '#059669', background: '#f9fafb', surface: '#ffffff', text: '#111827' },
  'dark-matcha':            { primary: '#4caf50', background: '#0f1f17', surface: '#162a21', text: '#e6f4ea' },
  'light-rose':             { primary: '#ec4899', background: '#fdf2f8', surface: '#ffffff', text: '#3f1d2e' },
  'dark-cyberpunk':         { primary: '#00e5ff', background: '#0a0a0f', surface: '#141421', text: '#e5e7eb' },
  'dark-purple-neon':       { primary: '#8b5cf6', background: '#0f0b1a', surface: '#1b1530', text: '#f5f3ff' },
  'dark-blue-professional': { primary: '#2563eb', background: '#0b1220', surface: '#111a2e', text: '#e5edff' },
  'dark-graphite-minimal':  { primary: '#9ca3af', background: '#0f0f10', surface: '#1a1a1d', text: '#f3f4f6' },
  'dark-forest':            { primary: '#22c55e', background: '#0b1f14', surface: '#123324', text: '#dcfce7' },
  'dark-midnight-pink':     { primary: '#f472b6', background: '#0f0b14', surface: '#1a1324', text: '#fdf2f8' },
  'dark-dracula':           { primary: '#bd93f9', background: '#282a36', surface: '#343746', text: '#f8f8f2' },
}

export const THEME_LABELS: Record<ThemeName, string> = {
  'dark-default':           'Escuro (Padrão)',
  'dark-vscode':            'Escuro (VS Code)',
  'light-1':                'Claro (Azul)',
  'light-2':                'Claro (Verde)',
  'dark-matcha':            'Escuro — Matcha',
  'light-rose':             'Claro — Rosa',
  'dark-cyberpunk':         'Escuro — Cyberpunk',
  'dark-purple-neon':       'Escuro — Roxo Neon',
  'dark-blue-professional': 'Escuro — Azul Profissional',
  'dark-graphite-minimal':  'Escuro — Grafite Minimal',
  'dark-forest':            'Escuro — Forest',
  'dark-midnight-pink':     'Escuro — Midnight Pink',
  'dark-dracula':           'Escuro — Dracula',
}

export interface Settings {
  themeName: ThemeName
  weekStart: 'sun' | 'mon'
}

export const DEFAULT_SETTINGS: Settings = {
  themeName: 'dark-default',
  weekStart: 'sun',
}

export const DEFAULT_STUDY_STATE: StudyState = {
  focusMinutes: 25,
  breakMinutes: 5,
  goals: [],
  sessions: [],
}

export const DAY_LABELS: Record<Day, string> = {
  mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb', sun: 'Dom',
}
export const DAY_LABELS_FULL: Record<Day, string> = {
  mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta',
  fri: 'Sexta', sat: 'Sábado', sun: 'Domingo',
}
export const DAYS_ORDER: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const PERIOD_LABELS: Record<Period, string> = {
  morning: 'Manhã', afternoon: 'Tarde', night: 'Noite',
}
export const PERIODS_ORDER: Period[] = ['morning', 'afternoon', 'night']

export type CellId = `${Day}-${Period}` | 'backlog'

export const getCellId = (day: Day | null, period: Period | null): CellId => {
  if (!day || !period) return 'backlog'
  return `${day}-${period}`
}

// Store mobile (estado em memória)
export interface MobileStore {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  incomes: IncomeEntry[]
  financialConfig: FinancialConfig
  savingsGoals: SavingsGoal[]
  playbooks: Playbook[]
  crmContacts: CRMContact[]
  crmInteractions: CRMInteraction[]
  crmTags: CRMTag[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  study: StudyState
  settings: Settings
  storeUpdatedAt: string
}

export const DEFAULT_MOBILE_STORE: MobileStore = {
  cards: [],
  calendarEvents: [],
  noteFolders: [],
  notes: [],
  colorPalettes: [],
  habits: [],
  habitEntries: [],
  bills: [],
  expenses: [],
  budgetCategories: [],
  incomes: [],
  financialConfig: { monthlyIncome: 0, monthlySpendingLimit: 0 },
  savingsGoals: [],
  playbooks: [],
  crmContacts: [],
  crmInteractions: [],
  crmTags: [],
  shortcutFolders: [],
  shortcuts: [],
  study: DEFAULT_STUDY_STATE,
  settings: DEFAULT_SETTINGS,
  storeUpdatedAt: new Date().toISOString(),
}
