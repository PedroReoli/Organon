import { randomUUID } from 'crypto'

import type {
  ColorPalette,
  FinancialConfig,
  IncomeEntry,
  LegacyShortcutKind,
  PathItem,
  ShortcutFolder,
  ShortcutItem,
  ShortcutItemInput,
  Store,
  StudyGoal,
  StudyMediaItem,
  StudySessionLog,
  StudyState,
  ThemeName,
} from './types'

export const DEFAULT_STUDY_STATE: StudyState = {
  wallpaperUrl: '',
  focusMinutes: 25,
  breakMinutes: 5,
  muteSound: false,
  mediaItems: [],
  goals: [],
  sessions: [],
}

const clampStudyMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

const clampStudyVolume = (value: number): number => {
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
        id: item.id ?? randomUUID(),
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
        id: goal.id ?? randomUUID(),
        title: goal.title.trim(),
        description: goal.description ?? '',
        priority: goal.priority && ['P1', 'P2', 'P3', 'P4'].includes(goal.priority) ? goal.priority : null,
        status: goal.status && ['todo', 'in_progress', 'blocked', 'done'].includes(goal.status) ? goal.status : 'todo',
        checklist: Array.isArray(goal.checklist)
          ? goal.checklist
            .map(item => ({
              id: item.id ?? randomUUID(),
              text: item.text ?? '',
              done: Boolean(item.done),
            }))
            .filter(item => item.text.trim().length > 0)
          : [],
        linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
        createdAt: goal.createdAt ?? new Date().toISOString(),
        updatedAt: goal.updatedAt ?? new Date().toISOString(),
      }))
    : base.goals

  const sessions: StudySessionLog[] = Array.isArray(raw.sessions)
    ? raw.sessions
      .filter(session => session && typeof session.completedAt === 'string')
      .map(session => ({
        id: session.id ?? randomUUID(),
        completedAt: session.completedAt,
        focusSeconds: Math.max(0, Number(session.focusSeconds) || 0),
      }))
    : base.sessions

  return {
    wallpaperUrl: typeof raw.wallpaperUrl === 'string' ? raw.wallpaperUrl : base.wallpaperUrl,
    focusMinutes: clampStudyMinutes(Number(raw.focusMinutes), base.focusMinutes),
    breakMinutes: clampStudyMinutes(Number(raw.breakMinutes), base.breakMinutes),
    muteSound: Boolean(raw.muteSound),
    mediaItems,
    goals,
    sessions,
  }
}

export const getDefaultStore = (): Store => ({
  version: 10,
  cards: [],
  shortcutFolders: [],
  shortcuts: [],
  paths: [],
  projects: [],
  registeredIDEs: [],
  calendarEvents: [],
  noteFolders: [],
  notes: [],
  colorPalettes: [],
  clipboardCategories: [],
  clipboardItems: [],
  files: [],
  apps: [],
  macros: [],
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
  quickAccess: [],
  meetings: [],
  study: { ...DEFAULT_STUDY_STATE },
  settings: {
    themeName: 'dark-default',
    dataDir: null,
    installerCompleted: false,
    weekStart: null,
    backupEnabled: true,
    backupIntervalMinutes: 15,
  },
})

export const normalizeStore = (input: Partial<Store> | null): Store => {
  const base = getDefaultStore()
  if (!input || typeof input !== 'object') return base
  const settings = input.settings ?? base.settings
  const rawShortcuts = Array.isArray(input.shortcuts)
    ? (input.shortcuts as ShortcutItemInput[])
    : (base.shortcuts as ShortcutItemInput[])
  const rawPaths = Array.isArray((input as Partial<Store> & { paths?: PathItem[] }).paths)
    ? (input as Partial<Store> & { paths?: PathItem[] }).paths as PathItem[]
    : base.paths

  const migratedPaths: PathItem[] = []
  const normalizedShortcuts = rawShortcuts.reduce<ShortcutItem[]>((acc, shortcut) => {
    const kind: LegacyShortcutKind = shortcut.kind ?? 'url'
    if (kind === 'path') {
      migratedPaths.push({
        id: shortcut.id,
        title: shortcut.title,
        path: shortcut.value,
        order: shortcut.order,
      })
      return acc
    }
    if (kind === 'url') {
      acc.push({ ...shortcut, kind: 'url' })
    }
    return acc
  }, [])

  const normalizedPaths = [...rawPaths, ...migratedPaths].filter(item => item && item.path)
  const normalizedFolders = Array.isArray(input.shortcutFolders)
    ? input.shortcutFolders.map(folder => ({
      ...folder,
      parentId: (folder as ShortcutFolder & { parentId?: string | null }).parentId ?? null,
    }))
    : base.shortcutFolders

  type OldSettings = {
    theme?: { primary?: string }
    themeName?: ThemeName
    dataDir?: string | null
    installerCompleted?: boolean
    weekStart?: string | null
    apiToken?: string
    apiBaseUrl?: string
    apiEmail?: string
    apiRefreshToken?: string
    keyboardShortcuts?: Array<{
      id: string
      action: string
      description: string
      keys: {
        ctrl?: boolean
        shift?: boolean
        alt?: boolean
        meta?: boolean
        key: string
      }
    }>
    backupEnabled?: boolean
    backupIntervalMinutes?: number
  }

  const oldSettings = settings as OldSettings
  let themeName: ThemeName = base.settings.themeName
  if (oldSettings?.themeName) {
    themeName = oldSettings.themeName
  }

  return {
    ...base,
    ...input,
    version: 10,
    cards: Array.isArray(input.cards) ? input.cards : base.cards,
    shortcutFolders: normalizedFolders,
    shortcuts: normalizedShortcuts,
    paths: normalizedPaths,
    projects: Array.isArray(input.projects) ? input.projects : base.projects,
    registeredIDEs: Array.isArray(input.registeredIDEs) ? input.registeredIDEs : base.registeredIDEs,
    calendarEvents: Array.isArray(input.calendarEvents) ? input.calendarEvents : base.calendarEvents,
    noteFolders: Array.isArray(input.noteFolders) ? input.noteFolders : base.noteFolders,
    notes: Array.isArray(input.notes) ? input.notes : base.notes,
    colorPalettes: Array.isArray((input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes)
      ? (input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes as ColorPalette[]
      : base.colorPalettes,
    clipboardCategories: Array.isArray(input.clipboardCategories) ? input.clipboardCategories : base.clipboardCategories,
    clipboardItems: Array.isArray(input.clipboardItems) ? input.clipboardItems : base.clipboardItems,
    files: Array.isArray(input.files) ? input.files : base.files,
    apps: Array.isArray(input.apps) ? input.apps : base.apps,
    macros: Array.isArray(input.macros) ? input.macros : base.macros,
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
    quickAccess: Array.isArray(input.quickAccess) ? input.quickAccess : base.quickAccess,
    meetings: Array.isArray(input.meetings) ? input.meetings : base.meetings,
    study: normalizeStudyState((input as Partial<Store> & { study?: Partial<StudyState> }).study),
    settings: {
      themeName,
      dataDir: oldSettings?.dataDir ?? base.settings.dataDir,
      installerCompleted: oldSettings?.installerCompleted ?? base.settings.installerCompleted,
      weekStart: oldSettings?.weekStart ?? base.settings.weekStart,
      apiToken: oldSettings?.apiToken ?? base.settings.apiToken,
      apiBaseUrl: oldSettings?.apiBaseUrl ?? base.settings.apiBaseUrl,
      apiEmail: oldSettings?.apiEmail ?? base.settings.apiEmail,
      apiRefreshToken: oldSettings?.apiRefreshToken ?? base.settings.apiRefreshToken,
      keyboardShortcuts: oldSettings?.keyboardShortcuts ?? base.settings.keyboardShortcuts,
      backupEnabled: oldSettings?.backupEnabled ?? true,
      backupIntervalMinutes: oldSettings?.backupIntervalMinutes ?? base.settings.backupIntervalMinutes,
    },
  }
}
