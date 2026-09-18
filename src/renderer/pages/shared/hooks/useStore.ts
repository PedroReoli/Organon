import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Card,
  Store,
  CardLocation,
  Day,
  Period,
  CalendarEvent,
} from '@types'
import {
  getCardsForCell,
  getCurrentWeekDates,
  isElectron,
  normalizeTime,
} from '@utils'
import {
  DEFAULT_SPRINT_BOARD_CONFIG,
  DEFAULT_SPRINT_COLUMNS,
} from '@types'
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
  createCanvasSlice,
  createColorPaletteSlice,
  createQuickAccessSlice,
  createMeetingSlice,
  createSprintCardsSlice,
  createCalendarCategorySlice,
  createNoteTemplatesSlice,
  createStoreManagementSlice,
  createNoteExtrasSlice,
} from '../../../hooks/useStore/index'
import {
  normalizeStore,
  getDefaultStore,
  hashClipboardContent,
  clampStudyMinutes,
  clampStudyVolume,
  type LegacyShortcutKind,
  type ShortcutItemInput,
} from './storeNormalization'

export {
  normalizeStore,
  getDefaultStore,
  hashClipboardContent,
  clampStudyMinutes,
  clampStudyVolume,
  type LegacyShortcutKind,
  type ShortcutItemInput,
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
  const canvasSlice = createCanvasSlice(updateStore)
  const colorPaletteSlice = createColorPaletteSlice(updateStore)
  const quickAccessSlice = createQuickAccessSlice(updateStore, () => ({ quickAccess: store.quickAccess }))
  const meetingSlice = createMeetingSlice(updateStore)
  const sprintCardsSlice = createSprintCardsSlice(updateStore)
  const calendarCategorySlice = createCalendarCategorySlice(updateStore)
  const noteTemplatesSlice = createNoteTemplatesSlice(updateStore)
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
    saveStore(normalized)
    setStoreVersion(v => v + 1)
  }, [saveStore])

  // ─── Cards (extraido em hooks/store/cards.slice.ts) ─────────────────────────
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

  // ─── Calendar Events (extraido em hooks/store/calendar.slice.ts) ───────────
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

  // ─── Note Overload Wrapper ─────────────────────────────────────────────────
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

  // ─── Canvas Versions ───────────────────────────────────────────────────────
  const clearCanvasVersions = useCallback((canvasId: string) => {
    updateStore(prev => {
      const allVersions = { ...(prev.canvasVersions ?? {}) }
      delete allVersions[canvasId]
      return { ...prev, canvasVersions: allVersions }
    })
  }, [updateStore])

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
    bills: store.bills,
    expenses: store.expenses,
    budgetCategories: store.budgetCategories,
    incomes: store.incomes,
    financialConfig: store.financialConfig,
    savingsGoals: store.savingsGoals,
    quickAccess: store.quickAccess,
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
    // Sprint Board
    sprintColumns: store.sprintColumns ?? DEFAULT_SPRINT_COLUMNS,
    sprintColumnGroups: store.sprintColumnGroups ?? [],
    sprintColumnSections: store.sprintColumnSections ?? [],
    sprintSwimLanes: store.sprintSwimLanes ?? [],
    sprintMetadata: store.sprintMetadata ?? [],
    sprintBoardConfig: store.sprintBoardConfig ?? DEFAULT_SPRINT_BOARD_CONFIG,
    ...sprintSlice,
    // Sprint Cards
    sprintCards: store.sprintCards ?? [],
    ...sprintCardsSlice,
    // Project methods
    ...projectsSlice,
    // Calendar methods
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    calendarCategories: store.calendarCategories ?? [],
    ...calendarCategorySlice,
    // Clipboard methods
    ...clipboardSlice,
    // Dashboard methods
    ...dashboardSlice,
    // Note methods
    ...notesSlice,
    addNote,
    ...noteExtrasSlice,
    // Note templates
    noteTemplates: store.noteTemplates ?? [],
    ...noteTemplatesSlice,
    // Canvas folders + versions
    canvasFolders: store.canvasFolders ?? [],
    canvasFolderAssignments: store.canvasFolderAssignments ?? {},
    canvasVersions: store.canvasVersions ?? {},
    ...canvasSlice,
    removeCanvasVersion: canvasSlice.deleteCanvasVersion,
    clearCanvasVersions,
    ...colorPaletteSlice,
    // Meeting methods
    meetings: store.meetings,
    ...meetingSlice,

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
