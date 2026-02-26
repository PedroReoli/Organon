import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../hooks/useStore'
import { useAuth } from '../hooks/useAuth'
import { uploadStore, downloadStore } from '../../api/sync'
import { applyTheme, expandCalendarEvents, getTodayISO, isElectron, getShortcutById, matchesShortcut } from '../utils'
import { THEMES, DEFAULT_SETTINGS } from '../types'
import { Titlebar } from './Titlebar'
import { InternalNav } from './InternalNav'
import { AuthModal } from './AuthModal'
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
    removeNoteFolder,
    addNote,
    updateNote,
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
  } = useStore()

  const { user, isLoadingAuth, authError, login, register, logout, clearAuthError } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncToCloud = async () => {
    if (!user || !isElectron()) return
    setIsSyncing(true)
    try {
      const rawStore = await window.electronAPI.loadStore()
      await uploadStore(rawStore, user.$id)
      alert('Dados enviados para a nuvem com sucesso!')
    } catch (err) {
      alert(`Erro ao sincronizar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncFromCloud = async () => {
    if (!user || !isElectron()) return
    if (!confirm('Isso irá substituir seus dados locais com os dados da nuvem. Continuar?')) return
    setIsSyncing(true)
    try {
      const cloudStore = await downloadStore(user.$id)
      if (!cloudStore) {
        alert('Nenhum dado encontrado na nuvem.')
        return
      }
      await window.electronAPI.saveStore(cloudStore)
      alert('Dados baixados com sucesso! O app será recarregado.')
      window.location.reload()
    } catch (err) {
      alert(`Erro ao baixar dados: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  void isLoadingAuth // usado internamente pelo useAuth

  const [activeView, setActiveView] = useState<AppView>('today')
  const [showInstaller, setShowInstaller] = useState<boolean | null>(null)
  const [showQuickSearch, setShowQuickSearch] = useState(false)
  const [showShortcutSearch, setShowShortcutSearch] = useState(false)
  const [showNavbarCustomizeModal, setShowNavbarCustomizeModal] = useState(false)
  const [reduceModeSignal, setReduceModeSignal] = useState(0)
  const [pendingOpenCardId, setPendingOpenCardId] = useState<string | null>(null)
  const [pendingCalendarDate, setPendingCalendarDate] = useState<string | null>(null)
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
              onRemoveNote={removeNote}
              onAddFolder={addNoteFolder}
              onRemoveFolder={removeNoteFolder}
              reduceModeSignal={reduceModeSignal}
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
              user={user}
              onOpenAuthModal={() => setShowAuthModal(true)}
              isSyncing={isSyncing}
              onSyncToCloud={handleSyncToCloud}
              onSyncFromCloud={handleSyncFromCloud}
              onSignOut={logout}
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
          onClose={() => setShowShortcutSearch(false)}
          onOpenShortcut={(url) => {
            handleOpenShortcut(url)
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

      {showAuthModal && (
        <AuthModal
          onLogin={login}
          onRegister={register}
          authError={authError}
          onClearError={clearAuthError}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}
