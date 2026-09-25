// Dias da semana (abreviados)
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

// Períodos do dia
export type Period = 'morning' | 'afternoon' | 'night'

// Prioridade dos cards
export type CardPriority = 'P1' | 'P2' | 'P3' | 'P4'

// Status dos cards
export type CardStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'postponed' | 'cancelled' | 'overdue'

// Checklist item dentro de um card
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
  completed?: boolean
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
  postponed: 'Adiado',
  cancelled: 'Cancelado',
  overdue: 'Atrasado',
}

export const STATUS_COLORS: Record<CardStatus, string> = {
  todo: '#6b7280',
  in_progress: 'var(--color-primary)',
  blocked: '#ef4444',
  done: '#22c55e',
  postponed: '#a855f7',
  cancelled: '#64748b',
  overdue: '#dc2626',
}

export const STATUS_ORDER: CardStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'postponed', 'cancelled', 'overdue']

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
  description?: string
  location: CardLocation
  order: number
  date: string | null           // ISO date "2026-02-03" ou null
  time: string | null           // "HH:MM" ou null
  hasDate: boolean              // true = com data (limpa no reset), false = sem data (mantém)
  isLocked: boolean             // true = travado num dia específico, somente leitura
  durationMinutes: number | null // duração em minutos para a vista horária
  priority: CardPriority | null  // P1-P4 ou null
  status: CardStatus             // todo, in_progress, blocked, done, postponed, cancelled, overdue
  checklist: ChecklistItem[]     // subtarefas
  projectId: string | null       // vinculo com projeto
  createdAt: string              // ISO timestamp
  updatedAt: string              // ISO timestamp
  inSprint?: boolean
  sprintId?: string | null
  sprintColumnId?: string | null
  swimLaneId?: string | null
  sprintSectionId?: string | null
  postponementCount?: number
  lastNotificationAt?: string | null
  nextReminderAt?: string | null
  dependencies?: string[]
  objectiveId?: string | null
  cancelReason?: string | null
  startedAt?: string | null
  completedAt?: string | null
  coverColor?: string | null
  iconEmoji?: string | null
  storyPoints?: number | null
  tags?: string[]
  reminder?: CardReminder | null
}

export type ReminderMode = 'exact' | 'before' | 'relative' | 'interval'
export type ReminderSound = 'alarm' | 'bell' | 'chime' | 'digital' | 'gentle' | 'none'

export interface CardReminder {
  enabled: boolean
  mode: ReminderMode
  triggerAt: string | null         // ISO date/time string of next trigger
  offsetMinutes?: number           // For 'before' mode (e.g. 15 min before card.time)
  intervalMinutes?: number         // For 'interval' mode (e.g. every 10, 15, 30 min)
  repeatUntilDone?: boolean        // If true, repeats at every interval until status === 'done'
  snoozedUntil?: string | null     // ISO string when snoozed
  hasFired?: boolean               // Flag if fired for non-repeating
  sound?: ReminderSound            // Alert sound
  nativeToast?: boolean            // Windows Notification
  alertType?: 'alarm' | 'toast'    // Full alarm modal vs subtle toast
  fireCount?: number               // How many times it has fired/reminded
  createdAt?: string
}

export interface PlannerPreferences {
  plannerStartHour: number
  plannerEndHour: number
  plannerInterval: 30 | 60
}

export interface SprintColumn {
  id: string
  name: string
  color: string
  order: number
  groupId?: string | null
  autoStatus?: CardStatus | null
}

export interface SprintCard {
  id: string
  title: string
  description: string
  priority: CardPriority | null
  status: CardStatus
  checklist: ChecklistItem[]
  columnId: string | null
  sectionId: string | null
  sprintId?: string | null
  estimatedHours?: number | null
  tags?: string[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface SprintColumnGroup {
  id: string
  name: string
  color: string
  order: number
}

export interface SprintColumnSection {
  id: string
  columnId: string
  name: string
  order: number
}

export interface SprintSwimLane {
  id: string
  name: string
  color: string
  order: number
}

export interface SprintMetadata {
  id: string
  label?: string
  name?: string
  goal?: string
  projectIds?: string[]
  targetStoryPoints?: number
  startDate: string
  endDate: string
  createdAt: string
  [key: string]: any
}

export interface SprintBoardConfig {
  lanesEnabled: boolean
  groupsEnabled: boolean
  sectionsEnabled: boolean
  activeSprintId?: string | null
}

export const DEFAULT_SPRINT_BOARD_CONFIG: SprintBoardConfig = {
  lanesEnabled: false,
  groupsEnabled: false,
  sectionsEnabled: false,
  activeSprintId: null,
}

export const DEFAULT_SPRINT_COLUMNS: SprintColumn[] = [
  { id: 'col-backlog', name: 'Backlog', color: '#64748b', order: 0 },
  { id: 'col-todo', name: 'A fazer', color: 'var(--color-primary)', order: 1 },
  { id: 'col-doing', name: 'Em progresso', color: '#f59e0b', order: 2 },
  { id: 'col-review', name: 'Review', color: '#a855f7', order: 3 },
  { id: 'col-done', name: 'Concluído', color: '#22c55e', order: 4, autoStatus: 'done' },
]

export interface AgendaCategory {
  id: string
  name: string
  color: string
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
  categoryId: string | null
  contactId?: string | null
  createdAt: string
  updatedAt: string
}

export type CalendarRecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarRecurrence {
  frequency: CalendarRecurrenceFrequency
  interval: number
  until: string | null
}

export interface CalendarReminder {
  enabled: boolean
  offsetMinutes: number
}

export const DAY_LABELS: Record<Day, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
}

export const DAYS_ORDER: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const PERIOD_LABELS: Record<Period, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
}

export const PERIODS_ORDER: Period[] = ['morning', 'afternoon', 'night']

export type CellId = `${Day}-${Period}` | 'backlog'

export const getCellId = (day: Day | null, period: Period | null): CellId => {
  if (day === null || period === null) {
    return 'backlog'
  }
  return `${day}-${period}`
}

export const parseCellId = (cellId: CellId): CardLocation => {
  if (cellId === 'backlog') {
    return { day: null, period: null }
  }
  const [day, period] = cellId.split('-') as [Day, Period]
  return { day, period }
}
