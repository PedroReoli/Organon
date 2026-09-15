/**
 * Cards slice — funcoes puras de mutacao de cards.
 *
 * Definido no upgrade 07 sub-A. Ver hooks/store/README.md para o padrao.
 */

import type { Card, CardLocation, Day, Period, Store } from '../../types'
import {
  createCard,
  updateCard,
  deleteCard,
  getCurrentWeekDates,
  getDayFromDate,
  getPeriodFromTime,
  normalizeTime,
} from '../../utils'

export function cardsAdd(prev: Store, title: string): { store: Store; createdId: string | null } {
  if (!title.trim()) return { store: prev, createdId: null }
  const newCard = createCard(title)
  return {
    store: {
      ...prev,
      cards: [...prev.cards, newCard],
    },
    createdId: newCard.id,
  }
}

export function cardsAddWithDate(
  prev: Store,
  input: { title: string; date: string; location: CardLocation; time?: string | null },
): { store: Store; createdId: string | null } {
  if (!input.title.trim() || !input.date.trim()) {
    return { store: prev, createdId: null }
  }

  const newCard = createCard(input.title, input.date)
  const sameCellOrders = prev.cards
    .filter(
      (c) =>
        c.location.day === input.location.day &&
        c.location.period === input.location.period,
    )
    .map((c) => c.order)
  const nextOrder = sameCellOrders.length > 0 ? Math.max(...sameCellOrders) + 1 : 0

  return {
    store: {
      ...prev,
      cards: [
        ...prev.cards,
        {
          ...newCard,
          location: input.location,
          order: nextOrder,
          time: input.time ? normalizeTime(input.time) : null,
        },
      ],
    },
    createdId: newCard.id,
  }
}

type CardEditableFields =
  | 'title'
  | 'descriptionHtml'
  | 'date'
  | 'time'
  | 'hasDate'
  | 'isLocked'
  | 'priority'
  | 'status'
  | 'checklist'
  | 'projectId'
  | 'durationMinutes'
  | 'inSprint'
  | 'sprintColumnId'
  | 'swimLaneId'
  | 'sprintSectionId'
  | 'location'

export function cardsEdit(
  prev: Store,
  cardId: string,
  updates: Partial<Pick<Card, CardEditableFields>>,
): Store {
  const existingCard = prev.cards.find((c) => c.id === cardId)
  const isPostponed =
    existingCard &&
    ((updates.date && updates.date !== existingCard.date) ||
      (updates.location &&
        (updates.location.day !== existingCard.location.day ||
          updates.location.period !== existingCard.location.period)) ||
      updates.status === 'postponed')

  const nextUpdates = {
    ...updates,
    ...(isPostponed ? { postponementCount: (existingCard?.postponementCount ?? 0) + 1 } : {}),
    ...(typeof updates.time === 'string' || updates.time === null
      ? { time: normalizeTime(updates.time) }
      : {}),
  }
  const updatedCards = updateCard(prev.cards, cardId, nextUpdates)
  const updated = updatedCards.find((c) => c.id === cardId)
  if (!updated) {
    return { ...prev, cards: updatedCards }
  }

  // Sincroniza Planejamento com Calendario:
  // se o card estiver em uma celula (dia+periodo) e tiver data, o dia
  // deve bater com o dia da semana da data.
  if (updated.hasDate && updated.date && updated.location.day && updated.location.period) {
    const dayFromDate = getDayFromDate(updated.date)
    if (updated.location.day !== dayFromDate) {
      return {
        ...prev,
        cards: updatedCards.map((card) =>
          card.id === cardId
            ? { ...card, location: { ...card.location, day: dayFromDate } }
            : card,
        ),
      }
    }
  }

  // Se o card tiver hora, alinhar o periodo (manha/tarde/noite) automaticamente.
  if (updated.time && updated.location.day && updated.location.period) {
    const normalized = normalizeTime(updated.time)
    if (normalized) {
      const periodFromTime = getPeriodFromTime(normalized)
      if (updated.location.period !== periodFromTime) {
        return {
          ...prev,
          cards: updatedCards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  time: normalized,
                  location: { ...card.location, period: periodFromTime },
                }
              : card,
          ),
        }
      }
    }
  }

  return { ...prev, cards: updatedCards }
}

export function cardsRemove(prev: Store, cardId: string): Store {
  return {
    ...prev,
    cards: deleteCard(prev.cards, cardId),
    pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'cards', id: cardId }],
  }
}

export function cardsMoveToCell(
  prev: Store,
  cardId: string,
  newLocation: CardLocation,
  newIndex: number,
  displayedWeekDates?: Record<Day, string>,
): Store {
  const weekDates = displayedWeekDates ?? getCurrentWeekDates()
  const card = prev.cards.find((c) => c.id === cardId)
  if (!card) return prev

  const isCellMove = !!newLocation.day && !!newLocation.period
  const isLocationChanged = card.location.day !== newLocation.day || card.location.period !== newLocation.period
  const nextPostponementCount = isLocationChanged ? (card.postponementCount ?? 0) + 1 : (card.postponementCount ?? 0)

  const nextCard =
    card.hasDate && isCellMove
      ? { ...card, date: weekDates[newLocation.day as Day], postponementCount: nextPostponementCount }
      : { ...card, postponementCount: nextPostponementCount }

  const targetCards = prev.cards
    .filter(
      (c) =>
        c.location.day === newLocation.day &&
        c.location.period === newLocation.period &&
        c.id !== cardId,
    )
    .sort((a, b) => a.order - b.order)

  targetCards.splice(newIndex, 0, { ...nextCard, location: newLocation })

  const updatedTargetCards = targetCards.map((c, idx) => ({ ...c, order: idx }))

  const newCards = prev.cards.map((c) => {
    const updated = updatedTargetCards.find((u) => u.id === c.id)
    return updated || c
  })

  return {
    ...prev,
    cards: newCards,
  }
}

export function cardsReorderInCell(
  prev: Store,
  day: Day | null,
  period: Period | null,
  orderedIds: string[],
): Store {
  const newCards = prev.cards.map((card) => {
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
}
