import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Card,
  Store,
  CardLocation,
  Day,
  Period,
  ShortcutFolder,
  ShortcutItem,
  Settings,
  NavbarConfig,
  ThemeName,
  CalendarEvent,
  ClipboardItem,
  ClipboardCategory,
  Note,
  NoteFolder,
  NoteBookmark,
  NoteTemplate,
  ColorPalette,
  AppItem,
  IncomeEntry,
  FinancialConfig,
  Project,
  ProjectLink,
  QuickAccessItem,
  Meeting,
  Playbook,
  PlaybookDialog,
  PlaybookFolder,
  PlaybookVariable,
  AgendaCategory,
  SprintCard,
  SprintColumn,
  SprintColumnGroup,
  SprintColumnSection,
  SprintSwimLane,
  SprintMetadata,
  SprintBoardConfig,
  StudyState,
  StudyGoal,
  StudyMediaItem,
  StudySessionLog,
  StudySessionPreset,
} from '@types'
import {
  createCard as _createCard,
  updateCard as _updateCard,
  deleteCard as _deleteCard,
  getCardsForCell,
  getCurrentWeekDates,
  getDayFromDate as _getDayFromDate,
  getPeriodFromTime as _getPeriodFromTime,
  isElectron,
  normalizeCard,
  normalizeTime,
  generateId,
} from '@utils'
import { BUILTIN_STUDY_PRESETS, DEFAULT_SETTINGS, DEFAULT_SPRINT_BOARD_CONFIG, DEFAULT_SPRINT_COLUMNS, DEFAULT_STUDY_STATE, THEMES } from '@types'
import { classifyClipboardContent } from '@Clipboard/clipboard/clipboardClassifier'
import * as cardsSlice from '../../../hooks/store/cards.slice'
import * as calendarSlice from '../../../hooks/store/calendar.slice'
import {
  createProjectsSlice,
  createClipboardSlice,
  createSettingsSlice,
  createStudySlice,
  createDashboardSlice,
  createMiscSlice,
  createNotesSlice,
  createSprintSlice,
  createPlaybooksSlice,
  createCanvasSlice,
  createColorPaletteSlice,
  createQuickAccessSlice,
  createMeetingSlice,
  createSprintCardsSlice,
  createCalendarCategorySlice,
  createNoteTemplatesSlice,
  createPlaybookExtrasSlice,
  createStoreManagementSlice,
  createNoteExtrasSlice,
} from '../../../hooks/useStore/index'


type LegacyShortcutKind = 'url' | 'path' | 'clipboard'

/** Hash simples (FNV-1a) para detectar duplicatas de clipboard. Upgrade 18. */
function hashClipboardContent(content: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}
type ShortcutItemInput = Omit<ShortcutItem, 'kind'> & { kind?: LegacyShortcutKind }

const clampStudyMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

const clampStudyVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(1, Math.max(0, value))
}

const normalizeStudyState = (input: Partial<StudyState> | null | undefined): StudyState => {
  const base = DEFAULT_STUDY_STATE
  const raw = input ?? {}

  const mediaItems: StudyMediaItem[] = Array.isArray(raw.mediaItems)
    ? raw.mediaItems
      .filter(item => item && typeof item.url === 'string')
      .map(item => ({
        id: item.id ?? generateId(),
        title: item.title ?? 'Midia',
        url: item.url ?? '',
        kind: item.kind === 'youtube' ? 'youtube' : 'audio',
        youtubeVideoId: item.youtubeVideoId ?? null,
        volume: clampStudyVolume(Number(item.volume)),
        loop: item.loop !== false,
        showDock: item.showDock !== false,
      }))
    : base.mediaItems

  const goals: StudyGoal[] = Array.isArray(raw.goals)
    ? raw.goals
      .filter(goal => goal && typeof goal.title === 'string' && goal.title.trim().length > 0)
      .map(goal => ({
        id: goal.id ?? generateId(),
        title: goal.title.trim(),
        priority: goal.priority && ['P1', 'P2', 'P3', 'P4'].includes(goal.priority) ? goal.priority : null,
        status: goal.status && ['todo', 'in_progress', 'blocked', 'done'].includes(goal.status) ? goal.status : 'todo',
        checklist: Array.isArray(goal.checklist)
          ? goal.checklist
            .map(item => ({
              id: item.id ?? generateId(),
              text: item.text ?? '',
              done: Boolean(item.done),
            }))
            .filter(item => item.text.trim().length > 0)
          : [],
        description: typeof goal.description === 'string' ? goal.description : undefined,
        deadline: typeof goal.deadline === 'string' ? goal.deadline : null,
        linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
        createdAt: goal.createdAt ?? new Date().toISOString(),
        updatedAt: goal.updatedAt ?? new Date().toISOString(),
        category: typeof goal.category === 'string' ? goal.category : undefined,
      }))
    : base.goals

  const sessions: StudySessionLog[] = Array.isArray(raw.sessions)
    ? raw.sessions
      .filter(session => session && typeof session.completedAt === 'string')
      .map(session => ({
        id: session.id ?? generateId(),
        completedAt: session.completedAt,
        focusSeconds: Math.max(0, Number(session.focusSeconds) || 0),
        goalId: typeof session.goalId === 'string' ? session.goalId : null,
        presetName: typeof session.presetName === 'string' ? session.presetName : undefined,
        category: typeof session.category === 'string' ? session.category : undefined,
      }))
    : base.sessions

  const presets: StudySessionPreset[] = Array.isArray(raw.presets) && raw.presets.length > 0
    ? raw.presets
      .filter(p => p && typeof p.name === 'string')
      .map(p => ({
        id: p.id ?? generateId(),
        name: p.name,
        focusMinutes: Math.max(1, Number(p.focusMinutes) || 25),
        breakMinutes: Math.max(0, Number(p.breakMinutes) || 5),
        cyclesBeforeLongBreak: Math.max(0, Number(p.cyclesBeforeLongBreak) || 0),
        longBreakMinutes: Math.max(0, Number(p.longBreakMinutes) || 0),
        isBuiltin: Boolean(p.isBuiltin),
        createdAt: p.createdAt ?? new Date().toISOString(),
      }))
    : BUILTIN_STUDY_PRESETS

  return {
    wallpaperUrl: typeof raw.wallpaperUrl === 'string' ? raw.wallpaperUrl : base.wallpaperUrl,
    focusMinutes: clampStudyMinutes(Number(raw.focusMinutes), base.focusMinutes),
    breakMinutes: clampStudyMinutes(Number(raw.breakMinutes), base.breakMinutes),
    muteSound: Boolean(raw.muteSound),
    mediaItems,
    goals,
    sessions,
    presets,
    activePresetId: typeof raw.activePresetId === 'string' ? raw.activePresetId : (presets[0]?.id ?? null),
    focusedGoalId: typeof raw.focusedGoalId === 'string' ? raw.focusedGoalId : null,
  }
}

const getDefaultStore = (): Store => ({
  version: 12,
  storeUpdatedAt: new Date().toISOString(),
  lastSyncAt: undefined,
  cards: [],
  shortcutFolders: [],
  shortcuts: [],
  projects: [],
  registeredIDEs: [],
  calendarEvents: [],
  noteFolders: [],
  notes: [],
  colorPalettes: [],
  clipboardCategories: [],
  clipboardItems: [],
  apps: [],
  macros: [],
  appGroups: [],
  appLaunchLogs: [],
  habits: [],
  habitEntries: [],
  bills: [],
  expenses: [],
  budgetCategories: [],
  incomes: [],
  financialConfig: {
    monthlyIncome: 0,
    monthlySpendingLimit: 0,
  },
  savingsGoals: [],
  investments: [],
  quickAccess: [],
  meetings: [],
  playbooks: [],
  playbookFolders: [],
  sprintCards: [],
  sprintColumnSections: [],
  calendarCategories: [],
  study: { ...DEFAULT_STUDY_STATE },
  settings: { ...DEFAULT_SETTINGS },
})

const normalizeStore = (input: Partial<Store> | null | undefined): Store => {
  const base = getDefaultStore()
  if (!input || typeof input !== 'object') return base
  const settings = input.settings ?? base.settings
  const rawShortcuts = Array.isArray(input.shortcuts)
    ? (input.shortcuts as ShortcutItemInput[])
    : (base.shortcuts as ShortcutItemInput[])
  const normalizedShortcuts = rawShortcuts.reduce<ShortcutItem[]>((acc, shortcut) => {
    const kind: LegacyShortcutKind = shortcut.kind ?? 'url'
    if (kind === 'url') {
      const s = shortcut as ShortcutItem
      acc.push({
        ...shortcut,
        kind: 'url',
        icon: (shortcut as ShortcutItem & { icon?: ShortcutItem['icon'] }).icon ?? null,
        description: typeof s.description === 'string' ? s.description : undefined,
        tags: Array.isArray(s.tags) ? s.tags : [],
        openCount: typeof s.openCount === 'number' ? s.openCount : 0,
        lastOpenedAt: typeof s.lastOpenedAt === 'string' ? s.lastOpenedAt : null,
        isFavorite: s.isFavorite === true,
      })
    }
    return acc
  }, [])
  const normalizedFolders = Array.isArray(input.shortcutFolders)
    ? input.shortcutFolders.map(folder => ({
      ...folder,
      parentId: (folder as ShortcutFolder & { parentId?: string | null }).parentId ?? null,
    }))
    : base.shortcutFolders

  const normalizedQuickAccess = Array.isArray((input as Partial<Store> & { quickAccess?: QuickAccessItem[] }).quickAccess)
    ? (input as Partial<Store> & { quickAccess?: QuickAccessItem[] }).quickAccess as QuickAccessItem[]
    : base.quickAccess

  // Migrar do formato antigo (theme objeto) para novo (themeName)
  let themeName: ThemeName = base.settings.themeName
  const oldSettings = settings as Settings & { theme?: { primary?: string } }
  if (oldSettings?.themeName && THEMES[oldSettings.themeName as ThemeName]) {
    themeName = oldSettings.themeName as ThemeName
  } else if (oldSettings?.theme?.primary) {
    // Tentar detectar tema pelo primary color
    const entries = Object.entries(THEMES) as [ThemeName, { primary: string }][]
    const match = entries.find(([, t]) => t.primary === oldSettings.theme?.primary)
    if (match) themeName = match[0]
  }

  // Normalizar cards (migrar de formato antigo para novo com date/hasDate)
  const rawCards = Array.isArray(input.cards) ? input.cards : base.cards
  const normalizedCards = rawCards.map(card => normalizeCard(card as Card & { id: string; title: string }))
  const normalizedPlaybooks: Playbook[] = Array.isArray(input.playbooks)
    ? input.playbooks
      .filter(pb => pb && typeof pb.title === 'string')
      .map(pb => ({
        id: pb.id ?? generateId(),
        title: pb.title ?? '',
        sector: pb.sector ?? 'Geral',
        category: pb.category ?? 'Geral',
        summary: pb.summary ?? '',
        content: pb.content ?? '',
        dialogs: Array.isArray(pb.dialogs)
          ? pb.dialogs
            .filter(dialog => dialog && typeof dialog.text === 'string')
            .map((dialog, index) => ({
              id: dialog.id ?? generateId(),
              title: dialog.title ?? `Dialogo ${index + 1}`,
              text: dialog.text ?? '',
              order: Number.isFinite(dialog.order) ? dialog.order : index,
              createdAt: dialog.createdAt ?? new Date().toISOString(),
              updatedAt: dialog.updatedAt ?? dialog.createdAt ?? new Date().toISOString(),
              variables: Array.isArray((dialog as PlaybookDialog).variables)
                ? (dialog as PlaybookDialog).variables
                : undefined,
              copyCount: typeof (dialog as PlaybookDialog).copyCount === 'number'
                ? (dialog as PlaybookDialog).copyCount
                : undefined,
              copyCountByMonth: (dialog as PlaybookDialog).copyCountByMonth && typeof (dialog as PlaybookDialog).copyCountByMonth === 'object'
                ? (dialog as PlaybookDialog).copyCountByMonth
                : undefined,
            }))
            .sort((a, b) => a.order - b.order)
          : [],
        order: Number.isFinite(pb.order) ? pb.order : 0,
        createdAt: pb.createdAt ?? new Date().toISOString(),
        updatedAt: pb.updatedAt ?? pb.createdAt ?? new Date().toISOString(),
        isFavorite: (pb as Playbook).isFavorite === true,
        isArchived: (pb as Playbook).isArchived === true,
        folderId: (pb as Playbook).folderId ?? null,
        viewCount: typeof (pb as Playbook).viewCount === 'number' ? (pb as Playbook).viewCount : 0,
        versions: Array.isArray((pb as Playbook).versions) ? (pb as Playbook).versions : [],
      }))
      .sort((a, b) => a.order - b.order)
    : base.playbooks

  const normalizedPlaybookFolders: PlaybookFolder[] = Array.isArray(
    (input as Store).playbookFolders,
  )
    ? (input as Store).playbookFolders!
      .filter((f) => f && typeof f.name === 'string')
      .map((f, index) => ({
        id: f.id ?? generateId(),
        name: f.name ?? 'Pasta',
        color: f.color ?? '#6b7280',
        order: Number.isFinite(f.order) ? f.order : index,
        createdAt: f.createdAt ?? new Date().toISOString(),
      }))
      .sort((a, b) => a.order - b.order)
    : base.playbookFolders ?? []

  return {
    ...base,
    ...input,
    version: 12,
    storeUpdatedAt: input.storeUpdatedAt ?? base.storeUpdatedAt,
    lastSyncAt: (input as Partial<Store> & { lastSyncAt?: string }).lastSyncAt ?? base.lastSyncAt,
    pendingDeletes: Array.isArray(input.pendingDeletes) ? input.pendingDeletes : [],
    cards: normalizedCards.map(c => ({ ...c, projectId: (c as Card & { projectId?: string | null }).projectId ?? null })),
    shortcutFolders: normalizedFolders,
    shortcuts: normalizedShortcuts,
    projects: Array.isArray(input.projects)
      ? input.projects.map(p => ({
        ...p,
        path: (p as Project).path ?? '',
        links: Array.isArray((p as Project & { links?: ProjectLink[] }).links) ? (p as Project).links : [],
        tags: Array.isArray((p as Project).tags) ? (p as Project).tags : [],
        isArchived: (p as Project).isArchived === true,
        archivedAt: typeof (p as Project).archivedAt === 'string' ? (p as Project).archivedAt : null,
      }))
      : base.projects,
    registeredIDEs: Array.isArray(input.registeredIDEs) ? input.registeredIDEs : base.registeredIDEs,
    calendarEvents: Array.isArray(input.calendarEvents)
      ? input.calendarEvents.map(ev => ({
        id: (ev as CalendarEvent).id,
        title: (ev as CalendarEvent).title ?? '',
        date: (ev as CalendarEvent).date,
        time: (ev as CalendarEvent & { time?: string | null }).time ?? null,
        recurrence: (ev as CalendarEvent & { recurrence?: CalendarEvent['recurrence'] }).recurrence ?? null,
        reminder: (ev as CalendarEvent & { reminder?: CalendarEvent['reminder'] }).reminder ?? null,
        description: (ev as CalendarEvent).description ?? '',
        color: (ev as CalendarEvent).color ?? 'var(--color-primary)',
        categoryId: (ev as CalendarEvent).categoryId ?? null,
        createdAt: (ev as CalendarEvent).createdAt ?? new Date().toISOString(),
        updatedAt: (ev as CalendarEvent).updatedAt ?? (ev as CalendarEvent).createdAt ?? new Date().toISOString(),
      }))
      : base.calendarEvents,
    noteFolders: Array.isArray(input.noteFolders)
      ? (input.noteFolders as NoteFolder[]).map(f => ({ ...f, isHome: f.isHome === true }))
      : base.noteFolders,
    notes: Array.isArray(input.notes)
      ? input.notes.map(n => ({
        ...n,
        projectId: (n as Note & { projectId?: string | null }).projectId ?? null,
        parentNoteId: (n as Note & { parentNoteId?: string | null }).parentNoteId ?? null,
        isPinned: Boolean((n as Note & { isPinned?: boolean }).isPinned),
        isFavorite: Boolean((n as Note & { isFavorite?: boolean }).isFavorite),
        isLocked: Boolean((n as Note & { isLocked?: boolean }).isLocked),
      }))
      : base.notes,
    colorPalettes: Array.isArray((input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes)
      ? (input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes as ColorPalette[]
      : base.colorPalettes,
    clipboardCategories: Array.isArray((input as Partial<Store> & { clipboardCategories?: ClipboardCategory[] }).clipboardCategories)
      ? (input as Partial<Store> & { clipboardCategories?: ClipboardCategory[] }).clipboardCategories as ClipboardCategory[]
      : base.clipboardCategories,
    clipboardItems: Array.isArray(input.clipboardItems)
      ? input.clipboardItems.map(item => ({
          ...item,
          categoryId:   (item as ClipboardItem & { categoryId?: string | null }).categoryId ?? null,
          copyCount:    typeof (item as ClipboardItem).copyCount === 'number' ? (item as ClipboardItem).copyCount : 0,
          contentType:  (item as ClipboardItem).contentType ?? classifyClipboardContent((item as ClipboardItem).content ?? ''),
          isSnippet:    (item as ClipboardItem).isSnippet === true,
          contentHash:  (item as ClipboardItem).contentHash ?? hashClipboardContent((item as ClipboardItem).content ?? ''),
        }))
      : base.clipboardItems,
    apps: Array.isArray(input.apps)
      ? input.apps.map((a) => ({
          ...a,
          args: typeof (a as AppItem).args === 'string' ? (a as AppItem).args : '',
          workingDir: typeof (a as AppItem).workingDir === 'string' ? (a as AppItem).workingDir : '',
          envVars: typeof (a as AppItem).envVars === 'string' ? (a as AppItem).envVars : '',
          groupId: (a as AppItem).groupId ?? null,
          autoLaunch: (a as AppItem).autoLaunch === true,
          launchCount: typeof (a as AppItem).launchCount === 'number' ? (a as AppItem).launchCount : 0,
          lastLaunchedAt: typeof (a as AppItem).lastLaunchedAt === 'string' ? (a as AppItem).lastLaunchedAt : null,
        }))
      : base.apps,
    macros: Array.isArray(input.macros) ? input.macros : base.macros,
    appGroups: Array.isArray((input as Store).appGroups) ? (input as Store).appGroups : (base.appGroups ?? []),
    appLaunchLogs: Array.isArray((input as Store).appLaunchLogs) ? (input as Store).appLaunchLogs : (base.appLaunchLogs ?? []),
    habits: Array.isArray(input.habits) ? input.habits : base.habits,
    habitEntries: Array.isArray(input.habitEntries) ? input.habitEntries : base.habitEntries,
    bills: Array.isArray(input.bills) ? input.bills : base.bills,
    expenses: Array.isArray(input.expenses) ? input.expenses : base.expenses,
    budgetCategories: Array.isArray(input.budgetCategories) ? input.budgetCategories : base.budgetCategories,
    incomes: Array.isArray((input as Partial<Store> & { incomes?: IncomeEntry[] }).incomes)
      ? (input as Partial<Store> & { incomes?: IncomeEntry[] }).incomes as IncomeEntry[]
      : base.incomes,
    financialConfig: {
      monthlyIncome: (input as Partial<Store> & { financialConfig?: FinancialConfig }).financialConfig?.monthlyIncome ?? base.financialConfig.monthlyIncome,
      monthlySpendingLimit: (input as Partial<Store> & { financialConfig?: FinancialConfig }).financialConfig?.monthlySpendingLimit ?? base.financialConfig.monthlySpendingLimit,
    },
    savingsGoals: Array.isArray(input.savingsGoals) ? input.savingsGoals : base.savingsGoals,
    quickAccess: normalizedQuickAccess,
    meetings: Array.isArray(input.meetings) ? input.meetings : base.meetings,
    playbooks: normalizedPlaybooks,
    playbookFolders: normalizedPlaybookFolders,
    study: normalizeStudyState((input as Partial<Store> & { study?: Partial<StudyState> }).study),
    settings: {
      themeName,
      dataDir: settings?.dataDir ?? base.settings.dataDir,
      installerCompleted: (settings as Settings)?.installerCompleted ?? base.settings.installerCompleted,
      weekStart: (settings as Settings)?.weekStart ?? base.settings.weekStart,
      keyboardShortcuts: (settings as Settings)?.keyboardShortcuts ?? base.settings.keyboardShortcuts,
      navbarConfig: (settings as Settings & { navbarConfig?: NavbarConfig }).navbarConfig ?? base.settings.navbarConfig,
      backupEnabled: (settings as Settings)?.backupEnabled ?? base.settings.backupEnabled,
      backupIntervalMinutes: (settings as Settings)?.backupIntervalMinutes ?? base.settings.backupIntervalMinutes,
      apiToken: (settings as Settings)?.apiToken ?? base.settings.apiToken,
      apiBaseUrl: (settings as Settings)?.apiBaseUrl ?? base.settings.apiBaseUrl,
      apiEmail: (settings as Settings)?.apiEmail ?? base.settings.apiEmail,
      apiRefreshToken: (settings as Settings)?.apiRefreshToken ?? base.settings.apiRefreshToken,
      profilePhotoDataUrl: (settings as Settings)?.profilePhotoDataUrl ?? base.settings.profilePhotoDataUrl,
      dashboardLayout: (settings as Settings)?.dashboardLayout ?? base.settings.dashboardLayout,
      dashboardWidgets: (settings as Settings)?.dashboardWidgets ?? base.settings.dashboardWidgets,
      dashboardTemplates: (settings as Settings)?.dashboardTemplates ?? base.settings.dashboardTemplates,
      debugHudTitlebar: (settings as Settings)?.debugHudTitlebar ?? base.settings.debugHudTitlebar,
      debugHudInline: (settings as Settings)?.debugHudInline ?? base.settings.debugHudInline,
      debugHudHover: (settings as Settings)?.debugHudHover ?? base.settings.debugHudHover,
    },
  }
}

export const useStore = () => {
  const [store, setStore] = useState<Store>(getDefaultStore())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeVersion, setStoreVersion] = useState(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadInitialStore = async () => {
      try {
        const applyWeeklyMaintenance = (input: Store): { store: Store; changed: boolean } => {
          const weekStart = getCurrentWeekDates().mon
          const storedWeekStart = input.settings.weekStart

          if (!storedWeekStart) {
            return {
              store: {
                ...input,
                settings: { ...input.settings, weekStart },
              },
              changed: true,
            }
          }

          if (storedWeekStart === weekStart) {
            return { store: input, changed: false }
          }

          // Apenas atualiza weekStart — NÃO remove cards de semanas anteriores
          return {
            store: {
              ...input,
              settings: { ...input.settings, weekStart },
            },
            changed: true,
          }
        }

        // Recuperar dados de emergencia salvos pelo beforeunload
        const FLUSH_KEY = 'organon-store-flush'
        let flushed: Store | null = null
        try {
          const raw = localStorage.getItem(FLUSH_KEY)
          if (raw) {
            flushed = normalizeStore(JSON.parse(raw) as Partial<Store>)
            localStorage.removeItem(FLUSH_KEY)
          }
        } catch { /* ignore parse errors */ }

        if (isElectron()) {
          const loaded = await window.electronAPI.loadStore()
          let normalized = normalizeStore(loaded)
          // Se havia dados de emergencia, mesclar mantendo o mais recente por storeUpdatedAt
          if (flushed && flushed.storeUpdatedAt && (!normalized.storeUpdatedAt || flushed.storeUpdatedAt > normalized.storeUpdatedAt)) {
            normalized = flushed
          }
          const { store: next, changed } = applyWeeklyMaintenance(normalized)
          setStore(next)
          if (changed || flushed) {
            await window.electronAPI.saveStore(next)
          }
        } else {
          const stored = localStorage.getItem('organon-store')
          if (stored) {
            const parsed = JSON.parse(stored) as Store
            const normalized = normalizeStore(parsed)
            const { store: next, changed } = applyWeeklyMaintenance(normalized)
            setStore(next)
            if (changed) {
              localStorage.setItem('organon-store', JSON.stringify(next))
            }
          } else {
            const initial = getDefaultStore()
            const { store: next } = applyWeeklyMaintenance(initial)
            setStore(next)
            localStorage.setItem('organon-store', JSON.stringify(next))
          }
        }
      } catch (err) {
        console.error('Erro ao carregar store:', err)
        setError('Erro ao carregar dados salvos')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialStore()
  }, [])

  const pendingStoreRef = useRef<Store | null>(null)

  const saveStore = useCallback((nextStore: Store) => {
    pendingStoreRef.current = nextStore
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      pendingStoreRef.current = null
      const normalized = normalizeStore(nextStore)
      try {
        if (isElectron()) {
          await window.electronAPI.saveStore(normalized)
        } else {
          localStorage.setItem('organon-store', JSON.stringify(normalized))
        }
      } catch (err) {
        console.error('Erro ao salvar store:', err)
        setError('Erro ao salvar dados')
      }
    }, 300)
  }, [])

  // Flush de emergencia: salva em localStorage antes de fechar o app
  // para nao perder mudancas pendentes no debounce de 300ms.
  useEffect(() => {
    const FLUSH_KEY = 'organon-store-flush'
    const handleBeforeUnload = () => {
      if (pendingStoreRef.current) {
        try {
          const normalized = normalizeStore(pendingStoreRef.current)
          localStorage.setItem(FLUSH_KEY, JSON.stringify(normalized))
        } catch { /* ignore quota errors */ }
        pendingStoreRef.current = null
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const updateStore = useCallback((updater: (prev: Store) => Store) => {
    const now = new Date().toISOString()
    setStore(prev => {
      const next = { ...normalizeStore(updater(prev)), storeUpdatedAt: now }
      saveStore(next)
      return next
    })
    setStoreVersion(v => v + 1)
  }, [saveStore])

  // ─── Slices ────────────────────────────────────────────────────────────────
  const projectsSlice = createProjectsSlice(updateStore)
  const clipboardSlice = createClipboardSlice(updateStore)
  const settingsSlice = createSettingsSlice(updateStore)
  const studySlice = createStudySlice(updateStore)
  const dashboardSlice = createDashboardSlice(updateStore)
  const miscSlice = createMiscSlice(updateStore)
  const notesSlice = createNotesSlice(updateStore)
  const sprintSlice = createSprintSlice(updateStore)
  const playbooksSlice = createPlaybooksSlice(updateStore)
  const canvasSlice = createCanvasSlice(updateStore)
  const colorPaletteSlice = createColorPaletteSlice(updateStore)
  const quickAccessSlice = createQuickAccessSlice(updateStore, () => ({ quickAccess: store.quickAccess }))
  const meetingSlice = createMeetingSlice(updateStore)
  const sprintCardsSlice = createSprintCardsSlice(updateStore)
  const calendarCategorySlice = createCalendarCategorySlice(updateStore)
  const noteTemplatesSlice = createNoteTemplatesSlice(updateStore)
  const playbookExtrasSlice = createPlaybookExtrasSlice(updateStore)
  const storeManagementSlice = createStoreManagementSlice(setStore, saveStore, isElectron, getDefaultStore)
  const noteExtrasSlice = createNoteExtrasSlice(updateStore, () => store)


  // ─── Clipboard Monitor ─────────────────────────────────────────────────────
  clipboardSlice.useClipboardMonitor()

  /**
   * Substitui o store em memória e agenda gravação no disco.
   * Usado pelo sync para aplicar dados puxados da API sem reload de página.
   * Cancela qualquer gravação pendente do debounce para evitar sobrescrita.
   */
  const replaceStore = useCallback((nextStore: Store) => {
    const normalized = normalizeStore(nextStore)
    setStore(normalized)
    saveStore(normalized) // cancela debounce anterior e agenda gravação com dados novos
    setStoreVersion(v => v + 1)
  }, [saveStore])

  // ─── Cards (extraido em hooks/store/cards.slice.ts) ────────

  const addCard = useCallback((title: string): string | void => {
    let createdId: string | null = null
    updateStore(prev => {
      const result = cardsSlice.cardsAdd(prev, title)
      createdId = result.createdId
      return result.store
    })
    if (createdId) return createdId
  }, [updateStore])

  const addCardWithDate = useCallback((input: { title: string; date: string; location: CardLocation; time?: string | null }) => {
    let createdId: string | null = null
    updateStore(prev => {
      const result = cardsSlice.cardsAddWithDate(prev, input)
      createdId = result.createdId
      return result.store
    })
    return createdId
  }, [updateStore])

  const editCard = useCallback((cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'isLocked' | 'priority' | 'status' | 'checklist' | 'projectId' | 'durationMinutes' | 'inSprint' | 'sprintColumnId' | 'swimLaneId' | 'sprintSectionId' | 'location'>>) => {
    updateStore(prev => cardsSlice.cardsEdit(prev, cardId, updates))
  }, [updateStore])

  const removeCard = useCallback((cardId: string) => {
    updateStore(prev => cardsSlice.cardsRemove(prev, cardId))
  }, [updateStore])

  const moveCardToCell = useCallback((
    cardId: string,
    newLocation: CardLocation,
    newIndex: number,
    displayedWeekDates?: Record<Day, string>
  ) => {
    updateStore(prev => cardsSlice.cardsMoveToCell(prev, cardId, newLocation, newIndex, displayedWeekDates))
  }, [updateStore])

  const reorderInCell = useCallback((
    day: Day | null,
    period: Period | null,
    orderedIds: string[]
  ) => {
    updateStore(prev => cardsSlice.cardsReorderInCell(prev, day, period, orderedIds))
  }, [updateStore])

  const getCardsForLocation = useCallback((day: Day | null, period: Period | null) => {
    return getCardsForCell(store.cards, day, period)
  }, [store.cards])

  // ==========================================
  // Sprint Board (Upgrade 01)
  // ==========================================


  const addSprintColumn = useCallback((name: string, color = '#64748b') => {
    sprintSlice.addSprintColumn(name, color)
  }, [sprintSlice])

  const updateSprintColumn = useCallback((columnId: string, updates: Partial<Pick<SprintColumn, 'name' | 'color' | 'groupId' | 'autoStatus'>>) => {
    sprintSlice.updateSprintColumn(columnId, updates)
  }, [sprintSlice])

  const removeSprintColumn = useCallback((columnId: string) => {
    sprintSlice.removeSprintColumn(columnId)
  }, [sprintSlice])

  const reorderSprintColumns = useCallback((orderedIds: string[]) => {
    sprintSlice.reorderSprintColumns(orderedIds)
  }, [sprintSlice])

  const addSprintColumnGroup = useCallback((name: string, color = 'var(--color-primary)') => {
    sprintSlice.addSprintColumnGroup(name, color)
  }, [sprintSlice])

  const updateSprintColumnGroup = useCallback((groupId: string, updates: Partial<Pick<SprintColumnGroup, 'name' | 'color'>>) => {
    sprintSlice.updateSprintColumnGroup(groupId, updates)
  }, [sprintSlice])

  const removeSprintColumnGroup = useCallback((groupId: string) => {
    sprintSlice.removeSprintColumnGroup(groupId)
  }, [sprintSlice])

  const addSprintColumnSection = useCallback((columnId: string, name: string) => {
    sprintSlice.addSprintColumnSection(columnId, name)
  }, [sprintSlice])

  const updateSprintColumnSection = useCallback((sectionId: string, updates: Partial<Pick<SprintColumnSection, 'name'>>) => {
    sprintSlice.updateSprintColumnSection(sectionId, updates)
  }, [sprintSlice])

  const removeSprintColumnSection = useCallback((sectionId: string) => {
    sprintSlice.removeSprintColumnSection(sectionId)
  }, [sprintSlice])

  const addSprintSwimLane = useCallback((name: string, color = '#a855f7') => {
    sprintSlice.addSprintSwimLane(name, color)
  }, [sprintSlice])

  const updateSprintSwimLane = useCallback((laneId: string, updates: Partial<Pick<SprintSwimLane, 'name' | 'color'>>) => {
    sprintSlice.updateSprintSwimLane(laneId, updates)
  }, [sprintSlice])

  const removeSprintSwimLane = useCallback((laneId: string) => {
    sprintSlice.removeSprintSwimLane(laneId)
  }, [sprintSlice])

  const updateSprintBoardConfig = useCallback((updates: Partial<SprintBoardConfig>) => {
    sprintSlice.updateSprintBoardConfig(updates)
  }, [sprintSlice])

  const upsertSprintMetadata = useCallback((metadata: SprintMetadata) => {
    sprintSlice.upsertSprintMetadata(metadata)
  }, [sprintSlice])

  const removeSprintMetadata = useCallback((sprintId: string) => {
    sprintSlice.removeSprintMetadata(sprintId)
  }, [sprintSlice])

  const setActiveSprint = useCallback((sprintId: string | null) => {
    sprintSlice.setActiveSprint(sprintId)
  }, [sprintSlice])

  const setCardSprint = useCallback((cardId: string, inSprint: boolean) => {
    sprintSlice.setCardSprint(cardId, inSprint)
  }, [sprintSlice])

  const setCardSprintColumn = useCallback((cardId: string, columnId: string | null) => {
    sprintSlice.setCardSprintColumn(cardId, columnId)
  }, [sprintSlice])

  const setCardSprintSection = useCallback((cardId: string, sectionId: string | null) => {
    sprintSlice.setCardSprintSection(cardId, sectionId)
  }, [sprintSlice])

  const setCardSwimLane = useCallback((cardId: string, laneId: string | null) => {
    sprintSlice.setCardSwimLane(cardId, laneId)
  }, [sprintSlice])

  // ─── Sprint Cards (entidade separada) ─────────────────────

  const addSprintCard = useCallback((title: string, columnId: string | null = null): string | null => {
    return sprintCardsSlice.addSprintCard(title, columnId)
  }, [sprintCardsSlice])

  const editSprintCard = useCallback((cardId: string, updates: Partial<Omit<SprintCard, 'id' | 'createdAt'>>) => {
    sprintCardsSlice.editSprintCard(cardId, updates)
  }, [sprintCardsSlice])

  const removeSprintCard = useCallback((cardId: string) => {
    sprintCardsSlice.removeSprintCard(cardId)
  }, [sprintCardsSlice])

  const moveSprintCard = useCallback((cardId: string, columnId: string | null, sectionId: string | null = null) => {
    sprintCardsSlice.moveSprintCard(cardId, columnId, sectionId)
  }, [sprintCardsSlice])

  // ========================================
  // CALENDAR EVENTS
  // ========================================

  // ─── Calendar (extraido em hooks/store/calendar.slice.ts) ────

  const addCalendarEvent = useCallback((input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateStore(prev => calendarSlice.calendarAddEvent(prev, {
      ...input,
      time: normalizeTime(input.time) ?? null,
      recurrence: input.recurrence ?? null,
      reminder: input.reminder ?? null,
    }))
  }, [updateStore])

  const updateCalendarEvent = useCallback((eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
    const nextUpdates = {
      ...updates,
      ...(typeof updates.time === 'string' || updates.time === null
        ? { time: normalizeTime(updates.time) }
        : {}),
    }
    updateStore(prev => calendarSlice.calendarUpdateEvent(prev, eventId, nextUpdates))
  }, [updateStore])

  const removeCalendarEvent = useCallback((eventId: string) => {
    updateStore(prev => calendarSlice.calendarRemoveEvent(prev, eventId))
  }, [updateStore])

  // ─── Categorias de calendario ───────────────────────────────

  const addCalendarCategory = useCallback((name: string, color: string): string | null => {
    return calendarCategorySlice.addCalendarCategory(name, color)
  }, [calendarCategorySlice])

  const updateCalendarCategory = useCallback((catId: string, updates: Partial<Omit<AgendaCategory, 'id'>>) => {
    calendarCategorySlice.updateCalendarCategory(catId, updates)
  }, [calendarCategorySlice])

  const removeCalendarCategory = useCallback((catId: string) => {
    calendarCategorySlice.removeCalendarCategory(catId)
  }, [calendarCategorySlice])

  // ========================================
  // CLIPBOARD
  // ========================================

  // NOTES
  // ========================================

  const addNoteFolder = useCallback((name: string, parentId?: string | null) => {
    return notesSlice.addNoteFolder(name, parentId)
  }, [notesSlice])

  const updateNoteFolder = useCallback((folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => {
    notesSlice.updateNoteFolder(folderId, updates)
  }, [notesSlice])

  const removeNoteFolder = useCallback((folderId: string) => {
    notesSlice.removeNoteFolder(folderId)
  }, [notesSlice])

  const reorderNoteFolders = useCallback((orderedIds: string[]) => {
    notesSlice.reorderNoteFolders(orderedIds)
  }, [notesSlice])

  const addNote = useCallback((
    titleOrInput: string | { title: string; content?: string; folderId?: string | null; projectId?: string | null; parentNoteId?: string | null },
    contentOrFolderId?: string | null,
    folderId?: string | null,
    projectId?: string | null,
    parentNoteId?: string | null
  ) => {
    if (typeof titleOrInput === 'object' && titleOrInput !== null) {
      return notesSlice.addNote(titleOrInput)
    }
    return notesSlice.addNote({
      title: titleOrInput,
      content: typeof contentOrFolderId === 'string' ? contentOrFolderId : undefined,
      folderId: typeof contentOrFolderId !== 'string' ? contentOrFolderId : (folderId ?? null),
      projectId: projectId ?? null,
      parentNoteId: parentNoteId ?? null,
    })
  }, [notesSlice])

  const updateNote = useCallback((noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId' | 'isLocked'>>) => {
    notesSlice.updateNote(noteId, updates)
  }, [notesSlice])

  const toggleNoteFavorite = useCallback((noteId: string) => {
    noteExtrasSlice.toggleNoteFavorite(noteId)
  }, [noteExtrasSlice])

  const toggleNotePinned = useCallback((noteId: string) => {
    noteExtrasSlice.toggleNotePinned(noteId)
  }, [noteExtrasSlice])

  const toggleNoteLock = useCallback((noteId: string) => {
    noteExtrasSlice.toggleNoteLock(noteId)
  }, [noteExtrasSlice])

  const reorderNotes = useCallback((orderedIds: string[]) => {
    noteExtrasSlice.reorderNotes(orderedIds)
  }, [noteExtrasSlice])

  const removeNote = useCallback((noteId: string) => {
    notesSlice.removeNote(noteId)
  }, [notesSlice])

  // ==========================================
  // Lixeira de Notas (Upgrade 10a)
  // ==========================================

  const softDeleteNote = useCallback((noteId: string) => {
    noteExtrasSlice.softDeleteNote(noteId)
  }, [noteExtrasSlice])

  const softDeleteNoteFolder = useCallback((folderId: string) => {
    noteExtrasSlice.softDeleteNoteFolder(folderId)
  }, [noteExtrasSlice])

  const restoreNote = useCallback((noteId: string) => {
    noteExtrasSlice.restoreNote(noteId)
  }, [noteExtrasSlice])

  const restoreNoteFolder = useCallback((folderId: string) => {
    noteExtrasSlice.restoreNoteFolder(folderId)
  }, [noteExtrasSlice])

  const purgeNote = useCallback((noteId: string) => {
    noteExtrasSlice.purgeNote(noteId)
  }, [noteExtrasSlice])

  const purgeNoteFolder = useCallback((folderId: string) => {
    noteExtrasSlice.purgeNoteFolder(folderId)
  }, [noteExtrasSlice])

  const purgeOldTrash = useCallback(() => {
    noteExtrasSlice.purgeOldTrash()
  }, [noteExtrasSlice])

  const emptyNotesTrash = useCallback(() => {
    notesSlice.emptyNotesTrash()
  }, [notesSlice])

  // ==========================================
  // Note Templates (Upgrade 10c)
  // ==========================================

  const addNoteTemplate = useCallback((input: Omit<NoteTemplate, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => {
    return noteTemplatesSlice.addNoteTemplate(input)
  }, [noteTemplatesSlice])

  const updateNoteTemplate = useCallback((templateId: string, updates: Partial<Pick<NoteTemplate, 'name' | 'description' | 'category' | 'icon' | 'content' | 'variables' | 'isDefaultDaily'>>) => {
    noteTemplatesSlice.updateNoteTemplate(templateId, updates)
  }, [noteTemplatesSlice])

  const removeNoteTemplate = useCallback((templateId: string) => {
    noteTemplatesSlice.removeNoteTemplate(templateId)
  }, [noteTemplatesSlice])

  const setNoteBookmarks = useCallback((noteId: string, bookmarks: NoteBookmark[]) => {
    noteTemplatesSlice.setNoteBookmarks(noteId, bookmarks)
  }, [noteTemplatesSlice])

  // ==========================================
  // Canvas Folders + Versions (Upgrade 18) — local-only metadata
  // ==========================================

  const addCanvasFolder = useCallback((name: string, parentId: string | null = null) => {
    return canvasSlice.addCanvasFolder(name, parentId)
  }, [canvasSlice])

  const renameCanvasFolder = useCallback((folderId: string, name: string) => {
    canvasSlice.renameCanvasFolder(folderId, name)
  }, [canvasSlice])

  const removeCanvasFolder = useCallback((folderId: string) => {
    canvasSlice.removeCanvasFolder(folderId)
  }, [canvasSlice])

  const moveCanvasToFolder = useCallback((canvasId: string, folderId: string | null) => {
    canvasSlice.moveCanvasToFolder(canvasId, folderId)
  }, [canvasSlice])

  const snapshotCanvasVersion = useCallback((canvasId: string, snapshot: Record<string, unknown>, thumbnail?: string) => {
    canvasSlice.snapshotCanvasVersion(canvasId, snapshot, thumbnail)
  }, [canvasSlice])

  const removeCanvasVersion = useCallback((canvasId: string, versionId: string) => {
    canvasSlice.deleteCanvasVersion(canvasId, versionId)
  }, [canvasSlice])

  const clearCanvasVersions = useCallback((canvasId: string) => {
    updateStore(prev => {
      const allVersions = { ...(prev.canvasVersions ?? {}) }
      delete allVersions[canvasId]
      return { ...prev, canvasVersions: allVersions }
    })
  }, [updateStore])

  // ========================================
  // COLOR PALETTES
  // ========================================

  const addColorPalette = useCallback((name: string, colors: string[]) => {
    return colorPaletteSlice.addColorPalette(name, colors)
  }, [colorPaletteSlice])

  const updateColorPalette = useCallback((paletteId: string, updates: Partial<Pick<ColorPalette, 'name' | 'colors'>>) => {
    colorPaletteSlice.updateColorPalette(paletteId, updates)
  }, [colorPaletteSlice])

  const removeColorPalette = useCallback((paletteId: string) => {
    colorPaletteSlice.removeColorPalette(paletteId)
  }, [colorPaletteSlice])

  // ========================================
  // Meeting methods
  // ========================================

  const addMeeting = useCallback((meeting: Meeting) => {
    meetingSlice.addMeeting(meeting)
  }, [meetingSlice])

  const updateMeeting = useCallback((meetingId: string, updates: Partial<Pick<Meeting, 'title' | 'transcription'>>) => {
    meetingSlice.updateMeeting(meetingId, updates)
  }, [meetingSlice])

  const removeMeeting = useCallback((meetingId: string) => {
    meetingSlice.removeMeeting(meetingId)
  }, [meetingSlice])

  // ========================================
  // Playbook methods
  // ========================================

  const addPlaybook = useCallback((input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
  }) => {
    return playbooksSlice.addPlaybook({
      title: input.title,
      sector: input.sector ?? 'Geral',
      category: input.category ?? 'Geral',
      summary: input.summary ?? '',
      content: input.content ?? '',
    })
  }, [playbooksSlice])

  const updatePlaybook = useCallback((playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content'>>) => {
    playbooksSlice.updatePlaybook(playbookId, updates)
  }, [playbooksSlice])

  const removePlaybook = useCallback((playbookId: string) => {
    playbooksSlice.removePlaybook(playbookId)
  }, [playbooksSlice])

  const addPlaybookDialog = useCallback((playbookId: string, input: { title: string; text: string }) => {
    return playbooksSlice.addPlaybookDialog(playbookId, input)
  }, [playbooksSlice])

  const updatePlaybookDialog = useCallback((playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text' | 'tags'>>) => {
    playbooksSlice.updatePlaybookDialog(playbookId, dialogId, updates)
  }, [playbooksSlice])

  const removePlaybookDialog = useCallback((playbookId: string, dialogId: string) => {
    playbooksSlice.removePlaybookDialog(playbookId, dialogId)
  }, [playbooksSlice])

  const reorderPlaybookDialogs = useCallback((playbookId: string, orderedIds: string[]) => {
    playbooksSlice.reorderPlaybookDialogs(playbookId, orderedIds)
  }, [playbooksSlice])

  const duplicatePlaybookDialog = useCallback((playbookId: string, dialogId: string) => {
    return playbooksSlice.duplicatePlaybookDialog(playbookId, dialogId)
  }, [playbooksSlice])

  // ========================================
  // Playbook extensions (upgrade 15)
  // ========================================

  const snapshotPlaybookVersion = useCallback((playbookId: string) => {
    playbooksSlice.snapshotPlaybookVersion(playbookId)
  }, [playbooksSlice])

  const restorePlaybookVersion = useCallback((playbookId: string, versionId: string) => {
    playbooksSlice.restorePlaybookVersion(playbookId, versionId)
  }, [playbooksSlice])

  const togglePlaybookFavorite = useCallback((playbookId: string) => {
    playbookExtrasSlice.togglePlaybookFavorite(playbookId)
  }, [playbookExtrasSlice])

  const togglePlaybookArchived = useCallback((playbookId: string) => {
    playbookExtrasSlice.togglePlaybookArchived(playbookId)
  }, [playbookExtrasSlice])

  const movePlaybookToFolder = useCallback((playbookId: string, folderId: string | null) => {
    playbookExtrasSlice.movePlaybookToFolder(playbookId, folderId)
  }, [playbookExtrasSlice])

  const incrementPlaybookViewCount = useCallback((playbookId: string) => {
    playbooksSlice.incrementPlaybookViewCount(playbookId)
  }, [playbooksSlice])

  const incrementDialogCopyCount = useCallback((playbookId: string, dialogId: string) => {
    playbooksSlice.incrementDialogCopyCount(playbookId, dialogId)
  }, [playbooksSlice])

  const updatePlaybookDialogVariables = useCallback(
    (playbookId: string, dialogId: string, variables: PlaybookVariable[]) => {
      playbooksSlice.updatePlaybookDialog(playbookId, dialogId, { variables })
    },
    [playbooksSlice],
  )

  /** Cria playbook ja com conteudo e dialogs pre-definidos (usado por template). */
  const addPlaybookFromTemplate = useCallback((input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
    dialogs: Array<{
      title: string
      text: string
      variables?: PlaybookVariable[]
    }>
  }) => {
    return playbookExtrasSlice.addPlaybookFromTemplate(input)
  }, [playbookExtrasSlice])

  // Playbook folders CRUD
  const addPlaybookFolder = useCallback((name: string, color = '#6b7280') => {
    return playbooksSlice.addPlaybookFolder(name, color)
  }, [playbooksSlice])

  const updatePlaybookFolder = useCallback((folderId: string, updates: Partial<Pick<PlaybookFolder, 'name' | 'color'>>) => {
    playbooksSlice.updatePlaybookFolder(folderId, updates)
  }, [playbooksSlice])

  const removePlaybookFolder = useCallback((folderId: string) => {
    playbooksSlice.removePlaybookFolder(folderId)
  }, [playbooksSlice])

  // ========================================
  // Reset Store
  // ========================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Data
    cards: store.cards,
    shortcutFolders: store.shortcutFolders,
    shortcuts: store.shortcuts,
    projects: store.projects,
    registeredIDEs: store.registeredIDEs,
    calendarEvents: store.calendarEvents,
    noteFolders: store.noteFolders,
    notes: store.notes,
    colorPalettes: store.colorPalettes,
    clipboardCategories: store.clipboardCategories,
    clipboardItems: store.clipboardItems,
    apps: store.apps,
    appGroups: store.appGroups ?? [],
    appLaunchLogs: store.appLaunchLogs ?? [],
    macros: store.macros,
    habits: store.habits,
    habitEntries: store.habitEntries,
    bills: store.bills,
    expenses: store.expenses,
    budgetCategories: store.budgetCategories,
    incomes: store.incomes,
    financialConfig: store.financialConfig,
    savingsGoals: store.savingsGoals,
    quickAccess: store.quickAccess,
    playbooks: store.playbooks,
    playbookFolders: store.playbookFolders ?? [],
    study: store.study,
    settings: store.settings,
    lastSyncAt: store.lastSyncAt,
    // State
    isLoading,
    error,
    storeVersion,
    // Card methods
    addCard,
    addCardWithDate,
    editCard,
    removeCard,
    moveCardToCell,
    reorderInCell,
    getCardsForLocation,
    // Sprint Board (Upgrade 01)
    sprintColumns: store.sprintColumns ?? DEFAULT_SPRINT_COLUMNS,
    sprintColumnGroups: store.sprintColumnGroups ?? [],
    sprintColumnSections: store.sprintColumnSections ?? [],
    sprintSwimLanes: store.sprintSwimLanes ?? [],
    sprintMetadata: store.sprintMetadata ?? [],
    sprintBoardConfig: store.sprintBoardConfig ?? DEFAULT_SPRINT_BOARD_CONFIG,
    addSprintColumn,
    updateSprintColumn,
    removeSprintColumn,
    reorderSprintColumns,
    addSprintColumnGroup,
    updateSprintColumnGroup,
    removeSprintColumnGroup,
    addSprintColumnSection,
    updateSprintColumnSection,
    removeSprintColumnSection,
    addSprintSwimLane,
    updateSprintSwimLane,
    removeSprintSwimLane,
    updateSprintBoardConfig,
    upsertSprintMetadata,
    removeSprintMetadata,
    setActiveSprint,
    setCardSprint,
    setCardSprintColumn,
    setCardSprintSection,
    setCardSwimLane,
    // Sprint Cards (entidade separada)
    sprintCards: store.sprintCards ?? [],
    addSprintCard,
    editSprintCard,
    removeSprintCard,
    moveSprintCard,
    // Project methods (stubs) + IDE methods
    ...projectsSlice,
    // Calendar methods
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    calendarCategories: store.calendarCategories ?? [],
    addCalendarCategory,
    updateCalendarCategory,
    removeCalendarCategory,
    // Clipboard methods
    ...clipboardSlice,
    // Dashboard methods
    ...dashboardSlice,
    // Note methods
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
    // Lixeira de notas (Upgrade 10a)
    softDeleteNote,
    softDeleteNoteFolder,
    restoreNote,
    restoreNoteFolder,
    purgeNote,
    purgeNoteFolder,
    purgeOldTrash,
    emptyNotesTrash,
    // Templates de nota (Upgrade 10c)
    noteTemplates: store.noteTemplates ?? [],
    addNoteTemplate,
    updateNoteTemplate,
    removeNoteTemplate,
    setNoteBookmarks,
    // Canvas folders + versions (Upgrade 18)
    canvasFolders: store.canvasFolders ?? [],
    canvasFolderAssignments: store.canvasFolderAssignments ?? {},
    canvasVersions: store.canvasVersions ?? {},
    addCanvasFolder,
    renameCanvasFolder,
    removeCanvasFolder,
    moveCanvasToFolder,
    snapshotCanvasVersion,
    removeCanvasVersion,
    clearCanvasVersions,
    addColorPalette,
    updateColorPalette,
    removeColorPalette,
    // Meeting methods
    meetings: store.meetings,
    addMeeting,
    updateMeeting,
    removeMeeting,

    // Playbook methods
    addPlaybook,
    updatePlaybook,
    removePlaybook,
    addPlaybookDialog,
    updatePlaybookDialog,
    removePlaybookDialog,
    reorderPlaybookDialogs,
    duplicatePlaybookDialog,
    // Playbook extensions (upgrade 15)
    snapshotPlaybookVersion,
    restorePlaybookVersion,
    togglePlaybookFavorite,
    togglePlaybookArchived,
    movePlaybookToFolder,
    incrementPlaybookViewCount,
    incrementDialogCopyCount,
    updatePlaybookDialogVariables,
    addPlaybookFromTemplate,
    addPlaybookFolder,
    updatePlaybookFolder,
    removePlaybookFolder,
    replaceStore,
    updateStore,
    // Quick Access
    ...quickAccessSlice,
    // Store Management
    ...storeManagementSlice,
    // Settings
    ...settingsSlice,
    // Study
    ...studySlice,
    // Misc
    ...miscSlice,
  }
}
