/**
 * Handler puro: drop no backlog (remove date e location).
 *
 * Definido no upgrade 01.
 */

import type { Card, Day } from '../../../../types'
import type { DropResult } from './dropOnSprintColumn'

export interface DropOnBacklogArgs {
  cardId: string
  cards: Card[]
  insertIndex?: number
}

export function dropOnBacklog(args: DropOnBacklogArgs): DropResult {
  const card = args.cards.find((c) => c.id === args.cardId)
  if (!card) return { kind: 'noop' }

  // Card travado nao pode ir para backlog (perderia o lock no dia).
  if (card.isLocked) {
    return { kind: 'reject', reason: 'Card travado nao pode ir para o backlog' }
  }

  if (card.location.day == null && card.location.period == null) {
    return { kind: 'noop' } // ja esta no backlog
  }

  const backlogCount = args.cards.filter(
    (c) => c.location.day == null && c.location.period == null,
  ).length

  return {
    kind: 'move',
    cardId: args.cardId,
    newLocation: { day: null, period: null },
    newIndex: args.insertIndex ?? backlogCount,
    weekDates: {} as Record<Day, string>,
  }
}
