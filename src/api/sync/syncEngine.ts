import { organonApi, SyncOperation } from '../organon'
import type {
  Store,
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
  ColorPalette,
  FinancialConfig,
  BudgetCategory,
  ShortcutFolder,
  ShortcutItem,
  SprintCard,
  SprintColumnSection,
  AgendaCategory,
} from '../../renderer/types'
import {
  BATCH_SIZE,
  PULL_SINCE_FALLBACK,
  PUSH_RESOURCE_LABELS,
  PartialSyncedStore,
  PullResult,
  Payload,
  PushProgress,
  SyncGroupError,
  SyncReport,
  now,
  s,
  arr,
  toposort,
} from './sync.types'
import {
  cardToApi,
  noteToApi,
  noteFolderToApi,
  projectToApi,
  calendarEventToApi,
  billToApi,
  expenseToApi,
  incomeToApi,
  savingsGoalToApi,
  investmentToApi,
  meetingToApi,
  studyGoalToApi,
  studyMediaItemToApi,
  colorPaletteToApi,
  sprintCardToApi,
  sprintColumnSectionToApi,
  calendarCategoryToApi,
} from './toApiMappers'
import {
  applyChange,
  shortcutFolderFromApi,
  shortcutItemFromApi,
} from './fromApiMappers'

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

  const notes        = arr<Note>(safeStore.notes)
  const cards        = arr<Card>(safeStore.cards)
  const studyMedia   = arr<StudyMediaItem>(safeStudy.mediaItems)
  const studyGoals   = arr<StudyGoal>(safeStudy.goals)
  const noteFolders  = arr<NoteFolder>(safeStore.noteFolders)
  const projects     = arr<Project>(safeStore.projects)
  const calendarEvents = arr<CalendarEvent>(safeStore.calendarEvents)
  const bills        = arr<Bill>(safeStore.bills)
  const incomes      = arr<IncomeEntry>(safeStore.incomes)
  const savingsGoals = arr<SavingsGoal>(safeStore.savingsGoals)
  const investments  = arr<Investment>(safeStore.investments)
  const expenses     = arr<Expense>(safeStore.expenses)
  const colorPalettesD = arr<ColorPalette>(safeStore.colorPalettes)

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
  addGroup('finance_expenses',     expensesSorted.map(e => e.id))
  addGroup('notes',                notes.map(n => n.id))
  addGroup('cards',                cards.map(c => c.id))
  addGroup('study_media_items',    studyMedia.map(m => m.id))
  addGroup('study_goals',          studyGoals.map(g => g.id))
  // note_folders: folhas → raízes (reverso do push)
  for (let i = noteFolderLevels.length - 1; i >= 0; i--) {
    const ids = noteFolderLevels[i].map(f => f.id)
    if (ids.length > 0) resourceGroups.push({ label: 'note_folders', ops: makeDeleteOps('note_folders', ids) })
  }
  addGroup('projects',             projects.map(p => p.id))
  addGroup('calendar_events',      calendarEvents.map(e => e.id))
  addGroup('finance_bills',        bills.map(b => b.id))
  addGroup('finance_incomes',      incomes.map(i => i.id))
  addGroup('finance_savings_goals', savingsGoals.map(g => g.id))
  addGroup('finance_investments',   investments.map(i => i.id))
  addGroup('meetings',              arr<Meeting>(safeStore.meetings).map(m => m.id))
  addGroup('color_palettes',        colorPalettesD.map(p => p.id))

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
  const bills = arr<Bill>(safeStore.bills)
  const expenses = arr<Expense>(safeStore.expenses)
  const incomes = arr<IncomeEntry>(safeStore.incomes)
  const savingsGoals = arr<SavingsGoal>(safeStore.savingsGoals)
  const investments = arr<Investment>(safeStore.investments)
  const meetings = arr<Meeting>(safeStore.meetings)
  const studyGoals = arr<StudyGoal>(safeStudy.goals)
  const studyMediaItems = arr<StudyMediaItem>(safeStudy.mediaItems)
  const colorPalettes = arr<ColorPalette>(safeStore.colorPalettes)
  const sprintCards = arr<SprintCard>(safeStore.sprintCards)
  const sprintColumnSections = arr<SprintColumnSection>(safeStore.sprintColumnSections)
  const calendarCategories = arr<AgendaCategory>(safeStore.calendarCategories)

  function makeOps(resource: string, items: Array<{ id: string }>, toApi: (item: never) => Payload): SyncOperation[] {
    return items.map(item => ({
      resource,
      operation: 'upsert' as const,
      id: item.id,
      payload: toApi(item as never),
      client_updated_at: clientTime,
    }))
  }

  const resourceGroups: Array<{ label: string; ops: SyncOperation[] }> = []

  function addGroup(label: string, ops: SyncOperation[]) {
    if (ops.length > 0) resourceGroups.push({ label, ops })
  }

  // 0. Delete ops from tombstone list
  {
    const pendingDeletes = arr<{ resource: string; id: string }>(safeStore.pendingDeletes)
    if (pendingDeletes.length > 0) {
      addGroup('__deletes__', pendingDeletes.map(d => ({
        resource: d.resource,
        operation: 'delete' as const,
        id: d.id,
        payload: {},
        client_updated_at: clientTime,
      })))
    }
  }

  // 1. Entidades independentes
  addGroup('projects',              makeOps('projects',              projects,       projectToApi as (i: never) => Payload))
  addGroup('calendar_events',       makeOps('calendar_events',       calendarEvents, calendarEventToApi as (i: never) => Payload))
  addGroup('finance_bills',         makeOps('finance_bills',         bills,          billToApi as (i: never) => Payload))
  addGroup('finance_incomes',       makeOps('finance_incomes',       incomes,        incomeToApi as (i: never) => Payload))
  addGroup('finance_savings_goals', makeOps('finance_savings_goals', savingsGoals,   savingsGoalToApi as (i: never) => Payload))
  addGroup('finance_investments',   makeOps('finance_investments',   investments,    investmentToApi as (i: never) => Payload))
  addGroup('meetings',              makeOps('meetings',              meetings,       meetingToApi as (i: never) => Payload))
  addGroup('study_goals',           makeOps('study_goals',           studyGoals,     studyGoalToApi as (i: never) => Payload))
  addGroup('study_media_items',     makeOps('study_media_items',     studyMediaItems,studyMediaItemToApi as (i: never) => Payload))
  addGroup('color_palettes',        makeOps('color_palettes',        colorPalettes,  colorPaletteToApi as (i: never) => Payload))
  addGroup('sprint_cards',           makeOps('sprint_cards',           sprintCards,          sprintCardToApi as (i: never) => Payload))
  addGroup('sprint_column_sections', makeOps('sprint_column_sections', sprintColumnSections, sprintColumnSectionToApi as (i: never) => Payload))
  addGroup('calendar_categories',    makeOps('calendar_categories',    calendarCategories,   calendarCategoryToApi as (i: never) => Payload))

  // Singletons
  {
    const fc = safeStore.financialConfig as FinancialConfig | undefined
    const budgetCats = arr<BudgetCategory>(safeStore.budgetCategories)
    if (fc) {
      addGroup('finance_config', [{ resource: 'finance_config', operation: 'upsert', id: 'singleton', payload: { monthly_income: fc.monthlyIncome ?? 0, monthly_spending_limit: fc.monthlySpendingLimit ?? 0, budget_categories: budgetCats.map(c => ({ category: c.category, limit: c.limit })) }, client_updated_at: clientTime }])
    }
  }
  {
    const sc = safeStudy
    addGroup('study_config', [{ resource: 'study_config', operation: 'upsert', id: 'singleton', payload: { pomodoro_work_min: sc.focusMinutes ?? 25, pomodoro_break_min: sc.breakMinutes ?? 5, mute_sound: sc.muteSound ?? false, wallpaper_url: sc.wallpaperUrl ?? '' }, client_updated_at: clientTime }])
  }

  // 2. note_folders: enviadas nível por nível
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
      if (depth > 50) break
    }
    const orphans = safeItems.filter(f => !placed.has(f.id))
    if (orphans.length > 0) {
      addGroup('note_folders', orphans.map(f => ({
        resource: 'note_folders', operation: 'upsert' as const,
        id: f.id, payload: noteFolderToApi({ ...f, parentId: null }), client_updated_at: clientTime,
      })))
    }
  }

  // 3. notes: depende de note_folders + projects
  {
    const knownNoteIds = new Set(notes.map(n => n.id))
    const safeNotes = notes.map(n => ({
      ...n,
      parentNoteId: n.parentNoteId && knownNoteIds.has(n.parentNoteId) ? n.parentNoteId : null,
    }))
    const placed = new Set<string>()
    let level = safeNotes.filter(n => !n.parentNoteId)
    let depth = 0
    while (level.length > 0) {
      addGroup('notes', level.map(n => ({
        resource: 'notes', operation: 'upsert' as const,
        id: n.id, payload: noteToApi(n, noteContents?.get(n.id) ?? ''), client_updated_at: clientTime,
      })))
      level.forEach(n => placed.add(n.id))
      level = safeNotes.filter(n => !placed.has(n.id) && !!n.parentNoteId && placed.has(n.parentNoteId!))
      depth++
      if (depth > 50) break
    }
    const orphans = safeNotes.filter(n => !placed.has(n.id))
    if (orphans.length > 0) {
      addGroup('notes', orphans.map(n => ({
        resource: 'notes', operation: 'upsert' as const,
        id: n.id, payload: noteToApi({ ...n, parentNoteId: null }, noteContents?.get(n.id) ?? ''), client_updated_at: clientTime,
      })))
    }
  }

  // 4. cards
  addGroup('cards', makeOps('cards', cards, cardToApi as (i: never) => Payload))

  // 5. expenses
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
        const failedResults = response.data.results.filter(result => result.status !== 'ok' && result.status !== 'deleted' && result.status !== 'conflict' && result.status !== 'skipped')
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

  // Sync shortcuts via endpoints individuais
  {
    const localFolders = arr<ShortcutFolder>(safeStore.shortcutFolders)
    const localItems   = arr<ShortcutItem>(safeStore.shortcuts)

    if (localFolders.length > 0 || localItems.length > 0) {
      try {
        const [serverFoldersRes, serverItemsRes] = await Promise.all([
          organonApi.shortcuts.folders.list(),
          organonApi.shortcuts.list(),
        ])
        const serverFolderIds  = new Set(arr<Payload>(serverFoldersRes.data).map(f => s(f.id)))
        const serverItemIds    = new Set(arr<Payload>(serverItemsRes.data).map(sc => s(sc.id)))
        const localFolderIds   = new Set(localFolders.map(f => f.id))
        const localItemIds     = new Set(localItems.map(sc => sc.id))

        // Push folders
        const knownFolderIds = new Set(localFolders.map(f => f.id))
        const safeFolders    = localFolders.map(f => ({
          ...f,
          parentId: f.parentId && knownFolderIds.has(f.parentId) ? f.parentId : null,
        }))
        const placedFolderIds = new Set<string>()
        let folderLevel = safeFolders.filter(f => !f.parentId)
        let folderDepth = 0
        while (folderLevel.length > 0 && folderDepth < 50) {
          await Promise.all(folderLevel.map(async f => {
            const body = { name: f.name, parent_id: f.parentId ?? null, sort_order: f.order }
            try {
              if (serverFolderIds.has(f.id)) {
                await organonApi.shortcuts.folders.update(f.id, body)
              } else {
                await organonApi.shortcuts.folders.create(body)
              }
            } catch (e) { console.warn(`[Sync] shortcut folder ${f.id}:`, e) }
            placedFolderIds.add(f.id)
          }))
          folderLevel = safeFolders.filter(f =>
            !placedFolderIds.has(f.id) && !!f.parentId && placedFolderIds.has(f.parentId!)
          )
          folderDepth++
        }
        const orphanFolders = safeFolders.filter(f => !placedFolderIds.has(f.id))
        await Promise.all(orphanFolders.map(async f => {
          const body = { name: f.name, parent_id: null, sort_order: f.order }
          try {
            if (serverFolderIds.has(f.id)) {
              await organonApi.shortcuts.folders.update(f.id, body)
            } else {
              await organonApi.shortcuts.folders.create(body)
            }
          } catch (e) { console.warn(`[Sync] shortcut folder orphan ${f.id}:`, e) }
        }))

        // Deletar do servidor pastas que não existem mais localmente
        await Promise.all(
          [...serverFolderIds]
            .filter(id => !localFolderIds.has(id))
            .map(id => organonApi.shortcuts.folders.delete(id).catch(e => console.warn(`[Sync] delete folder ${id}:`, e)))
        )

        // Push shortcut items
        await Promise.all(localItems.map(async sc => {
          const body: Record<string, unknown> = {
            title: sc.title,
            kind: sc.kind,
            value: sc.value,
            folder_id: sc.folderId ?? null,
            icon: sc.icon ?? null,
            sort_order: sc.order,
          }
          try {
            if (serverItemIds.has(sc.id)) {
              await organonApi.shortcuts.update(sc.id, body)
            } else {
              await organonApi.shortcuts.create(body)
            }
          } catch (e) { console.warn(`[Sync] shortcut item ${sc.id}:`, e) }
        }))

        // Deletar do servidor atalhos que não existem mais localmente
        await Promise.all(
          [...serverItemIds]
            .filter(id => !localItemIds.has(id))
            .map(id => organonApi.shortcuts.delete(id).catch(e => console.warn(`[Sync] delete shortcut ${id}:`, e)))
        )

        console.log(`[Sync] ✓ Atalhos sincronizados — ${localFolders.length} pastas, ${localItems.length} itens`)
      } catch (err) {
        console.warn('[Sync] pushAllToApi: falha ao sincronizar atalhos:', err)
      }
    }
  }

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

export async function pullFromApi(since?: string): Promise<PullResult> {
  const sinceDate = since ?? PULL_SINCE_FALLBACK

  const store: PartialSyncedStore = {
    cards: [], notes: [], noteFolders: [], calendarEvents: [],
    projects: [],
    bills: [], expenses: [], incomes: [], savingsGoals: [], investments: [], meetings: [],
    studyGoals: [], studyMediaItems: [],
    financeConfig: null, financeConfigBudgetCategories: null, studyConfig: null,
    colorPalettes: [],
    shortcutFolders: [], shortcuts: [],
    sprintCards: [], sprintColumnSections: [], calendarCategories: [],
  }
  const noteContents = new Map<string, string>()
  const deletedIds = new Map<string, string[]>()
  let serverTime = now()
  let cursor: string | undefined

  do {
    const res = await organonApi.sync.changes(sinceDate, cursor)
    serverTime = res.data.serverTime
    cursor = res.data.nextCursor ?? undefined

    for (const change of res.data.changes) {
      applyChange(store, noteContents, deletedIds, change)
    }
  } while (cursor)

  try {
    const [foldersRes, itemsRes] = await Promise.all([
      organonApi.shortcuts.folders.list(),
      organonApi.shortcuts.list(),
    ])
    store.shortcutFolders = arr<Payload>(foldersRes.data).map(f => shortcutFolderFromApi(s(f.id), f))
    store.shortcuts       = arr<Payload>(itemsRes.data).map(sc => shortcutItemFromApi(s(sc.id), sc))
  } catch (err) {
    console.warn('[Sync] pullFromApi: falha ao buscar atalhos:', err)
  }

  return { store, noteContents, serverTime, deletedIds }
}

export async function hasRemoteChanges(lastSyncAt?: string): Promise<boolean> {
  if (!lastSyncAt) return true
  try {
    const res = await organonApi.sync.changes(lastSyncAt, undefined, 1)
    return res.data.changes.length > 0
  } catch (err) {
    console.warn('[Sync] hasRemoteChanges falhou:', err)
    return false
  }
}
