import type { Card, CardLocation, Day, Period } from '../../types'
import type { UpdateStoreFn } from './types'

export const createCardsExtrasSlice = (updateStore: UpdateStoreFn, getStore: () => any) => {
  const editCard = (cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'isLocked' | 'priority' | 'status' | 'checklist' | 'projectId' | 'durationMinutes' | 'inSprint' | 'sprintColumnId' | 'swimLaneId' | 'sprintSectionId' | 'location'>>) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
      ),
    }))
  }

  const moveCardToCell = (
    cardId: string,
    targetDay: Day | null,
    targetPeriod: Period | null,
    targetLocation: CardLocation
  ) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(card =>
        card.id === cardId
          ? {
              ...card,
              day: targetDay,
              period: targetPeriod,
              location: targetLocation,
              updatedAt: new Date().toISOString(),
            }
          : card
      ),
    }))
  }

  const reorderInCell = (
    day: Day | null,
    period: Period | null,
    location: CardLocation,
    orderedIds: string[]
  ) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(card => {
        const matchesCell =
          card.day === day && card.period === period && card.location === location
        if (!matchesCell) return card
        const newOrder = orderedIds.indexOf(card.id)
        if (newOrder === -1) return card
        return { ...card, order: newOrder }
      }),
    }))
  }

  const getCardsForLocation = (day: Day | null, period: Period | null) => {
    const store = getStore()
    return store.cards.filter(
      (c: Card) => c.day === day && c.period === period
    )
  }

  return {
    editCard,
    moveCardToCell,
    reorderInCell,
    getCardsForLocation,
  }
}
