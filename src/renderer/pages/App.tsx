import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useStore,
  useAuth,
  useSync,
  useGlobalShortcuts,
  useClipboardExpiration,
  useRealtime,
} from './shared/hooks'
import { deleteAllFromApi } from '../../api/sync'
import { applyTheme, isElectron } from '@utils'
import { THEMES, DEFAULT_SETTINGS } from '@types'
import { Titlebar } from './shared/Titlebar'
import { type DashboardHubCard, type DashboardSyncStatus } from './DashboardPage/DashboardPage'
import { InstallerView } from './SettingsPage/InstallerView'
import { TopNavbarShell } from '../components/layout/TopNavbarShell'
import { GlobalShellLayout } from '../components/layout/GlobalShellLayout'
import { useWakeWordListener } from '../hooks/useWakeWordListener'
import type { AppView } from './shared/InternalNav'
import {
  APP_HUBS,
  APP_VIEW_LABELS,
  SYNC_STATUS_LABELS,
} from './app/app.constants'
import { useAppDebugHud } from './app/useAppDebugHud'
import { useCalendarReminders } from './app/useCalendarReminders'
import { AppGlobalModals } from './app/AppGlobalModals'
import { AppViewRouter } from './app/AppViewRouter'

export const App = () => {
  const {
    cards,
    calendarEvents,
    noteFolders,
    notes,
    colorPalettes,
    clipboardCategories,
    clipboardItems,
    apps = [],
    study,
    settings,
    isLoading,
    error,
    addCard,
    editCard,
    canvasFolders,
    canvasFolderAssignments,
    canvasVersions,
    addCanvasFolder,
    renameCanvasFolder,
    removeCanvasFolder,
    moveCanvasToFolder,
    snapshotCanvasVersion,
    removeCanvasVersion,
    addCalendarEvent,
    addClipboardCategory,
    renameClipboardCategory,
    removeClipboardCategory,
    addClipboardItem,
    updateClipboardItem,
    removeClipboardItem,
    moveClipboardItemToCategory,
    toggleClipboardSnippet,
    purgeExpiredClipboard,
    addNoteFolder,
    updateNoteFolder,
    reorderNoteFolders,
    addNote,
    updateNote,
    toggleNoteFavorite,
    toggleNotePinned,
    toggleNoteLock,
    reorderNotes,
    softDeleteNote,
    softDeleteNoteFolder,
    restoreNote,
    restoreNoteFolder,
    purgeNote,
    purgeNoteFolder,
    purgeOldTrash,
    emptyNotesTrash,
    noteTemplates,
    setNoteBookmarks,
    addColorPalette,
    updateColorPalette,
    removeColorPalette,
    resetStore,
    clearUserData,
    projects,
    meetings,
    registeredIDEs,
    addRegisteredIDE,
    updateRegisteredIDE,
    removeRegisteredIDE,
    lastSyncAt,
    updateSettings,
    updateStudy,
    replaceStore,
    updateStore,
    storeVersion,
    incrementClipboardCopyCount,
    updateDashboardLayout,
    updateDashboardWidgets,
    saveDashboardTemplate,
    deleteDashboardTemplate,
  } = useStore()

  // ── Auth ────────────────────────────────────────────────────────────────────
  const prevApiEmailRef = useRef<string>(settings.apiEmail ?? '')
  const auth = useAuth(
    settings.apiBaseUrl ?? '',
    settings.apiRefreshToken ?? '',
    (accessToken, email, refreshToken) => {
      const prevEmail = prevApiEmailRef.current
      if (email && prevEmail && email !== prevEmail) {
        console.log(`[Auth] Troca de conta: ${prevEmail} → ${email}. Limpando dados locais...`)
        void clearUserData()
        sync.resetStartupCheck()
      }
      prevApiEmailRef.current = email || prevEmail
      updateSettings({ apiRefreshToken: refreshToken || accessToken, apiEmail: email })
    },
  )

  const apiBaseUrl = (settings.apiBaseUrl ?? '').trim() || 'https://reolicodeapi.com'
  const isConfigured = /^https?:\/\/.+/i.test(apiBaseUrl)
  const userLoggedIn = auth.isAuthenticated

  // ── Realtime (upgrade 02) ─────────────────────────────────────────────────
  const realtime = useRealtime({ isLoggedIn: userLoggedIn, updateStore })

  // ── Sync ────────────────────────────────────────────────────────────────────
  const sync = useSync({
    isConfigured,
    userLoggedIn,
    isLoading,
    settings,
    storeVersion,
    replaceStore,
    realtimeConnected: realtime.isConnected,
  })

  const loginWithSync = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const ok = await auth.login(email, password)
      if (ok) sync.setShowLoginSync(true)
      return ok
    },
    [auth, sync],
  )

  const registerWithSync = useCallback(
    async (email: string, password: string, name?: string): Promise<boolean> => {
      const ok = await auth.register(email, password, name)
      if (ok) sync.setShowLoginSync(true)
      return ok
    },
    [auth, sync],
  )

  const handleResetStore = useCallback(async () => {
    if (userLoggedIn && isElectron()) {
      try {
        const rawStore = await window.electronAPI.loadStore()
        await deleteAllFromApi(rawStore)
      } catch {
        /* ignora erros de API */
      }
    }
    await resetStore()
  }, [userLoggedIn, resetStore])

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<AppView>('today')
  const [showLocalSyncModal, setShowLocalSyncModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showInstaller, setShowInstaller] = useState<boolean | null>(null)
  const [showViewsNavigator, setShowViewsNavigator] = useState(false)
  const [showClipboardModal, setShowClipboardModal] = useState(false)
  const [reduceModeSignal, setReduceModeSignal] = useState(0)
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null)

  // Escuta contínua de comando de voz "Oi Organon" em segundo plano
  useWakeWordListener({
    enabled: true,
    onWakeWordDetected: () => {
      setShowVoiceModal(true)
      setActiveView('transcripts')
    },
  })

  // Verificação silenciosa de atualizações no startup (após 5s)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await (window as any).electronAPI?.checkForUpdates?.()
        if (res?.updateAvailable) {
          setShowUpdateModal(true)
        }
      } catch {
        // Ignora erros na verificação silenciosa
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  useClipboardExpiration({ retentionDays: 30, onPurge: purgeExpiredClipboard })

  const [viewZoom, setViewZoom] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('view-zoom') ?? '{}')
    } catch {
      return {}
    }
  })
  const activeZoom = viewZoom[activeView] ?? 1

  const keyboardShortcuts = useMemo(() => {
    const defaults = DEFAULT_SETTINGS.keyboardShortcuts || []
    const saved = settings.keyboardShortcuts || []
    const byId = new Map(saved.map((s) => [s.id, s]))
    return defaults.map((d) => {
      const custom = byId.get(d.id)
      return custom ? { ...d, ...custom, keys: custom.keys } : d
    })
  }, [settings.keyboardShortcuts])

  const dashboardHubs = useMemo<DashboardHubCard[]>(() => {
    const syncLabel = userLoggedIn
      ? SYNC_STATUS_LABELS[sync.syncStatus as DashboardSyncStatus]
      : 'Local'
    const plannedCardsCount = cards.filter((card) => card.location.day || card.hasDate).length

    return [
      {
        ...APP_HUBS[0],
        metrics: [
          { label: 'Cards ativos', value: String(plannedCardsCount) },
          { label: 'Eventos', value: String(calendarEvents.length) },
        ],
      },
      {
        ...APP_HUBS[1],
        metrics: [
          { label: 'Metas de foco', value: String(study.goals.length) },
          { label: 'Sessões', value: String(study.sessions.length) },
        ],
      },
      {
        ...APP_HUBS[2],
        metrics: [{ label: 'Notas', value: String(notes.length) }],
      },
      {
        ...APP_HUBS[3],
        metrics: [{ label: 'Projetos', value: String(projects.length) }],
      },
      {
        ...APP_HUBS[4],
        metrics: [
          { label: 'Clipboard', value: String(clipboardItems.length) },
          { label: 'Paletas', value: String(colorPalettes.length) },
        ],
      },
      {
        ...APP_HUBS[5],
        metrics: [
          { label: 'Sync', value: syncLabel },
          { label: 'Conta', value: userLoggedIn ? 'Online' : 'Local' },
        ],
      },
    ]
  }, [
    calendarEvents.length,
    cards,
    clipboardItems.length,
    colorPalettes.length,
    notes.length,
    projects.length,
    study.goals.length,
    study.sessions.length,
    sync.syncStatus,
    userLoggedIn,
  ])

  const currentHub = useMemo(
    () =>
      APP_HUBS.find((hub) => hub.views.some((view) => view.view === activeView)) ||
      (activeView === 'planner' ? APP_HUBS[0] : undefined),
    [activeView],
  )

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkInstaller = async () => {
      if (!isElectron()) {
        setShowInstaller(false)
        return
      }
      try {
        const isPackaged = await window.electronAPI.isPackaged()
        if (!isPackaged) {
          setShowInstaller(false)
          return
        }
        const isCompleted = await window.electronAPI.isInstallerCompleted()
        setShowInstaller(!isCompleted)
      } catch {
        setShowInstaller(false)
      }
    }
    checkInstaller()
  }, [])

  useEffect(() => {
    const theme = THEMES[settings.themeName]
    if (theme) applyTheme(theme)
  }, [settings.themeName])

  // Listener do popup do Super Whisper
  useEffect(() => {
    if (!isElectron()) return
    if (!window.electronAPI?.onSuperWhisperTranscript) return

    const handler = (text: string) => {
      if (!text || !text.trim()) return
      window.dispatchEvent(new CustomEvent('transcript:send-to-ai', { detail: { text } }))
      window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { text } }))
    }

    window.electronAPI.onSuperWhisperTranscript(handler)
    return () => {
      window.electronAPI.offSuperWhisperTranscript?.()
    }
  }, [])

  // Auto-purge da lixeira no startup
  useEffect(() => {
    purgeOldTrash()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-launch on boot
  const autoLaunchRanRef = useRef(false)
  useEffect(() => {
    if (autoLaunchRanRef.current) return
    if (isLoading) return
    if (!isElectron()) return
    if (apps.length === 0) return
    autoLaunchRanRef.current = true
    const targets = apps.filter((a) => a.autoLaunch === true && a.exePath)
    if (targets.length === 0) return
    targets.forEach((app, idx) => {
      setTimeout(() => {
        window.electronAPI?.launchExe?.(app.exePath).catch(() => {})
      }, idx * 2000)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, apps])

  // Lembretes de eventos do calendário
  useCalendarReminders({ calendarEvents })

  // Atalhos globais
  useGlobalShortcuts({
    activeView,
    keyboardShortcuts,
    setReduceModeSignal,
    setShowShortcutSearch: setShowViewsNavigator,
    setShowViewsNavigator,
    setShowClipboardModal,
    setViewZoom,
  })

  // Debug HUD
  const { debugTitlebarEnabled, debugInlineEnabled, debugText } = useAppDebugHud({
    settings,
    activeView,
  })

  const handleOpenShortcut = (url: string) => {
    void (async () => {
      if (!isElectron()) return
      await window.electronAPI.openExternal(url).catch(() => {})
    })()
  }

  const currentShellConfig = useMemo(() => {
    const buildConfig = () => {
      const defaultHub = currentHub?.label || 'Organon'
      const defaultView = APP_VIEW_LABELS[activeView] || activeView

      switch (activeView) {
        case 'projects':
          return {
            hubTitle: 'Operação',
            viewTitle: 'Projetos & Git',
            metricsText: `${projects.length} repositórios monitorados · Organon Git Engine`,
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Novo projeto/task'), variant: 'primary' as const },
              { label: 'Varredura Git', onClick: () => { (window as any).electronAPI?.gitEngine?.scan?.() } },
            ],
          }
        case 'okrs':
          return {
            hubTitle: 'Planejamento',
            viewTitle: 'OKRs & Metas',
            metricsText: 'Acompanhamento de Objetivos e Resultados-Chave (KRs)',
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Meta OKR'), variant: 'primary' as const },
            ],
          }
        case 'notes':
          return {
            hubTitle: 'Conhecimento',
            viewTitle: 'Notas & Documentos',
            metricsText: `${notes.length} anotações salvas no ecossistema`,
            actions: [
              { label: '+ Nova Nota', onClick: () => addNote('Nova Nota', ''), variant: 'primary' as const },
            ],
          }
        case 'study':
          return {
            hubTitle: 'Foco',
            viewTitle: 'Modo Foco & Pomodoro',
            metricsText: `${study.goals.length} metas · ${study.sessions.length} sessões concluídas`,
            actions: [
              { label: 'Ditado de Voz', onClick: () => setShowVoiceModal(true), variant: 'primary' as const },
            ],
          }
        case 'settings':
        case 'history':
          return {
            hubTitle: 'Sistema',
            viewTitle: 'Configurações & Histórico',
            metricsText: `Sincronização Local Wi-Fi Ativa · ${lastSyncAt ? 'Sincronizado' : 'Pronto'}`,
            actions: [
              { label: 'Wi-Fi QR Sync', onClick: () => setShowLocalSyncModal(true), variant: 'primary' as const },
              { label: 'Atualizações', onClick: () => setShowUpdateModal(true) },
            ],
          }
        default:
          const pending = cards.filter((c) => c.status !== 'done').length
          return {
            hubTitle: defaultHub,
            viewTitle: defaultView,
            metricsText: `${pending} cards pendentes · ${projects.length} repositórios monitorados`,
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Nova tarefa'), variant: 'primary' as const },
              { label: 'Ditado de Voz', onClick: () => setShowVoiceModal(true) },
            ],
          }
      }
    }

    const cfg = buildConfig()
    const chatAction = {
      label: isChatOpen ? 'Fechar IA' : 'Chat IA',
      onClick: () => setIsChatOpen((prev) => !prev),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      variant: isChatOpen ? ('primary' as const) : undefined,
    }

    return {
      hubTitle: cfg.hubTitle,
      viewTitle: cfg.viewTitle,
      metricsText: cfg.metricsText,
      footerActions: [...cfg.actions, chatAction],
    }
  }, [activeView, cards, projects, notes, study, currentHub, lastSyncAt, addCard, addNote, isChatOpen])

  // ── Early returns ───────────────────────────────────────────────────────────
  if (showInstaller === null) {
    return (
      <div className="app-container">
        <div className="app-status" style={{ color: 'var(--color-text-muted)' }}>
          <div className="app-status-title">Iniciando...</div>
        </div>
      </div>
    )
  }

  if (showInstaller) {
    return (
      <div className="app-container">
        <Titlebar debugText={debugTitlebarEnabled ? debugText : null} />
        <InstallerView
          onComplete={() => {
            setShowInstaller(false)
            window.location.reload()
          }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <Titlebar debugText={debugTitlebarEnabled ? debugText : null} />
        <div className="app-body">
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
        <Titlebar debugText={debugTitlebarEnabled ? debugText : null} />
        <div className="app-body">
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
      <Titlebar debugText={debugTitlebarEnabled ? debugText : null} />
      {debugInlineEnabled && debugText && (
        <div className="debug-hud-inline" title={debugText}>
          {debugText}
        </div>
      )}
      <GlobalShellLayout
        hubTitle={currentShellConfig.hubTitle}
        viewTitle={currentShellConfig.viewTitle}
        metricsText={currentShellConfig.metricsText}
        notifications={
          cards.filter((c) => c.date && new Date(c.date) < new Date() && c.status !== 'done').length > 0
            ? [
                {
                  id: 'notif-overdue',
                  title: 'Tarefas Atrasadas',
                  message: `Você possui ${
                    cards.filter((c) => c.date && new Date(c.date) < new Date() && c.status !== 'done').length
                  } card(s) em atraso no Planejamento.`,
                  timestamp: 'Hoje',
                  type: 'warning',
                  category: 'task',
                  actionView: 'planner',
                },
              ]
            : []
        }
        onClearNotifications={() => {}}
        onNavigateView={(v) => setActiveView(v as AppView)}
        onOpenSyncModal={() => setShowLocalSyncModal(true)}
        footerActions={currentShellConfig.footerActions}
      >
        <TopNavbarShell
          activeView={activeView}
          hubTitle={currentShellConfig.hubTitle}
          viewTitle={currentShellConfig.viewTitle}
          onNavigateHome={() => setActiveView('today')}
          onNavigateView={(v) => setActiveView(v)}
          onOpenQuickSearch={() => setShowViewsNavigator(true)}
          onOpenSettings={() => setActiveView('settings')}
          onOpenSyncModal={() => setShowLocalSyncModal(true)}
          onOpenVoice={() => setShowVoiceModal(true)}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onNewTask={() => setActiveView('planner')}
          onNewNote={() => {
            const newNote = addNote('Nova Nota', '')
            if (newNote?.id) {
              setPendingNoteId(newNote.id)
            }
            setActiveView('notes')
          }}
          isChatOpen={isChatOpen}
          lastSyncAt={lastSyncAt}
          syncStatus={sync.syncStatus}
        />

        <AppViewRouter
          activeView={activeView}
          activeZoom={activeZoom}
          cards={cards}
          calendarEvents={calendarEvents}
          notes={notes}
          noteFolders={noteFolders}
          colorPalettes={colorPalettes}
          clipboardCategories={clipboardCategories}
          clipboardItems={clipboardItems}
          apps={apps}
          study={study}
          settings={settings}
          projects={projects}
          meetings={meetings}
          registeredIDEs={registeredIDEs}
          dashboardHubs={dashboardHubs}
          syncStatus={sync.syncStatus as DashboardSyncStatus}
          syncError={sync.syncError}
          lastSyncAt={lastSyncAt}
          userLoggedIn={userLoggedIn}
          isConfigured={isConfigured}
          pendingNoteId={pendingNoteId}
          reduceModeSignal={reduceModeSignal}
          keyboardShortcuts={keyboardShortcuts}
          noteTemplates={noteTemplates}
          canvasFolders={canvasFolders}
          canvasFolderAssignments={canvasFolderAssignments}
          canvasVersions={canvasVersions}
          onSetActiveView={setActiveView}
          onEditCard={editCard}
          onAddCard={addCard}
          onAddCalendarEvent={addCalendarEvent}
          onAddNote={addNote}
          onUpdateNote={updateNote}
          onToggleNoteFavorite={toggleNoteFavorite}
          onToggleNotePinned={toggleNotePinned}
          onToggleNoteLock={toggleNoteLock}
          onReorderNotes={reorderNotes}
          onReorderNoteFolders={reorderNoteFolders}
          onAddNoteFolder={addNoteFolder}
          onUpdateNoteFolder={updateNoteFolder}
          onSoftDeleteNote={softDeleteNote}
          onSoftDeleteNoteFolder={softDeleteNoteFolder}
          onRestoreNote={restoreNote}
          onRestoreNoteFolder={restoreNoteFolder}
          onPurgeNote={purgeNote}
          onPurgeNoteFolder={purgeNoteFolder}
          onEmptyNotesTrash={emptyNotesTrash}
          onSetNoteBookmarks={setNoteBookmarks}
          onSetPendingNoteId={setPendingNoteId}
          onUpdateStudy={updateStudy}
          onUpdateSettings={updateSettings}
          onOpenShortcut={handleOpenShortcut}
          onUpdateDashboardLayout={updateDashboardLayout}
          onUpdateDashboardWidgets={updateDashboardWidgets}
          onSaveDashboardTemplate={saveDashboardTemplate}
          onDeleteDashboardTemplate={deleteDashboardTemplate}
          onAddCanvasFolder={addCanvasFolder}
          onRenameCanvasFolder={renameCanvasFolder}
          onRemoveCanvasFolder={removeCanvasFolder}
          onMoveCanvasToFolder={moveCanvasToFolder}
          onSnapshotCanvasVersion={snapshotCanvasVersion}
          onRemoveCanvasVersion={removeCanvasVersion}
          onAddClipboardCategory={addClipboardCategory}
          onRenameClipboardCategory={renameClipboardCategory}
          onRemoveClipboardCategory={removeClipboardCategory}
          onAddClipboardItem={addClipboardItem}
          onUpdateClipboardItem={updateClipboardItem}
          onRemoveClipboardItem={removeClipboardItem}
          onMoveClipboardItemToCategory={moveClipboardItemToCategory}
          onIncrementClipboardCopyCount={incrementClipboardCopyCount}
          onToggleClipboardSnippet={toggleClipboardSnippet}
          onAddColorPalette={addColorPalette}
          onUpdateColorPalette={updateColorPalette}
          onRemoveColorPalette={removeColorPalette}
          onAddRegisteredIDE={addRegisteredIDE}
          onUpdateRegisteredIDE={updateRegisteredIDE}
          onRemoveRegisteredIDE={removeRegisteredIDE}
          onResetStore={handleResetStore}
          onRunSyncNow={() => {
            void sync.runSyncNow()
          }}
          onLoginWithSync={loginWithSync}
          onRegisterWithSync={registerWithSync}
          auth={auth}
        />
      </GlobalShellLayout>

      <AppGlobalModals
        settings={settings}
        notes={notes}
        noteFolders={noteFolders}
        cards={cards}
        clipboardCategories={clipboardCategories}
        clipboardItems={clipboardItems}
        activeView={activeView}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        showLocalSyncModal={showLocalSyncModal}
        setShowLocalSyncModal={setShowLocalSyncModal}
        showVoiceModal={showVoiceModal}
        setShowVoiceModal={setShowVoiceModal}
        showViewsNavigator={showViewsNavigator}
        setShowViewsNavigator={setShowViewsNavigator}
        showClipboardModal={showClipboardModal}
        setShowClipboardModal={setShowClipboardModal}
        showUpdateModal={showUpdateModal}
        setShowUpdateModal={setShowUpdateModal}
        showLoginSync={sync.showLoginSync}
        onAddCard={addCard}
        onAddNote={addNote}
        onUpdateNote={updateNote}
        onAddNoteFolder={addNoteFolder}
        onUpdateNoteFolder={updateNoteFolder}
        onSetActiveView={setActiveView}
        onSetPendingNoteId={setPendingNoteId}
        onIncrementCopyCount={incrementClipboardCopyCount}
      />
    </div>
  )
}
