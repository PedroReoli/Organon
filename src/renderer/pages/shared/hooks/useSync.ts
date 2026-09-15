import { useCallback, useEffect, useRef, useState } from 'react'
import { pushAllToApi, hasRemoteChanges, pullFromApi } from '../../../../api/sync'
import { isElectron } from '@utils'
import type { Store as AppStore, Settings, SyncErrorLog } from '@types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

interface UseSyncParams {
  isConfigured: boolean
  userLoggedIn: boolean
  isLoading: boolean
  settings: Settings
  storeVersion: number
  replaceStore: (store: AppStore) => void
  /**
   * Upgrade 02: quando WS realtime esta conectado, polling pode ser
   * mais espacado (push cobre o caminho rapido). Default: false (10s).
   * Quando true: 120s.
   */
  realtimeConnected?: boolean
}

interface UseSyncReturn {
  syncStatus: SyncStatus
  syncError: string | null
  isSyncing: boolean
  showLoginSync: boolean
  setShowLoginSync: (v: boolean) => void
  runSyncNow: () => Promise<void>
  resetStartupCheck: () => void
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[], tombstoneIds?: Set<string>): T[] {
  if (remote.length === 0) return local
  const map = new Map<string, T>(local.map(e => [e.id, e]))
  for (const r of remote) {
    if (tombstoneIds?.has(r.id)) continue  // skip items deleted locally
    const existing = map.get(r.id)
    // Manter o item mais recente por updatedAt; se nao houver timestamp, remoto vence
    if (!existing || !existing.updatedAt || !r.updatedAt || r.updatedAt >= existing.updatedAt) {
      map.set(r.id, r)
    }
  }
  return Array.from(map.values())
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSync({
  isConfigured,
  userLoggedIn,
  isLoading,
  settings,
  storeVersion,
  replaceStore,
  realtimeConnected = false,
}: UseSyncParams): UseSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showLoginSync, setShowLoginSync] = useState(false)
  const [storageReady, setStorageReady] = useState(!isElectron())

  useEffect(() => {
    if (!isElectron()) return
    let cancelled = false
    window.electronAPI.getInstallerStatus()
      .then(status => { if (!cancelled) setStorageReady(status.completed) })
      .catch(() => { if (!cancelled) setStorageReady(false) })
    return () => { cancelled = true }
  }, [])

  // Hidratar erro persistido ao montar (mostra na UI logo ao abrir o app)
  useEffect(() => {
    if (!isElectron()) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await window.electronAPI.loadStore()
        if (cancelled) return
        if (s.lastSyncError) {
          setSyncError(s.lastSyncError.rawText)
          setSyncStatus('error')
        }
      } catch { /* silencioso: hidratacao best-effort */ }
    })()
    return () => { cancelled = true }
  }, [])

  const autoSyncTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWatchdogRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startupCheckedRef   = useRef(false)
  const syncInFlightRef     = useRef(false)
  const syncQueuedRef       = useRef(false)
  const justSyncedRef          = useRef(false)
  // Always-fresh ref so runSyncNow (stable callback) can read current settings
  const settingsRef         = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])
  // Rastreia versao do store para detectar mudancas durante sync
  const storeVersionRef     = useRef(storeVersion)
  useEffect(() => { storeVersionRef.current = storeVersion }, [storeVersion])

  const resetStartupCheck = useCallback(() => {
    startupCheckedRef.current = false
  }, [])

  // ── runSyncNow ──────────────────────────────────────────────────────────────

  const runSyncNow = useCallback(async () => {
    if (!storageReady || !isConfigured || !userLoggedIn || !isElectron()) return
    if (syncInFlightRef.current) {
      syncQueuedRef.current = true
      return
    }
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }

    if (pendingWatchdogRef.current) {
      clearTimeout(pendingWatchdogRef.current)
      pendingWatchdogRef.current = null
    }

    syncInFlightRef.current = true
    const versionAtStart = storeVersionRef.current
    setSyncStatus('syncing')
    setSyncError(null)

    try {
      const rawStore = await window.electronAPI.loadStore()

      const noteContents = new Map<string, string>()
      await Promise.all(rawStore.notes.map(async (note) => {
        try {
          const content = await window.electronAPI.readNote(note.mdPath)
          noteContents.set(note.id, content ?? '')
        } catch { /* ignora erros individuais */ }
      }))

      const report = await pushAllToApi(rawStore, noteContents)

      // Recursos cujo push falhou — preservar dados locais no merge (evita perda)
      const pushFailedResources = new Set(report.errors.map(e => e.resource))

      const { store: pulled, noteContents: pulledContents, serverTime, deletedIds } =
        await pullFromApi(rawStore.lastSyncAt)

      await Promise.all(
        pulled.notes.map(async (note) => {
          const content = pulledContents.get(note.id) ?? ''
          if (content.trim()) {
            await window.electronAPI
              .writeNote((note as { mdPath?: string }).mdPath ?? `notes/${note.id}.md`, content)
              .catch((e: unknown) => console.warn('[Sync] writeNote (pull) falhou:', e))
          }
        })
      )

      const localNoteMap = new Map(rawStore.notes.map(n => [n.id, n]))
      const s = settingsRef.current
      const pendingDeletes = rawStore.pendingDeletes ?? []
      const deletedNoteIds = new Set([
        ...pendingDeletes.filter(d => d.resource === 'notes').map(d => d.id),
        ...(deletedIds.get('notes') ?? []),
      ])
      const deletedFolderIds = new Set([
        ...pendingDeletes.filter(d => d.resource === 'note_folders').map(d => d.id),
        ...(deletedIds.get('note_folders') ?? []),
      ])

      // IDs excluídos remotamente por recurso (para filtrar o store local antes do merge)
      const remoteDelCards         = new Set(deletedIds.get('cards') ?? [])
      const remoteDelProjects      = new Set(deletedIds.get('projects') ?? [])
      const remoteDelEvents        = new Set(deletedIds.get('calendar_events') ?? [])
      const remoteDelHabits        = new Set(deletedIds.get('habits') ?? [])
      const remoteDelHabitEntries  = new Set(deletedIds.get('habit_entries') ?? [])
      const remoteDelCrm           = new Set(deletedIds.get('crm_contacts') ?? [])
      const remoteDelCrmTags       = new Set(deletedIds.get('crm_tags') ?? [])
      const remoteDelCrmInter      = new Set(deletedIds.get('crm_interactions') ?? [])
      const remoteDelBills         = new Set(deletedIds.get('finance_bills') ?? [])
      const remoteDelExpenses      = new Set(deletedIds.get('finance_expenses') ?? [])
      const remoteDelIncomes       = new Set(deletedIds.get('finance_incomes') ?? [])
      const remoteDelSavings       = new Set(deletedIds.get('finance_savings_goals') ?? [])
      const remoteDelInvestments   = new Set(deletedIds.get('finance_investments') ?? [])
      const remoteDelPlaybooks     = new Set(deletedIds.get('playbooks') ?? [])
      const remoteDelMeetings      = new Set(deletedIds.get('meetings') ?? [])
      const remoteDelStudyGoals    = new Set(deletedIds.get('study_goals') ?? [])
      const remoteDelStudyMedia    = new Set(deletedIds.get('study_media_items') ?? [])
      const remoteDelColorPalettes = new Set(deletedIds.get('color_palettes') ?? [])
      const remoteDelSprintCards   = new Set(deletedIds.get('sprint_cards') ?? [])
      const remoteDelSprintSections = new Set(deletedIds.get('sprint_column_sections') ?? [])
      const remoteDelCalendarCats  = new Set(deletedIds.get('calendar_categories') ?? [])

      // Tombstones locais para eventos de calendário (previne restauração por pull antes do push das deleções)
      const deletedEventIds = new Set([
        ...pendingDeletes.filter(d => d.resource === 'calendar_events').map(d => d.id),
        ...remoteDelEvents,
      ])

      // Preservar pendingDeletes cujo grupo de delete falhou no push
      const deleteGroupFailed = report.errors.some(e => e.resource === '__deletes__')
      const nextPendingDeletes = deleteGroupFailed ? pendingDeletes : []

      // Se o push de um recurso falhou, manter dados locais (evita perder itens nao enviados)
      const pf = pushFailedResources

      const merged: AppStore = {
        ...rawStore,
        settings: s,
        pendingDeletes: nextPendingDeletes,
        cards:          pf.has('cards') ? rawStore.cards : mergeById(rawStore.cards.filter(c => !remoteDelCards.has(c.id)), pulled.cards),
        notes:          (mergeById(rawStore.notes.filter(n => !deletedNoteIds.has(n.id)), pulled.notes, deletedNoteIds).map(note => {
          const local = localNoteMap.get(note.id)
          return { ...note, mdPath: local?.mdPath ?? (note as { mdPath?: string }).mdPath }
        }) as AppStore['notes']),
        noteFolders:    mergeById(rawStore.noteFolders.filter(f => !deletedFolderIds.has(f.id)), pulled.noteFolders, deletedFolderIds),
        calendarEvents: pf.has('calendar_events') ? rawStore.calendarEvents : mergeById(rawStore.calendarEvents.filter(e => !deletedEventIds.has(e.id)), pulled.calendarEvents, deletedEventIds),
        projects:       pf.has('projects') ? rawStore.projects : mergeById(rawStore.projects.filter(p => !remoteDelProjects.has(p.id)), pulled.projects),
        habits:         pf.has('habits') ? rawStore.habits : mergeById(rawStore.habits.filter(h => !remoteDelHabits.has(h.id)), pulled.habits),
        habitEntries:   pf.has('habit_entries') ? rawStore.habitEntries : mergeById(rawStore.habitEntries.filter(e => !remoteDelHabitEntries.has(e.id) && !remoteDelHabits.has(e.habitId)), pulled.habitEntries),
        crmContacts:    pf.has('crm_contacts') ? rawStore.crmContacts : mergeById(rawStore.crmContacts.filter(c => !remoteDelCrm.has(c.id)), pulled.crmContacts),
        crmTags:        mergeById((rawStore.crmTags ?? []).filter(t => !remoteDelCrmTags.has(t.id)), pulled.crmTags),
        crmInteractions: mergeById((rawStore.crmInteractions ?? []).filter(i => !remoteDelCrmInter.has(i.id)), pulled.crmInteractions),
        bills:          pf.has('finance_bills') ? rawStore.bills : mergeById(rawStore.bills.filter(b => !remoteDelBills.has(b.id)), pulled.bills),
        expenses:       pf.has('finance_expenses') ? rawStore.expenses : mergeById(rawStore.expenses.filter(e => !remoteDelExpenses.has(e.id)), pulled.expenses),
        incomes:        pf.has('finance_incomes') ? rawStore.incomes : mergeById(rawStore.incomes.filter(i => !remoteDelIncomes.has(i.id)), pulled.incomes),
        savingsGoals:   mergeById(rawStore.savingsGoals.filter(g => !remoteDelSavings.has(g.id)), pulled.savingsGoals),
        investments:    mergeById((rawStore.investments ?? []).filter(i => !remoteDelInvestments.has(i.id)), pulled.investments),
        meetings:       mergeById((rawStore.meetings ?? []).filter(m => !remoteDelMeetings.has(m.id)), pulled.meetings),
        playbooks:      pf.has('playbooks') ? rawStore.playbooks : mergeById(rawStore.playbooks.filter(p => !remoteDelPlaybooks.has(p.id)), pulled.playbooks),
        colorPalettes:  mergeById((rawStore.colorPalettes ?? []).filter(p => !remoteDelColorPalettes.has(p.id)), pulled.colorPalettes),
        sprintCards:          pf.has('sprint_cards') ? (rawStore.sprintCards ?? []) : mergeById((rawStore.sprintCards ?? []).filter(c => !remoteDelSprintCards.has(c.id)), pulled.sprintCards),
        sprintColumnSections: pf.has('sprint_column_sections') ? (rawStore.sprintColumnSections ?? []) : mergeById((rawStore.sprintColumnSections ?? []).filter(s => !remoteDelSprintSections.has(s.id)), pulled.sprintColumnSections),
        calendarCategories:   mergeById((rawStore.calendarCategories ?? []).filter(c => !remoteDelCalendarCats.has(c.id)), pulled.calendarCategories),
        financialConfig: pulled.financeConfig ?? rawStore.financialConfig,
        budgetCategories: pulled.financeConfigBudgetCategories ?? rawStore.budgetCategories,
        shortcutFolders: pulled.shortcutFolders.length > 0 ? pulled.shortcutFolders : (rawStore.shortcutFolders ?? []),
        shortcuts:       pulled.shortcuts.length > 0 ? pulled.shortcuts : (rawStore.shortcuts ?? []),
        study: {
          ...rawStore.study,
          ...(pulled.studyConfig ?? {}),
          goals:      mergeById((rawStore.study?.goals ?? []).filter(g => !remoteDelStudyGoals.has(g.id)), pulled.studyGoals),
          mediaItems: mergeById((rawStore.study?.mediaItems ?? []).filter(m => !remoteDelStudyMedia.has(m.id)), pulled.studyMediaItems),
        },
        lastSyncAt: serverTime,
      }

      // Se o store mudou durante o sync (o usuario editou enquanto rodava push/pull),
      // recarregar do disco ANTES de salvar o merged, senao o saveStore sobrescreve
      // as edicoes locais pendentes do debounce do useStore.
      let finalStore: AppStore = merged
      if (storeVersionRef.current !== versionAtStart) {
        const freshStore = await window.electronAPI.loadStore()
        finalStore = {
          ...merged,
          cards:          mergeById(freshStore.cards, merged.cards),
          notes:          mergeById(freshStore.notes, merged.notes) as AppStore['notes'],
          noteFolders:    mergeById(freshStore.noteFolders, merged.noteFolders),
          calendarEvents: mergeById(freshStore.calendarEvents, merged.calendarEvents),
          projects:       mergeById(freshStore.projects, merged.projects),
          habits:         mergeById(freshStore.habits, merged.habits),
          habitEntries:   mergeById(freshStore.habitEntries, merged.habitEntries),
          crmContacts:    mergeById(freshStore.crmContacts, merged.crmContacts),
          crmTags:        mergeById(freshStore.crmTags ?? [], merged.crmTags ?? []),
          crmInteractions: mergeById(freshStore.crmInteractions ?? [], merged.crmInteractions ?? []),
          bills:          mergeById(freshStore.bills, merged.bills),
          expenses:       mergeById(freshStore.expenses, merged.expenses),
          incomes:        mergeById(freshStore.incomes, merged.incomes),
          savingsGoals:   mergeById(freshStore.savingsGoals, merged.savingsGoals),
          investments:    mergeById(freshStore.investments ?? [], merged.investments ?? []),
          playbooks:      mergeById(freshStore.playbooks, merged.playbooks),
          sprintCards:          mergeById(freshStore.sprintCards ?? [], merged.sprintCards ?? []),
          sprintColumnSections: mergeById(freshStore.sprintColumnSections ?? [], merged.sprintColumnSections ?? []),
          calendarCategories:   mergeById(freshStore.calendarCategories ?? [], merged.calendarCategories ?? []),
          colorPalettes:  mergeById(freshStore.colorPalettes ?? [], merged.colorPalettes ?? []),
        }
      }

      // Monta o log persistido de erros (null quando sucesso).
      let syncErrorLog: SyncErrorLog | null = null
      let syncErrorText: string | null = null
      if (report.errors.length > 0) {
        const lines = [
          `Sincronizado parcialmente — ${report.succeededOps}/${report.totalOps} ops enviadas com sucesso`,
          `Horário: ${new Date(serverTime).toLocaleString('pt-BR')}`,
          '',
          `⚠ ${report.errors.length} grupo(s) com erro:`,
          ...report.errors.map(e =>
            `  [${e.resource}] lote ${e.batchIndex}/${e.totalBatches} | HTTP ${String(e.status)} | ${e.count} item(s) | ${e.message}`
          ),
        ]
        syncErrorText = lines.join('\n')
        syncErrorLog = {
          timestamp: new Date().toISOString(),
          summary: `Sincronização parcial: ${report.errors.length} grupo(s) com erro`,
          rawText: syncErrorText,
          failures: report.errors.map(e => ({
            resource: e.resource,
            batchIndex: e.batchIndex,
            totalBatches: e.totalBatches,
            status: e.status,
            count: e.count,
            message: e.message,
          })),
        }
      }

      finalStore = { ...finalStore, lastSyncError: syncErrorLog }

      const saved = await window.electronAPI.saveStore(finalStore)
      if (!saved) throw new Error('Sincronização bloqueada: a alteração removeria uma quantidade crítica de dados locais.')

      if (syncErrorLog) {
        setSyncStatus('error')
        setSyncError(syncErrorText)
      } else {
        setSyncStatus('synced')
        setSyncError(null)
      }
      justSyncedRef.current = true

      replaceStore(finalStore)
    } catch (err) {
      console.error('[Sync] Erro crítico:', err)
      setSyncStatus('error')
      const e = err as { message?: string; status?: number; body?: { error?: { message?: string; route?: string; code?: string } } }
      const errMsg = e.body?.error?.message ?? e.message ?? 'Erro desconhecido'
      const route = e.body?.error?.route ?? ''
      const httpStatus = e.status ?? ''
      const errorCode = e.body?.error?.code ?? ''
      const isNetwork = errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network')

      const lines = [
        `Erro critico ao sincronizar`,
        `Horario: ${new Date().toLocaleString('pt-BR')}`,
        '',
      ]
      if (isNetwork) {
        lines.push(`⚠ Causa: Falha de rede — verifique sua conexao com a internet.`)
      } else {
        lines.push(`⚠ Causa: ${errMsg}`)
        if (httpStatus) lines.push(`   HTTP: ${httpStatus}`)
        if (errorCode) lines.push(`   Codigo: ${errorCode}`)
        if (route) lines.push(`   Rota: ${route}`)
      }

      const rawText = lines.join('\n')
      setSyncError(rawText)

      // Persistir o erro critico no store para sinalizar no SettingsView mesmo apos reiniciar.
      try {
        const current = await window.electronAPI.loadStore()
        const persisted: SyncErrorLog = {
          timestamp: new Date().toISOString(),
          summary: isNetwork ? 'Falha de rede na sincronização' : `Erro crítico: ${errMsg}`,
          rawText,
          failures: [{
            resource: '__critical__',
            status: httpStatus || (isNetwork ? 'network' : 'error'),
            message: errMsg + (route ? ` (rota: ${route})` : ''),
          }],
        }
        await window.electronAPI.saveStore({ ...current, lastSyncError: persisted })
      } catch (persistErr) {
        console.warn('[Sync] Nao foi possivel persistir lastSyncError:', persistErr)
      }
    } finally {
      syncInFlightRef.current = false
      if (syncQueuedRef.current) {
        syncQueuedRef.current = false
        setSyncStatus('pending')
        autoSyncTimerRef.current = setTimeout(() => {
          autoSyncTimerRef.current = null
          void runSyncNow()
        }, 1000)
      }
    }
  }, [isConfigured, userLoggedIn, replaceStore, storageReady])

  // ── Startup sync ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!storageReady || !isConfigured || !userLoggedIn || !isElectron() || isLoading) return
    if (startupCheckedRef.current) return
    if (showLoginSync) return
    startupCheckedRef.current = true

    const checkAndPull = async () => {
      try {
        const rawStore = await window.electronAPI.loadStore()
        const needsPull = await hasRemoteChanges(rawStore.lastSyncAt)

        if (!needsPull) {
          void runSyncNow()
          return
        }

        const { store: pulled, noteContents, serverTime, deletedIds } = await pullFromApi(rawStore.lastSyncAt)

        await Promise.all(
          pulled.notes.map(async (note) => {
            const content = noteContents.get(note.id) ?? ''
            if (content.trim()) {
              await window.electronAPI.writeNote(note.mdPath, content)
                .catch((e: unknown) => console.warn('[Sync] writeNote falhou:', e))
            }
          })
        )

        type LocalNote = { id: string; mdPath?: string; isLocked?: boolean }
        const localNoteMap = new Map<string, LocalNote>(
          (rawStore.notes as LocalNote[]).map(n => [n.id, n])
        )
        const s = settingsRef.current
        const pendingDeletes = rawStore.pendingDeletes ?? []
        const deletedNoteIds = new Set([
          ...pendingDeletes.filter(d => d.resource === 'notes').map(d => d.id),
          ...(deletedIds.get('notes') ?? []),
        ])
        const deletedFolderIds = new Set([
          ...pendingDeletes.filter(d => d.resource === 'note_folders').map(d => d.id),
          ...(deletedIds.get('note_folders') ?? []),
        ])

        const remoteDelCards         = new Set(deletedIds.get('cards') ?? [])
        const remoteDelProjects      = new Set(deletedIds.get('projects') ?? [])
        const remoteDelEvents        = new Set(deletedIds.get('calendar_events') ?? [])
        const remoteDelHabits        = new Set(deletedIds.get('habits') ?? [])
        const remoteDelHabitEntries  = new Set(deletedIds.get('habit_entries') ?? [])
        const remoteDelCrm           = new Set(deletedIds.get('crm_contacts') ?? [])
        const remoteDelCrmTags       = new Set(deletedIds.get('crm_tags') ?? [])
        const remoteDelCrmInter      = new Set(deletedIds.get('crm_interactions') ?? [])
        const remoteDelBills         = new Set(deletedIds.get('finance_bills') ?? [])
        const remoteDelExpenses      = new Set(deletedIds.get('finance_expenses') ?? [])
        const remoteDelIncomes       = new Set(deletedIds.get('finance_incomes') ?? [])
        const remoteDelSavings       = new Set(deletedIds.get('finance_savings_goals') ?? [])
        const remoteDelInvestments   = new Set(deletedIds.get('finance_investments') ?? [])
        const remoteDelPlaybooks     = new Set(deletedIds.get('playbooks') ?? [])
        const remoteDelMeetings      = new Set(deletedIds.get('meetings') ?? [])
        const remoteDelStudyGoals    = new Set(deletedIds.get('study_goals') ?? [])
        const remoteDelStudyMedia    = new Set(deletedIds.get('study_media_items') ?? [])
        const remoteDelColorPalettes = new Set(deletedIds.get('color_palettes') ?? [])
        const remoteDelSprintCards   = new Set(deletedIds.get('sprint_cards') ?? [])
        const remoteDelSprintSections = new Set(deletedIds.get('sprint_column_sections') ?? [])
        const remoteDelCalendarCats  = new Set(deletedIds.get('calendar_categories') ?? [])

        // Tombstones locais para eventos de calendário
        const deletedEventIds = new Set([
          ...pendingDeletes.filter(d => d.resource === 'calendar_events').map(d => d.id),
          ...remoteDelEvents,
        ])

        const merged: AppStore = {
          ...rawStore,
          settings: s,
          cards:          mergeById(rawStore.cards.filter(c => !remoteDelCards.has(c.id)), pulled.cards),
          notes:          mergeById(rawStore.notes.filter(n => !deletedNoteIds.has(n.id)), pulled.notes, deletedNoteIds).map(note => {
            const local = localNoteMap.get(note.id)
            return {
              ...note,
              mdPath:   local?.mdPath ?? note.mdPath,
              isLocked: local?.isLocked ?? (note as { isLocked?: boolean }).isLocked ?? false,
            }
          }),
          noteFolders:    mergeById(rawStore.noteFolders.filter(f => !deletedFolderIds.has(f.id)), pulled.noteFolders, deletedFolderIds),
          calendarEvents: mergeById(rawStore.calendarEvents.filter(e => !deletedEventIds.has(e.id)), pulled.calendarEvents, deletedEventIds),
          projects:       mergeById(rawStore.projects.filter(p => !remoteDelProjects.has(p.id)), pulled.projects),
          habits:         mergeById(rawStore.habits.filter(h => !remoteDelHabits.has(h.id)), pulled.habits),
          habitEntries:   mergeById(rawStore.habitEntries.filter(e => !remoteDelHabitEntries.has(e.id) && !remoteDelHabits.has(e.habitId)), pulled.habitEntries),
          crmContacts:    mergeById(rawStore.crmContacts.filter(c => !remoteDelCrm.has(c.id)), pulled.crmContacts),
          crmTags:        mergeById((rawStore.crmTags ?? []).filter(t => !remoteDelCrmTags.has(t.id)), pulled.crmTags),
          crmInteractions: mergeById((rawStore.crmInteractions ?? []).filter(i => !remoteDelCrmInter.has(i.id)), pulled.crmInteractions),
          bills:          mergeById(rawStore.bills.filter(b => !remoteDelBills.has(b.id)), pulled.bills),
          expenses:       mergeById(rawStore.expenses.filter(e => !remoteDelExpenses.has(e.id)), pulled.expenses),
          incomes:        mergeById(rawStore.incomes.filter(i => !remoteDelIncomes.has(i.id)), pulled.incomes),
          savingsGoals:   mergeById(rawStore.savingsGoals.filter(g => !remoteDelSavings.has(g.id)), pulled.savingsGoals),
          investments:    mergeById((rawStore.investments ?? []).filter(i => !remoteDelInvestments.has(i.id)), pulled.investments),
          meetings:       mergeById((rawStore.meetings ?? []).filter(m => !remoteDelMeetings.has(m.id)), pulled.meetings),
          playbooks:      mergeById(rawStore.playbooks.filter(p => !remoteDelPlaybooks.has(p.id)), pulled.playbooks),
          colorPalettes:  mergeById((rawStore.colorPalettes ?? []).filter(p => !remoteDelColorPalettes.has(p.id)), pulled.colorPalettes),
          sprintCards:          mergeById((rawStore.sprintCards ?? []).filter(c => !remoteDelSprintCards.has(c.id)), pulled.sprintCards),
          sprintColumnSections: mergeById((rawStore.sprintColumnSections ?? []).filter(s => !remoteDelSprintSections.has(s.id)), pulled.sprintColumnSections),
          calendarCategories:   mergeById((rawStore.calendarCategories ?? []).filter(c => !remoteDelCalendarCats.has(c.id)), pulled.calendarCategories),
          financialConfig: pulled.financeConfig ?? rawStore.financialConfig,
          budgetCategories: pulled.financeConfigBudgetCategories ?? rawStore.budgetCategories,
          shortcutFolders: pulled.shortcutFolders.length > 0 ? pulled.shortcutFolders : (rawStore.shortcutFolders ?? []),
          shortcuts:       pulled.shortcuts.length > 0 ? pulled.shortcuts : (rawStore.shortcuts ?? []),
          study: {
            ...rawStore.study,
            ...(pulled.studyConfig ?? {}),
            goals:      mergeById((rawStore.study?.goals ?? []).filter(g => !remoteDelStudyGoals.has(g.id)), pulled.studyGoals),
            mediaItems: mergeById((rawStore.study?.mediaItems ?? []).filter(m => !remoteDelStudyMedia.has(m.id)), pulled.studyMediaItems),
          },
          lastSyncAt: serverTime,
          // Sucesso no pull de startup limpa erro antigo persistido
          lastSyncError: null,
        }

        const saved = await window.electronAPI.saveStore(merged)
        if (!saved) throw new Error('Sincronização inicial bloqueada: a resposta remota removeria uma quantidade crítica de dados locais.')
        // Não setar justSyncedRef=true aqui: o pull-only de startup não empurra dados locais.
        // O auto-sync subsequente (disparado pela mudança de storeVersion) cuidará do push.
        replaceStore(merged)
      } catch (err) {
        console.error('[Sync] Erro no pull de startup:', err)
        const errMsg = (err as { message?: string }).message ?? 'Erro desconhecido'
        const isNetwork = errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network')
        const rawText = [
          'Erro na sincronização inicial',
          `Horário: ${new Date().toLocaleString('pt-BR')}`,
          '',
          `⚠ Causa: ${isNetwork ? 'Falha de rede — verifique sua conexão com a internet.' : errMsg}`,
        ].join('\n')
        setSyncStatus('error')
        setSyncError(rawText)

        // Persistir o erro no store para exibir no SettingsView mesmo apos reiniciar.
        try {
          const current = await window.electronAPI.loadStore()
          const persisted: SyncErrorLog = {
            timestamp: new Date().toISOString(),
            summary: isNetwork ? 'Falha de rede no pull inicial' : `Erro no pull inicial: ${errMsg}`,
            rawText,
            failures: [{
              resource: '__startup__',
              status: isNetwork ? 'network' : 'error',
              message: errMsg,
            }],
          }
          await window.electronAPI.saveStore({ ...current, lastSyncError: persisted })
        } catch (persistErr) {
          console.warn('[Sync] Nao foi possivel persistir lastSyncError:', persistErr)
        }
      }
    }

    void checkAndPull()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, userLoggedIn, isLoading, showLoginSync, storageReady])

  // ── Auto-sync on store change ───────────────────────────────────────────────

  const scheduleAutoSync = useCallback(() => {
    if (!storageReady || !isConfigured || !userLoggedIn || !isElectron()) return
    if (syncInFlightRef.current) { syncQueuedRef.current = true; return }
    if (justSyncedRef.current) { justSyncedRef.current = false; return }
    if (autoSyncTimerRef.current) return
    setSyncStatus('pending')

    // Watchdog: se após 25s o sync ainda não iniciou, reporta o problema
    if (pendingWatchdogRef.current) clearTimeout(pendingWatchdogRef.current)
    pendingWatchdogRef.current = setTimeout(() => {
      pendingWatchdogRef.current = null
      // Só aciona se ainda estiver pendente (não iniciou sync)
      if (!syncInFlightRef.current) {
        setSyncStatus('error')
        setSyncError(
          [
            'Sincronização travada em "pendente"',
            `Horário: ${new Date().toLocaleString('pt-BR')}`,
            '',
            '⚠ Causa: o sync foi agendado mas não iniciou no tempo esperado.',
            '  Verifique conexão com a internet e se a sessão está ativa.',
          ].join('\n'),
        )
      }
    }, 25000)

    // Upgrade 02: quando WS realtime esta conectado, polling vai pra
    // 120s (push cobre o caminho rapido). Caso contrario, 10s.
    const debounceMs = realtimeConnected ? 120_000 : 10_000
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null
      void runSyncNow()
    }, debounceMs)
  }, [isConfigured, runSyncNow, userLoggedIn, realtimeConnected, storageReady])

  useEffect(() => { scheduleAutoSync() }, [storeVersion, scheduleAutoSync])

  // ── Reset on logout ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (storageReady && isConfigured && userLoggedIn) return
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }
    if (pendingWatchdogRef.current) {
      clearTimeout(pendingWatchdogRef.current)
      pendingWatchdogRef.current = null
    }
    syncInFlightRef.current  = false
    syncQueuedRef.current    = false
    setSyncStatus('idle')
    setSyncError(null)
    startupCheckedRef.current = false
  }, [isConfigured, userLoggedIn, storageReady])

  return {
    syncStatus,
    syncError,
    isSyncing: syncStatus === 'syncing',
    showLoginSync,
    setShowLoginSync,
    runSyncNow,
    resetStartupCheck,
  }
}
