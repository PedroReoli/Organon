/**
 * Handler puro: drop em coluna do Sprint Board (1 dia da semana).
 *
 * Recebe estado e args, retorna a mutacao a ser aplicada.
 * Sem efeitos colaterais — testavel isoladamente.
 *
 * Definido no upgrade 01.
 */

import type { Card, CardLocation, Day } from '@types'

export interface DropOnSprintColumnArgs {
  cardId: string
  targetDay: Day
  cards: Card[]
  weekDates: Record<Day, string>
  /** Optional: index dentro da coluna onde inserir. Default: final. */
  insertIndex?: number
}

export type DropResult =
  | {
      kind: 'move'
      cardId: string
      newLocation: CardLocation
      newIndex: number
      weekDates: Record<Day, string>
    }
  | { kind: 'reject'; reason: string }
  | { kind: 'noop' }

export function dropOnSprintColumn(args: DropOnSprintColumnArgs): DropResult {
  const card = args.cards.find((c) => c.id === args.cardId)
  if (!card) return { kind: 'noop' }

  // Card travado nao pode mudar de dia.
  if (card.isLocked && card.location.day !== args.targetDay) {
    return {
      kind: 'reject',
      reason: 'Card travado neste dia',
    }
  }

  // Nada muda se ja esta no mesmo dia (sem period definido).
  if (card.location.day === args.targetDay && card.location.period == null) {
    return { kind: 'noop' }
  }

  const targetCardsCount = args.cards.filter((c) => c.location.day === args.targetDay).length
  const newIndex = args.insertIndex ?? targetCardsCount

  return {
    kind: 'move',
    cardId: args.cardId,
    newLocation: {
      day: args.targetDay,
      period: card.location.period, // preserva periodo se existir
    },
    newIndex,
    weekDates: args.weekDates,
  }
}
