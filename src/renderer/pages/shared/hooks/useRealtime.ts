/**
 * useRealtime — conecta o RealtimeClient no mount e aplica eventos
 * recebidos no store local.
 *
 * Cobre todos os 19+ recursos via registry. Cada entry mapeia o
 * `resource` recebido no envelope para o slice correto do store + a
 * funcao `fromApi` que transforma snake_case em camelCase.
 *
 * Aplica eventos respeitando `pendingDeletes`: se o usuario local
 * acabou de deletar um item, o evento de update/create remoto NAO
 * o ressuscita.
 *
 * Upgrade 02 — full coverage.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Store, StudyGoal, StudyMediaItem } from '@types'
import {
  type Payload,
  billFromApi,
  calendarEventFromApi,
  cardFromApi,
  colorPaletteFromApi,
  expenseFromApi,
  incomeFromApi,
  investmentFromApi,
  meetingFromApi,
  noteFolderFromApi,
  noteFromApi,
  playbookFromApi,
  projectFromApi,
  savingsGoalFromApi,
  shortcutFolderFromApi,
  shortcutItemFromApi,
  studyGoalFromApi,
  studyMediaItemFromApi,
} from '../../../../api/sync'
import { getRealtimeClient, type RealtimeEvent, type RealtimeState } from '../../../../api/realtime'

interface UseRealtimeOptions {
  isLoggedIn: boolean
  /** Atualizador raw do store. */
  updateStore: (updater: (prev: Store) => Store) => void
  /** Callback opcional quando o state da conexao muda (usado para ajustar polling). */
  onStateChange?: (state: RealtimeState) => void
}

export interface UseRealtimeResult {
  state: RealtimeState
  isConnected: boolean
}

// ── Registry de recursos ──────────────────────────────────────────

interface ResourceRegistryEntry {
  storeKey: keyof Store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromApi: (id: string, p: Payload) => any
  tombstoneResource: string
}

const REGISTRY: Record<string, ResourceRegistryEntry> = {
  cards: { storeKey: 'cards', fromApi: cardFromApi, tombstoneResource: 'cards' },
  calendar_events: { storeKey: 'calendarEvents', fromApi: calendarEventFromApi, tombstoneResource: 'calendar_events' },
  notes: { storeKey: 'notes', fromApi: noteFromApi, tombstoneResource: 'notes' },
  note_folders: { storeKey: 'noteFolders', fromApi: noteFolderFromApi, tombstoneResource: 'note_folders' },
  projects: { storeKey: 'projects', fromApi: projectFromApi, tombstoneResource: 'projects' },
  finance_bills: { storeKey: 'bills', fromApi: billFromApi, tombstoneResource: 'finance_bills' },
  finance_expenses: { storeKey: 'expenses', fromApi: expenseFromApi, tombstoneResource: 'finance_expenses' },
  finance_incomes: { storeKey: 'incomes', fromApi: incomeFromApi, tombstoneResource: 'finance_incomes' },
  finance_savings_goals: { storeKey: 'savingsGoals', fromApi: savingsGoalFromApi, tombstoneResource: 'finance_savings_goals' },
  finance_investments: { storeKey: 'investments', fromApi: investmentFromApi, tombstoneResource: 'finance_investments' },
  playbooks: { storeKey: 'playbooks', fromApi: playbookFromApi, tombstoneResource: 'playbooks' },
  meetings: { storeKey: 'meetings', fromApi: meetingFromApi, tombstoneResource: 'meetings' },
  color_palettes: { storeKey: 'colorPalettes', fromApi: colorPaletteFromApi, tombstoneResource: 'color_palettes' },
  shortcuts: { storeKey: 'shortcuts', fromApi: shortcutItemFromApi, tombstoneResource: 'shortcuts' },
  shortcut_folders: { storeKey: 'shortcutFolders', fromApi: shortcutFolderFromApi, tombstoneResource: 'shortcut_folders' },
}

/**
 * Aplica um RealtimeEvent ao store. Pure function (passado o store
 * anterior, retorna o proximo).
 */
export function applyRealtimeEvent(prev: Store, event: RealtimeEvent): Store {
  // Special-case: study sub-resources vivem dentro de study.*
  if (event.resource === 'study_goals') {
    return applyStudyGoal(prev, event)
  }
  if (event.resource === 'study_media_items') {
    return applyStudyMediaItem(prev, event)
  }

  const entry = REGISTRY[event.resource]
  if (!entry) return prev

  const tombstones = new Set(
    (prev.pendingDeletes ?? [])
      .filter((d) => d.resource === entry.tombstoneResource)
      .map((d) => d.id),
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = (prev as any)[entry.storeKey] as Array<{ id: string; updatedAt?: string }> | undefined
  if (!Array.isArray(slice)) return prev

  if (event.op === 'delete') {
    const id = String((event.data as { id?: string }).id ?? '')
    if (!id) return prev
    if (!slice.some((c) => c.id === id)) return prev
    return { ...prev, [entry.storeKey]: slice.filter((c) => c.id !== id) } as Store
  }

  // create / update
  const id = String((event.data as { id?: string }).id ?? '')
  if (!id) return prev
  if (tombstones.has(id)) return prev

  const remote = entry.fromApi(id, event.data as Payload) as { id: string; updatedAt?: string }
  const existing = slice.find((c) => c.id === id)

  // Garantia de monotonicidade
  if (existing && existing.updatedAt && remote.updatedAt && existing.updatedAt > remote.updatedAt) {
    return prev
  }

  if (existing) {
    return {
      ...prev,
      [entry.storeKey]: slice.map((c) => (c.id === id ? remote : c)),
    } as Store
  }
  return { ...prev, [entry.storeKey]: [...slice, remote] } as Store
}

// ── Sub-resource appliers (study.* fica dentro de StudyState) ────

function applyStudyGoal(prev: Store, event: RealtimeEvent): Store {
  const tombstones = new Set(
    (prev.pendingDeletes ?? [])
      .filter((d) => d.resource === 'study_goals')
      .map((d) => d.id),
  )
  const goals = prev.study?.goals ?? []
  if (event.op === 'delete') {
    const id = String((event.data as { id?: string }).id ?? '')
    if (!id) return prev
    return { ...prev, study: { ...prev.study, goals: goals.filter((g) => g.id !== id) } }
  }
  const id = String((event.data as { id?: string }).id ?? '')
  if (!id || tombstones.has(id)) return prev
  const remote: StudyGoal = studyGoalFromApi(id, event.data as Payload)
  const existing = goals.find((g) => g.id === id)
  if (existing && existing.updatedAt && remote.updatedAt && existing.updatedAt > remote.updatedAt) return prev
  const nextGoals = existing
    ? goals.map((g) => (g.id === id ? remote : g))
    : [...goals, remote]
  return { ...prev, study: { ...prev.study, goals: nextGoals } }
}

function applyStudyMediaItem(prev: Store, event: RealtimeEvent): Store {
  const tombstones = new Set(
    (prev.pendingDeletes ?? [])
      .filter((d) => d.resource === 'study_media_items')
      .map((d) => d.id),
  )
  const mediaItems = prev.study?.mediaItems ?? []
  if (event.op === 'delete') {
    const id = String((event.data as { id?: string }).id ?? '')
    if (!id) return prev
    return { ...prev, study: { ...prev.study, mediaItems: mediaItems.filter((m) => m.id !== id) } }
  }
  const id = String((event.data as { id?: string }).id ?? '')
  if (!id || tombstones.has(id)) return prev
  const remote: StudyMediaItem = studyMediaItemFromApi(id, event.data as Payload)
  const existing = mediaItems.find((m) => m.id === id)
  if (existing && (existing as any).updatedAt && (remote as any).updatedAt && (existing as any).updatedAt > (remote as any).updatedAt) return prev
  const nextMedia = existing
    ? mediaItems.map((m) => (m.id === id ? remote : m))
    : [...mediaItems, remote]
  return { ...prev, study: { ...prev.study, mediaItems: nextMedia } }
}

// ── Hook ──────────────────────────────────────────────────────────

export function useRealtime(options: UseRealtimeOptions): UseRealtimeResult {
  const { isLoggedIn, updateStore, onStateChange } = options
  const [state, setState] = useState<RealtimeState>('idle')

  const handleStateChange = useCallback(
    (next: RealtimeState) => {
      setState(next)
      onStateChange?.(next)
    },
    [onStateChange],
  )

  useEffect(() => {
    const client = getRealtimeClient()

    const unsubscribeState = client.onStateChange(handleStateChange)

    const unsubscribeEvent = client.onEvent((event) => {
      updateStore((prev) => applyRealtimeEvent(prev, event))
    })

    if (isLoggedIn) {
      client.connect()
    } else {
      client.disconnect()
    }

    return () => {
      unsubscribeState()
      unsubscribeEvent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  return {
    state,
    isConnected: state === 'open',
  }
}
