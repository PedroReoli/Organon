import { useState } from 'react'
import { useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CalendarEvent, Card as CardType, CardLocation, Day, Period, Project } from '../types'
import { parseCellId, getCellId } from '../types'
import { expandCalendarEvents, getCurrentWeekDates } from '../utils'
import { Backlog } from './Backlog'
import { WeekGrid } from './WeekGrid'
import { CardItem } from './Card'
import { CardModal } from './CardModal'
import { CalendarEventModal } from './CalendarEventModal'

interface PlannerViewProps {
  cards: CardType[]
  calendarEvents: CalendarEvent[]
  projects?: Project[]
  getCardsForLocation: (day: Day | null, period: Period | null) => CardType[]
  onAddCard: (title: string) => void
  onEditCard: (cardId: string, updates: Partial<Pick<CardType, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate'>>) => void
  onRemoveCard: (cardId: string) => void
  onMoveCard: (cardId: string, newLocation: CardLocation, newIndex: number) => void
  onReorderCard: (day: Day | null, period: Period | null, orderedIds: string[]) => void
  onEditEvent: (eventId: string, updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'date' | 'time' | 'color' | 'recurrence' | 'reminder'>>) => void
  onRemoveEvent: (eventId: string) => void
  openCardId?: string | null
  onOpenCardHandled?: () => void
}

export const PlannerView = ({
  cards,
  calendarEvents,
  projects,
  getCardsForLocation,
  onAddCard,
  onEditCard,
  onRemoveCard,
  onMoveCard,
  onReorderCard,
  onEditEvent,
  onRemoveEvent,
  openCardId,
  onOpenCardHandled,
}: PlannerViewProps) => {
  const [activeCard, setActiveCard] = useState<CardType | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<{ event: CalendarEvent; period: Period } | null>(null)

  const weekDates = getCurrentWeekDates()
  const weekStart = weekDates.mon
  const weekEnd = weekDates.sun
  const weekEvents = expandCalendarEvents(calendarEvents, weekStart, weekEnd)

  // Abrir card programaticamente (ex: Busca Rapida)
  useEffect(() => {
    if (!openCardId) return
    const card = cards.find(c => c.id === openCardId)
    if (!card) return
    setSelectedCard(card)
    onOpenCardHandled?.()
  }, [openCardId, cards, onOpenCardHandled])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = cards.find(c => c.id === active.id)
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const cardId = active.id as string
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const overId = over.id as string

    let targetCellId: string
    let targetIndex: number

    const overCard = cards.find(c => c.id === overId)
    if (overCard) {
      targetCellId = getCellId(overCard.location.day, overCard.location.period)
      const cellCards = getCardsForLocation(overCard.location.day, overCard.location.period)
      targetIndex = cellCards.findIndex(c => c.id === overId)
    } else {
      targetCellId = overId
      targetIndex = 0
    }

    const targetLocation = parseCellId(targetCellId as Parameters<typeof parseCellId>[0])
    const sourceCellId = getCellId(card.location.day, card.location.period)

    if (sourceCellId === targetCellId) {
      const cellCards = getCardsForLocation(targetLocation.day, targetLocation.period)
      const oldIndex = cellCards.findIndex(c => c.id === cardId)

      if (oldIndex !== targetIndex) {
        const newOrder = [...cellCards]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(targetIndex, 0, removed)
        onReorderCard(
          targetLocation.day as Day | null,
          targetLocation.period as Period | null,
          newOrder.map(c => c.id)
        )
      }
    } else {
      const targetCards = getCardsForLocation(targetLocation.day, targetLocation.period)
      const insertIndex = overCard ? targetIndex : targetCards.length
      onMoveCard(cardId, targetLocation, insertIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="planner-layout">
        <Backlog
          cards={getCardsForLocation(null, null)}
          onAddCard={onAddCard}
          onCardClick={setSelectedCard}
        />

        <WeekGrid
          getCardsForLocation={getCardsForLocation}
          onCardClick={setSelectedCard}
          events={weekEvents}
          onEventClick={(event, period) => setSelectedEvent({ event, period })}
        />
      </div>

      <DragOverlay>
        {activeCard && (
          <CardItem card={activeCard} isOverlay />
        )}
      </DragOverlay>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          projects={projects}
          onClose={() => setSelectedCard(null)}
          onSave={(updates) => {
            onEditCard(selectedCard.id, updates)
            setSelectedCard(null)
          }}
          onDelete={() => {
            onRemoveCard(selectedCard.id)
            setSelectedCard(null)
          }}
        />
      )}

      {selectedEvent && (
        <CalendarEventModal
          event={calendarEvents.find(e => e.id === (selectedEvent.event as CalendarEvent & { sourceId?: string }).sourceId) ?? selectedEvent.event}
          defaultPeriod={selectedEvent.period}
          onClose={() => setSelectedEvent(null)}
          onSave={(updates) => {
            const baseId = (selectedEvent.event as CalendarEvent & { sourceId?: string }).sourceId ?? selectedEvent.event.id
            onEditEvent(baseId, updates)
            setSelectedEvent(null)
          }}
          onDelete={() => {
            const baseId = (selectedEvent.event as CalendarEvent & { sourceId?: string }).sourceId ?? selectedEvent.event.id
            onRemoveEvent(baseId)
            setSelectedEvent(null)
          }}
        />
      )}
    </DndContext>
  )
}
