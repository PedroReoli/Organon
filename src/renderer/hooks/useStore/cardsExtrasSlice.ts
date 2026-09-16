import type { Card, CardLocation, Day, Period } from '../../types'
import type { UpdateStoreFn } from './types'

export const createCardsExtrasSlice = (updateStore: UpdateStoreFn, getStore: () => any) => {
  const editCard = (cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'isLocked' | 'priority' | 'status' | 'checklist' | 'projectId' | 'durationMinutes' | 'inSprint' | 'sprintColumnId' | 'swimLaneId' | 'sprintSectionId' | 'location'>>) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map((card: Card) =>
        card.id === cardId ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
      ),
    }))
  }

  const moveCardToCell = (
    cardId: string,
    _targetDay: Day | null,
    _targetPeriod: Period | null,
    targetLocation: CardLocation
  ) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map((card: Card) =>
        card.id === cardId
          ? {
              ...card,
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
    _location: CardLocation,
    orderedIds: string[]
  ) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map((card: Card) => {
        const matchesCell =
          card.location?.day === day && card.location?.period === period
        if (!matchesCell) return card
        const newOrder = orderedIds.indexOf(card.id)
        if (newOrder === -1) return card
        return { ...card, order: newOrder }
      }),
    }))
  }

  const getCardsForLocation = (day: Day | null, period: Period | null) => {
    const store = getStore()
    return (store.cards || []).filter(
      (c: Card) => c.location?.day === day && c.location?.period === period
    )
  }

  return {
    editCard,
    moveCardToCell,
    reorderInCell,
    getCardsForLocation,
  }
}
