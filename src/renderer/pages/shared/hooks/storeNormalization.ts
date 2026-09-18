import type {
  Card,
  Store,
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
  ColorPalette,
  AppItem,
  IncomeEntry,
  FinancialConfig,
  Project,
  ProjectLink,
  QuickAccessItem,
  StudyState,
  StudyGoal,
  StudyMediaItem,
  StudySessionLog,
  StudySessionPreset,
} from '@types'
import {
  normalizeCard,
  generateId,
} from '@utils'
import {
  BUILTIN_STUDY_PRESETS,
  DEFAULT_SETTINGS,
  DEFAULT_STUDY_STATE,
  THEMES,
} from '@types'
import { classifyClipboardContent } from '@Clipboard/clipboard/clipboardClassifier'

export type LegacyShortcutKind = 'url' | 'path' | 'clipboard'

/** Hash simples (FNV-1a) para detectar duplicatas de clipboard. Upgrade 18. */
export function hashClipboardContent(content: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export type ShortcutItemInput = Omit<ShortcutItem, 'kind'> & { kind?: LegacyShortcutKind }

export const clampStudyMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

export const clampStudyVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(1, Math.max(0, value))
}

export const normalizeStudyState = (input: Partial<StudyState> | null | undefined): StudyState => {
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

export const getDefaultStore = (): Store => ({
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
  sprintCards: [],
  sprintColumnSections: [],
  calendarCategories: [],
  study: { ...DEFAULT_STUDY_STATE },
  settings: { ...DEFAULT_SETTINGS },
})

export const normalizeStore = (input: Partial<Store> | null | undefined): Store => {
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
    const entries = Object.entries(THEMES) as [ThemeName, { primary: string }][]
    const match = entries.find(([, t]) => t.primary === oldSettings.theme?.primary)
    if (match) themeName = match[0]
  }

  // Normalizar cards
  const rawCards = Array.isArray(input.cards) ? input.cards : base.cards
  const normalizedCards = rawCards.map(card => normalizeCard(card as Card & { id: string; title: string }))

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
