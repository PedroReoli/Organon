import type {
  Card,
  Note,
  NoteFolder,
  CalendarEvent,
  Project,
  Bill,
  Expense,
  IncomeEntry,
  SavingsGoal,
  Investment,
  Meeting,
  StudyGoal,
  StudyMediaItem,
  FinancialConfig,
  ColorPalette,
  BudgetCategory,
  ShortcutFolder,
  ShortcutItem,
  SprintCard,
  SprintColumnSection,
  AgendaCategory,
} from '../../renderer/types'

export const BATCH_SIZE = 100
export const PULL_SINCE_FALLBACK = '2020-01-01T00:00:00.000Z'

export interface PartialSyncedStore {
  cards: Card[]
  notes: Note[]
  noteFolders: NoteFolder[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  bills: Bill[]
  expenses: Expense[]
  incomes: IncomeEntry[]
  savingsGoals: SavingsGoal[]
  investments: Investment[]
  meetings: Meeting[]
  studyGoals: StudyGoal[]
  studyMediaItems: StudyMediaItem[]
  financeConfig: FinancialConfig | null
  financeConfigBudgetCategories: BudgetCategory[] | null
  studyConfig: { focusMinutes: number; breakMinutes: number; muteSound: boolean; wallpaperUrl: string } | null
  colorPalettes: ColorPalette[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  sprintCards: SprintCard[]
  sprintColumnSections: SprintColumnSection[]
  calendarCategories: AgendaCategory[]
}

export interface PullResult {
  store: PartialSyncedStore
  /** noteId → content HTML (para escrever em disco no desktop) */
  noteContents: Map<string, string>
  serverTime: string
  /** resource → lista de IDs excluídos remotamente desde o último sync */
  deletedIds: Map<string, string[]>
}

export type Payload = Record<string, unknown>

export const now = () => new Date().toISOString()
export function s(v: unknown, fallback = ''): string { return v != null ? String(v) : fallback }
export function n(v: unknown, def = 0): number { return typeof v === 'number' ? v : def }
export function b(v: unknown, def = false): boolean { return typeof v === 'boolean' ? v : def }
export function arr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : [] }

export const INT32_MAX = 2147483647
export const INT32_MIN = -2147483648
export function i32(v: unknown, def = 0): number {
  const parsed = typeof v === 'number'
    ? v
    : (typeof v === 'string' && v.trim() !== '' ? Number(v) : def)
  if (!Number.isFinite(parsed)) return def
  const truncated = Math.trunc(parsed)
  if (truncated > INT32_MAX) return INT32_MAX
  if (truncated < INT32_MIN) return INT32_MIN
  return truncated
}

export interface PushProgress {
  resource: string
  label: string
  count: number
  groupIndex: number
  totalGroups: number
}

export interface SyncGroupError {
  resource: string
  batchIndex: number
  totalBatches: number
  count: number
  status: number | string
  message: string
}

export interface SyncReport {
  totalOps: number
  succeededOps: number
  errors: SyncGroupError[]
}

export const PUSH_RESOURCE_LABELS: Record<string, string> = {
  projects: 'Projetos',
  calendar_events: 'Eventos de calendário',
  finance_bills: 'Contas',
  finance_incomes: 'Rendas',
  finance_savings_goals: 'Metas de economia',
  finance_investments: 'Investimentos',
  meetings: 'Reuniões',
  study_goals: 'Metas de estudo',
  study_media_items: 'Mídias de estudo',
  crm_contacts: 'Contatos CRM',
  crm_tags: 'Tags CRM',
  crm_interactions: 'Interações CRM',
  finance_config: 'Config. financeira',
  study_config: 'Config. de estudo',
  note_folders: 'Pastas de notas',
  notes: 'Notas',
  cards: 'Cards',
  finance_expenses: 'Despesas',
  color_palettes: 'Paletas de cores',
}

/**
 * Ordena itens que possuem parentId auto-referencial (ex: note_folders, expenses).
 * Garante que pais sempre precedem filhos no array resultante.
 * Ciclos são ignorados (itens restantes adicionados ao final).
 */
export function toposort<T extends { id: string; parentId?: string | null }>(items: T[]): T[] {
  const byId = new Map<string, T>(items.map(i => [i.id, i]))
  const sorted: T[] = []
  const visited = new Set<string>()

  function visit(id: string) {
    if (visited.has(id)) return
    const item = byId.get(id)
    if (!item) return
    visited.add(id)
    if (item.parentId && byId.has(item.parentId)) {
      visit(item.parentId) // garante que o pai vem antes
    }
    sorted.push(item)
  }

  for (const item of items) visit(item.id)
  return sorted
}
