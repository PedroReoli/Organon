/**
 * Single source of truth dos ids de drop targets do planner.
 *
 * Definido no upgrade 01. Substitui os helpers ad-hoc espalhados em
 * PlannerView, HourlyWeekGrid e PeriodCell que usavam strings raw como
 * `mon-morning`, `hourly-slot:mon:480` etc.
 *
 * Toda string id agora e gerada e parseada por estas funcoes,
 * garantindo consistencia e tipos.
 */

import type { Day, Period } from '@types'

export type DndTargetId =
  | { kind: 'backlog' }
  | { kind: 'sprint-col'; day: Day }
  | { kind: 'period-cell'; day: Day | null; period: Period | null }
  | { kind: 'hourly-slot'; day: Day; minutes: number }
  | { kind: 'card'; cardId: string }

const SPRINT_COL_PREFIX = 'sprint-col:'
const HOURLY_SLOT_PREFIX = 'hourly-slot:'
const CARD_PREFIX = 'card:'
const PERIOD_CELL_PREFIX = 'period-cell:'

export const dndIds = {
  backlog: () => 'backlog',
  sprintCol: (day: Day) => `${SPRINT_COL_PREFIX}${day}`,
  periodCell: (day: Day | null, period: Period | null) =>
    `${PERIOD_CELL_PREFIX}${day ?? 'null'}:${period ?? 'null'}`,
  hourlySlot: (day: Day, minutes: number) => `${HOURLY_SLOT_PREFIX}${day}:${minutes}`,
  card: (cardId: string) => `${CARD_PREFIX}${cardId}`,
}

export function parseDndId(id: string): DndTargetId | null {
  if (id === 'backlog') return { kind: 'backlog' }

  if (id.startsWith(SPRINT_COL_PREFIX)) {
    const day = id.slice(SPRINT_COL_PREFIX.length) as Day
    return { kind: 'sprint-col', day }
  }

  if (id.startsWith(HOURLY_SLOT_PREFIX)) {
    const rest = id.slice(HOURLY_SLOT_PREFIX.length)
    const [dayStr, minutesStr] = rest.split(':')
    const minutes = Number(minutesStr)
    if (!dayStr || !Number.isFinite(minutes)) return null
    return { kind: 'hourly-slot', day: dayStr as Day, minutes }
  }

  if (id.startsWith(CARD_PREFIX)) {
    return { kind: 'card', cardId: id.slice(CARD_PREFIX.length) }
  }

  if (id.startsWith(PERIOD_CELL_PREFIX)) {
    const rest = id.slice(PERIOD_CELL_PREFIX.length)
    const [dayStr, periodStr] = rest.split(':')
    return {
      kind: 'period-cell',
      day: dayStr === 'null' ? null : (dayStr as Day),
      period: periodStr === 'null' ? null : (periodStr as Period),
    }
  }

  return null
}

/** Helpers para checar tipo de target sem destructure. */
export const isBacklogId = (id: string): boolean => id === 'backlog'
export const isSprintColId = (id: string): boolean => id.startsWith(SPRINT_COL_PREFIX)
export const isHourlySlotId = (id: string): boolean => id.startsWith(HOURLY_SLOT_PREFIX)
export const isCardId = (id: string): boolean => id.startsWith(CARD_PREFIX)
