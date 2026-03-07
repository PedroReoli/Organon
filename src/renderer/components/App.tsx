import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../hooks/useAuth'
import { pushAllToApi, hasRemoteChanges, pullFromApi } from '../../api/sync'
import { applyTheme, expandCalendarEvents, getTodayISO, isElectron, getShortcutById, matchesShortcut } from '../utils'
import { THEMES, DEFAULT_SETTINGS } from '../types'
import { Titlebar } from './Titlebar'
import { InternalNav } from './InternalNav'
import { TodayView } from './TodayView'
import { PlannerView } from './PlannerView'
import { CalendarView } from './CalendarView'
import { CRMView } from './CRMView'
import { PlaybookView } from './PlaybookView'
import { ShortcutsView } from './ShortcutsView'
import { PathsView } from './PathsView'
import { ProjectsView } from './ProjectsView'
import { ColorsView } from './ColorsView'
import { NotesView } from './NotesView'
import { ClipboardView } from './ClipboardView'
import { FilesView } from './FilesView'
import { AppsView } from './AppsView'
import { SettingsView } from './SettingsView'
import { HabitsView } from './HabitsView'
import { StudyView } from './StudyView'
import { FinancialView } from './FinancialView'
import { InstallerView } from './InstallerView'
import { ShortcutSearchModal } from './ShortcutSearchModal'
import { HistoryView } from './HistoryView'
import { NavbarCustomizeModal } from './NavbarCustomizeModal'

import type { AppView } from './InternalNav'

export const App = () => {
  const {
    cards,
    shortcutFolders,
    shortcuts,
    paths,
    calendarEvents,
    noteFolders,
    notes,
    colorPalettes,
    clipboardCategories,
    clipboardItems,
    files,
    apps,
    macros,
    habits,
    habitEntries,
    bills,
    expenses,
    budgetCategories,
    incomes,
    financialConfig,
    savingsGoals,
    study,
    settings,
    isLoading,
    error,
    addCard,
    editCard,
    removeCard,
    moveCardToCell,
    reorderInCell,
    getCardsForLocation,
    addShortcutFolder,
    renameShortcutFolder,
    removeShortcutFolder,
    addShortcut,
    updateShortcut,
    removeShortcut,
    moveShortcutToFolder,
    reorderShortcutsInFolder,
    reorderFolders,
    moveFolderToParent,
    removeShortcuts,
    moveShortcuts,
    addPath,
    updatePath,
    removePath,
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    addClipboardCategory,
    renameClipboardCategory,
    removeClipboardCategory,
    addClipboardItem,
    updateClipboardItem,
    removeClipboardItem,
    moveClipboardItemToCategory,
    addFileItem,
    removeFileItem,
    addNoteFolder,
    updateNoteFolder,
    removeNoteFolder,
    reorderNoteFolders,
    addNote,
    updateNote,
    toggleNoteFavorite,
    toggleNotePinned,
    toggleNoteLock,
    reorderNotes,
    removeNote,
    addColorPalette,
    updateColorPalette,
    removeColorPalette,
    addApp,
    updateApp,
    removeApp,
    addMacro,
    updateMacro,
    removeMacro,
    // Habits methods
    addHabit,
    updateHabit,
    removeHabit,
    addHabitEntry,
    updateHabitEntry,
    removeHabitEntry,
    // Financial methods
    addBill,
    updateBill,
    removeBill,
    addExpense,
    updateExpense,
    removeExpense,
    setBudgetCategories,
    addIncome,
    updateIncome,
    removeIncome,
    updateFinancialConfig,
    addSavingsGoal,
    updateSavingsGoal,
    removeSavingsGoal,
    // Quick Access methods
    quickAccess,
    addQuickAccess,
    removeQuickAccess,
    // Reset Store
    resetStore,
    // Project & IDE methods
    projects,
    meetings,
    playbooks,
    registeredIDEs,
    addProject,
    updateProject,
    removeProject,
    addRegisteredIDE,
    updateRegisteredIDE,
    removeRegisteredIDE,
    // CRM methods
    crmContacts,
    crmInteractions,
    crmTags,
    addCRMContact,
    updateCRMContact,
    removeCRMContact,
    moveCRMContactToStage,
    reorderCRMContacts,
    addCRMInteraction,
    removeCRMInteraction,
    addCRMTag,
    removeCRMTag,
    addCRMContactLink,
    removeCRMContactLink,
    // Playbook methods
    addPlaybook,
    updatePlaybook,
    removePlaybook,
    addPlaybookDialog,
    updatePlaybookDialog,
    removePlaybookDialog,
    updateSettings,
    updateStudy,
    storeVersion,
  } = useStore()

  const auth = useAuth(
    settings.apiBaseUrl ?? '',
    settings.apiToken ?? settings.apiRefreshToken ?? '',
    (token, email) => updateSettings({ apiToken: token, apiRefreshToken: '', apiEmail: email }),
  )
  const apiBaseUrl = (settings.apiBaseUrl ?? '').trim() || 'https://reolicodeapi.com'
  const isConfigured = /^https?:\/\/.+/i.test(apiBaseUrl)
  const userLoggedIn = auth.isAuthenticated

  type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const isSyncing = syncStatus === 'syncing'
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startupCheckedRef = useRef(false)
  const syncInFlightRef = useRef(false)
  const syncQueuedRef = useRef(false)
  const INT32_MAX = 2147483647

  // Startup sync: se API configurada, verifica se há mudanças no servidor
  useEffect(() => {
    if (!isConfigured || !userLoggedIn || !isElectron() || isLoading) return
    if (startupCheckedRef.current) return
    startupCheckedRef.current = true

    const checkAndPull = async () => {
      try {
        const rawStore = await window.electronAPI.loadStore()
        console.log('[Sync] Verificando mudanças remotas desde:', rawStore.lastSyncAt ?? 'início')
        const needsPull = await hasRemoteChanges(rawStore.lastSyncAt)
        if (!needsPull) { console.log('[Sync] Nenhuma mudança remota.'); return }

        console.log('[Sync] Baixando dados da API...')
        const { store: pulled, noteContents, serverTime } = await pullFromApi(rawStore.lastSyncAt)
        console.log('[Sync] Pull OK — cards:', pulled.cards.length, 'notes:', pulled.notes.length)

        await Promise.all(
          pulled.notes.map(async (note) => {
            const content = noteContents.get(note.id) ?? ''
            if (content) await window.electronAPI.writeNote(note.mdPath, content).catch((e: unknown) => console.warn('[Sync] writeNote falhou:', e))
          })
        )

        const merged = {
          ...rawStore,
          cards: pulled.cards,
          notes: pulled.notes.map(note => {
            const localNote = rawStore.notes.find((item: { id: string; mdPath?: string; isLocked?: boolean }) => item.id === note.id)
            return {
              ...note,
              mdPath: localNote?.mdPath ?? note.mdPath,
              isLocked: localNote?.isLocked ?? note.isLocked ?? false,
            }
          }),
          noteFolders: pulled.noteFolders,
          calendarEvents: pulled.calendarEvents,
          projects: pulled.projects,
          habits: pulled.habits,
          habitEntries: pulled.habitEntries,
          crmContacts: pulled.crmContacts,
          bills: pulled.bills,
          expenses: pulled.expenses,
          incomes: pulled.incomes,
          savingsGoals: pulled.savingsGoals,
          playbooks: pulled.playbooks,
          study: { ...rawStore.study, goals: pulled.studyGoals, mediaItems: pulled.studyMediaItems },
          lastSyncAt: serverTime,
        }

        await window.electronAPI.saveStore(merged)
        console.log('[Sync] Store atualizado, recarregando...')
        window.location.reload()
      } catch (err) {
        console.error('[Sync] Erro no pull de startup:', err)
      }
    }

    void checkAndPull()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, userLoggedIn, isLoading])

  const runSyncNow = useCallback(async () => {
    if (!isConfigured || !userLoggedIn || !isElectron()) return
    if (syncInFlightRef.current) {
      syncQueuedRef.current = true
      return
    }
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }

    syncInFlightRef.current = true
    setSyncStatus('syncing')
    setSyncError(null)
    let rawStore: Awaited<ReturnType<typeof window.electronAPI.loadStore>> | null = null
    try {
      rawStore = await window.electronAPI.loadStore()

      const noteContents = new Map<string, string>()
      await Promise.all(rawStore.notes.map(async (note) => {
        try {
          const content = await window.electronAPI.readNote(note.mdPath)
          noteContents.set(note.id, content ?? '')
        } catch { /* ignora erros individuais de leitura */ }
      }))

      console.log('[Sync] Enviando para API — ops:', rawStore.cards.length + rawStore.notes.length + rawStore.habits.length, '+ entidades')
      await pushAllToApi(rawStore, noteContents)

      const syncedAt = new Date().toISOString()
      await window.electronAPI.saveStore({ ...rawStore, lastSyncAt: syncedAt })

      console.log('[Sync] Push OK —', syncedAt)
      setSyncStatus('synced')
    } catch (err) {
      console.error('[Sync] Erro no push:', err)
      setSyncStatus('error')
      const errorObj = err as { message?: string; status?: number; code?: string }
      const overflowNotes = (rawStore?.notes ?? [])
        .filter(note => {
          const value = typeof note.order === 'number' ? note.order : Number(note.order)
          return Number.isFinite(value) && Math.abs(value) > INT32_MAX
        })
        .slice(0, 10)
        .map(note => `- noteId=${note.id} | order=${String(note.order)} | titulo=${note.title ?? ''}`)

      const reportLines = [
        `Resumo: ${errorObj?.message || 'Erro desconhecido na sincronização.'}`,
        `Horário: ${new Date().toLocaleString('pt-BR')}`,
        `Status HTTP: ${String(errorObj?.status ?? 'desconhecido')}`,
        `Código: ${String(errorObj?.code ?? 'n/a')}`,
        `Total de notas no envio: ${String(rawStore?.notes?.length ?? 0)}`,
        'Observação: markdown enviado em content_markdown; md_path não é enviado.',
      ]

      if (overflowNotes.length > 0) {
        reportLines.push('Possíveis ordens fora do range int32 (amostra):')
        reportLines.push(...overflowNotes)
      }

      setSyncError(reportLines.join('\n'))
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
  }, [isConfigured, userLoggedIn])

  const scheduleAutoSync = useCallback(() => {
    if (!isConfigured || !userLoggedIn || !isElectron()) return
    if (syncInFlightRef.current) {
      syncQueuedRef.current = true
      return
    }
    if (autoSyncTimerRef.current) return
    setSyncStatus('pending')
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null
      void runSyncNow()
    }, 10000)
  }, [isConfigured, runSyncNow, userLoggedIn])

  // Auto-sync: qualquer mudança agenda sync (sem reset infinito do timer)
  useEffect(() => {
    scheduleAutoSync()
  }, [storeVersion, scheduleAutoSync])

  useEffect(() => {
    if (isConfigured && userLoggedIn) return
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }
    syncInFlightRef.current = false
    syncQueuedRef.current = false
    setSyncStatus('idle')
    setSyncError(null)
    startupCheckedRef.current = false
  }, [isConfigured, userLoggedIn])

  const [activeView, setActiveView] = useState<AppView>('today')
  const [showInstaller, setShowInstaller] = useState<boolean | null>(null)
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [showShortcutSearch, setShowShortcutSearch] = useState(false)
  const [showNavbarCustomizeModal, setShowNavbarCustomizeModal] = useState(false)
  const [reduceModeSignal, setReduceModeSignal] = useState(0)
  const [pendingOpenCardId, setPendingOpenCardId] = useState<string | null>(null)
  const [pendingCalendarDate, setPendingCalendarDate] = useState<string | null>(null)
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)
  const reminderFiredRef = useState(() => new Set<string>())[0]

  const keyboardShortcuts = useMemo(() => {
    const defaults = DEFAULT_SETTINGS.keyboardShortcuts || []
    const saved = settings.keyboardShortcuts || []
    const byId = new Map(saved.map(shortcut => [shortcut.id, shortcut]))

    return defaults.map(defaultShortcut => {
      const customShortcut = byId.get(defaultShortcut.id)
      return customShortcut
        ? { ...defaultShortcut, ...customShortcut, keys: customShortcut.keys }
        : defaultShortcut
    })
  }, [settings.keyboardShortcuts])

  // Verificar se precisa mostrar o instalador
  useEffect(() => {
    const checkInstaller = async () => {
      if (!isElectron()) {
        setShowInstaller(false)
        return
      }

      try {
        const isPackaged = await window.electronAPI.isPackaged()
        if (!isPackaged) {
          // Em desenvolvimento, pular instalador
          setShowInstaller(false)
          return
        }

        const isCompleted = await window.electronAPI.isInstallerCompleted()
        setShowInstaller(!isCompleted)
      } catch (err) {
        console.error('Erro ao verificar instalador:', err)
        setShowInstaller(false)
      }
    }

    checkInstaller()
  }, [])

  useEffect(() => {
    const theme = THEMES[settings.themeName]
    if (theme) {
      applyTheme(theme)
    }
  }, [settings.themeName])

  useEffect(() => {
    // Lembretes em background (quando o app estiver aberto).
    // Para notificacao fora do app (agendamento no SO), seria outra integracao.
    if (calendarEvents.length === 0) return

    const toISODate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const addDays = (iso: string, days: number) => {
      const d = new Date(iso + 'T00:00:00')
      d.setDate(d.getDate() + days)
      return toISODate(d)
    }

    const fire = (title: string, body: string) => {
      try {
        // Electron suporta Notification no renderer.
        // Em web, pode depender de permissao.
        // eslint-disable-next-line no-new
        new Notification(title, { body })
      } catch {
        // Ignora
      }
    }

    const tick = () => {
      const now = new Date()
      const nowMs = now.getTime()
      const windowMs = 60 * 1000
      const startISO = toISODate(now)
      const endISO = addDays(startISO, 2)

      const upcoming = expandCalendarEvents(calendarEvents, startISO, endISO)
      for (const ev of upcoming) {
        if (!ev.reminder?.enabled) continue
        if (!ev.time) continue

        const dt = new Date(`${ev.date}T${ev.time}:00`)
        const reminderAt = dt.getTime() - (ev.reminder.offsetMinutes || 0) * 60 * 1000
        const key = `${(ev as { sourceId?: string }).sourceId ?? ev.id}|${ev.date}|${ev.time}|${ev.reminder.offsetMinutes}`

        if (reminderAt <= nowMs && reminderAt > nowMs - windowMs) {
          if (reminderFiredRef.has(key)) continue
          reminderFiredRef.add(key)

          const when = ev.reminder.offsetMinutes === 0
            ? 'Agora'
            : ev.reminder.offsetMinutes === 60
              ? 'Em 1 hora'
              : ev.reminder.offsetMinutes === 120
                ? 'Em 2 horas'
                : ev.reminder.offsetMinutes === 1440
                  ? 'Em 1 dia'
                  : `Em ${ev.reminder.offsetMinutes} min`

          fire(`Lembrete: ${ev.title}`, `${when} • ${ev.date} ${ev.time}`)
        }
      }
    }

    // Tentar pedir permissao no browser (no Electron normalmente nao precisa).
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {})
    }

    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [calendarEvents, reminderFiredRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (target as HTMLElement | null)?.isContentEditable) {
        // Nao dispara atalhos globais enquanto o usuario digita em campos de texto.
        return
      }

      const quickSearchShortcut = getShortcutById(keyboardShortcuts, 'quick-search')
      const reducedModeShortcut = getShortcutById(keyboardShortcuts, 'reduced-mode')

      if (reducedModeShortcut && matchesShortcut(e, reducedModeShortcut)) {
        if (activeView === 'notes' || activeView === 'planner' || activeView === 'calendar') {
          e.preventDefault()
          setReduceModeSignal(prev => prev + 1)
        }
        return
      }

      if (quickSearchShortcut && matchesShortcut(e, quickSearchShortcut)) {
        e.preventDefault()
        setShowShortcutSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeView, keyboardShortcuts])

  const handleOpenShortcut = (url: string) => {
    void (async () => {
      if (!isElectron()) return
      await window.electronAPI.openExternal(url).catch(() => {})
    })()
  }

  // Ainda verificando se precisa mostrar instalador
  if (showInstaller === null) {
    return (
      <div className="app-container">
        <div className="app-status" style={{ color: 'var(--color-text-muted)' }}>
          <div className="app-status-title">Iniciando...</div>
        </div>
      </div>
    )
  }

  // Mostrar instalador
  if (showInstaller) {
    return (
      <div className="app-container">
        <Titlebar />
        <InstallerView onComplete={() => {
          setShowInstaller(false)
          // Recarregar a janela para aplicar as novas configuracoes
          window.location.reload()
        }} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <Titlebar />
        <div className="app-body">
          <InternalNav
            activeView={activeView}
            onChange={setActiveView}
            disabled
            navbarConfig={settings.navbarConfig}
            onOpenNavbarCustomize={() => setShowNavbarCustomizeModal(true)}
          />
          <div className="app-view">
            <div className="app-status" style={{ color: 'var(--color-text-muted)' }}>
              <div className="app-status-title">Carregando...</div>
              <div className="app-status-subtitle">Preparando seus dados</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <Titlebar />
        <div className="app-body">
          <InternalNav
            activeView={activeView}
            onChange={setActiveView}
            disabled
            navbarConfig={settings.navbarConfig}
            onOpenNavbarCustomize={() => setShowNavbarCustomizeModal(true)}
          />
          <div className="app-view">
            <div className="app-status" style={{ color: 'var(--color-danger)' }}>
              <div className="app-status-title">Erro ao carregar</div>
              <div className="app-status-subtitle">{error}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Titlebar />
      <div className="app-body">
        <InternalNav
          activeView={activeView}
          onChange={setActiveView}
          navbarConfig={settings.navbarConfig}
          onOpenNavbarCustomize={() => setShowNavbarCustomizeModal(true)}
          syncStatus={syncStatus}
          userLoggedIn={userLoggedIn}
          onSync={() => { void runSyncNow() }}
        />

        <div className="app-view">
          {activeView === 'today' && (
            <TodayView
              cards={cards}
              calendarEvents={calendarEvents}
              macros={macros}
              habits={habits}
              habitEntries={habitEntries}
              bills={bills}
              expenses={expenses}
              savingsGoals={savingsGoals}
              shortcuts={shortcuts}
              files={files}
              notes={notes}
              showQuickSearch={showQuickSearch}
              onOpenQuickSearch={() => setShowQuickSearch(true)}
              onCloseQuickSearch={() => setShowQuickSearch(false)}
              onGoToPlannerCard={(cardId) => {
                setShowQuickSearch(false)
                setPendingOpenCardId(cardId)
                setActiveView('planner')
              }}
              onGoToCalendarDate={(dateISO) => {
                setShowQuickSearch(false)
                setPendingCalendarDate(dateISO)
                setActiveView('calendar')
              }}
              onOpenShortcut={(url) => {
                setShowQuickSearch(false)
                handleOpenShortcut(url)
              }}
              onOpenFile={(fileId) => {
                setShowQuickSearch(false)
                const file = files.find(f => f.id === fileId)
                if (!file) return
                if (!isElectron()) return
                window.electronAPI.openFile(file.path).catch(() => {})
              }}
              onGoToNotes={() => {
                setShowQuickSearch(false)
                setActiveView('notes')
              }}
              quickAccess={quickAccess}
              onAddQuickAccess={addQuickAccess}
              onRemoveQuickAccess={removeQuickAccess}
              onRunMacro={(macroId) => {
                if (!isElectron()) {
                  console.log('Run macro', macroId)
                  return
                }
                const macro = macros.find(m => m.id === macroId)
                if (!macro) return
                const exePaths = macro.appIds
                  .map(id => apps.find(a => a.id === id)?.exePath)
                  .filter((p): p is string => !!p)
                window.electronAPI.launchMany(exePaths, macro.mode).catch(() => {})
              }}
              onToggleHabitBoolean={(habit) => {
                const todayISO = getTodayISO()
                const entry = habitEntries.find(e => e.habitId === habit.id && e.date === todayISO)
                if (entry) {
                  if (entry.value >= 1 && !entry.skipped) {
                    updateHabitEntry(entry.id, { value: 0 })
                  } else {
                    updateHabitEntry(entry.id, { value: 1, skipped: false, skipReason: '' })
                  }
                } else {
                  addHabitEntry({ habitId: habit.id, date: todayISO, value: 1, skipped: false, skipReason: '' })
                }
              }}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'planner' && (
            <PlannerView
              cards={cards}
              calendarEvents={calendarEvents}
              projects={projects}
              getCardsForLocation={getCardsForLocation}
              onAddCard={addCard}
              onEditCard={editCard}
              onRemoveCard={removeCard}
              onMoveCard={moveCardToCell}
              onReorderCard={reorderInCell}
              onEditEvent={updateCalendarEvent}
              onRemoveEvent={removeCalendarEvent}
              reduceModeSignal={reduceModeSignal}
              openCardId={pendingOpenCardId}
              onOpenCardHandled={() => setPendingOpenCardId(null)}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              cards={cards}
              events={calendarEvents}
              onAddEvent={addCalendarEvent}
              onRemoveEvent={removeCalendarEvent}
              reduceModeSignal={reduceModeSignal}
              focusDateISO={pendingCalendarDate}
              onFocusDateHandled={() => setPendingCalendarDate(null)}
            />
          )}

          {activeView === 'crm' && (
            <CRMView
              contacts={crmContacts}
              interactions={crmInteractions}
              tags={crmTags}
              notes={notes}
              calendarEvents={calendarEvents}
              projects={projects}
              onAddContact={addCRMContact}
              onUpdateContact={updateCRMContact}
              onRemoveContact={removeCRMContact}
              onMoveContactToStage={moveCRMContactToStage}
              onReorderContacts={reorderCRMContacts}
              onAddInteraction={addCRMInteraction}
              onRemoveInteraction={removeCRMInteraction}
              onAddTag={addCRMTag}
              onRemoveTag={removeCRMTag}
              onAddLink={addCRMContactLink}
              onRemoveLink={removeCRMContactLink}
            />
          )}

          {activeView === 'playbook' && (
            <PlaybookView
              playbooks={playbooks}
              onAddPlaybook={addPlaybook}
              onUpdatePlaybook={updatePlaybook}
              onRemovePlaybook={removePlaybook}
              onAddDialog={addPlaybookDialog}
              onUpdateDialog={updatePlaybookDialog}
              onRemoveDialog={removePlaybookDialog}
            />
          )}

          {activeView === 'shortcuts' && (
            <ShortcutsView
              folders={shortcutFolders}
              shortcuts={shortcuts}
              onAddFolder={addShortcutFolder}
              onRenameFolder={renameShortcutFolder}
              onRemoveFolder={removeShortcutFolder}
              onAddShortcut={addShortcut}
              onUpdateShortcut={updateShortcut}
              onMoveShortcut={moveShortcutToFolder}
              onReorderShortcuts={reorderShortcutsInFolder}
              onRemoveShortcut={removeShortcut}
              onReorderFolders={reorderFolders}
              onMoveFolderToParent={moveFolderToParent}
              onRemoveShortcuts={removeShortcuts}
              onMoveShortcuts={moveShortcuts}
            />
          )}

          {activeView === 'notes' && (
            <NotesView
              notes={notes}
              folders={noteFolders}
              onAddNote={addNote}
              onUpdateNote={updateNote}
              onToggleFavorite={toggleNoteFavorite}
              onTogglePinned={toggleNotePinned}
              onToggleLock={toggleNoteLock}
              onReorderNotes={reorderNotes}
              onReorderFolders={reorderNoteFolders}
              onRemoveNote={removeNote}
              onAddFolder={addNoteFolder}
              onUpdateFolder={updateNoteFolder}
              onRemoveFolder={removeNoteFolder}
              reduceModeSignal={reduceModeSignal}
              initialNoteId={pendingNoteId}
              onInitialNoteConsumed={() => setPendingNoteId(null)}
              keyboardShortcuts={keyboardShortcuts}
            />
          )}

          {activeView === 'clipboard' && (
            <ClipboardView
              categories={clipboardCategories}
              items={clipboardItems}
              onAddCategory={addClipboardCategory}
              onRenameCategory={renameClipboardCategory}
              onRemoveCategory={removeClipboardCategory}
              onAddItem={addClipboardItem}
              onUpdateItem={updateClipboardItem}
              onRemoveItem={removeClipboardItem}
              onMoveItemToCategory={moveClipboardItemToCategory}
            />
          )}

          {activeView === 'files' && (
            <FilesView
              files={files}
              onImportFiles={async () => {
                if (!isElectron()) return
                const paths = await window.electronAPI.selectFilesToImport()
                for (const sourcePath of paths) {
                  const result = await window.electronAPI.importFile(sourcePath)
                  if (result.success && result.item) {
                    addFileItem(result.item)
                  }
                }
              }}
              onImportFilePaths={async (paths) => {
                if (!isElectron()) return { imported: 0, failed: paths.length }
                let imported = 0
                let failed = 0
                for (const sourcePath of paths) {
                  try {
                    const result = await window.electronAPI.importFile(sourcePath)
                    if (result.success && result.item) {
                      addFileItem(result.item)
                      imported += 1
                    } else {
                      failed += 1
                    }
                  } catch {
                    failed += 1
                  }
                }
                return { imported, failed }
              }}
              onOpenFile={(file) => {
                if (!isElectron()) return
                window.electronAPI.openFile(file.path).catch(() => {})
              }}
              onDeleteFile={async (file) => {
                if (!isElectron()) return
                const ok = await window.electronAPI.deleteFile(file.path)
                if (ok) {
                  removeFileItem(file.id)
                }
              }}
            />
          )}

          {activeView === 'apps' && (
            <AppsView
              apps={apps}
              macros={macros}
              onAddApp={addApp}
              onUpdateApp={updateApp}
              onRemoveApp={removeApp}
              onAddMacro={addMacro}
              onUpdateMacro={updateMacro}
              onRemoveMacro={removeMacro}
            />
          )}

          {activeView === 'habits' && (
            <HabitsView
              habits={habits}
              entries={habitEntries}
              onAddHabit={addHabit}
              onUpdateHabit={updateHabit}
              onRemoveHabit={removeHabit}
              onAddEntry={addHabitEntry}
              onUpdateEntry={updateHabitEntry}
              onRemoveEntry={removeHabitEntry}
            />
          )}

          {activeView === 'study' && (
            <StudyView
              cards={cards}
              study={study}
              onUpdateStudy={updateStudy}
              onUpdatePlanningCard={(cardId, updates) => editCard(cardId, updates)}
            />
          )}

          {activeView === 'financial' && (
            <FinancialView
              bills={bills}
              expenses={expenses}
              budgetCategories={budgetCategories}
              incomes={incomes}
              financialConfig={financialConfig}
              savingsGoals={savingsGoals}
              onAddBill={addBill}
              onUpdateBill={updateBill}
              onRemoveBill={removeBill}
              onAddExpense={addExpense}
              onUpdateExpense={updateExpense}
              onRemoveExpense={removeExpense}
              onSetBudgetCategories={setBudgetCategories}
              onAddIncome={addIncome}
              onUpdateIncome={updateIncome}
              onRemoveIncome={removeIncome}
              onUpdateFinancialConfig={updateFinancialConfig}
              onAddSavingsGoal={addSavingsGoal}
              onUpdateSavingsGoal={updateSavingsGoal}
              onRemoveSavingsGoal={removeSavingsGoal}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={updateSettings}
              registeredIDEs={registeredIDEs}
              onAddRegisteredIDE={addRegisteredIDE}
              onUpdateRegisteredIDE={updateRegisteredIDE}
              onRemoveRegisteredIDE={removeRegisteredIDE}
              onResetStore={resetStore}
              onOpenHistory={() => setActiveView('history')}
              onAddNote={addNote}
              onAddCard={addCard}
              onAddCalendarEvent={addCalendarEvent}
              isSyncing={isSyncing}
              syncStatus={syncStatus}
              syncError={syncError}
              isConfigured={isConfigured}
              userLoggedIn={userLoggedIn}
              onLogin={auth.login}
              onRegister={auth.register}
              onLogout={auth.logout}
              authError={auth.authError}
              onClearAuthError={auth.clearError}
              authUser={auth.user}
              authLoading={auth.isRestoring}
            />
          )}

          {activeView === 'history' && (
            <HistoryView
              cards={cards}
              events={calendarEvents}
              notes={notes}
              files={files}
              apps={apps}
              projects={projects}
              meetings={meetings}
            />
          )}

          {activeView === 'paths' && (
            <PathsView
              paths={paths}
              onAddPath={addPath}
              onUpdatePath={updatePath}
              onRemovePath={removePath}
            />
          )}

          {activeView === 'projects' && (
            <ProjectsView
              projects={projects}
              registeredIDEs={registeredIDEs}
              cards={cards}
              notes={notes}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onRemoveProject={removeProject}
              onAddNote={addNote}
              onEditCard={editCard}
            />
          )}

          {activeView === 'colors' && (
            <ColorsView
              palettes={colorPalettes}
              onAddPalette={addColorPalette}
              onUpdatePalette={updateColorPalette}
              onRemovePalette={removeColorPalette}
            />
          )}
        </div>
      </div>

      {showShortcutSearch && (
        <ShortcutSearchModal
          shortcuts={shortcuts}
          notes={notes}
          onClose={() => setShowShortcutSearch(false)}
          onOpenShortcut={(url) => {
            handleOpenShortcut(url)
            setShowShortcutSearch(false)
          }}
          onOpenNote={(noteId) => {
            setPendingNoteId(noteId)
            setActiveView('notes')
            setShowShortcutSearch(false)
          }}
        />
      )}

      <NavbarCustomizeModal
        isOpen={showNavbarCustomizeModal}
        onClose={() => setShowNavbarCustomizeModal(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

    </div>
  )
}
