/**
 * Handler puro: drop em slot horario do drill-down (1 dia, hourly grid).
 *
 * Calcula time, period e durationMinutes default. Retorna mutacao composta
 * (move + edit) para ser aplicada pelo dispatcher.
 *
 * Definido no upgrade 01.
 */

import type { Card, CardLocation, Day, PlannerPreferences } from '@types'
import { getPeriodFromTime } from '@utils'

export interface DropOnHourlySlotArgs {
  cardId: string
  targetDay: Day
  minutes: number
  cards: Card[]
  weekDates: Record<Day, string>
  prefs: PlannerPreferences
}

export type HourlySlotDropResult =
  | {
      kind: 'move-and-edit'
      cardId: string
      newLocation: CardLocation
      newIndex: number
      weekDates: Record<Day, string>
      edits: { time: string; durationMinutes: number }
    }
  | { kind: 'edit-only'; cardId: string; edits: { time: string; durationMinutes: number } }
  | { kind: 'reject'; reason: string }
  | { kind: 'noop' }

function minutesToTime(totalMinutes: number): string {
  const safe = Math.max(0, totalMinutes)
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function dropOnHourlySlot(args: DropOnHourlySlotArgs): HourlySlotDropResult {
  const card = args.cards.find((c) => c.id === args.cardId)
  if (!card) return { kind: 'noop' }

  // Card travado nao pode mudar de dia.
  if (card.isLocked && card.location.day !== args.targetDay) {
    return { kind: 'reject', reason: 'Card travado neste dia' }
  }

  const time = minutesToTime(args.minutes)
  const period = getPeriodFromTime(time)
  const defaultDuration = card.durationMinutes ?? args.prefs.plannerInterval

  // Se ja esta no mesmo dia/period, so edita time.
  const sameLocation =
    card.location.day === args.targetDay && card.location.period === period

  if (sameLocation) {
    return {
      kind: 'edit-only',
      cardId: args.cardId,
      edits: { time, durationMinutes: defaultDuration },
    }
  }

  const targetCardsCount = args.cards.filter(
    (c) => c.location.day === args.targetDay && c.location.period === period,
  ).length

  return {
    kind: 'move-and-edit',
    cardId: args.cardId,
    newLocation: { day: args.targetDay, period },
    newIndex: targetCardsCount,
    weekDates: args.weekDates,
    edits: { time, durationMinutes: defaultDuration },
  }
}
