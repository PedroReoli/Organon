import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CalendarEvent, Card, Day, Period } from '../types'
import { getCellId } from '../types'
import { SortableCard } from './Card'

interface PeriodCellProps {
  day: Day
  period: Period
  events: CalendarEvent[]
  cards: Card[]
  onCardClick: (card: Card) => void
  onEventClick?: (event: CalendarEvent, cellPeriod: Period) => void
}

const MAX_VISIBLE_EVENTS = 3
const CARDS_PER_PAGE = 3

export const PeriodCell = ({ day, period, events, cards, onCardClick, onEventClick }: PeriodCellProps) => {
  const [page, setPage] = useState(0)

  const cellId = getCellId(day, period)
  const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE))

  // Corrigir página se cards foram removidos
  const safePage = Math.min(page, totalPages - 1)
  if (safePage !== page) setPage(safePage)

  const startIdx = safePage * CARDS_PER_PAGE
  const visibleCards = cards.slice(startIdx, startIdx + CARDS_PER_PAGE)
  const hasPagination = cards.length > CARDS_PER_PAGE
  const isCompact = visibleCards.length >= (events.length > 0 ? 3 : 4)

  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
  })

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS)
  const hiddenCount = events.length - MAX_VISIBLE_EVENTS

  return (
    <div
      ref={setNodeRef}
      className={`grid-cell period-${period} ${isCompact ? 'cell-compact' : ''} ${isOver ? 'drag-over' : ''}`}
    >
      {events.length > 0 && (
        <div className="cell-events" aria-label="Eventos">
          {visibleEvents.map(event => (
            <button
              key={event.id}
              type="button"
              className="cell-event"
              style={{ borderLeftColor: event.color }}
              title={event.time ? `${event.time} — ${event.title}` : event.title}
              onClick={() => onEventClick?.(event, period)}
            >
              <span className="cell-event-time">{event.time ?? 'Dia todo'}</span>
              <span className="cell-event-title">{event.title}</span>
            </button>
          ))}
          {hiddenCount > 0 && (
            <span className="cell-event-more">+{hiddenCount} mais</span>
          )}
        </div>
      )}

      <SortableContext items={visibleCards.map(c => c.id)} strategy={isCompact ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className="cell-cards">
          {visibleCards.map(card => (
            <SortableCard
              key={card.id}
              card={card}
              compact={isCompact}
              onClick={() => onCardClick(card)}
            />
          ))}
        </div>
      </SortableContext>

      {hasPagination && (
        <div className="cell-pagination">
          <button
            type="button"
            className="cell-pagination-arrow"
            disabled={safePage === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            aria-label="Pagina anterior"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="cell-pagination-info">{safePage + 1}/{totalPages}</span>
          <button
            type="button"
            className="cell-pagination-arrow"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            aria-label="Proxima pagina"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {events.length === 0 && cards.length === 0 && (
        <div className="cell-empty-hint">
          <span>+</span>
        </div>
      )}
    </div>
  )
}
