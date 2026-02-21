import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Card,
  Store,
  CardLocation,
  Day,
  Period,
  ShortcutFolder,
  ShortcutItem,
  PathItem,
  Settings,
  ThemeName,
  CalendarEvent,
  ClipboardItem,
  ClipboardCategory,
  FileItem,
  Note,
  NoteFolder,
  ColorPalette,
  AppItem,
  AppMacro,
  Habit,
  HabitEntry,
  Bill,
  Expense,
  BudgetCategory,
  IncomeEntry,
  FinancialConfig,
  SavingsGoal,
  Project,
  ProjectLink,
  RegisteredIDE,
  QuickAccessItem,
  Meeting,
  Playbook,
  PlaybookDialog,
  CRMContact,
  CRMInteraction,
  CRMTag,
  CRMPriority,
  CRMStageId,
  CRMInteractionType,
  CRMContactLinks,
  StudyState,
  StudyGoal,
  StudyMediaItem,
  StudySessionLog,
} from '../types'
import {
  createCard,
  updateCard,
  deleteCard,
  getCardsForCell,
  getCurrentWeekDates,
  getDayFromDate,
  getPeriodFromTime,
  isElectron,
  createShortcutFolder,
  createShortcut,
  createPathItem,
  createProject,
  createRegisteredIDE,
  normalizeCard,
  normalizeTime,
  generateId,
  createClipboardCategory,
} from '../utils'
import { DEFAULT_SETTINGS, DEFAULT_STUDY_STATE, THEMES } from '../types'

type LegacyShortcutKind = 'url' | 'path' | 'clipboard'
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
        description: goal.description ?? '',
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
        linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
        createdAt: goal.createdAt ?? new Date().toISOString(),
        updatedAt: goal.updatedAt ?? new Date().toISOString(),
      }))
    : base.goals

  const sessions: StudySessionLog[] = Array.isArray(raw.sessions)
    ? raw.sessions
      .filter(session => session && typeof session.completedAt === 'string')
      .map(session => ({
        id: session.id ?? generateId(),
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

const getDefaultStore = (): Store => ({
  version: 12,
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
  playbooks: [],
  crmContacts: [],
  crmInteractions: [],
  crmTags: [],
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
      acc.push({ ...shortcut, kind: 'url', icon: (shortcut as ShortcutItem & { icon?: ShortcutItem['icon'] }).icon ?? null })
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
            }))
            .sort((a, b) => a.order - b.order)
          : [],
        order: Number.isFinite(pb.order) ? pb.order : 0,
        createdAt: pb.createdAt ?? new Date().toISOString(),
        updatedAt: pb.updatedAt ?? pb.createdAt ?? new Date().toISOString(),
      }))
      .sort((a, b) => a.order - b.order)
    : base.playbooks

  return {
    ...base,
    ...input,
    version: 12,
    cards: normalizedCards.map(c => ({ ...c, projectId: (c as Card & { projectId?: string | null }).projectId ?? null })),
    shortcutFolders: normalizedFolders,
    shortcuts: normalizedShortcuts,
    paths: normalizedPaths,
    projects: Array.isArray(input.projects)
      ? input.projects.map(p => ({
        ...p,
        path: (p as Project).path ?? '',
        links: Array.isArray((p as Project & { links?: ProjectLink[] }).links) ? (p as Project).links : [],
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
        color: (ev as CalendarEvent).color ?? '#6366f1',
        createdAt: (ev as CalendarEvent).createdAt ?? new Date().toISOString(),
        updatedAt: (ev as CalendarEvent).updatedAt ?? (ev as CalendarEvent).createdAt ?? new Date().toISOString(),
      }))
      : base.calendarEvents,
    noteFolders: Array.isArray(input.noteFolders) ? input.noteFolders : base.noteFolders,
    notes: Array.isArray(input.notes)
      ? input.notes.map(n => ({ ...n, projectId: (n as Note & { projectId?: string | null }).projectId ?? null }))
      : base.notes,
    colorPalettes: Array.isArray((input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes)
      ? (input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes as ColorPalette[]
      : base.colorPalettes,
    clipboardCategories: Array.isArray((input as Partial<Store> & { clipboardCategories?: ClipboardCategory[] }).clipboardCategories)
      ? (input as Partial<Store> & { clipboardCategories?: ClipboardCategory[] }).clipboardCategories as ClipboardCategory[]
      : base.clipboardCategories,
    clipboardItems: Array.isArray(input.clipboardItems)
      ? input.clipboardItems.map(item => ({ ...item, categoryId: (item as ClipboardItem & { categoryId?: string | null }).categoryId ?? null }))
      : base.clipboardItems,
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
    quickAccess: normalizedQuickAccess,
    meetings: Array.isArray(input.meetings) ? input.meetings : base.meetings,
    playbooks: normalizedPlaybooks,
    crmContacts: Array.isArray((input as Partial<Store> & { crmContacts?: CRMContact[] }).crmContacts)
      ? (input as Partial<Store> & { crmContacts?: CRMContact[] }).crmContacts as CRMContact[]
      : base.crmContacts,
    crmInteractions: Array.isArray((input as Partial<Store> & { crmInteractions?: CRMInteraction[] }).crmInteractions)
      ? (input as Partial<Store> & { crmInteractions?: CRMInteraction[] }).crmInteractions as CRMInteraction[]
      : base.crmInteractions,
    crmTags: Array.isArray((input as Partial<Store> & { crmTags?: CRMTag[] }).crmTags)
      ? (input as Partial<Store> & { crmTags?: CRMTag[] }).crmTags as CRMTag[]
      : base.crmTags,
    study: normalizeStudyState((input as Partial<Store> & { study?: Partial<StudyState> }).study),
    settings: {
      themeName,
      dataDir: settings?.dataDir ?? base.settings.dataDir,
      installerCompleted: (settings as Settings)?.installerCompleted ?? base.settings.installerCompleted,
      weekStart: (settings as Settings)?.weekStart ?? base.settings.weekStart,
      keyboardShortcuts: (settings as Settings)?.keyboardShortcuts ?? base.settings.keyboardShortcuts,
      backupEnabled: (settings as Settings)?.backupEnabled ?? base.settings.backupEnabled,
      backupIntervalMinutes: (settings as Settings)?.backupIntervalMinutes ?? base.settings.backupIntervalMinutes,
    },
  }
}

export const useStore = () => {
  const [store, setStore] = useState<Store>(getDefaultStore())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

          const nextCards = input.cards.filter(card => {
            if (!card.hasDate) return true
            if (!card.date) return false
            return card.date >= weekStart
          })

          return {
            store: {
              ...input,
              cards: nextCards,
              settings: { ...input.settings, weekStart },
            },
            changed: true,
          }
        }

        if (isElectron()) {
          const loaded = await window.electronAPI.loadStore()
          const normalized = normalizeStore(loaded)
          const { store: next, changed } = applyWeeklyMaintenance(normalized)
          setStore(next)
          if (changed) {
            await window.electronAPI.saveStore(next)
          }
        } else {
          const stored = localStorage.getItem('organizador-semanal-store')
          if (stored) {
            const parsed = JSON.parse(stored) as Store
            const normalized = normalizeStore(parsed)
            const { store: next, changed } = applyWeeklyMaintenance(normalized)
            setStore(next)
            if (changed) {
              localStorage.setItem('organizador-semanal-store', JSON.stringify(next))
            }
          } else {
            const initial = getDefaultStore()
            const { store: next } = applyWeeklyMaintenance(initial)
            setStore(next)
            localStorage.setItem('organizador-semanal-store', JSON.stringify(next))
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

  const saveStore = useCallback((nextStore: Store) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const normalized = normalizeStore(nextStore)
      try {
        if (isElectron()) {
          await window.electronAPI.saveStore(normalized)
        } else {
          localStorage.setItem('organizador-semanal-store', JSON.stringify(normalized))
        }
      } catch (err) {
        console.error('Erro ao salvar store:', err)
        setError('Erro ao salvar dados')
      }
    }, 300)
  }, [])

  const updateStore = useCallback((updater: (prev: Store) => Store) => {
    setStore(prev => {
      const next = normalizeStore(updater(prev))
      saveStore(next)
      return next
    })
  }, [saveStore])

  const addCard = useCallback((title: string) => {
    if (!title.trim()) return
    const newCard = createCard(title)
    updateStore(prev => ({
      ...prev,
      cards: [...prev.cards, newCard],
    }))
  }, [updateStore])

  const addCardWithDate = useCallback((input: { title: string; date: string; location: CardLocation }) => {
    if (!input.title.trim() || !input.date.trim()) return null
    const newCard = createCard(input.title, input.date)

    updateStore(prev => {
      const sameCellOrders = prev.cards
        .filter(c => c.location.day === input.location.day && c.location.period === input.location.period)
        .map(c => c.order)
      const nextOrder = sameCellOrders.length > 0 ? Math.max(...sameCellOrders) + 1 : 0

      return {
        ...prev,
        cards: [...prev.cards, { ...newCard, location: input.location, order: nextOrder }],
      }
    })

    return newCard.id
  }, [updateStore])

  const editCard = useCallback((cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'priority' | 'status' | 'checklist' | 'projectId'>>) => {
    updateStore(prev => {
      const nextUpdates = {
        ...updates,
        ...(typeof updates.time === 'string' || updates.time === null
          ? { time: normalizeTime(updates.time) }
          : {}),
      }
      const updatedCards = updateCard(prev.cards, cardId, nextUpdates)
      const updated = updatedCards.find(c => c.id === cardId)
      if (!updated) {
        return { ...prev, cards: updatedCards }
      }

      // Mantem o Planejamento sincronizado com o Calendario:
      // se o card estiver em uma celula (dia+periodo) e tiver data, o dia deve bater com o dia da semana da data.
      if (updated.hasDate && updated.date && updated.location.day && updated.location.period) {
        const dayFromDate = getDayFromDate(updated.date)
        if (updated.location.day !== dayFromDate) {
          return {
            ...prev,
            cards: updatedCards.map(card => (
              card.id === cardId
                ? { ...card, location: { ...card.location, day: dayFromDate } }
                : card
            )),
          }
        }
      }

      // Se o card tiver hora, alinhar o periodo (manha/tarde/noite) automaticamente.
      if (updated.hasDate && updated.date && updated.time && updated.location.day && updated.location.period) {
        const normalized = normalizeTime(updated.time)
        if (normalized) {
          const periodFromTime = getPeriodFromTime(normalized)
          if (updated.location.period !== periodFromTime) {
            return {
              ...prev,
              cards: updatedCards.map(card => (
                card.id === cardId
                  ? { ...card, time: normalized, location: { ...card.location, period: periodFromTime } }
                  : card
              )),
            }
          }
        }
      }

      return { ...prev, cards: updatedCards }
    })
  }, [updateStore])

  const removeCard = useCallback((cardId: string) => {
    updateStore(prev => ({
      ...prev,
      cards: deleteCard(prev.cards, cardId),
    }))
  }, [updateStore])

  const moveCardToCell = useCallback((
    cardId: string,
    newLocation: CardLocation,
    newIndex: number
  ) => {
    updateStore(prev => {
      const weekDates = getCurrentWeekDates()
      const card = prev.cards.find(c => c.id === cardId)
      if (!card) return prev

      const isCellMove = !!newLocation.day && !!newLocation.period
      const nextCard = card.hasDate && isCellMove
        ? { ...card, date: weekDates[newLocation.day as Day] }
        : card

      const targetCards = prev.cards
        .filter(c =>
          c.location.day === newLocation.day &&
          c.location.period === newLocation.period &&
          c.id !== cardId
        )
        .sort((a, b) => a.order - b.order)

      targetCards.splice(newIndex, 0, { ...nextCard, location: newLocation })

      const updatedTargetCards = targetCards.map((c, idx) => ({
        ...c,
        order: idx,
      }))

      const newCards = prev.cards.map(c => {
        const updated = updatedTargetCards.find(u => u.id === c.id)
        return updated || c
      })

      return {
        ...prev,
        cards: newCards,
      }
    })
  }, [updateStore])

  const reorderInCell = useCallback((
    day: Day | null,
    period: Period | null,
    orderedIds: string[]
  ) => {
    updateStore(prev => {
      const newCards = prev.cards.map(card => {
        if (card.location.day === day && card.location.period === period) {
          const newOrder = orderedIds.indexOf(card.id)
          if (newOrder !== -1) {
            return { ...card, order: newOrder }
          }
        }
        return card
      })

      return {
        ...prev,
        cards: newCards,
      }
    })
  }, [updateStore])

  const getCardsForLocation = useCallback((day: Day | null, period: Period | null) => {
    return getCardsForCell(store.cards, day, period)
  }, [store.cards])

  const addShortcutFolder = useCallback((name: string, parentId?: string | null) => {
    if (!name.trim()) return
    const newFolder = createShortcutFolder(name, parentId ?? null)
    updateStore(prev => ({
      ...prev,
      shortcutFolders: [...prev.shortcutFolders, newFolder],
    }))
  }, [updateStore])

  const renameShortcutFolder = useCallback((folderId: string, name: string) => {
    if (!name.trim()) return
    updateStore(prev => ({
      ...prev,
      shortcutFolders: prev.shortcutFolders.map(folder => (
        folder.id === folderId ? { ...folder, name: name.trim() } : folder
      )),
    }))
  }, [updateStore])

  const removeShortcutFolder = useCallback((folderId: string) => {
    updateStore(prev => ({
      ...prev,
      shortcutFolders: prev.shortcutFolders.filter(folder => folder.id !== folderId),
      shortcuts: prev.shortcuts.map(shortcut => (
        shortcut.folderId === folderId ? { ...shortcut, folderId: null } : shortcut
      )),
    }))
  }, [updateStore])

  const addShortcut = useCallback((input: {
    title: string
    value: string
    folderId: string | null
  }) => {
    if (!input.title.trim() || !input.value.trim()) return
    const newShortcut = createShortcut(input)
    updateStore(prev => ({
      ...prev,
      shortcuts: [...prev.shortcuts, newShortcut],
    }))
  }, [updateStore])

  const updateShortcut = useCallback((shortcutId: string, updates: Partial<Pick<ShortcutItem, 'title' | 'value' | 'icon'>>) => {
    updateStore(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(shortcut => {
        if (shortcut.id !== shortcutId) return shortcut
        return {
          ...shortcut,
          title: updates.title ?? shortcut.title,
          value: updates.value ?? shortcut.value,
          icon: updates.icon ?? shortcut.icon ?? null,
        }
      }),
    }))
  }, [updateStore])

  const moveShortcutToFolder = useCallback((shortcutId: string, folderId: string | null) => {
    updateStore(prev => {
      const otherOrders = prev.shortcuts
        .filter(s => s.folderId === folderId && s.id !== shortcutId)
        .map(s => s.order)
      const nextOrder = otherOrders.length > 0 ? Math.max(...otherOrders) + 1 : 0

      return {
        ...prev,
        shortcuts: prev.shortcuts.map(shortcut => (
          shortcut.id === shortcutId ? { ...shortcut, folderId, order: nextOrder } : shortcut
        )),
      }
    })
  }, [updateStore])

  const reorderShortcutsInFolder = useCallback((folderId: string | null, orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(shortcut => {
        if (shortcut.folderId !== folderId) return shortcut
        const idx = orderedIds.indexOf(shortcut.id)
        if (idx === -1) return shortcut
        return { ...shortcut, order: idx }
      }),
    }))
  }, [updateStore])

  const removeShortcut = useCallback((shortcutId: string) => {
    updateStore(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.filter(shortcut => shortcut.id !== shortcutId),
    }))
  }, [updateStore])

  const reorderFolders = useCallback((orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      shortcutFolders: prev.shortcutFolders.map(folder => {
        const idx = orderedIds.indexOf(folder.id)
        if (idx === -1) return folder
        return { ...folder, order: idx }
      }),
    }))
  }, [updateStore])

  const moveFolderToParent = useCallback((folderId: string, newParentId: string | null) => {
    updateStore(prev => {
      const isDescendant = (ancestorId: string, targetId: string | null): boolean => {
        if (!targetId) return false
        if (targetId === ancestorId) return true
        const parent = prev.shortcutFolders.find(f => f.id === targetId)
        return parent ? isDescendant(ancestorId, parent.parentId) : false
      }
      if (isDescendant(folderId, newParentId)) return prev

      const siblingOrders = prev.shortcutFolders
        .filter(f => f.parentId === newParentId && f.id !== folderId)
        .map(f => f.order)
      const nextOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0

      return {
        ...prev,
        shortcutFolders: prev.shortcutFolders.map(folder =>
          folder.id === folderId
            ? { ...folder, parentId: newParentId, order: nextOrder }
            : folder
        ),
      }
    })
  }, [updateStore])

  const removeShortcuts = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    updateStore(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.filter(s => !idSet.has(s.id)),
    }))
  }, [updateStore])

  const moveShortcuts = useCallback((ids: string[], folderId: string | null) => {
    const idSet = new Set(ids)
    updateStore(prev => {
      const existingOrders = prev.shortcuts
        .filter(s => s.folderId === folderId && !idSet.has(s.id))
        .map(s => s.order)
      let nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 0
      return {
        ...prev,
        shortcuts: prev.shortcuts.map(s => {
          if (!idSet.has(s.id)) return s
          return { ...s, folderId, order: nextOrder++ }
        }),
      }
    })
  }, [updateStore])

  const addPath = useCallback((input: { title: string; path: string }) => {
    if (!input.title.trim() || !input.path.trim()) return
    const newPath = createPathItem(input)
    updateStore(prev => ({
      ...prev,
      paths: [...prev.paths, newPath],
    }))
  }, [updateStore])

  const updatePath = useCallback((pathId: string, updates: Partial<Pick<PathItem, 'title' | 'path'>>) => {
    updateStore(prev => ({
      ...prev,
      paths: prev.paths.map(item => {
        if (item.id !== pathId) return item
        return {
          ...item,
          title: updates.title ?? item.title,
          path: updates.path ?? item.path,
        }
      }),
    }))
  }, [updateStore])

  const removePath = useCallback((pathId: string) => {
    updateStore(prev => ({
      ...prev,
      paths: prev.paths.filter(item => item.id !== pathId),
    }))
  }, [updateStore])

  // ========================================
  // PROJECTS
  // ========================================

  const addProject = useCallback((input: { name: string; path?: string; description?: string; color?: string; links?: ProjectLink[]; preferredIdeId?: string | null }) => {
    if (!input.name.trim()) return
    const newProject = createProject(input)
    updateStore(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
    }))
    return newProject.id
  }, [updateStore])

  const updateProject = useCallback((projectId: string, updates: Partial<Pick<Project, 'name' | 'path' | 'description' | 'color' | 'links' | 'preferredIdeId'>>) => {
    updateStore(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id !== projectId) return p
        return { ...p, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeProject = useCallback((projectId: string) => {
    updateStore(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      cards: prev.cards.map(c => c.projectId === projectId ? { ...c, projectId: null } : c),
      notes: prev.notes.map(n => n.projectId === projectId ? { ...n, projectId: null } : n),
    }))
  }, [updateStore])

  // ========================================
  // REGISTERED IDEs
  // ========================================

  const addRegisteredIDE = useCallback((input: { name: string; exePath: string; iconDataUrl?: string | null; args?: string }) => {
    if (!input.name.trim() || !input.exePath.trim()) return
    const newIDE = createRegisteredIDE(input)
    updateStore(prev => ({
      ...prev,
      registeredIDEs: [...prev.registeredIDEs, newIDE],
    }))
    return newIDE.id
  }, [updateStore])

  const updateRegisteredIDE = useCallback((ideId: string, updates: Partial<Pick<RegisteredIDE, 'name' | 'exePath' | 'iconDataUrl' | 'args'>>) => {
    updateStore(prev => ({
      ...prev,
      registeredIDEs: prev.registeredIDEs.map(ide => {
        if (ide.id !== ideId) return ide
        return { ...ide, ...updates }
      }),
    }))
  }, [updateStore])

  const removeRegisteredIDE = useCallback((ideId: string) => {
    updateStore(prev => ({
      ...prev,
      registeredIDEs: prev.registeredIDEs.filter(ide => ide.id !== ideId),
      projects: prev.projects.map(p => p.preferredIdeId === ideId ? { ...p, preferredIdeId: null } : p),
    }))
  }, [updateStore])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    updateStore(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }))
  }, [updateStore])

  const updateStudy = useCallback((updater: (prev: StudyState) => StudyState) => {
    updateStore(prev => ({
      ...prev,
      study: normalizeStudyState(updater(prev.study)),
    }))
  }, [updateStore])

  // ========================================
  // CALENDAR EVENTS
  // ========================================

  const addCalendarEvent = useCallback((input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newEvent: CalendarEvent = {
      ...input,
      time: normalizeTime(input.time) ?? null,
      recurrence: input.recurrence ?? null,
      reminder: input.reminder ?? null,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    updateStore(prev => ({
      ...prev,
      calendarEvents: [...prev.calendarEvents, newEvent],
    }))
  }, [updateStore])

  const updateCalendarEvent = useCallback((eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(event => {
        if (event.id !== eventId) return event
        const nextUpdates = {
          ...updates,
          ...(typeof updates.time === 'string' || updates.time === null
            ? { time: normalizeTime(updates.time) }
            : {}),
        }
        return { ...event, ...nextUpdates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeCalendarEvent = useCallback((eventId: string) => {
    updateStore(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter(event => event.id !== eventId),
    }))
  }, [updateStore])

  // ========================================
  // CLIPBOARD
  // ========================================

  const addClipboardCategory = useCallback((name: string) => {
    const newCategory = createClipboardCategory(name)
    updateStore(prev => ({
      ...prev,
      clipboardCategories: [...prev.clipboardCategories, newCategory],
    }))
  }, [updateStore])

  const renameClipboardCategory = useCallback((categoryId: string, name: string) => {
    if (!name.trim()) return
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.map(cat =>
        cat.id === categoryId ? { ...cat, name: name.trim() } : cat
      ),
    }))
  }, [updateStore])

  const removeClipboardCategory = useCallback((categoryId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.filter(cat => cat.id !== categoryId),
      clipboardItems: prev.clipboardItems.map(item =>
        item.categoryId === categoryId ? { ...item, categoryId: null } : item
      ),
    }))
  }, [updateStore])

  const reorderClipboardCategories = useCallback((orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.map(cat => {
        const idx = orderedIds.indexOf(cat.id)
        if (idx === -1) return cat
        return { ...cat, order: idx }
      }),
    }))
  }, [updateStore])

  const addClipboardItem = useCallback((content: string, title?: string, categoryId?: string | null) => {
    const now = new Date().toISOString()
    const newItem: ClipboardItem = {
      id: generateId(),
      title: title ?? content.slice(0, 50),
      content,
      isPinned: false,
      categoryId: categoryId ?? null,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      clipboardItems: [...prev.clipboardItems, newItem],
    }))
  }, [updateStore])

  const updateClipboardItem = useCallback((itemId: string, updates: Partial<Pick<ClipboardItem, 'title' | 'isPinned' | 'categoryId'>>) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map(item => {
        if (item.id !== itemId) return item
        return { ...item, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeClipboardItem = useCallback((itemId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.filter(item => item.id !== itemId),
    }))
  }, [updateStore])

  const moveClipboardItemToCategory = useCallback((itemId: string, categoryId: string | null) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map(item =>
        item.id === itemId ? { ...item, categoryId, updatedAt: new Date().toISOString() } : item
      ),
    }))
  }, [updateStore])

  // ========================================
  // FILES
  // ========================================

  const addFileItem = useCallback((item: FileItem) => {
    updateStore(prev => ({
      ...prev,
      files: [...prev.files, item],
    }))
  }, [updateStore])

  const removeFileItem = useCallback((fileId: string) => {
    updateStore(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId),
    }))
  }, [updateStore])

  // ========================================
  // NOTES
  // ========================================

  const addNoteFolder = useCallback((name: string, parentId?: string | null) => {
    const newFolder: NoteFolder = {
      id: generateId(),
      name: name.trim(),
      parentId: parentId ?? null,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      noteFolders: [...prev.noteFolders, newFolder],
    }))
    return newFolder.id
  }, [updateStore])

  const updateNoteFolder = useCallback((folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId'>>) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.map(folder => {
        if (folder.id !== folderId) return folder
        return { ...folder, ...updates }
      }),
    }))
  }, [updateStore])

  const removeNoteFolder = useCallback((folderId: string) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.filter(folder => folder.id !== folderId),
      notes: prev.notes.map(note => (
        note.folderId === folderId ? { ...note, folderId: null } : note
      )),
    }))
  }, [updateStore])

  const addNote = useCallback((title: string, folderId?: string | null, projectId?: string | null) => {
    const now = new Date().toISOString()
    const id = generateId()
    const newNote: Note = {
      id,
      title: title.trim(),
      mdPath: `${id}.md`,
      folderId: folderId ?? null,
      projectId: projectId ?? null,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }))
    return newNote
  }, [updateStore])

  const updateNote = useCallback((noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId'>>) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map(note => {
        if (note.id !== noteId) return note
        return { ...note, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeNote = useCallback((noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== noteId),
    }))
  }, [updateStore])

  // ========================================
  // COLOR PALETTES
  // ========================================

  const addColorPalette = useCallback((name: string, colors: string[]) => {
    const now = new Date().toISOString()
    const newPalette: ColorPalette = {
      id: generateId(),
      name: name.trim(),
      colors,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      colorPalettes: [...prev.colorPalettes, newPalette],
    }))
    return newPalette.id
  }, [updateStore])

  const updateColorPalette = useCallback((paletteId: string, updates: Partial<Pick<ColorPalette, 'name' | 'colors'>>) => {
    updateStore(prev => ({
      ...prev,
      colorPalettes: prev.colorPalettes.map(palette => {
        if (palette.id !== paletteId) return palette
        return { ...palette, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeColorPalette = useCallback((paletteId: string) => {
    updateStore(prev => ({
      ...prev,
      colorPalettes: prev.colorPalettes.filter(p => p.id !== paletteId),
    }))
  }, [updateStore])

  // ========================================
  // APPS & MACROS
  // ========================================

  const addApp = useCallback((input: { name: string; exePath: string; iconPath?: string | null }) => {
    const newApp: AppItem = {
      id: generateId(),
      name: input.name.trim(),
      exePath: input.exePath,
      iconPath: input.iconPath ?? null,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      apps: [...prev.apps, newApp],
    }))
    return newApp.id
  }, [updateStore])

  const updateApp = useCallback((appId: string, updates: Partial<Pick<AppItem, 'name' | 'exePath' | 'iconPath'>>) => {
    updateStore(prev => ({
      ...prev,
      apps: prev.apps.map(app => {
        if (app.id !== appId) return app
        return { ...app, ...updates }
      }),
    }))
  }, [updateStore])

  const removeApp = useCallback((appId: string) => {
    updateStore(prev => ({
      ...prev,
      apps: prev.apps.filter(app => app.id !== appId),
      macros: prev.macros.map(macro => ({
        ...macro,
        appIds: macro.appIds.filter(id => id !== appId),
      })),
    }))
  }, [updateStore])

  const addMacro = useCallback((input: { name: string; appIds: string[]; mode: 'sequential' | 'simultaneous' }) => {
    const newMacro: AppMacro = {
      id: generateId(),
      name: input.name.trim(),
      appIds: input.appIds,
      mode: input.mode,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      macros: [...prev.macros, newMacro],
    }))
    return newMacro.id
  }, [updateStore])

  const updateMacro = useCallback((macroId: string, updates: Partial<Pick<AppMacro, 'name' | 'appIds' | 'mode'>>) => {
    updateStore(prev => ({
      ...prev,
      macros: prev.macros.map(macro => {
        if (macro.id !== macroId) return macro
        return { ...macro, ...updates }
      }),
    }))
  }, [updateStore])

  const removeMacro = useCallback((macroId: string) => {
    updateStore(prev => ({
      ...prev,
      macros: prev.macros.filter(macro => macro.id !== macroId),
    }))
  }, [updateStore])

  // ========================================
  // HABITS
  // ========================================

  const addHabit = useCallback((input: Omit<Habit, 'id' | 'createdAt' | 'order'>) => {
    const newHabit: Habit = {
      ...input,
      id: generateId(),
      order: Date.now(),
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }))
    return newHabit.id
  }, [updateStore])

  const updateHabit = useCallback((habitId: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habitId ? { ...h, ...updates } : h),
    }))
  }, [updateStore])

  const removeHabit = useCallback((habitId: string) => {
    updateStore(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== habitId),
      habitEntries: prev.habitEntries.filter(e => e.habitId !== habitId),
    }))
  }, [updateStore])

  const addHabitEntry = useCallback((input: Omit<HabitEntry, 'id'>) => {
    const newEntry: HabitEntry = { ...input, id: generateId() }
    updateStore(prev => ({
      ...prev,
      habitEntries: [...prev.habitEntries, newEntry],
    }))
  }, [updateStore])

  const updateHabitEntry = useCallback((entryId: string, updates: Partial<Omit<HabitEntry, 'id'>>) => {
    updateStore(prev => ({
      ...prev,
      habitEntries: prev.habitEntries.map(e => e.id === entryId ? { ...e, ...updates } : e),
    }))
  }, [updateStore])

  const removeHabitEntry = useCallback((entryId: string) => {
    updateStore(prev => ({
      ...prev,
      habitEntries: prev.habitEntries.filter(e => e.id !== entryId),
    }))
  }, [updateStore])

  // ========================================
  // FINANCIAL - BILLS
  // ========================================

  const addBill = useCallback((input: Omit<Bill, 'id' | 'createdAt'>) => {
    const newBill: Bill = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      bills: [...prev.bills, newBill],
    }))
    return newBill.id
  }, [updateStore])

  const updateBill = useCallback((billId: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      bills: prev.bills.map(b => b.id === billId ? { ...b, ...updates } : b),
    }))
  }, [updateStore])

  const removeBill = useCallback((billId: string) => {
    updateStore(prev => ({
      ...prev,
      bills: prev.bills.filter(b => b.id !== billId),
    }))
  }, [updateStore])

  // ========================================
  // FINANCIAL - EXPENSES
  // ========================================

  const addExpense = useCallback((input: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense],
    }))
    return newExpense.id
  }, [updateStore])

  const updateExpense = useCallback((expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e),
    }))
  }, [updateStore])

  const removeExpense = useCallback((expenseId: string) => {
    updateStore(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId),
    }))
  }, [updateStore])

  // ========================================
  // FINANCIAL - BUDGET, INCOME & SAVINGS
  // ========================================

  const setBudgetCategories = useCallback((categories: BudgetCategory[]) => {
    updateStore(prev => ({
      ...prev,
      budgetCategories: categories,
    }))
  }, [updateStore])

  const addIncome = useCallback((input: Omit<IncomeEntry, 'id' | 'createdAt'>) => {
    const newIncome: IncomeEntry = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      incomes: [...prev.incomes, newIncome],
    }))
    return newIncome.id
  }, [updateStore])

  const updateIncome = useCallback((incomeId: string, updates: Partial<Omit<IncomeEntry, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      incomes: prev.incomes.map(i => i.id === incomeId ? { ...i, ...updates } : i),
    }))
  }, [updateStore])

  const removeIncome = useCallback((incomeId: string) => {
    updateStore(prev => ({
      ...prev,
      incomes: prev.incomes.filter(i => i.id !== incomeId),
    }))
  }, [updateStore])

  const updateFinancialConfig = useCallback((updates: Partial<FinancialConfig>) => {
    updateStore(prev => ({
      ...prev,
      financialConfig: {
        ...prev.financialConfig,
        ...updates,
      },
    }))
  }, [updateStore])

  const addSavingsGoal = useCallback((input: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, newGoal],
    }))
    return newGoal.id
  }, [updateStore])

  const updateSavingsGoal = useCallback((goalId: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map(g => g.id === goalId ? { ...g, ...updates } : g),
    }))
  }, [updateStore])

  const removeSavingsGoal = useCallback((goalId: string) => {
    updateStore(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter(g => g.id !== goalId),
    }))
  }, [updateStore])

  // ========================================
  // Quick Access methods
  // ========================================

  const addQuickAccess = useCallback((view: string, label: string) => {
    const existing = store.quickAccess.find(qa => qa.view === view)
    if (existing) return

    const maxOrder = store.quickAccess.length > 0
      ? Math.max(...store.quickAccess.map(qa => qa.order))
      : -1

    const newQuickAccess: QuickAccessItem = {
      id: generateId(),
      view,
      label,
      order: maxOrder + 1,
    }

    updateStore(prev => ({
      ...prev,
      quickAccess: [...prev.quickAccess, newQuickAccess],
    }))
  }, [updateStore, store.quickAccess])

  const removeQuickAccess = useCallback((id: string) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: prev.quickAccess.filter(qa => qa.id !== id),
    }))
  }, [updateStore])

  const reorderQuickAccess = useCallback((orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: prev.quickAccess.map(qa => {
        const idx = orderedIds.indexOf(qa.id)
        if (idx === -1) return qa
        return { ...qa, order: idx }
      }),
    }))
  }, [updateStore])

  // ========================================
  // Meeting methods
  // ========================================

  const addMeeting = useCallback((meeting: Meeting) => {
    updateStore(prev => ({
      ...prev,
      meetings: [...prev.meetings, meeting],
    }))
  }, [updateStore])

  const updateMeeting = useCallback((meetingId: string, updates: Partial<Pick<Meeting, 'title' | 'transcription'>>) => {
    updateStore(prev => ({
      ...prev,
      meetings: prev.meetings.map(m =>
        m.id !== meetingId ? m : { ...m, ...updates, updatedAt: new Date().toISOString() },
      ),
    }))
  }, [updateStore])

  const removeMeeting = useCallback((meetingId: string) => {
    updateStore(prev => ({
      ...prev,
      meetings: prev.meetings.filter(m => m.id !== meetingId),
    }))
  }, [updateStore])

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
    const title = input.title.trim()
    if (!title) return undefined

    const maxOrder = store.playbooks.length > 0
      ? Math.max(...store.playbooks.map(playbook => playbook.order))
      : -1

    const now = new Date().toISOString()
    const newPlaybook: Playbook = {
      id: generateId(),
      title,
      sector: (input.sector ?? 'Geral').trim() || 'Geral',
      category: (input.category ?? 'Geral').trim() || 'Geral',
      summary: (input.summary ?? '').trim(),
      content: input.content ?? '',
      dialogs: [],
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    updateStore(prev => ({
      ...prev,
      playbooks: [...prev.playbooks, newPlaybook],
    }))

    return newPlaybook.id
  }, [store.playbooks, updateStore])

  const updatePlaybook = useCallback((playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content'>>) => {
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(playbook =>
        playbook.id !== playbookId
          ? playbook
          : {
            ...playbook,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
      ),
    }))
  }, [updateStore])

  const removePlaybook = useCallback((playbookId: string) => {
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.filter(playbook => playbook.id !== playbookId),
    }))
  }, [updateStore])

  const addPlaybookDialog = useCallback((playbookId: string, input: { title: string; text: string }) => {
    const now = new Date().toISOString()
    const dialogId = generateId()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(playbook => {
        if (playbook.id !== playbookId) return playbook
        const maxOrder = playbook.dialogs.length > 0
          ? Math.max(...playbook.dialogs.map(dialog => dialog.order))
          : -1
        const dialog: PlaybookDialog = {
          id: dialogId,
          title: input.title.trim() || `Dialogo ${maxOrder + 2}`,
          text: input.text,
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        }
        return {
          ...playbook,
          dialogs: [...playbook.dialogs, dialog],
          updatedAt: now,
        }
      }),
    }))
    return dialogId
  }, [updateStore])

  const updatePlaybookDialog = useCallback((playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text'>>) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(playbook => {
        if (playbook.id !== playbookId) return playbook
        return {
          ...playbook,
          dialogs: playbook.dialogs.map(dialog =>
            dialog.id !== dialogId
              ? dialog
              : {
                ...dialog,
                ...updates,
                updatedAt: now,
              },
          ),
          updatedAt: now,
        }
      }),
    }))
  }, [updateStore])

  const removePlaybookDialog = useCallback((playbookId: string, dialogId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(playbook => {
        if (playbook.id !== playbookId) return playbook
        const nextDialogs = playbook.dialogs
          .filter(dialog => dialog.id !== dialogId)
          .map((dialog, index) => ({ ...dialog, order: index }))
        return {
          ...playbook,
          dialogs: nextDialogs,
          updatedAt: now,
        }
      }),
    }))
  }, [updateStore])

  // ========================================
  // Reset Store
  // ========================================

  const resetStore = useCallback(async () => {
    const defaultStore = getDefaultStore()
    setStore(defaultStore)
    if (isElectron()) {
      await window.electronAPI.saveStore(defaultStore)
    } else {
      localStorage.setItem('organizador-semanal-store', JSON.stringify(defaultStore))
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // ========================================
  // CRM METHODS
  // ========================================

  const addCRMContact = useCallback((input: {
    name: string
    company?: string | null
    role?: string | null
    phone?: string | null
    email?: string | null
    socialMedia?: string | null
    context?: string | null
    interests?: string | null
    priority?: CRMPriority
    description?: string
  }) => {
    const now = new Date().toISOString()
    const newContact: CRMContact = {
      id: generateId(),
      name: input.name.trim(),
      company: input.company ?? null,
      role: input.role ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      socialMedia: input.socialMedia ?? null,
      context: input.context ?? null,
      interests: input.interests ?? null,
      priority: input.priority ?? 'media',
      tags: [],
      stageId: 'prospeccao',
      description: input.description ?? '',
      followUpDate: null,
      links: {
        noteIds: [],
        calendarEventIds: [],
        fileIds: [],
        cardIds: [],
        projectIds: [],
      },
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      crmContacts: [...prev.crmContacts, newContact],
    }))
    return newContact.id
  }, [updateStore])

  const updateCRMContact = useCallback((contactId: string, updates: Partial<Pick<CRMContact,
    | 'name'
    | 'company'
    | 'role'
    | 'phone'
    | 'email'
    | 'socialMedia'
    | 'context'
    | 'interests'
    | 'priority'
    | 'description'
    | 'followUpDate'
  >>) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact =>
        contact.id === contactId
          ? { ...contact, ...updates, updatedAt: new Date().toISOString() }
          : contact
      ),
    }))
  }, [updateStore])

  const removeCRMContact = useCallback((contactId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.filter(c => c.id !== contactId),
      crmInteractions: prev.crmInteractions.filter(i => i.contactId !== contactId),
    }))
  }, [updateStore])

  const moveCRMContactToStage = useCallback((contactId: string, stageId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact =>
        contact.id === contactId
          ? { ...contact, stageId: stageId as CRMStageId, updatedAt: new Date().toISOString() }
          : contact
      ),
    }))
  }, [updateStore])

  const reorderCRMContacts = useCallback((stageId: CRMStageId, orderedIds: string[]) => {
    updateStore(prev => {
      const otherContacts = prev.crmContacts.filter(c => c.stageId !== stageId)
      const stageContacts = prev.crmContacts.filter(c => c.stageId === stageId)
      const reorderedStageContacts = orderedIds.map((id, idx) => {
        const contact = stageContacts.find(c => c.id === id)
        return contact ? { ...contact, order: idx } : null
      }).filter((c): c is CRMContact => c !== null)
      return {
        ...prev,
        crmContacts: [...otherContacts, ...reorderedStageContacts],
      }
    })
  }, [updateStore])

  const addCRMInteraction = useCallback((input: {
    contactId: string
    type: CRMInteractionType
    content: string
    date: string
    time: string
  }) => {
    const newInteraction: CRMInteraction = {
      id: generateId(),
      contactId: input.contactId,
      type: input.type,
      content: input.content,
      date: input.date,
      time: input.time,
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      crmInteractions: [...prev.crmInteractions, newInteraction],
    }))
    return newInteraction.id
  }, [updateStore])

  const updateCRMInteraction = useCallback((interactionId: string, updates: Partial<Pick<CRMInteraction, 'type' | 'content' | 'date' | 'time'>>) => {
    updateStore(prev => ({
      ...prev,
      crmInteractions: prev.crmInteractions.map(interaction =>
        interaction.id === interactionId
          ? { ...interaction, ...updates }
          : interaction
      ),
    }))
  }, [updateStore])

  const removeCRMInteraction = useCallback((interactionId: string) => {
    updateStore(prev => ({
      ...prev,
      crmInteractions: prev.crmInteractions.filter(i => i.id !== interactionId),
    }))
  }, [updateStore])

  const addCRMTag = useCallback((name: string, color?: string) => {
    const newTag: CRMTag = {
      id: generateId(),
      name: name.trim(),
      color: color ?? '#6366f1',
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      crmTags: [...prev.crmTags, newTag],
    }))
    return newTag.id
  }, [updateStore])

  const updateCRMTag = useCallback((tagId: string, updates: Partial<Pick<CRMTag, 'name' | 'color'>>) => {
    updateStore(prev => ({
      ...prev,
      crmTags: prev.crmTags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      ),
    }))
  }, [updateStore])

  const removeCRMTag = useCallback((tagId: string) => {
    updateStore(prev => ({
      ...prev,
      crmTags: prev.crmTags.filter(t => t.id !== tagId),
      crmContacts: prev.crmContacts.map(c => ({
        ...c,
        tags: c.tags.filter(t => t !== tagId),
      })),
    }))
  }, [updateStore])

  const addCRMContactLink = useCallback((contactId: string, linkType: keyof CRMContactLinks, entityId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact => {
        if (contact.id !== contactId) return contact
        const currentLinks = contact.links[linkType]
        if (currentLinks.includes(entityId)) return contact
        return {
          ...contact,
          links: {
            ...contact.links,
            [linkType]: [...currentLinks, entityId],
          },
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
  }, [updateStore])

  const removeCRMContactLink = useCallback((contactId: string, linkType: keyof CRMContactLinks, entityId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact => {
        if (contact.id !== contactId) return contact
        return {
          ...contact,
          links: {
            ...contact.links,
            [linkType]: contact.links[linkType].filter(id => id !== entityId),
          },
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
  }, [updateStore])

  return {
    // Data
    cards: store.cards,
    shortcutFolders: store.shortcutFolders,
    shortcuts: store.shortcuts,
    paths: store.paths,
    projects: store.projects,
    registeredIDEs: store.registeredIDEs,
    calendarEvents: store.calendarEvents,
    noteFolders: store.noteFolders,
    notes: store.notes,
    colorPalettes: store.colorPalettes,
    clipboardCategories: store.clipboardCategories,
    clipboardItems: store.clipboardItems,
    files: store.files,
    apps: store.apps,
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
    crmContacts: store.crmContacts,
    crmInteractions: store.crmInteractions,
    crmTags: store.crmTags,
    study: store.study,
    settings: store.settings,
    // State
    isLoading,
    error,
    // Card methods
    addCard,
    addCardWithDate,
    editCard,
    removeCard,
    moveCardToCell,
    reorderInCell,
    getCardsForLocation,
    // Shortcut methods
    addShortcutFolder,
    renameShortcutFolder,
    removeShortcutFolder,
    addShortcut,
    updateShortcut,
    moveShortcutToFolder,
    reorderShortcutsInFolder,
    removeShortcut,
    reorderFolders,
    moveFolderToParent,
    removeShortcuts,
    moveShortcuts,
    // Path methods
    addPath,
    updatePath,
    removePath,
    // Project methods
    addProject,
    updateProject,
    removeProject,
    // IDE methods
    addRegisteredIDE,
    updateRegisteredIDE,
    removeRegisteredIDE,
    // Calendar methods
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    // Clipboard methods
    addClipboardCategory,
    renameClipboardCategory,
    removeClipboardCategory,
    reorderClipboardCategories,
    addClipboardItem,
    updateClipboardItem,
    removeClipboardItem,
    moveClipboardItemToCategory,
    // Files
    addFileItem,
    removeFileItem,
    // Note methods
    addNoteFolder,
    updateNoteFolder,
    removeNoteFolder,
    addNote,
    updateNote,
    removeNote,
    addColorPalette,
    updateColorPalette,
    removeColorPalette,
    // App methods
    addApp,
    updateApp,
    removeApp,
    addMacro,
    updateMacro,
    removeMacro,
    // Habit methods
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
    addQuickAccess,
    removeQuickAccess,
    reorderQuickAccess,
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
    // CRM methods
    addCRMContact,
    updateCRMContact,
    removeCRMContact,
    moveCRMContactToStage,
    reorderCRMContacts,
    addCRMInteraction,
    updateCRMInteraction,
    removeCRMInteraction,
    addCRMTag,
    updateCRMTag,
    removeCRMTag,
    addCRMContactLink,
    removeCRMContactLink,
    // Reset Store
    resetStore,
    // Settings
    updateSettings,
    // Study
    updateStudy,
  }
}
