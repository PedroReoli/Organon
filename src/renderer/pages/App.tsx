import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useStore, useAuth, useSync, useGlobalShortcuts, useClipboardExpiration, useRealtime } from './shared/hooks'
import { Chatbot } from './NotesPage/notes/Chatbot'
import { deleteAllFromApi } from '../../api/sync'
import { applyTheme, expandCalendarEvents, isElectron, getShortcutById as _getShortcutById, matchesShortcut as _matchesShortcut } from '@utils'
import { THEMES, DEFAULT_SETTINGS, DEFAULT_DASHBOARD_WIDGETS } from '@types'
import type { Card, DashboardWidget } from '@types'
import { Titlebar } from './shared/Titlebar'
import { DashboardPage, type DashboardHubCard, type DashboardSyncStatus } from './DashboardPage/DashboardPage'
import { InstallerView } from './SettingsPage/InstallerView'
import { SyncProgressModal } from './shared/modals/SyncProgressModal'
import { ViewsNavigatorModal } from './shared/modals/ViewsNavigatorModal'
import { ClipboardQuickModal } from './ClipboardPage/clipboard/ClipboardQuickModal'
import { LocalSyncModal } from './shared/modals/LocalSyncModal'
import { VoiceDictationModal } from './shared/modals/VoiceDictationModal'
import { UpdateModal } from '../components/UpdateModal'
import { HubConhecimento } from './DashboardPage/hubs/HubConhecimento'
import { HubEstudos }      from './DashboardPage/hubs/HubEstudos'
import { HubTrabalho }     from './DashboardPage/hubs/HubTrabalho'
import { HubFerramentas }  from './DashboardPage/hubs/HubFerramentas'
import { HubSistema }      from './DashboardPage/hubs/HubSistema'
import { PlannerPage }     from './PlannerPage'
import { TopNavbarShell } from '../components/layout/TopNavbarShell'
import { GlobalShellLayout } from '../components/layout/GlobalShellLayout'
import { useWakeWordListener } from '../hooks/useWakeWordListener'
import { ViewLoadingSkeleton } from './shared/components/display/ViewLoadingSkeleton'
import type { AppView } from './shared/InternalNav'

// Sub-upgrade: Lazy loading com code splitting dos módulos pesados
const CanvasView = lazy(() => import('./CanvasPage/canvas').then(m => ({ default: m.CanvasView })))
const WhisperPage = lazy(() => import('./WhisperPage/WhisperPage').then(m => ({ default: m.WhisperPage })))
const AudioPage = lazy(() => import('./AudioPage/AudioPage').then(m => ({ default: m.AudioPage })))
const LibraryPage = lazy(() => import('./LibraryPage/LibraryPage').then(m => ({ default: m.LibraryPage })))
const OKRsPage = lazy(() => import('./OKRsPage/OKRsPage').then(m => ({ default: m.OKRsPage })))
const SystemDesignPage = lazy(() => import('./SystemDesignPage/SystemDesignPage').then(m => ({ default: m.SystemDesignPage })))


type AppHub = {
  id: string
  label: string
  description: string
  accent: string
  primaryView: AppView
  views: Array<{ view: AppView; label: string }>
}

const APP_VIEW_LABELS: Record<AppView, string> = {
  today: 'Dashboard',
  agenda: 'Planejamento',
  planner: 'Planejamento',
  calendar: 'Planejamento',
  okrs: 'OKRs & Metas',
  study: 'Modo Foco',
  notes: 'Notas',
  playbook: 'Playbook',
  library: 'Biblioteca',
  canvas: 'Canvas',
  transcripts: 'Whisper Transcrições',
  audio: 'Áudio & Gravações',
  crm: 'CRM Contatos',
  projects: 'Projetos & Git',
  clipboard: 'Clipboard Manager',
  colors: 'Paletas de Cores',
  'system-design': 'System Design',
  settings: 'Configurações',
  history: 'Histórico',
  shortcuts: 'Atalhos',
  apps: 'Aplicativos',
  habits: 'Hábitos',
  financial: 'Financeiro',
  workflow: 'Workflows',
}

const APP_HUBS: AppHub[] = [
  {
    id: 'planning',
    label: 'Planejamento',
    description: 'Sprint board, calendário e grade horária unificados.',
    accent: 'var(--color-primary)',
    primaryView: 'agenda',
    views: [
      { view: 'agenda', label: 'Planejamento' },
      { view: 'calendar', label: 'Calendário' },
      { view: 'okrs', label: 'OKRs & Metas' },
    ],
  },
  {
    id: 'focus',
    label: 'Foco',
    description: 'Sessões de foco contínuo, Pomodoro e metas ativas.',
    accent: '#10b981',
    primaryView: 'study',
    views: [
      { view: 'study', label: 'Modo Foco' },
    ],
  },
  {
    id: 'content',
    label: 'Conhecimento',
    description: 'Notas, playbooks, biblioteca, gravações e canvas.',
    accent: 'var(--color-primary)',
    primaryView: 'notes',
    views: [
      { view: 'notes',       label: 'Notas'        },
      { view: 'playbook',    label: 'Playbook'     },
      { view: 'library',     label: 'Biblioteca'   },
      { view: 'canvas',      label: 'Canvas'       },
      { view: 'transcripts', label: 'Whisper'      },
      { view: 'audio',       label: 'Áudio'        },
    ],
  },
  {
    id: 'operation',
    label: 'Operação',
    description: 'CRM e relatórios de código dos seus repositórios Git.',
    accent: '#f97316',
    primaryView: 'crm',
    views: [
      { view: 'crm',      label: 'CRM'      },
      { view: 'projects', label: 'Projetos' },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    description: 'Gerenciador de área de transferência, paletas e diagramas.',
    accent: '#60a5fa',
    primaryView: 'clipboard',
    views: [
      { view: 'clipboard',     label: 'Clipboard'     },
      { view: 'colors',        label: 'Cores'         },
      { view: 'system-design', label: 'System Design' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    description: 'Configurações do aplicativo, sync local e histórico.',
    accent: '#94a3b8',
    primaryView: 'settings',
    views: [
      { view: 'settings', label: 'Configurações' },
      { view: 'history',  label: 'Histórico'     },
    ],
  },
]


const SYNC_STATUS_LABELS: Record<DashboardSyncStatus, string> = {
  idle: 'Local',
  pending: 'Pendente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  error: 'Erro',
}

const DEBUG_SCREEN_EVENT = 'organon:debug-screen'

export const App = () => {
  const {
    cards, calendarEvents,
    noteFolders, notes, colorPalettes, clipboardCategories, clipboardItems,
    apps = [],
    study, settings, isLoading, error,
    addCard, editCard,
    canvasFolders, canvasFolderAssignments, canvasVersions,
    addCanvasFolder, renameCanvasFolder, removeCanvasFolder, moveCanvasToFolder,
    snapshotCanvasVersion, removeCanvasVersion,
    sprintColumns: _sprintColumns, sprintColumnGroups: _sprintColumnGroups, sprintSwimLanes: _sprintSwimLanes, sprintBoardConfig: _sprintBoardConfig,
    addCalendarEvent,
    addClipboardCategory, renameClipboardCategory, removeClipboardCategory,
    addClipboardItem, updateClipboardItem, removeClipboardItem, moveClipboardItemToCategory,
    toggleClipboardSnippet, purgeExpiredClipboard,
    addNoteFolder, updateNoteFolder, removeNoteFolder: _removeNoteFolder, reorderNoteFolders,
    addNote, updateNote, toggleNoteFavorite, toggleNotePinned, toggleNoteLock,
    reorderNotes, removeNote: _removeNote,
    softDeleteNote, softDeleteNoteFolder, restoreNote, restoreNoteFolder,
    purgeNote, purgeNoteFolder, purgeOldTrash, emptyNotesTrash,
    noteTemplates, addNoteTemplate: _addNoteTemplate, updateNoteTemplate: _updateNoteTemplate, removeNoteTemplate: _removeNoteTemplate,
    setNoteBookmarks,
    addColorPalette, updateColorPalette, removeColorPalette,
    resetStore, clearUserData,
    projects, meetings, playbooks, registeredIDEs,
    addRegisteredIDE, updateRegisteredIDE, removeRegisteredIDE,
    crmContacts, crmInteractions, crmTags, crmSnapshots, lastSyncAt,
    addCRMContact, updateCRMContact, removeCRMContact,
    moveCRMContactToStage, reorderCRMContacts,
    addCRMInteraction, removeCRMInteraction,
    addCRMTag, removeCRMTag,
    addCRMContactLink, removeCRMContactLink,
    migrateCRMContactStages, upsertCRMSnapshot,
    addPlaybook, updatePlaybook, removePlaybook,
    addPlaybookDialog, updatePlaybookDialog, removePlaybookDialog,
    reorderPlaybookDialogs, duplicatePlaybookDialog,
    playbookFolders,
    addPlaybookFromTemplate, snapshotPlaybookVersion, restorePlaybookVersion,
    togglePlaybookFavorite, togglePlaybookArchived, movePlaybookToFolder,
    incrementPlaybookViewCount, incrementDialogCopyCount,
    updatePlaybookDialogVariables,
    addPlaybookFolder, updatePlaybookFolder, removePlaybookFolder,
    updateSettings, updateStudy, replaceStore, updateStore, storeVersion,
    incrementClipboardCopyCount,
    updateDashboardLayout, updateDashboardWidgets,
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

  const apiBaseUrl  = (settings.apiBaseUrl ?? '').trim() || 'https://reolicodeapi.com'
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

  const loginWithSync = useCallback(async (email: string, password: string): Promise<boolean> => {
    const ok = await auth.login(email, password)
    if (ok) sync.setShowLoginSync(true)
    return ok
  }, [auth, sync])

  const registerWithSync = useCallback(async (email: string, password: string, name?: string): Promise<boolean> => {
    const ok = await auth.register(email, password, name)
    if (ok) sync.setShowLoginSync(true)
    return ok
  }, [auth, sync])

  const handleResetStore = useCallback(async () => {
    if (userLoggedIn && isElectron()) {
      try {
        const rawStore = await window.electronAPI.loadStore()
        await deleteAllFromApi(rawStore)
      } catch { /* ignora erros de API */ }
    }
    await resetStore()
  }, [userLoggedIn, resetStore])

  // ── UI state ────────────────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<AppView>('today')
  const [showLocalSyncModal, setShowLocalSyncModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

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
  const [showInstaller, setShowInstaller]         = useState<boolean | null>(null)
  useClipboardExpiration({ retentionDays: 30, onPurge: purgeExpiredClipboard })
  const [showViewsNavigator, setShowViewsNavigator] = useState(false)
  const [showClipboardModal, setShowClipboardModal] = useState(false)
  const [reduceModeSignal, setReduceModeSignal]   = useState(0)
  const [pendingNoteId, setPendingNoteId]         = useState<string | null>(null)

  const [viewZoom, setViewZoom] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('view-zoom') ?? '{}') } catch { return {} }
  })
  const activeZoom = viewZoom[activeView] ?? 1

  const keyboardShortcuts = useMemo(() => {
    const defaults = DEFAULT_SETTINGS.keyboardShortcuts || []
    const saved    = settings.keyboardShortcuts || []
    const byId     = new Map(saved.map(s => [s.id, s]))
    return defaults.map(d => {
      const custom = byId.get(d.id)
      return custom ? { ...d, ...custom, keys: custom.keys } : d
    })
  }, [settings.keyboardShortcuts])

  const dashboardHubs = useMemo<DashboardHubCard[]>(() => {
    const syncLabel = userLoggedIn ? SYNC_STATUS_LABELS[sync.syncStatus as DashboardSyncStatus] : 'Local'
    const plannedCardsCount = cards.filter(card => card.location.day || card.hasDate).length

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
        metrics: [
          { label: 'Notas', value: String(notes.length) },
          { label: 'Playbooks', value: String(playbooks.length) },
        ],
      },
      {
        ...APP_HUBS[3],
        metrics: [
          { label: 'Contatos', value: String(crmContacts.length) },
          { label: 'Projetos', value: String(projects.length) },
        ],
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
    crmContacts.length,
    notes.length,
    playbooks.length,
    projects.length,
    study.goals.length,
    study.sessions.length,
    sync.syncStatus,
    userLoggedIn,
  ])

  const currentHub = useMemo(() => (
    APP_HUBS.find(hub => hub.views.some(view => view.view === activeView)) ||
    (activeView === 'planner' ? APP_HUBS[0] : undefined)
  ), [activeView])

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkInstaller = async () => {
      if (!isElectron()) { setShowInstaller(false); return }
      try {
        const isPackaged = await window.electronAPI.isPackaged()
        if (!isPackaged) { setShowInstaller(false); return }
        const isCompleted = await window.electronAPI.isInstallerCompleted()
        setShowInstaller(!isCompleted)
      } catch { setShowInstaller(false) }
    }
    checkInstaller()
  }, [])

  useEffect(() => {
    const theme = THEMES[settings.themeName]
    if (theme) applyTheme(theme)
  }, [settings.themeName])

  // Listener do popup do Super Whisper: quando o popup envia uma transcrição
  // via IPC `super-whisper:transcription`, abre o Chatbot com o texto pré-preenchido.
  useEffect(() => {
    if (!isElectron()) return
    if (!window.electronAPI?.onSuperWhisperTranscript) return

    const handler = (text: string) => {
      if (!text || !text.trim()) return
      // Dispara evento customizado que o Chatbot escuta (ou pode escutar) para
      // preencher o input. Mantém compatibilidade com o listener já existente em
      // TranscriptsPage (`transcript:send-to-ai`).
      window.dispatchEvent(new CustomEvent('transcript:send-to-ai', { detail: { text } }))
      // E abre o chatbot navegando para a view notes (o Chatbot é renderizado
      // globalmente, mas só fica visível quando setIsOpen(true) - usamos o
      // evento para isso também).
      window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { text } }))
    }

    window.electronAPI.onSuperWhisperTranscript(handler)
    return () => {
      window.electronAPI.offSuperWhisperTranscript?.()
    }
  }, [])

  // Upgrade 10a: auto-purge da lixeira no startup (notas/pastas com >30d em soft delete)
  useEffect(() => {
    purgeOldTrash()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Upgrade 17: auto-launch on boot — apps marcados como autoLaunch sao iniciados
  // ao abrir o Organon, com 2s de delay entre cada para nao sobrecarregar.
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

  const reminderFiredRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (calendarEvents.length === 0) return

    const toISODate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm   = String(d.getMonth() + 1).padStart(2, '0')
      const dd   = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    const addDays = (iso: string, days: number) => {
      const d = new Date(iso + 'T00:00:00')
      d.setDate(d.getDate() + days)
      return toISODate(d)
    }
    const fire = (title: string, body: string) => {
      try { new Notification(title, { body }) } catch { /* ignore */ }
    }
    const tick = () => {
      const now     = new Date()
      const nowMs   = now.getTime()
      const windowMs = 60 * 1000
      const startISO = toISODate(now)
      const endISO   = addDays(startISO, 2)
      const upcoming = expandCalendarEvents(calendarEvents, startISO, endISO)

      for (const ev of upcoming) {
        if (!ev.reminder?.enabled || !ev.time) continue
        const dt         = new Date(`${ev.date}T${ev.time}:00`)
        const reminderAt = dt.getTime() - (ev.reminder.offsetMinutes || 0) * 60 * 1000
        const key        = `${(ev as { sourceId?: string }).sourceId ?? ev.id}|${ev.date}|${ev.time}|${ev.reminder.offsetMinutes}`
        if (reminderAt <= nowMs && reminderAt > nowMs - windowMs) {
          if (reminderFiredRef.current.has(key)) continue
          reminderFiredRef.current.add(key)
          const when = ev.reminder.offsetMinutes === 0 ? 'Agora'
            : ev.reminder.offsetMinutes === 60  ? 'Em 1 hora'
            : ev.reminder.offsetMinutes === 120 ? 'Em 2 horas'
            : ev.reminder.offsetMinutes === 1440 ? 'Em 1 dia'
            : `Em ${ev.reminder.offsetMinutes} min`
          fire(`Lembrete: ${ev.title}`, `${when} • ${ev.date} ${ev.time}`)
        }
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {})
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [calendarEvents])

  // Atalhos globais (extraidos para hook useGlobalShortcuts no upgrade 07 sub-G)
  useGlobalShortcuts({
    activeView,
    keyboardShortcuts,
    setReduceModeSignal,
    setShowShortcutSearch: setShowViewsNavigator,
    setShowViewsNavigator,
    setShowClipboardModal,
    setViewZoom,
  })

  // ── Debug HUD (DEV) ────────────────────────────────────────────────────────

  const debugTitlebarEnabled = import.meta.env.DEV && (settings.debugHudTitlebar ?? false)
  const debugInlineEnabled = import.meta.env.DEV && (settings.debugHudInline ?? false)
  const debugHoverEnabled = import.meta.env.DEV && (settings.debugHudHover ?? true)
  const debugAnyEnabled = debugTitlebarEnabled || debugInlineEnabled

  const [debugScreenOverride, setDebugScreenOverride] = useState<string | null>(null)
  const [debugHover, setDebugHover] = useState<string | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onScreen = (event: Event) => {
      const e = event as CustomEvent<{ screen?: string }>
      setDebugScreenOverride(e.detail?.screen ?? null)
    }
    window.addEventListener(DEBUG_SCREEN_EVENT, onScreen as EventListener)
    return () => window.removeEventListener(DEBUG_SCREEN_EVENT, onScreen as EventListener)
  }, [])

  useEffect(() => {
    if (!debugAnyEnabled || !debugHoverEnabled) {
      setDebugHover(null)
      return
    }

    let raf = 0
    let last = ''

    const pickLabel = (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)
      if (!el || !el.closest) return ''

      const parts: string[] = []
      let node: HTMLElement | null = el

      while (node && parts.length < 6) {
        const debugName = node.getAttribute?.('data-debug-name')
        if (debugName) {
          const debugId = node.getAttribute('data-debug-id') ?? ''
          parts.unshift(debugId ? `${debugName}#${debugId}` : debugName)
          node = node.parentElement
          continue
        }

        const cls = typeof node.className === 'string' ? node.className : ''

        if (cls.includes('sprint-card') && !parts.some(p => p.includes('SprintCardItem'))) {
          const title = node.querySelector('.sprint-card-title')?.textContent?.trim()
          parts.unshift(`SprintCardItem#${title || node.getAttribute('data-debug-id') || '?'}`)
        } else if (cls.includes('period-cell') && !parts.some(p => p.includes('Cell'))) {
          const id = node.getAttribute('data-debug-id') || ''
          parts.unshift(id ? `PeriodView.Cell#${id}` : 'PeriodView.Cell')
        } else if (cls.includes('period-grid') && !parts.some(p => p.includes('PeriodView'))) {
          parts.unshift('PeriodView.Grid')
        } else if ((cls.includes('period-backlog') || cls.includes('hourly-backlog')) && !parts.some(p => p.includes('Backlog'))) {
          parts.unshift('PeriodView.Backlog')
        } else if (cls.includes('period-view') && !parts.some(p => p.includes('PeriodView'))) {
          parts.unshift('views/PeriodView')
        } else if ((cls.includes('hourly-view') || cls.includes('hourly-grid')) && !parts.some(p => p.includes('Hourly'))) {
          parts.unshift('views/HourlyView')
        } else if (cls.includes('planning-hub') && !parts.some(p => p.includes('HubPlanejamento'))) {
          parts.unshift('hubs/HubPlanejamento')
        } else if (cls.includes('planning-home') && !parts.some(p => p.includes('PlanningHome'))) {
          parts.unshift('planning/PlanningHomePage')
        } else if (cls.includes('planning-month') && !parts.some(p => p.includes('MonthView'))) {
          parts.unshift('views/MonthView')
        } else if (cls.includes('planning-timeline') && !parts.some(p => p.includes('Timeline'))) {
          parts.unshift('views/TimelineView')
        } else if (cls.includes('crm-hub') && !parts.some(p => p.includes('CRM'))) {
          parts.unshift('hubs/HubCRM')
        } else if (cls.includes('crm-pipeline') && !parts.some(p => p.includes('Pipeline'))) {
          parts.unshift('CRMPipeline')
        } else if (cls.includes('crm-contact-card') && !parts.some(p => p.includes('ContactCard'))) {
          const name = node.querySelector('.crm-contact-name')?.textContent?.trim()
          parts.unshift(`CRMContactCard#${name || '?'}`)
        } else if ((cls.includes('notes-view') || cls.includes('notes-')) && !parts.some(p => p.includes('Notes'))) {
          parts.unshift('NotesView')
        } else if (cls.includes('note-editor') && !parts.some(p => p.includes('Editor'))) {
          parts.unshift('WysiwygEditor')
        } else if (cls.includes('financial-') && !parts.some(p => p.includes('Financial'))) {
          parts.unshift('FinancialView')
        } else if (cls.includes('habits-') && !parts.some(p => p.includes('Habits'))) {
          parts.unshift('HabitsView')
        } else if (cls.includes('study-') && !parts.some(p => p.includes('Study'))) {
          parts.unshift('StudyView')
        } else if (cls.includes('canvas-') && !parts.some(p => p.includes('Canvas'))) {
          parts.unshift('canvas/CanvasView')
        } else if (cls.includes('playbook-') && !parts.some(p => p.includes('Playbook'))) {
          parts.unshift('PlaybookView')
        } else if (cls.includes('settings-section') && !parts.some(p => p.includes('Section'))) {
          const heading = node.querySelector('h2, h3, [class*=title]')?.textContent?.trim()
          parts.unshift(`SettingsSection#${heading || '?'}`)
        } else if (cls.includes('settings-') && !parts.some(p => p.includes('Settings'))) {
          parts.unshift('settings/SettingsView')
        } else if (cls.includes('app-navbar') && !parts.some(p => p.includes('Navbar'))) {
          parts.unshift('Navbar')
        } else if (cls.includes('titlebar') && !parts.some(p => p.includes('Titlebar'))) {
          parts.unshift('Titlebar')
        } else if (cls.includes('app-view-toolbar') && !parts.some(p => p.includes('Toolbar'))) {
          parts.unshift('App.Toolbar')
        } else if (cls.includes('app-view-shell') && !parts.some(p => p.includes('App'))) {
          parts.unshift('App.Shell')
        }

        node = node.parentElement
      }

      if (parts.length === 0) {
        const tag = el.tagName?.toLowerCase() ?? ''
        const firstCls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''
        return firstCls ? `<${tag}.${firstCls}>` : `<${tag}>`
      }

      return parts.join(' > ')
    }

    const onMove = (ev: PointerEvent) => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const label = pickLabel(ev.target)
        if (label === last) return
        last = label
        setDebugHover(label || null)
      })
    }

    const onContextMenu = (ev: MouseEvent) => {
      if (!ev.ctrlKey) return
      ev.preventDefault()
      const label = pickLabel(ev.target)
      if (label) {
        navigator.clipboard.writeText(label).then(() => {
          showDebugToast(label)
        }).catch(() => {})
      }
    }

    function showDebugToast(text: string) {
      const existing = document.querySelector('.debug-copy-toast')
      if (existing) existing.remove()
      const toast = document.createElement('div')
      toast.className = 'debug-copy-toast'
      toast.textContent = `Copiado: ${text}`
      document.body.appendChild(toast)
      setTimeout(() => toast.classList.add('is-visible'), 10)
      setTimeout(() => {
        toast.classList.remove('is-visible')
        setTimeout(() => toast.remove(), 200)
      }, 2000)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('contextmenu', onContextMenu)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [debugAnyEnabled, debugHoverEnabled])

  const handleOpenShortcut = (url: string) => {
    void (async () => {
      if (!isElectron()) return
      await window.electronAPI.openExternal(url).catch(() => {})
    })()
  }

  const debugScreen = debugScreenOverride ?? APP_VIEW_LABELS[activeView] ?? activeView
  const debugText = debugAnyEnabled
    ? `Tela: ${debugScreen}${debugHover ? ` · Hover: ${debugHover}` : ''}`
    : null

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
        case 'library':
          return {
            hubTitle: 'Conhecimento',
            viewTitle: 'Biblioteca & Mídias',
            metricsText: 'Módulo Biblioteca · Documentos, PDFs e Arquivos Locais',
            actions: [
              { label: '+ Nova Nota', onClick: () => addNote('Documento', ''), variant: 'primary' as const },
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
        case 'crm':
          return {
            hubTitle: 'Operação',
            viewTitle: 'CRM Contatos',
            metricsText: `${crmContacts.length} contatos cadastrados no pipeline`,
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Novo lead CRM'), variant: 'primary' as const },
            ],
          }
        case 'playbook':
          return {
            hubTitle: 'Conhecimento',
            viewTitle: 'Playbooks & Scripts',
            metricsText: `${playbooks.length} playbooks cadastrados`,
            actions: [
              { label: '+ Nova Nota', onClick: () => addNote('Novo Playbook', ''), variant: 'primary' as const },
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
          const pending = cards.filter(c => c.status !== 'done').length
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
      onClick: () => setIsChatOpen(prev => !prev),
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
  }, [activeView, cards, projects, notes, crmContacts, playbooks, study, currentHub, lastSyncAt, addCard, addNote, isChatOpen])

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
        <InstallerView onComplete={() => { setShowInstaller(false); window.location.reload() }} />
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
        notifications={cards.filter(c => c.date && new Date(c.date) < new Date() && c.status !== 'done').length > 0 ? [{
          id: 'notif-overdue',
          title: 'Tarefas Atrasadas',
          message: `Você possui ${cards.filter(c => c.date && new Date(c.date) < new Date() && c.status !== 'done').length} card(s) em atraso no Planejamento.`,
          timestamp: 'Hoje',
          type: 'warning',
          category: 'task',
          actionView: 'planner'
        }] : []}
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
          onToggleChat={() => setIsChatOpen(prev => !prev)}
          onNewTask={() => setActiveView('planner')}
          onNewNote={() => {
            addNote('Nova Nota', '')
            setActiveView('notes')
          }}
          isChatOpen={isChatOpen}
          lastSyncAt={lastSyncAt}
          syncStatus={sync.syncStatus}
        />

        <div className="app-body" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="app-view">
          {activeView === 'today' && (
            <DashboardPage
              cards={cards}
              calendarEvents={calendarEvents}
              notes={notes}
              study={study}
              hubCards={dashboardHubs}
              crmContactsCount={crmContacts.length}
              projectsCount={projects.length}
              playbooksCount={playbooks.length}
              colorPalettesCount={colorPalettes.length}
              clipboardCategoriesCount={clipboardCategories.length}
              clipboardItemsCount={clipboardItems.length}
              syncStatus={sync.syncStatus as DashboardSyncStatus}
              lastSyncAt={lastSyncAt}
              userLoggedIn={userLoggedIn}
              dashboardLayout={settings.dashboardLayout ?? 'hub'}
              dashboardWidgets={settings.dashboardWidgets ?? DEFAULT_DASHBOARD_WIDGETS}
              onDashboardLayoutChange={updateDashboardLayout}
              onDashboardWidgetsChange={updateDashboardWidgets}
              dashboardTemplates={settings.dashboardTemplates ?? []}
              onSaveTemplate={(name: string, widgets: DashboardWidget[]) => saveDashboardTemplate(name, 'custom', widgets)}
              onDeleteTemplate={deleteDashboardTemplate}
              onGoToPlannerCard={(_cardId: string) => { setActiveView('planner') }}
              onGoToCalendarDate={(_dateISO: string) => { setActiveView('calendar') }}
              onOpenShortcut={handleOpenShortcut}
              onGoToNotes={() => setActiveView('notes')}
              onNavigate={(view: AppView) => setActiveView(view)}
            />
          )}
          {activeView !== 'today' && (
            <div className="app-view-content app-view-content-enter" style={activeZoom !== 1 ? { zoom: activeZoom } : undefined}>
                {(activeView === 'agenda' || activeView === 'planner' || activeView === 'calendar') && (
                  <PlannerPage />
                )}

                {(activeView === 'notes' || activeView === 'playbook') && (
                  <HubConhecimento
                    activeView={activeView}
                    notes={notes}
                    folders={noteFolders}
                    onAddNote={(title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => addNote(typeof title === 'string' ? title : 'Nova nota', folderId, projectId, parentNoteId)}
                    onUpdateNote={updateNote}
                    onToggleFavorite={toggleNoteFavorite}
                    onTogglePinned={toggleNotePinned}
                    onToggleLock={toggleNoteLock}
                    onReorderNotes={reorderNotes}
                    onReorderFolders={reorderNoteFolders}
                    onRemoveNote={softDeleteNote}
                    onAddFolder={addNoteFolder}
                    onUpdateFolder={updateNoteFolder}
                    onRemoveFolder={softDeleteNoteFolder}
                    reduceModeSignal={reduceModeSignal}
                    initialNoteId={pendingNoteId}
                    onInitialNoteConsumed={() => setPendingNoteId(null)}
                    keyboardShortcuts={keyboardShortcuts}
                    onSoftDeleteNote={softDeleteNote}
                    onSoftDeleteFolder={softDeleteNoteFolder}
                    onRestoreNote={restoreNote}
                    onRestoreFolder={restoreNoteFolder}
                    onPurgeNote={purgeNote}
                    onPurgeFolder={purgeNoteFolder}
                    onEmptyTrash={emptyNotesTrash}
                    noteTemplates={noteTemplates}
                    onSetNoteBookmarks={setNoteBookmarks}
                    playbooks={playbooks}
                    playbookFolders={playbookFolders}
                    onAddPlaybook={addPlaybook}
                    onUpdatePlaybook={updatePlaybook}
                    onRemovePlaybook={removePlaybook}
                    onAddDialog={addPlaybookDialog}
                    onUpdateDialog={updatePlaybookDialog}
                    onRemoveDialog={removePlaybookDialog}
                    onReorderDialogs={reorderPlaybookDialogs}
                    onDuplicateDialog={duplicatePlaybookDialog}
                    onAddPlaybookFromTemplate={addPlaybookFromTemplate}
                    onSnapshotPlaybookVersion={snapshotPlaybookVersion}
                    onRestorePlaybookVersion={restorePlaybookVersion}
                    onTogglePlaybookFavorite={togglePlaybookFavorite}
                    onTogglePlaybookArchived={togglePlaybookArchived}
                    onMovePlaybookToFolder={movePlaybookToFolder}
                    onIncrementPlaybookViewCount={incrementPlaybookViewCount}
                    onIncrementDialogCopyCount={incrementDialogCopyCount}
                    onUpdateDialogVariables={updatePlaybookDialogVariables}
                    onAddPlaybookFolder={addPlaybookFolder}
                    onRenamePlaybookFolder={(folderId: string, name: string) => updatePlaybookFolder(folderId, { name })}
                    onRemovePlaybookFolder={removePlaybookFolder}
                  />
                )}

                {activeView === 'study' && (
                  <HubEstudos
                    activeView={activeView}
                    cards={cards}
                    study={study}
                    onUpdateStudy={updateStudy}
                    onUpdatePlanningCard={(cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'priority' | 'status' | 'checklist'>>) => editCard(cardId, updates)}
                  />
                )}

                {(activeView === 'crm' || activeView === 'projects') && (
                  <HubTrabalho
                    activeView={activeView}
                    reportsDir={settings.reportsDir}
                    dataDir={settings.dataDir}
                    onUpdateReportsDir={(dir: string) => updateSettings({ reportsDir: dir })}
                    contacts={crmContacts}
                    interactions={crmInteractions}
                    tags={crmTags}
                    notes={notes}
                    calendarEvents={calendarEvents}
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
                    snapshots={crmSnapshots}
                    onUpsertSnapshot={upsertCRMSnapshot}
                    onAddEvent={addCalendarEvent}
                    onMigrateCRMStages={migrateCRMContactStages}
                    projects={projects}
                  />
                )}

                {activeView === 'canvas' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando Canvas..." message="Inicializando ambiente de desenho vetorial" />}>
                    <CanvasView
                      userLoggedIn={userLoggedIn}
                      canvasFolders={canvasFolders}
                      canvasFolderAssignments={canvasFolderAssignments}
                      canvasVersions={canvasVersions}
                      onAddCanvasFolder={addCanvasFolder}
                      onRenameCanvasFolder={renameCanvasFolder}
                      onRemoveCanvasFolder={removeCanvasFolder}
                      onMoveCanvasToFolder={moveCanvasToFolder}
                      onSnapshotVersion={snapshotCanvasVersion}
                      onRemoveVersion={removeCanvasVersion}
                    />
                  </Suspense>
                )}

                {activeView === 'transcripts' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando Transcrições..." message="Conectando aos modelos Whisper locais" />}>
                    <WhisperPage
                      onExportToNote={(title, content) => addNote(title, content)}
                    />
                  </Suspense>
                )}

                {activeView === 'audio' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando Áudio..." message="Preparando interface de gravações" />}>
                    <AudioPage />
                  </Suspense>
                )}

                {activeView === 'library' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando Biblioteca..." message="Organizando documentos e mídias" />}>
                    <LibraryPage />
                  </Suspense>
                )}

                {activeView === 'okrs' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando Metas & OKRs..." message="Calculando progresso dos resultados-chave" />}>
                    <OKRsPage />
                  </Suspense>
                )}

                {activeView === 'system-design' && (
                  <Suspense fallback={<ViewLoadingSkeleton title="Carregando System Design..." message="Preparando canvas de arquitetura" />}>
                    <SystemDesignPage />
                  </Suspense>
                )}

                {(['clipboard', 'colors'] as AppView[]).includes(activeView) && (
                  <HubFerramentas
                    activeView={activeView}
                    categories={clipboardCategories}
                    items={clipboardItems}
                    onAddCategory={addClipboardCategory}
                    onRenameCategory={renameClipboardCategory}
                    onRemoveCategory={removeClipboardCategory}
                    onAddItem={addClipboardItem}
                    onUpdateItem={updateClipboardItem}
                    onRemoveItem={removeClipboardItem}
                    onMoveItemToCategory={moveClipboardItemToCategory}
                    onIncrementCopyCount={incrementClipboardCopyCount}
                    onToggleSnippet={toggleClipboardSnippet}
                    palettes={colorPalettes}
                    onAddPalette={addColorPalette}
                    onUpdatePalette={updateColorPalette}
                    onRemovePalette={removeColorPalette}
                  />
                )}

                {(activeView === 'settings' || activeView === 'history') && (
                  <HubSistema
                    activeView={activeView}
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    registeredIDEs={registeredIDEs}
                    onAddRegisteredIDE={addRegisteredIDE}
                    onUpdateRegisteredIDE={updateRegisteredIDE}
                    onRemoveRegisteredIDE={removeRegisteredIDE}
                    onResetStore={handleResetStore}
                    onOpenHistory={() => setActiveView('history')}
                    onAddNote={addNote}
                    onAddCard={addCard}
                    onAddCalendarEvent={addCalendarEvent}
                    syncStatus={sync.syncStatus}
                    syncError={sync.syncError}
                    lastSyncAt={lastSyncAt}
                    onSync={() => { void sync.runSyncNow() }}
                    isConfigured={isConfigured}
                    userLoggedIn={userLoggedIn}
                    onLogin={loginWithSync}
                    onRegister={registerWithSync}
                    onLogout={auth.logout}
                    authError={auth.authError}
                    onClearAuthError={auth.clearError}
                    authUser={auth.user}
                    authLoading={auth.isRestoring}
                    onUpdateProfile={auth.updateProfile}
                    profilePhotoDataUrl={settings.profilePhotoDataUrl}
                    onUpdateProfilePhoto={(dataUrl: string | null) => updateSettings({ profilePhotoDataUrl: dataUrl ?? undefined })}
                    notes={notes}
                    cards={cards}
                    events={calendarEvents}
                    projects={projects}
                    meetings={meetings}
                    apps={apps}
                    crmContacts={crmContacts}
                    colorPalettes={colorPalettes}
                  />
                )}
            </div>
          )}
          </div>
        </div>
      </GlobalShellLayout>

      <LocalSyncModal
        isOpen={showLocalSyncModal}
        onClose={() => setShowLocalSyncModal(false)}
      />

      <VoiceDictationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onCreateCard={(title) => addCard(title)}
        onCreateNote={(title) => addNote(title)}
      />

      {showViewsNavigator && (
        <ViewsNavigatorModal
          onNavigate={(view: AppView) => { setActiveView(view); setShowViewsNavigator(false) }}
          onClose={() => setShowViewsNavigator(false)}
        />
      )}

      {showClipboardModal && (
        <ClipboardQuickModal
          categories={clipboardCategories}
          items={clipboardItems}
          onClose={() => setShowClipboardModal(false)}
          onNavigateClipboard={() => { setActiveView('clipboard'); setShowClipboardModal(false) }}
          onIncrementCopyCount={incrementClipboardCopyCount}
        />
      )}

      {sync.showLoginSync && isElectron() && (
        <SyncProgressModal settings={settings} />
      )}

      <Chatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        hideFloatingTrigger={true}
        notes={notes.map(n => ({ id: n.id, title: n.title, content: n.content || '', folderId: n.folderId }))}
        folders={noteFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId, isHome: f.isHome }))}
        habits={[]}
        cards={cards.map(c => ({ id: c.id, title: c.title, status: c.status }))}
        screenContext={{
          screen: activeView,
          title: APP_VIEW_LABELS[activeView] || activeView,
          items: notes.map(n => ({ id: n.id, title: n.title, type: 'note' }))
        }}
        onNavigateToNote={(noteId) => {
          setPendingNoteId(noteId)
          setActiveView('notes')
        }}
        onApplyNote={(noteId, content) => {
          if (noteId) {
            updateNote(noteId, { content } as any)
          } else {
            const activeNoteId = notes[0]?.id
            if (activeNoteId) updateNote(activeNoteId, { content } as any)
          }
        }}
        onCreateNote={(title, content, folderId) => {
          const created: any = addNote(title, folderId)
          if (created?.id) {
            if (content) updateNote(created.id, { content } as any)
            setPendingNoteId(created.id)
            setActiveView('notes')
          }
        }}
        onAddFolder={(name, parentId) => addNoteFolder(name, parentId)}
        onUpdateFolder={(folderId, updates) => updateNoteFolder(folderId, updates)}
        onUpdateNote={(noteId, updates) => updateNote(noteId, updates)}
        conversationsDir={settings.dataDir || undefined}
      />
      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} />
      )}
    </div>
  )
}

