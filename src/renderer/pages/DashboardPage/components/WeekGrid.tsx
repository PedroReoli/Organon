import type React from 'react'
import type { CalendarEvent, Card, Day, Period } from '@types'
import { DAYS_ORDER, DAY_LABELS, PERIODS_ORDER, PERIOD_LABELS } from '@types'
import { formatDateShort, getDayFromDate, getPeriodFromTime, getTodayISO } from '@utils'
import { PeriodCell } from './PeriodCell'

interface WeekGridProps {
  weekDates: Record<Day, string>
  weekOffset: number
  getCardsForLocation: (day: Day | null, period: Period | null) => Card[]
  onCardClick: (card: Card) => void
  onCardContextMenu?: (e: React.MouseEvent, card: Card) => void
  onEventClick?: (event: CalendarEvent, cellPeriod: Period) => void
  events: CalendarEvent[]
}

export const WeekGrid = ({ weekDates, weekOffset, getCardsForLocation, onCardClick, onCardContextMenu, onEventClick, events }: WeekGridProps) => {
  const today      = getTodayISO()
  const todayDay   = getDayFromDate(today)

  return (
    <main className="week-grid">
      <div className="week-grid-header">
        <div className="week-grid-corner" />
        {DAYS_ORDER.map(day => {
          // "today" highlight only makes sense on the current week
          const isToday    = weekOffset === 0 && day === todayDay
          const dayEvents  = events.filter(e => e.date === weekDates[day])
          const dayCards   = PERIODS_ORDER.reduce((sum, p) => sum + getCardsForLocation(day, p).length, 0)
          const totalCount = dayEvents.length + dayCards

          return (
            <div key={day} className={`week-grid-day-header ${isToday ? 'is-today' : ''}`}>
              <div className="week-grid-day-label">{DAY_LABELS[day]}</div>
              <div className="week-grid-day-date-row">
                <div className="week-grid-day-date">{formatDateShort(weekDates[day])}</div>
                {totalCount > 0 && (
                  <span className="week-grid-day-count">{totalCount}</span>
                )}
                <div className="week-grid-day-events" aria-label="Eventos do dia">
                  {dayEvents.slice(0, 3).map(e => (
                    <span
                      key={e.id}
                      className="week-grid-day-event-dot"
                      style={{ backgroundColor: e.color }}
                      title={e.time ? `${e.time} — ${e.title}` : e.title}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="week-grid-body">
        {PERIODS_ORDER.map(period => (
          <div key={period} className="week-grid-row">
            <div className={`period-label period-label-${period}`}>
              {PERIOD_LABELS[period]}
            </div>
            {DAYS_ORDER.map(day => (
              <PeriodCell
                key={`${day}-${period}`}
                day={day}
                period={period}
                events={events
                  .filter(e => e.date === weekDates[day])
                  .filter(e => (e.time ? getPeriodFromTime(e.time) : 'morning') === period)
                  .sort((a, b) => {
                    const ta = a.time ?? ''
                    const tb = b.time ?? ''
                    if (ta !== tb) return ta.localeCompare(tb)
                    return a.title.localeCompare(b.title)
                  })}
                cards={getCardsForLocation(day, period)}
                onCardClick={onCardClick}
                onCardContextMenu={onCardContextMenu}
                onEventClick={onEventClick}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
