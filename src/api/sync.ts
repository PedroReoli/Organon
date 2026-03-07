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
  /** noteId → content_markdown (para escrever em disco no desktop) */
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

// ── toApi: local → payload ────────────────────────────────────────────────────

function cardToApi(c: Card): Payload {
  return {
    title: c.title,
    description_html: c.descriptionHtml ?? '',
    location_day: c.location?.day ?? null,
    location_period: c.location?.period ?? null,
    sort_order: c.order ?? 0,
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

function noteToApi(note: Note, contentMarkdown: string): Payload {
  return {
    id: note.id,
    title: note.title,
    content_markdown: contentMarkdown ?? '',
    content_html: '',
    folder_id: note.folderId ?? null,
    project_id: note.projectId ?? null,
    sort_order: note.order ?? 0,
    updated_at: note.updatedAt,
  }
}

function noteFolderToApi(f: NoteFolder): Payload {
  return {
    name: f.name,
    parent_id: f.parentId ?? null,
    sort_order: f.order ?? 0,
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
    sort_order: p.order ?? 0,
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
    sort_order: h.order ?? 0,
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
    sort_order: c.order ?? 0,
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
  // local title → API name | local sector → API description | dialogs não vão no batch
  return {
    name: p.title,
    description: p.sector ?? '',
    content: p.content ?? '',
    summary: p.summary ?? '',
    sort_order: p.order ?? 0,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

function studyGoalToApi(g: StudyGoal): Payload {
  return {
    title: g.title,
    description: g.description ?? '',
    priority: g.priority ?? null,
    status: g.status ?? 'todo',
    checklist: g.checklist ?? [],
    linked_planning_card_id: g.linkedPlanningCardId ?? null,
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  }
}

function studyMediaItemToApi(m: StudyMediaItem): Payload {
  // local kind → API type
  return {
    title: m.title,
    url: m.url ?? '',
    type: m.kind,
    youtube_video_id: m.youtubeVideoId ?? null,
    volume: m.volume ?? 1,
    loop: m.loop ?? false,
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
    description: s(p.description),
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
      // Fonte de verdade do conteúdo de nota na API: content_markdown.
      const markdown = s(p.content_markdown)
      result.notes.push(noteFromApi(id, p))
      noteContents.set(id, markdown)
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

// ── Push ──────────────────────────────────────────────────────────────────────

/** Envia todo o store para a API via /sync/batch (upsert de todas as entidades). */
export async function pushAllToApi(
  store: Store,
  noteContents?: Map<string, string>,
): Promise<void> {
  const clientTime = now()
  const ops: SyncOperation[] = []
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

  function upsert(resource: string, id: string, payload: Payload) {
    ops.push({ resource, operation: 'upsert', id, payload, client_updated_at: clientTime })
  }

  for (const c of cards)            upsert('cards', c.id, cardToApi(c))
  for (const n of notes)            upsert('notes', n.id, noteToApi(n, noteContents?.get(n.id) ?? ''))
  for (const f of noteFolders)      upsert('note_folders', f.id, noteFolderToApi(f))
  for (const e of calendarEvents)   upsert('calendar_events', e.id, calendarEventToApi(e))
  for (const p of projects)         upsert('projects', p.id, projectToApi(p))
  for (const h of habits)           upsert('habits', h.id, habitToApi(h))
  for (const e of habitEntries)     upsert('habit_entries', e.id, habitEntryToApi(e))
  for (const c of crmContacts)      upsert('crm_contacts', c.id, crmContactToApi(c))
  for (const b of bills)            upsert('finance_bills', b.id, billToApi(b))
  for (const e of expenses)         upsert('finance_expenses', e.id, expenseToApi(e))
  for (const i of incomes)          upsert('finance_incomes', i.id, incomeToApi(i))
  for (const g of savingsGoals)     upsert('finance_savings_goals', g.id, savingsGoalToApi(g))
  for (const p of playbooks)        upsert('playbooks', p.id, playbookToApi(p))
  for (const g of studyGoals)       upsert('study_goals', g.id, studyGoalToApi(g))
  for (const m of studyMediaItems)  upsert('study_media_items', m.id, studyMediaItemToApi(m))

  // Envia em lotes de BATCH_SIZE
  const totalBatches = Math.ceil(ops.length / BATCH_SIZE)
  console.log(`[Sync] push — ${ops.length} operações em ${totalBatches} lote(s)`)
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const noteOps = batch.filter(op => op.resource === 'notes')
    if (noteOps.length > 0) {
      const noteFields = Array.from(new Set(
        noteOps.flatMap(op => Object.keys((op.payload ?? {}) as Payload)),
      )).sort()
      console.log(
        `[Sync][notes] lote ${batchIndex}/${totalBatches} enviando ${noteOps.length} operação(ões) | campos: ${noteFields.join(', ')}`,
      )
    }
    try {
      const res = await organonApi.sync.batch(batch)
      console.log(`[Sync] lote ${batchIndex}/${totalBatches} OK`)
      if (noteOps.length > 0) {
        console.log(`[Sync][notes] lote ${batchIndex}/${totalBatches} HTTP ${res.status} OK`)
      }
    } catch (err) {
      const status = (err as { status?: number }).status ?? 'desconhecido'
      if (noteOps.length > 0) {
        console.error(`[Sync][notes] lote ${batchIndex}/${totalBatches} HTTP ${status} ERRO`)
      }
      console.error(`[Sync] lote ${batchIndex}/${totalBatches} ERRO:`, err)
      throw err
    }
  }
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
