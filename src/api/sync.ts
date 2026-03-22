// Sync com a Organon API (substitui Appwrite)
// Push: batch upsert de todas as entidades locais
// Pull: GET /sync/changes paginado → retorna PartialSyncedStore

import { organonApi, SyncOperation, SyncChange } from './organon'
import type {
  Store, Card, Note, NoteFolder, CalendarEvent, Project,
  Habit, HabitEntry, CRMContact, Bill, Expense, IncomeEntry,
  SavingsGoal, Playbook, StudyGoal, StudyMediaItem,
  ChecklistItem, CardPriority, CardStatus, CRMPriority, CRMStageId,
  ProjectLink, CalendarRecurrence, CalendarReminder,
} from '../renderer/types'

const BATCH_SIZE = 100
const PULL_SINCE_FALLBACK = '2020-01-01T00:00:00.000Z'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface PartialSyncedStore {
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

export interface PullResult {
  store: PartialSyncedStore
  /** noteId → content HTML (para escrever em disco no desktop) */
  noteContents: Map<string, string>
  serverTime: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Payload = Record<string, unknown>

const now = () => new Date().toISOString()
function s(v: unknown, fallback = ''): string { return v != null ? String(v) : fallback }
function n(v: unknown, def = 0): number { return typeof v === 'number' ? v : def }
function b(v: unknown, def = false): boolean { return typeof v === 'boolean' ? v : def }
function arr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : [] }

const INT32_MAX = 2147483647
const INT32_MIN = -2147483648
function i32(v: unknown, def = 0): number {
  const parsed = typeof v === 'number'
    ? v
    : (typeof v === 'string' && v.trim() !== '' ? Number(v) : def)
  if (!Number.isFinite(parsed)) return def
  const truncated = Math.trunc(parsed)
  if (truncated > INT32_MAX) return INT32_MAX
  if (truncated < INT32_MIN) return INT32_MIN
  return truncated
}

// ── toApi: local → payload ────────────────────────────────────────────────────

function cardToApi(c: Card): Payload {
  return {
    title: c.title,
    description_html: c.descriptionHtml ?? '',
    location_day: c.location?.day ?? null,
    location_period: c.location?.period ?? null,
    sort_order: i32(c.order, 0),
    date: c.date ?? null,
    time: c.time ?? null,
    has_date: c.hasDate ?? false,
    priority: c.priority ?? null,
    status: c.status ?? 'todo',
    project_id: c.projectId ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

function noteToApi(note: Note, content: string): Payload {
  return {
    id: note.id,
    title: note.title,
    content: content ?? '',
    content_format: 'html',
    ...(note.checksum ? { base_checksum: note.checksum } : {}),
    folder_id: note.folderId ?? null,
    project_id: note.projectId ?? null,
    parent_note_id: note.parentNoteId ?? null,
    is_pinned: note.isPinned ?? false,
    is_favorite: note.isFavorite ?? false,
    is_locked: note.isLocked ?? false,
    sort_order: i32(note.order, 0),
    updated_at: note.updatedAt,
  }
}

function noteFolderToApi(f: NoteFolder): Payload {
  return {
    name: f.name,
    parent_id: f.parentId ?? null,
    sort_order: i32(f.order, 0),
    is_home: f.isHome ?? false,
  }
}

function projectToApi(p: Project): Payload {
  return {
    name: p.name,
    path: p.path ?? '',
    description: p.description ?? '',
    color: p.color ?? '',
    links: p.links ?? [],
    preferred_ide_id: p.preferredIdeId ?? null,
    sort_order: i32(p.order, 0),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

function calendarEventToApi(e: CalendarEvent): Payload {
  return {
    title: e.title,
    date: e.date,
    time: e.time ?? null,
    recurrence: e.recurrence ?? null,
    reminder: e.reminder ?? null,
    description: e.description ?? '',
    color: e.color ?? '',
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  }
}

function habitToApi(h: Habit): Payload {
  return {
    name: h.name,
    type: h.type,
    target: h.target ?? 1,
    frequency: h.frequency,
    weekly_target: h.weeklyTarget ?? 1,
    week_days: h.weekDays ?? [],
    trigger: h.trigger ?? '',
    reason: h.reason ?? '',
    minimum_target: h.minimumTarget ?? 0,
    color: h.color ?? '',
    sort_order: i32(h.order, 0),
    created_at: h.createdAt,
  }
}

function habitEntryToApi(e: HabitEntry): Payload {
  return {
    habit_id: e.habitId,
    date: e.date,
    value: e.value ?? 0,
    skipped: e.skipped ?? false,
    skip_reason: e.skipReason ?? '',
  }
}

function crmContactToApi(c: CRMContact): Payload {
  // tags e links são gerenciados via endpoints separados — não vão no payload
  return {
    name: c.name,
    company: c.company ?? null,
    role: c.role ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    social_media: c.socialMedia ?? null,
    context: c.context ?? null,
    interests: c.interests ?? null,
    priority: c.priority ?? 'media',
    stage_id: c.stageId ?? 'prospeccao',
    description: c.description ?? '',
    follow_up_date: c.followUpDate ?? null,
    sort_order: i32(c.order, 0),
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

function billToApi(bill: Bill): Payload {
  return {
    name: bill.name,
    amount: bill.amount ?? 0,
    due_day: bill.dueDay ?? 1,
    category: bill.category ?? 'outro',
    recurrence: bill.recurrence ?? 'monthly',
    is_paid: bill.isPaid ?? false,
    paid_date: bill.paidDate ?? null,
    created_at: bill.createdAt,
  }
}

function expenseToApi(e: Expense): Payload {
  return {
    description: e.description,
    amount: e.amount ?? 0,
    category: e.category ?? 'outro',
    date: e.date,
    installments: e.installments ?? 1,
    current_installment: e.currentInstallment ?? 1,
    parent_id: e.parentId ?? null,
    note: e.note ?? '',
    created_at: e.createdAt,
  }
}

function incomeToApi(i: IncomeEntry): Payload {
  return {
    source: i.source,
    amount: i.amount ?? 0,
    date: i.date,
    kind: i.kind ?? 'fixed',
    recurrence_months: i.recurrenceMonths ?? 1,
    recurrence_index: i.recurrenceIndex ?? 1,
    recurrence_group_id: i.recurrenceGroupId ?? null,
    note: i.note ?? '',
    created_at: i.createdAt,
  }
}

function savingsGoalToApi(g: SavingsGoal): Payload {
  return {
    name: g.name,
    target_amount: g.targetAmount ?? 0,
    current_amount: g.currentAmount ?? 0,
    deadline: g.deadline ?? null,
    created_at: g.createdAt,
  }
}

function playbookToApi(p: Playbook): Payload {
  // title → name, sector → description, category agora é enviado
  return {
    name: p.title,
    description: p.sector ?? '',
    category: p.category ?? '',
    content: p.content ?? '',
    summary: p.summary ?? '',
    sort_order: i32(p.order, 0),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

function studyGoalToApi(g: StudyGoal): Payload {
  return {
    title: g.title,
    priority: g.priority ?? null,
    status: g.status ?? 'todo',
    checklist: g.checklist ?? [],
    // linked_planning_card_id não é enviado: referência local de conveniência,
    // o card pode não existir na API e causaria FK constraint violation.
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  }
}

function studyMediaItemToApi(m: StudyMediaItem): Payload {
  // local kind → API type; show_dock agora é enviado
  return {
    title: m.title,
    url: m.url ?? '',
    type: m.kind,
    youtube_video_id: m.youtubeVideoId ?? null,
    volume: m.volume ?? 1,
    loop: m.loop ?? false,
    show_dock: m.showDock ?? false,
  }
}

// ── fromApi: payload → local ──────────────────────────────────────────────────

function cardFromApi(id: string, p: Payload): Card {
  return {
    id,
    title: s(p.title),
    descriptionHtml: s(p.description_html),
    location: {
      day: (p.location_day as Card['location']['day']) ?? null,
      period: (p.location_period as Card['location']['period']) ?? null,
    },
    order: n(p.sort_order),
    date: p.date ? s(p.date) : null,
    time: p.time ? s(p.time) : null,
    hasDate: b(p.has_date),
    priority: (p.priority as CardPriority) ?? null,
    status: (p.status as CardStatus) ?? 'todo',
    checklist: arr<ChecklistItem>(p.checklist),
    projectId: p.project_id ? s(p.project_id) : null,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function noteFromApi(id: string, p: Payload): Note {
  return {
    id,
    title: s(p.title),
    // mdPath é um detalhe local do app desktop; não vem mais da API.
    mdPath: `${id}.md`,
    folderId: p.folder_id ? s(p.folder_id) : null,
    parentNoteId: p.parent_note_id ? s(p.parent_note_id) : null,
    projectId: p.project_id ? s(p.project_id) : null,
    checksum: p.checksum ? s(p.checksum) : undefined,
    isPinned: b(p.is_pinned),
    isFavorite: b(p.is_favorite),
    isLocked: b((p as Payload).is_locked),
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function noteFolderFromApi(id: string, p: Payload): NoteFolder {
  return {
    id,
    name: s(p.name),
    parentId: p.parent_id ? s(p.parent_id) : null,
    order: n(p.sort_order),
    isHome: b(p.is_home),
  }
}

function projectFromApi(id: string, p: Payload): Project {
  return {
    id,
    name: s(p.name),
    path: s(p.path),
    description: s(p.description),
    color: s(p.color),
    links: arr<ProjectLink>(p.links),
    preferredIdeId: p.preferred_ide_id ? s(p.preferred_ide_id) : null,
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function calendarEventFromApi(id: string, p: Payload): CalendarEvent {
  return {
    id,
    title: s(p.title),
    date: s(p.date),
    time: p.time ? s(p.time) : null,
    recurrence: (p.recurrence as CalendarRecurrence) ?? null,
    reminder: (p.reminder as CalendarReminder) ?? null,
    description: s(p.description),
    color: s(p.color),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function habitFromApi(id: string, p: Payload): Habit {
  return {
    id,
    name: s(p.name),
    type: (p.type as Habit['type']) ?? 'boolean',
    target: n(p.target, 1),
    frequency: (p.frequency as Habit['frequency']) ?? 'daily',
    weeklyTarget: n(p.weekly_target, 1),
    weekDays: arr<number>(p.week_days),
    trigger: s(p.trigger),
    reason: s(p.reason),
    minimumTarget: n(p.minimum_target),
    color: s(p.color),
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
  }
}

function habitEntryFromApi(id: string, p: Payload): HabitEntry {
  return {
    id,
    habitId: s(p.habit_id),
    date: s(p.date),
    value: n(p.value),
    skipped: b(p.skipped),
    skipReason: s(p.skip_reason),
  }
}

function crmContactFromApi(id: string, p: Payload): CRMContact {
  return {
    id,
    name: s(p.name),
    company: p.company ? s(p.company) : null,
    role: p.role ? s(p.role) : null,
    phone: p.phone ? s(p.phone) : null,
    email: p.email ? s(p.email) : null,
    socialMedia: p.social_media ? s(p.social_media) : null,
    context: p.context ? s(p.context) : null,
    interests: p.interests ? s(p.interests) : null,
    priority: (p.priority as CRMPriority) ?? 'media',
    tags: [],    // tags são via endpoint separado — reconstruídas via pull de /crm/contacts/:id/tags
    stageId: (p.stage_id as CRMStageId) ?? 'prospeccao',
    description: s(p.description),
    followUpDate: p.follow_up_date ? s(p.follow_up_date) : null,
    links: { noteIds: [], calendarEventIds: [], fileIds: [], cardIds: [], projectIds: [] },
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function billFromApi(id: string, p: Payload): Bill {
  return {
    id,
    name: s(p.name),
    amount: n(p.amount),
    dueDay: n(p.due_day, 1),
    category: (p.category as Bill['category']) ?? 'outro',
    recurrence: (p.recurrence as Bill['recurrence']) ?? 'monthly',
    isPaid: b(p.is_paid),
    paidDate: p.paid_date ? s(p.paid_date) : null,
    createdAt: s(p.created_at) || now(),
  }
}

function expenseFromApi(id: string, p: Payload): Expense {
  return {
    id,
    description: s(p.description),
    amount: n(p.amount),
    category: (p.category as Expense['category']) ?? 'outro',
    date: s(p.date),
    installments: n(p.installments, 1),
    currentInstallment: n(p.current_installment, 1),
    parentId: p.parent_id ? s(p.parent_id) : null,
    note: s(p.note),
    createdAt: s(p.created_at) || now(),
  }
}

function incomeFromApi(id: string, p: Payload): IncomeEntry {
  return {
    id,
    source: s(p.source),
    amount: n(p.amount),
    date: s(p.date),
    kind: (p.kind as IncomeEntry['kind']) ?? 'fixed',
    recurrenceMonths: n(p.recurrence_months, 1),
    recurrenceIndex: n(p.recurrence_index, 1),
    recurrenceGroupId: p.recurrence_group_id ? s(p.recurrence_group_id) : null,
    note: s(p.note),
    createdAt: s(p.created_at) || now(),
  }
}

function savingsGoalFromApi(id: string, p: Payload): SavingsGoal {
  return {
    id,
    name: s(p.name),
    targetAmount: n(p.target_amount),
    currentAmount: n(p.current_amount),
    deadline: p.deadline ? s(p.deadline) : null,
    createdAt: s(p.created_at) || now(),
  }
}

function playbookFromApi(id: string, p: Payload): Playbook {
  // API name → local title | API description → local sector
  return {
    id,
    title: s(p.name),
    sector: s(p.description),
    category: '',
    summary: s(p.summary),
    content: s(p.content),
    dialogs: [],   // dialogs não vêm no sync batch
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function studyGoalFromApi(id: string, p: Payload): StudyGoal {
  return {
    id,
    title: s(p.title),
    priority: (p.priority as CardPriority) ?? null,
    status: (p.status as CardStatus) ?? 'todo',
    checklist: arr<ChecklistItem>(p.checklist),
    linkedPlanningCardId: p.linked_planning_card_id ? s(p.linked_planning_card_id) : null,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

function studyMediaItemFromApi(id: string, p: Payload): StudyMediaItem {
  // API type → local kind
  return {
    id,
    title: s(p.title),
    url: s(p.url),
    kind: (p.type as StudyMediaItem['kind']) ?? 'youtube',
    youtubeVideoId: p.youtube_video_id ? s(p.youtube_video_id) : null,
    volume: n(p.volume, 1),
    loop: b(p.loop),
    showDock: false,
  }
}

// ── Dispatcher fromApi ────────────────────────────────────────────────────────

function applyChange(
  result: PartialSyncedStore,
  noteContents: Map<string, string>,
  change: SyncChange,
): void {
  if (change.operation === 'delete') return // ignorado no pull completo
  const { id, resource, payload: p } = change
  if (!p) return

  switch (resource) {
    case 'cards':              result.cards.push(cardFromApi(id, p)); break
    case 'notes': {
      const content = s(p.content)
      result.notes.push(noteFromApi(id, p))
      noteContents.set(id, content)
      break
    }
    case 'note_folders':       result.noteFolders.push(noteFolderFromApi(id, p)); break
    case 'calendar_events':    result.calendarEvents.push(calendarEventFromApi(id, p)); break
    case 'projects':           result.projects.push(projectFromApi(id, p)); break
    case 'habits':             result.habits.push(habitFromApi(id, p)); break
    case 'habit_entries':      result.habitEntries.push(habitEntryFromApi(id, p)); break
    case 'crm_contacts':       result.crmContacts.push(crmContactFromApi(id, p)); break
    case 'finance_bills':      result.bills.push(billFromApi(id, p)); break
    case 'finance_expenses':   result.expenses.push(expenseFromApi(id, p)); break
    case 'finance_incomes':    result.incomes.push(incomeFromApi(id, p)); break
    case 'finance_savings_goals': result.savingsGoals.push(savingsGoalFromApi(id, p)); break
    case 'playbooks':          result.playbooks.push(playbookFromApi(id, p)); break
    case 'study_goals':        result.studyGoals.push(studyGoalFromApi(id, p)); break
    case 'study_media_items':  result.studyMediaItems.push(studyMediaItemFromApi(id, p)); break
  }
}

// ── Topological sort (para entidades com parent_id auto-referência) ───────────

/**
 * Ordena itens que possuem parentId auto-referencial (ex: note_folders, expenses).
 * Garante que pais sempre precedem filhos no array resultante.
 * Ciclos são ignorados (itens restantes adicionados ao final).
 */
function toposort<T extends { id: string; parentId?: string | null }>(items: T[]): T[] {
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

// ── Tipos do relatório de sync ────────────────────────────────────────────────

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

// ── Delete All ────────────────────────────────────────────────────────────────

function makeDeleteOps(resource: string, ids: string[]): SyncOperation[] {
  return ids.map(id => ({ resource, operation: 'delete' as const, id }))
}

/**
 * Apaga todos os dados do usuário na API via /sync/batch (delete de todas as entidades).
 * Ordem reversa de dependência FK (filhos antes dos pais).
 * Nunca lança — coleta erros por lote e retorna relatório completo.
 */
export async function deleteAllFromApi(store: Store): Promise<SyncReport> {
  const safeStore = store as Partial<Store>
  const safeStudy = (safeStore.study ?? {}) as Partial<Store['study']>

  const habitEntries = arr<HabitEntry>(safeStore.habitEntries)
  const notes        = arr<Note>(safeStore.notes)
  const cards        = arr<Card>(safeStore.cards)
  const studyMedia   = arr<StudyMediaItem>(safeStudy.mediaItems)
  const studyGoals   = arr<StudyGoal>(safeStudy.goals)
  const crmContacts  = arr<CRMContact>(safeStore.crmContacts)
  const playbooks    = arr<Playbook>(safeStore.playbooks)
  const noteFolders  = arr<NoteFolder>(safeStore.noteFolders)
  const habits       = arr<Habit>(safeStore.habits)
  const projects     = arr<Project>(safeStore.projects)
  const calendarEvents = arr<CalendarEvent>(safeStore.calendarEvents)
  const bills        = arr<Bill>(safeStore.bills)
  const incomes      = arr<IncomeEntry>(safeStore.incomes)
  const savingsGoals = arr<SavingsGoal>(safeStore.savingsGoals)
  const expenses     = arr<Expense>(safeStore.expenses)

  // note_folders: apagar em ordem reversa (folhas → raízes)
  const noteFolderLevels: NoteFolder[][] = []
  {
    const placed = new Set<string>()
    let level = noteFolders.filter(f => !f.parentId)
    while (level.length > 0) {
      noteFolderLevels.push(level)
      level.forEach(f => placed.add(f.id))
      level = noteFolders.filter(f => f.parentId && placed.has(f.parentId) && !placed.has(f.id))
    }
    const orphans = noteFolders.filter(f => !placed.has(f.id))
    if (orphans.length > 0) noteFolderLevels.unshift(orphans)
  }

  // expenses: toposort e inverter (filhos antes dos pais)
  const expensesSorted = toposort(expenses).reverse()

  const resourceGroups: Array<{ label: string; ops: SyncOperation[] }> = []
  function addGroup(label: string, ids: string[]) {
    if (ids.length > 0) resourceGroups.push({ label, ops: makeDeleteOps(label, ids) })
  }

  // Ordem de delete: filhos antes dos pais
  addGroup('habit_entries',        habitEntries.map(e => e.id))
  addGroup('finance_expenses',     expensesSorted.map(e => e.id))
  addGroup('notes',                notes.map(n => n.id))
  addGroup('cards',                cards.map(c => c.id))
  addGroup('study_media_items',    studyMedia.map(m => m.id))
  addGroup('study_goals',          studyGoals.map(g => g.id))
  addGroup('crm_contacts',         crmContacts.map(c => c.id))
  addGroup('playbooks',            playbooks.map(p => p.id))
  // note_folders: folhas → raízes (reverso do push)
  for (let i = noteFolderLevels.length - 1; i >= 0; i--) {
    const ids = noteFolderLevels[i].map(f => f.id)
    if (ids.length > 0) resourceGroups.push({ label: 'note_folders', ops: makeDeleteOps('note_folders', ids) })
  }
  addGroup('habits',               habits.map(h => h.id))
  addGroup('projects',             projects.map(p => p.id))
  addGroup('calendar_events',      calendarEvents.map(e => e.id))
  addGroup('finance_bills',        bills.map(b => b.id))
  addGroup('finance_incomes',      incomes.map(i => i.id))
  addGroup('finance_savings_goals', savingsGoals.map(g => g.id))

  const totalOps = resourceGroups.reduce((sum, g) => sum + g.ops.length, 0)
  let succeededOps = 0
  const errors: SyncGroupError[] = []

  console.log(`[Sync] deleteAll — ${totalOps} ops em ${resourceGroups.length} grupo(s)`)

  for (const group of resourceGroups) {
    const { label, ops } = group
    const totalBatches = Math.ceil(ops.length / BATCH_SIZE)

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE)
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1

      try {
        await organonApi.sync.batch(batch)
        succeededOps += batch.length
        console.log(`[Sync][${label}] delete lote ${batchIndex}/${totalBatches} OK (${batch.length} ops)`)
      } catch (err) {
        const e = err as { status?: number; message?: string; body?: { error?: { message?: string } } }
        const status = e.status ?? 'desconhecido'
        const message = e.body?.error?.message ?? e.message ?? String(err)
        errors.push({ resource: label, batchIndex, totalBatches, count: batch.length, status, message })
        console.error(`[Sync][${label}] delete lote ${batchIndex}/${totalBatches} ERRO (HTTP ${String(status)}, ${batch.length} ops): ${message}`)
      }
    }
  }

  if (errors.length > 0) {
    console.groupCollapsed(`[Sync] ⚠ deleteAll concluído com ${errors.length} erro(s) | ${succeededOps}/${totalOps} ops`)
    for (const e of errors) {
      console.error(`  [${e.resource}] lote ${e.batchIndex}/${e.totalBatches} | HTTP ${String(e.status)} | ${e.count} ops | ${e.message}`)
    }
    console.groupEnd()
  } else {
    console.log(`[Sync] ✓ deleteAll completo — ${succeededOps}/${totalOps} ops`)
  }

  return { totalOps, succeededOps, errors }
}

// ── Push ──────────────────────────────────────────────────────────────────────

/**
 * Envia todo o store para a API via /sync/batch (upsert de todas as entidades).
 * Nunca lança — coleta erros por lote e retorna relatório completo.
 * Continua sincronizando os recursos seguintes mesmo quando um lote falha.
 */
const PUSH_RESOURCE_LABELS: Record<string, string> = {
  projects: 'Projetos',
  habits: 'Hábitos',
  calendar_events: 'Eventos de calendário',
  finance_bills: 'Contas',
  finance_incomes: 'Rendas',
  finance_savings_goals: 'Metas de economia',
  playbooks: 'Playbooks',
  study_goals: 'Metas de estudo',
  study_media_items: 'Mídias de estudo',
  crm_contacts: 'Contatos CRM',
  note_folders: 'Pastas de notas',
  notes: 'Notas',
  cards: 'Cards',
  habit_entries: 'Registros de hábitos',
  finance_expenses: 'Despesas',
}

export async function pushAllToApi(
  store: Store,
  noteContents?: Map<string, string>,
  onProgress?: (p: PushProgress) => void,
): Promise<SyncReport> {
  const clientTime = now()
  const safeStore = store as Partial<Store>
  const safeStudy = (safeStore.study ?? {}) as Partial<Store['study']>

  const cards = arr<Card>(safeStore.cards)
  const notes = arr<Note>(safeStore.notes)
  const noteFolders = arr<NoteFolder>(safeStore.noteFolders)
  const calendarEvents = arr<CalendarEvent>(safeStore.calendarEvents)
  const projects = arr<Project>(safeStore.projects)
  const habits = arr<Habit>(safeStore.habits)
  const habitEntries = arr<HabitEntry>(safeStore.habitEntries)
  const crmContacts = arr<CRMContact>(safeStore.crmContacts)
  const bills = arr<Bill>(safeStore.bills)
  const expenses = arr<Expense>(safeStore.expenses)
  const incomes = arr<IncomeEntry>(safeStore.incomes)
  const savingsGoals = arr<SavingsGoal>(safeStore.savingsGoals)
  const playbooks = arr<Playbook>(safeStore.playbooks)
  const studyGoals = arr<StudyGoal>(safeStudy.goals)
  const studyMediaItems = arr<StudyMediaItem>(safeStudy.mediaItems)

  function makeOps(resource: string, items: Array<{ id: string }>, toApi: (item: never) => Payload): SyncOperation[] {
    return items.map(item => ({
      resource,
      operation: 'upsert' as const,
      id: item.id,
      payload: toApi(item as never),
      client_updated_at: clientTime,
    }))
  }

  // ── Grupos de operações em ordem de dependência (FK) ──────────────────────
  // Cada grupo é enviado sequencialmente — falha de um não para o seguinte.
  const resourceGroups: Array<{ label: string; ops: SyncOperation[] }> = []

  function addGroup(label: string, ops: SyncOperation[]) {
    if (ops.length > 0) resourceGroups.push({ label, ops })
  }

  // 1. Entidades independentes
  addGroup('projects',              makeOps('projects',              projects,       projectToApi as (i: never) => Payload))
  addGroup('habits',                makeOps('habits',                habits,         habitToApi as (i: never) => Payload))
  addGroup('calendar_events',       makeOps('calendar_events',       calendarEvents, calendarEventToApi as (i: never) => Payload))
  addGroup('finance_bills',         makeOps('finance_bills',         bills,          billToApi as (i: never) => Payload))
  addGroup('finance_incomes',       makeOps('finance_incomes',       incomes,        incomeToApi as (i: never) => Payload))
  addGroup('finance_savings_goals', makeOps('finance_savings_goals', savingsGoals,   savingsGoalToApi as (i: never) => Payload))
  addGroup('playbooks',             makeOps('playbooks',             playbooks,      playbookToApi as (i: never) => Payload))
  addGroup('study_goals',           makeOps('study_goals',           studyGoals,     studyGoalToApi as (i: never) => Payload))
  addGroup('study_media_items',     makeOps('study_media_items',     studyMediaItems,studyMediaItemToApi as (i: never) => Payload))
  addGroup('crm_contacts',          makeOps('crm_contacts',          crmContacts,    crmContactToApi as (i: never) => Payload))

  // 2. note_folders: enviadas nível por nível (raízes → filhos → netos…)
  //    A API não garante ordem interna do batch, então cada nível vira um grupo separado.
  //    parent_id é nulificado se o pai não existe no store local (pasta órfã).
  {
    const knownFolderIds = new Set(noteFolders.map(f => f.id))
    const safeItems = noteFolders.map(f => ({
      ...f,
      parentId: f.parentId && knownFolderIds.has(f.parentId) ? f.parentId : null,
    }))
    const placed = new Set<string>()
    let level = safeItems.filter(f => !f.parentId)
    let depth = 0
    while (level.length > 0) {
      addGroup(`note_folders`, level.map(f => ({
        resource: 'note_folders', operation: 'upsert' as const,
        id: f.id, payload: noteFolderToApi(f), client_updated_at: clientTime,
      })))
      level.forEach(f => placed.add(f.id))
      level = safeItems.filter(f => !placed.has(f.id) && !!f.parentId && placed.has(f.parentId!))
      depth++
      if (depth > 50) break // proteção contra ciclo inesperado
    }
    // Órfãs remanescentes (parentId != null mas pai nunca colocado)
    const orphans = safeItems.filter(f => !placed.has(f.id))
    if (orphans.length > 0) {
      addGroup('note_folders', orphans.map(f => ({
        resource: 'note_folders', operation: 'upsert' as const,
        id: f.id, payload: noteFolderToApi({ ...f, parentId: null }), client_updated_at: clientTime,
      })))
    }
  }

  // 3. notes: depende de note_folders + projects
  addGroup('notes', notes.map(n => ({
    resource: 'notes', operation: 'upsert' as const,
    id: n.id, payload: noteToApi(n, noteContents?.get(n.id) ?? ''), client_updated_at: clientTime,
  })))

  // 4. cards: depende de projects
  addGroup('cards', makeOps('cards', cards, cardToApi as (i: never) => Payload))

  // 5. habit_entries: depende de habits
  addGroup('habit_entries', makeOps('habit_entries', habitEntries, habitEntryToApi as (i: never) => Payload))

  // 6. expenses: toposort garante parcela-pai antes de filhos
  addGroup('finance_expenses', toposort(expenses).map(e => ({
    resource: 'finance_expenses', operation: 'upsert' as const,
    id: e.id, payload: expenseToApi(e), client_updated_at: clientTime,
  })))

  const totalOps = resourceGroups.reduce((sum, g) => sum + g.ops.length, 0)
  let succeededOps = 0
  const errors: SyncGroupError[] = []

  console.log(`[Sync] push — ${totalOps} ops em ${resourceGroups.length} grupo(s)`)

  for (let gi = 0; gi < resourceGroups.length; gi++) {
    const group = resourceGroups[gi]
    const { label, ops } = group
    onProgress?.({
      resource: label,
      label: PUSH_RESOURCE_LABELS[label] ?? label,
      count: ops.length,
      groupIndex: gi + 1,
      totalGroups: resourceGroups.length,
    })
    const totalBatches = Math.ceil(ops.length / BATCH_SIZE)

    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE)
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1

      try {
        const response = await organonApi.sync.batch(batch)
        const failedResults = response.data.results.filter(result => result.status !== 'ok')
        succeededOps += batch.length - failedResults.length

        if (failedResults.length > 0) {
          const message = failedResults.map(result => `${result.id}:${result.status}`).join(', ')
          errors.push({ resource: label, batchIndex, totalBatches, count: failedResults.length, status: 'partial_failure', message })
          console.error(`[Sync][${label}] lote ${batchIndex}/${totalBatches} PARCIAL (${failedResults.length}/${batch.length} com problema): ${message}`)
          continue
        }

        console.log(`[Sync][${label}] lote ${batchIndex}/${totalBatches} OK (${batch.length} ops)`)
      } catch (err) {
        const e = err as { status?: number; message?: string; body?: { error?: { message?: string } } }
        const status = e.status ?? 'desconhecido'
        const message = e.body?.error?.message ?? e.message ?? String(err)
        errors.push({ resource: label, batchIndex, totalBatches, count: batch.length, status, message })
        console.error(`[Sync][${label}] lote ${batchIndex}/${totalBatches} ERRO (HTTP ${String(status)}, ${batch.length} ops): ${message}`)
      }
    }
  }

  // Relatório final no console
  if (errors.length > 0) {
    console.groupCollapsed(`[Sync] ⚠ Concluído com ${errors.length} erro(s) | ${succeededOps}/${totalOps} ops enviadas`)
    for (const e of errors) {
      console.error(`  [${e.resource}] lote ${e.batchIndex}/${e.totalBatches} | HTTP ${String(e.status)} | ${e.count} ops | ${e.message}`)
    }
    console.groupEnd()
  } else {
    console.log(`[Sync] ✓ Push completo — ${succeededOps}/${totalOps} ops enviadas`)
  }

  return { totalOps, succeededOps, errors }
}

// ── Pull ──────────────────────────────────────────────────────────────────────

/**
 * Baixa todas as mudanças desde `since` (ou desde 2020 se null).
 * Retorna store parcial com as entidades sincronizadas + conteúdo das notas.
 */
export async function pullFromApi(since?: string): Promise<PullResult> {
  const sinceDate = since ?? PULL_SINCE_FALLBACK

  const store: PartialSyncedStore = {
    cards: [], notes: [], noteFolders: [], calendarEvents: [],
    projects: [], habits: [], habitEntries: [], crmContacts: [],
    bills: [], expenses: [], incomes: [], savingsGoals: [],
    playbooks: [], studyGoals: [], studyMediaItems: [],
  }
  const noteContents = new Map<string, string>()
  let serverTime = now()
  let cursor: string | undefined

  do {
    const res = await organonApi.sync.changes(sinceDate, cursor)
    serverTime = res.data.serverTime
    cursor = res.data.nextCursor ?? undefined

    for (const change of res.data.changes) {
      applyChange(store, noteContents, change)
    }
  } while (cursor)

  return { store, noteContents, serverTime }
}

/**
 * Verifica se há mudanças no servidor desde `lastSyncAt`.
 * Retorna true se houver ao menos 1 mudança.
 */
export async function hasRemoteChanges(lastSyncAt?: string): Promise<boolean> {
  if (!lastSyncAt) return true // primeira sync: sempre pull
  try {
    const res = await organonApi.sync.changes(lastSyncAt, undefined, 1)
    return res.data.changes.length > 0
  } catch (err) {
    console.warn('[Sync] hasRemoteChanges falhou:', err)
    return false
  }
}
