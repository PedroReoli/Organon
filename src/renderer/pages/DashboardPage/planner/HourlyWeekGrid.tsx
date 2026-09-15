// Grade horária unificada: períodos como zonas de fundo, cards posicionados por horário
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { AgendaCategory, CalendarEvent, Card, CardPriority, CardStatus, Day, Period } from '@types'
import { DAYS_ORDER, DAY_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '@types'
import { formatDateShort, getTodayISO, getDayFromDate } from '@utils'
import { TimeSlotAxis } from './TimeSlotAxis'
import { CompactCard } from './CompactCard'
import { NoTimeZone } from './NoTimeZone'

const SLOT_HEIGHT = 48

const PERIOD_RANGES: Record<Period, { start: number; end: number; label: string }> = {
  morning:   { start: 5,  end: 12, label: 'Manhã' },
  afternoon: { start: 12, end: 18, label: 'Tarde' },
  night:     { start: 18, end: 24, label: 'Noite' },
}

const PRIORITIES: (CardPriority | null)[] = [null, 'P1', 'P2', 'P3', 'P4']
const HOURLY_SLOT_PREFIX = 'hourly-slot'

interface HourlyWeekGridProps {
  weekDates: Record<Day, string>
  weekOffset: number
  startHour: number
  endHour: number
  interval: 30 | 60
  getCardsForLocation: (day: Day | null, period: Period | null) => Card[]
  events: CalendarEvent[]
  categories?: AgendaCategory[]
  onCardClick: (card: Card) => void
  onCardContextMenu: (e: React.MouseEvent, card: Card) => void
  onEventClick?: (event: CalendarEvent, period: Period) => void
  onResizePointerDown: (card: Card, event: React.PointerEvent<HTMLDivElement>) => void
  getCardDurationMinutes?: (card: Card) => number | null
  resizingCardId?: string | null
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function getHourlySlotId(day: Day, minutes: number): string {
  return `${HOURLY_SLOT_PREFIX}:${day}:${minutes}`
}

function getPeriodFromHour(hour: number): Period {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'night'
}

function DroppableHourlySlot({ day, minutes, top, height }: { day: Day; minutes: number; top: number; height: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: getHourlySlotId(day, minutes) })
  return (
    <div
      ref={setNodeRef}
      className={`hourly-drop-zone${isOver ? ' is-over' : ''}`}
      style={{ top, height }}
    />
  )
}

export function HourlyWeekGrid({
  weekDates, weekOffset, startHour, endHour, interval,
  getCardsForLocation, events, categories = [], onCardClick, onCardContextMenu, onEventClick,
  onResizePointerDown, getCardDurationMinutes, resizingCardId,
}: HourlyWeekGridProps) {
  const catColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of categories) m[c.id] = c.color
    return m
  }, [categories])
  const today    = getTodayISO()
  const todayDay = getDayFromDate(today)

  const [filterStatus,   setFilterStatus]   = useState<CardStatus | null>(null)
  const [filterPriority, setFilterPriority] = useState<CardPriority | null>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)

  const startMin   = startHour * 60
  const endMin     = endHour * 60
  const totalMin   = endMin - startMin
  const totalSlots = totalMin / interval
  const gridHeight = totalSlots * SLOT_HEIGHT

  // Minutos atuais (atualiza a cada minuto)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setNowMinutes(d.getHours() * 60 + d.getMinutes())
    }
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [])

  // Scroll para o horário atual ao montar
  useEffect(() => {
    if (!scrollBodyRef.current) return
    const offsetMin = nowMinutes - startMin
    if (offsetMin < 0 || offsetMin > totalMin) return
    const scrollY = (offsetMin / interval) * SLOT_HEIGHT - 120
    scrollBodyRef.current.scrollTop = Math.max(0, scrollY)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Posição da linha "agora" (só na semana atual)
  const nowTop = weekOffset === 0 && nowMinutes >= startMin && nowMinutes <= endMin
    ? ((nowMinutes - startMin) / interval) * SLOT_HEIGHT
    : null

  const cardsByDay = useMemo(() => {
    const result: Record<Day, { withTime: Card[]; noTime: Card[] }> = {} as never
    for (const day of DAYS_ORDER) {
      const all: Card[] = []
      for (const period of ['morning', 'afternoon', 'night'] as Period[]) {
        all.push(...getCardsForLocation(day, period))
      }
      const filtered = all.filter(c => {
        if (filterStatus   && c.status   !== filterStatus)   return false
        if (filterPriority && c.priority !== filterPriority) return false
        return true
      })
      result[day] = {
        withTime: filtered
          .filter(c => c.time != null)
          .sort((a, b) => {
            const timeDiff = (a.time ?? '').localeCompare(b.time ?? '')
            if (timeDiff !== 0) return timeDiff
            return a.order - b.order
          }),
        noTime:   filtered.filter(c => c.time == null),
      }
    }
    return result
  }, [getCardsForLocation, filterStatus, filterPriority])

  function periodBackgrounds() {
    return (['morning', 'afternoon', 'night'] as Period[]).map(period => {
      const range = PERIOD_RANGES[period]
      const zoneStartMin = Math.max(range.start * 60, startMin)
      const zoneEndMin   = Math.min(range.end * 60, endMin)
      if (zoneStartMin >= zoneEndMin) return null
      const top    = ((zoneStartMin - startMin) / interval) * SLOT_HEIGHT
      const height = ((zoneEndMin - zoneStartMin) / interval) * SLOT_HEIGHT
      return (
        <div
          key={period}
          className={`hourly-period-zone hourly-period-zone--${period}`}
          style={{ top, height }}
        />
      )
    })
  }

  function droppableSlots(day: Day) {
    return Array.from({ length: totalSlots }, (_, slotIdx) => {
      const slotStartMinutes = startMin + slotIdx * interval
      return (
        <DroppableHourlySlot
          key={`${day}-${slotStartMinutes}`}
          day={day}
          minutes={slotStartMinutes}
          top={slotIdx * SLOT_HEIGHT}
          height={SLOT_HEIGHT}
        />
      )
    })
  }

  const hasFilters = filterStatus !== null || filterPriority !== null

  return (
    <div className="hourly-week-grid">
      <div className="hourly-filter-bar">
        <div className="hourly-filter-group">
          <span className="hourly-filter-label">Status</span>
          <div className="hourly-filter-select-wrap">
            <span
              className="hourly-filter-dot"
              style={{ background: filterStatus ? STATUS_COLORS[filterStatus] : 'var(--color-border-light)' }}
            />
            <select
              className="hourly-filter-select"
              value={filterStatus ?? ''}
              onChange={e => setFilterStatus((e.target.value || null) as CardStatus | null)}
            >
              <option value="">Todos</option>
              {STATUS_ORDER.map(status => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="hourly-filter-sep" />

        <div className="hourly-filter-group">
          <span className="hourly-filter-label">Prioridade</span>
          <div className="hourly-filter-select-wrap">
            <span
              className="hourly-filter-dot"
              style={{ background: filterPriority ? PRIORITY_COLORS[filterPriority] : 'var(--color-border-light)' }}
            />
            <select
              className="hourly-filter-select"
              value={filterPriority ?? ''}
              onChange={e => setFilterPriority((e.target.value || null) as CardPriority | null)}
            >
              <option value="">Todas</option>
              {PRIORITIES.filter((p): p is CardPriority => p !== null).map(priority => (
                <option key={priority} value={priority}>{priority} — {PRIORITY_LABELS[priority]}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            className="hourly-filter-clear"
            onClick={() => { setFilterStatus(null); setFilterPriority(null) }}
            title="Limpar filtros"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="hourly-week-header">
        <div className="hourly-axis-corner" />
        {DAYS_ORDER.map(day => {
          const isToday = weekOffset === 0 && day === todayDay
          return (
            <div key={day} className={`hourly-day-header ${isToday ? 'is-today' : ''}`}>
              <span className="hourly-day-label">{DAY_LABELS[day]}</span>
              <span className="hourly-day-date">{formatDateShort(weekDates[day])}</span>
            </div>
          )
        })}
      </div>

      <div className="hourly-week-no-time">
        <div className="hourly-axis-corner-sm" />
        {DAYS_ORDER.map(day => {
          const noTime = cardsByDay[day]?.noTime ?? []
          return (
            <div key={day} className="hourly-no-time-col">
              <NoTimeZone
                cards={noTime}
                slotHeight={SLOT_HEIGHT}
                interval={interval}
                onCardClick={onCardClick}
                onCardContextMenu={onCardContextMenu}
              />
            </div>
          )
        })}
      </div>

      <div className="hourly-week-body" ref={scrollBodyRef}>
        <TimeSlotAxis
          startHour={startHour}
          endHour={endHour}
          interval={interval}
          slotHeight={SLOT_HEIGHT}
        />

        {DAYS_ORDER.map(day => {
          const isToday   = weekOffset === 0 && day === todayDay
          const withTime  = cardsByDay[day]?.withTime ?? []
          const dayEvents = events.filter(e => e.date === weekDates[day] && e.time != null)

          const slotMap = new Map<number, Card[]>()
          for (const card of withTime) {
            if (!card.time) continue
            const cardMin   = timeToMinutes(card.time)
            const offsetMin = cardMin - startMin
            if (offsetMin < 0 || offsetMin >= totalMin) continue
            const slotIdx  = Math.floor(offsetMin / interval)
            const existing = slotMap.get(slotIdx) ?? []
            existing.push(card)
            slotMap.set(slotIdx, existing)
          }

          return (
            <div key={day} className={`hourly-day-col${isToday ? ' is-today' : ''}`} style={{ height: gridHeight }}>
              {periodBackgrounds()}

              {/* Linhas de slot: hora cheia mais escura, meia-hora mais suave */}
              {Array.from({ length: totalSlots }, (_, i) => {
                const slotMin = startMin + i * interval
                const isHour = slotMin % 60 === 0
                return (
                  <div
                    key={i}
                    className={`hourly-slot-line${isHour ? ' is-hour' : ''}`}
                    style={{ top: i * SLOT_HEIGHT }}
                  />
                )
              })}

              {droppableSlots(day)}

              {/* Linha do "agora" */}
              {isToday && nowTop !== null && (
                <div className="hourly-now-line" style={{ top: nowTop }}>
                  <span className="hourly-now-dot" />
                </div>
              )}

              {/* Cards com horário */}
              {Array.from(slotMap.entries()).map(([slotIdx, cards]) => {
                const top = slotIdx * SLOT_HEIGHT
                if (cards.length === 1) {
                  return (
                    <div key={cards[0].id} className="hourly-card-wrapper" style={{ top }}>
                      <CompactCard
                        card={cards[0]}
                        slotHeight={SLOT_HEIGHT}
                        interval={interval}
                        onClick={onCardClick}
                        onContextMenu={onCardContextMenu}
                        onResizePointerDown={onResizePointerDown}
                        previewDurationMinutes={getCardDurationMinutes?.(cards[0]) ?? undefined}
                        isResizing={resizingCardId === cards[0].id}
                      />
                    </div>
                  )
                }
                const [first, ...rest] = cards
                return (
                  <div key={`slot-${slotIdx}`} className="hourly-card-wrapper hourly-card-overlap" style={{ top }}>
                    <CompactCard
                      card={first}
                      slotHeight={SLOT_HEIGHT}
                      interval={interval}
                      onClick={onCardClick}
                      onContextMenu={onCardContextMenu}
                      onResizePointerDown={onResizePointerDown}
                      previewDurationMinutes={getCardDurationMinutes?.(first) ?? undefined}
                      isResizing={resizingCardId === first.id}
                    />
                    <button
                      className="hourly-overlap-badge"
                      title={rest.map(c => c.title).join('\n')}
                      onClick={() => onCardClick(rest[0])}
                      type="button"
                    >
                      +{rest.length}
                    </button>
                  </div>
                )
              })}

              {/* Eventos de calendário */}
              {dayEvents.map(event => {
                if (!event.time) return null
                const evMin     = timeToMinutes(event.time)
                const offsetMin = evMin - startMin
                if (offsetMin < 0 || offsetMin >= totalMin) return null
                const top      = (offsetMin / interval) * SLOT_HEIGHT
                const period   = getPeriodFromHour(Math.floor(evMin / 60))
                const evColor  = (event.categoryId ? catColorMap[event.categoryId] : null) ?? event.color
                const chipH    = Math.max(24, SLOT_HEIGHT - 4)
                return (
                  <button
                    key={event.id}
                    className="hourly-event-chip"
                    style={{ top, height: chipH, borderLeftColor: evColor, '--event-color': evColor } as React.CSSProperties}
                    onClick={() => onEventClick?.(event, period)}
                    title={`${event.time} — ${event.title}`}
                    type="button"
                  >
                    <span className="hourly-event-time">{event.time}</span>
                    <span className="hourly-event-title">{event.title}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
