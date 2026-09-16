/**
 * MonthView — vista mensal estilo calendario tradicional.
 *
 * Header com navegacao + botao de criar evento.
 * Click em evento abre modal de edicao.
 * Eventos e cards exibidos por dia com cores de categoria.
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type { CalendarEvent, Card } from '@types'
import { expandCalendarEvents, getTodayISO } from '@utils'
import { Button } from '@shared/components/primitives'
import { toISO } from '../PlanningSideWidgets'

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

interface DayItem {
  id: string
  label: string
  color: string
  type: 'event' | 'card'
  sourceEvent?: CalendarEvent
  sourceCard?: Card
}

interface MonthViewProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  selectedDate: string | null
  onSelectDate: (iso: string) => void
  onOpenDay: (iso: string) => void
  onCreateEvent?: (date: string) => void
  onEditEvent?: (event: CalendarEvent) => void
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => void
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void
  onOpenCard?: (card: Card) => void
}

export const MonthView: React.FC<MonthViewProps> = ({
  cards,
  calendarEvents,
  selectedDate,
  onSelectDate,
  onOpenDay,
  onCreateEvent,
  onEditEvent,
  onUpdateEvent,
  onUpdateCard,
}) => {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [activeDragItem, setActiveDragItem] = useState<DayItem | null>(null)
  const today = getTodayISO()

  const mY = monthDate.getFullYear()
  const mM = monthDate.getMonth()
  const mTotal = new Date(mY, mM + 1, 0).getDate()
  const mPad = new Date(mY, mM, 1).getDay()
  const mStartISO = toISO(mY, mM, 1)
  const mEndISO = toISO(mY, mM, mTotal)

  const expanded = useMemo(
    () => expandCalendarEvents(calendarEvents, mStartISO, mEndISO),
    [calendarEvents, mStartISO, mEndISO],
  )

  const days = useMemo(() => {
    const d: (number | null)[] = Array(mPad).fill(null)
    for (let i = 1; i <= mTotal; i++) d.push(i)
    return d
  }, [mPad, mTotal])

  const handleCreateEvent = useCallback(() => {
    const date = selectedDate ?? today
    onCreateEvent?.(date)
  }, [selectedDate, today, onCreateEvent])

  const handleItemClick = useCallback((e: React.MouseEvent, item: DayItem) => {
    e.stopPropagation()
    if (item.type === 'event' && item.sourceEvent && onEditEvent) {
      onEditEvent(item.sourceEvent)
    }
  }, [onEditEvent])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const parts = String(e.active.id).split('::')
    const type = parts[0]
    const id = parts[1]
    if (type === 'event') {
      const ev = calendarEvents.find(x => x.id === id)
      if (ev) setActiveDragItem({ id: ev.id, label: ev.title, color: ev.color, type: 'event', sourceEvent: ev })
    } else {
      const crd = cards.find(x => x.id === id)
      if (crd) setActiveDragItem({ id: crd.id, label: crd.title, color: '', type: 'card', sourceCard: crd })
    }
  }, [calendarEvents, cards])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveDragItem(null)
    if (!e.over) return
    const targetDate = String(e.over.id).replace('day:', '')
    
    const parts = String(e.active.id).split('::')
    const type = parts[0]
    const id = parts[1]

    if (type === 'event' && onUpdateEvent) {
      const ev = calendarEvents.find(x => x.id === id)
      if (ev && ev.date !== targetDate) {
        onUpdateEvent(id, { date: targetDate })
      }
    } else if (type === 'card' && onUpdateCard) {
      const crd = cards.find(x => x.id === id)
      if (crd && crd.date !== targetDate) {
        onUpdateCard(id, { date: targetDate })
      }
    }
  }, [calendarEvents, cards, onUpdateEvent, onUpdateCard])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="planning-month-view">
        <header className="planning-month-header">
        <div className="planning-month-title">
          <h2>{MONTH_NAMES[mM]} {mY}</h2>
        </div>
        <div className="planning-month-actions">
          {onCreateEvent && (
            <button
              type="button"
              className="planning-month-add-btn"
              title="Criar evento"
              onClick={handleCreateEvent}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                <rect x="2" y="3" width="12" height="10" rx="1.5" />
                <path d="M2 6h12" />
                <path d="M8 8.5v3M6.5 10h3" />
              </svg>
              <span>Evento</span>
            </button>
          )}
        </div>
        <div className="planning-month-nav">
          <Button variant="secondary" size="sm" onClick={() => setMonthDate(new Date(mY, mM - 1, 1))}>&#8249;</Button>
          <Button variant="secondary" size="sm" onClick={() => setMonthDate(new Date())}>Hoje</Button>
          <Button variant="secondary" size="sm" onClick={() => setMonthDate(new Date(mY, mM + 1, 1))}>&#8250;</Button>
        </div>
      </header>
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {DAY_NAMES.map((n) => <div key={n} className="calendar-weekday">{n}</div>)}
        </div>
        <div className="calendar-days">
          {days.map((day, idx) => {
            if (day === null) return <div key={idx} className="calendar-day empty" />
            const iso = toISO(mY, mM, day)
            const isToday = iso === today
            const isSel = iso === selectedDate
            const evts = expanded.filter((e) => e.date === iso)
            const crds = cards.filter((c) => c.date === iso && c.hasDate)
            const items: DayItem[] = [
              ...evts.map((e) => ({
                id: e.id,
                label: `${e.time ? `${e.time} ` : ''}${e.title}`,
                color: e.color,
                type: 'event' as const,
                sourceEvent: e,
              })),
              ...crds.map((c) => ({
                id: c.id,
                label: `${c.time ? `${c.time} ` : ''}${c.title}`,
                color: '',
                type: 'card' as const,
              })),
            ]
            const overflow = items.length - 3
            return (
              <DroppableDay
                key={idx}
                iso={iso}
                day={day}
                isToday={isToday}
                isSel={isSel}
                items={items}
                overflow={overflow}
                onSelectDate={onSelectDate}
                onOpenDay={onOpenDay}
                onCreateEvent={onCreateEvent}
                handleItemClick={handleItemClick}
              />
            )
          })}
        </div>
      </div>
      <DragOverlay 
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
        }}
      >
        {activeDragItem ? (
          <div className={`calendar-day-entry calendar-day-entry-${activeDragItem.type} is-dragging`} style={activeDragItem.type === 'event' ? { background: `color-mix(in srgb, ${activeDragItem.color} 30%, transparent)`, color: activeDragItem.color, borderColor: activeDragItem.color } : undefined}>
            <span className="calendar-day-entry-label">{activeDragItem.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  )
}

const DroppableDay: React.FC<{
  iso: string
  day: number
  isToday: boolean
  isSel: boolean
  items: DayItem[]
  overflow: number
  onSelectDate: (iso: string) => void
  onOpenDay: (iso: string) => void
  onCreateEvent?: (date: string) => void
  handleItemClick: (e: React.MouseEvent, item: DayItem) => void
}> = ({ iso, day, isToday, isSel, items, overflow, onSelectDate, onOpenDay, onCreateEvent, handleItemClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` })
  return (
    <div
      ref={setNodeRef}
      className={`calendar-day${isToday ? ' today' : ''}${isSel ? ' selected' : ''}${items.length > 0 ? ' has-items' : ''}${isOver ? ' drag-over' : ''}`}
      onClick={() => onSelectDate(iso)}
      onDoubleClick={() => onOpenDay(iso)}
    >
      <div className="calendar-day-top">
        <span className="calendar-day-number">{day}</span>
        {onCreateEvent && (
          <button
            type="button"
            className="calendar-day-add"
            title="Criar evento neste dia"
            onClick={(e) => { e.stopPropagation(); onCreateEvent(iso) }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div className="calendar-day-items">
          {items.slice(0, 3).map((it) => (
            <DraggableItem key={`${it.type}::${it.id}`} item={it} onClick={(e) => handleItemClick(e, it)} />
          ))}
          {overflow > 0 && <div className="calendar-day-overflow">+{overflow} mais</div>}
        </div>
      )}
    </div>
  )
}

const DraggableItem: React.FC<{ item: DayItem, onClick: (e: React.MouseEvent) => void }> = ({ item, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${item.type}::${item.id}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`calendar-day-entry calendar-day-entry-${item.type}`}
      style={{
        opacity: isDragging ? 0.3 : 1,
        background: item.type === 'event' ? `color-mix(in srgb, ${item.color} 20%, transparent)` : undefined,
        color: item.type === 'event' ? item.color : undefined,
      }}
      onClick={onClick}
    >
      <span className="calendar-day-entry-label">{item.label}</span>
    </div>
  )
}
