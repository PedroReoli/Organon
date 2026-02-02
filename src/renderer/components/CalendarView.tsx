import { useState, useEffect } from 'react'
import type { Card, CalendarEvent } from '../types'
import { expandCalendarEvents, getTodayISO, formatDateFull } from '../utils'

interface CalendarViewProps {
  cards: Card[]
  events: CalendarEvent[]
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onRemoveEvent: (eventId: string) => void
  focusDateISO?: string | null
  onFocusDateHandled?: () => void
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export const CalendarView = ({ cards, events, onAddEvent, onRemoveEvent, focusDateISO, onFocusDateHandled }: CalendarViewProps) => {
  const today = getTodayISO()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // New event form state
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState(today)
  const [newEventTime, setNewEventTime] = useState('')
  const [newEventColor, setNewEventColor] = useState('#6366f1')
  const [newEventReminderEnabled, setNewEventReminderEnabled] = useState(false)
  const [newEventReminderOffset, setNewEventReminderOffset] = useState(0)
  const [newEventRecurrence, setNewEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [newEventRecurrenceInterval, setNewEventRecurrenceInterval] = useState(1)
  const [newEventRecurrenceUntil, setNewEventRecurrenceUntil] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (!focusDateISO) return
    setSelectedDate(focusDateISO)
    const [yyyy, mm] = focusDateISO.split('-').map(Number)
    if (yyyy && mm) setCurrentDate(new Date(yyyy, mm - 1, 1))
    onFocusDateHandled?.()
  }, [focusDateISO, onFocusDateHandled])

  // Sync form date with selected date
  useEffect(() => {
    if (selectedDate) setNewEventDate(selectedDate)
  }, [selectedDate])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const monthStartISO = `${year}-${(month + 1).toString().padStart(2, '0')}-01`
  const monthEndISO = `${year}-${(month + 1).toString().padStart(2, '0')}-${totalDays.toString().padStart(2, '0')}`
  const expandedEvents = expandCalendarEvents(events, monthStartISO, monthEndISO)

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const getDateISO = (day: number) => {
    const d = new Date(year, month, day)
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  }

  const getEventsForDate = (dateISO: string) => expandedEvents.filter(e => e.date === dateISO)
  const getCardsForDate = (dateISO: string) => cards.filter(c => c.date === dateISO && c.hasDate)

  const resetForm = () => {
    setNewEventTitle('')
    setNewEventTime('')
    setNewEventReminderEnabled(false)
    setNewEventReminderOffset(0)
    setNewEventRecurrence('none')
    setNewEventRecurrenceInterval(1)
    setNewEventRecurrenceUntil('')
  }

  const handleAddEvent = () => {
    if (!newEventDate || !newEventTitle.trim()) return
    if (newEventReminderEnabled && !newEventTime.trim()) return
    onAddEvent({
      title: newEventTitle.trim(),
      date: newEventDate,
      time: newEventTime.trim() || null,
      recurrence: newEventRecurrence === 'none' ? null : {
        frequency: newEventRecurrence,
        interval: Math.max(1, newEventRecurrenceInterval),
        until: newEventRecurrenceUntil.trim() || null,
      },
      reminder: newEventReminderEnabled ? { enabled: true, offsetMinutes: newEventReminderOffset } : null,
      description: '',
      color: newEventColor,
    })
    resetForm()
  }

  const days: (number | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let i = 1; i <= totalDays; i++) days.push(i)

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const selectedCards = selectedDate ? getCardsForDate(selectedDate) : []

  return (
    <div className="calendar-split">
      {/* Main calendar grid */}
      <div className="calendar-layout">
        <header className="calendar-header">
          <div className="calendar-title"><h2>{MONTH_NAMES[month]} {year}</h2></div>
          <div className="calendar-nav">
            <button className="btn btn-secondary" onClick={goToPrevMonth}>&lt;</button>
            <button className="btn btn-secondary" onClick={goToNextMonth}>&gt;</button>
          </div>
        </header>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {DAY_NAMES.map(name => <div key={name} className="calendar-weekday">{name}</div>)}
          </div>
          <div className="calendar-days">
            {days.map((day, idx) => {
              if (day === null) return <div key={idx} className="calendar-day empty" />

              const dateISO = getDateISO(day)
              const isToday = dateISO === today
              const isSelected = dateISO === selectedDate
              const dayEvents = getEventsForDate(dateISO)
              const dayCards = getCardsForDate(dateISO)
              const hasItems = dayEvents.length > 0 || dayCards.length > 0

              const allItems = [
                ...dayEvents.map(e => ({ label: `${e.time ? `${e.time} ` : ''}${e.title}`, color: e.color, type: 'event' as const })),
                ...dayCards.map(c => ({ label: `${c.time ? `${c.time} ` : ''}${c.title}`, color: '', type: 'card' as const })),
              ]
              const maxVisible = 3
              const overflow = allItems.length - maxVisible

              return (
                <div
                  key={idx}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasItems ? 'has-items' : ''}`}
                  onClick={() => setSelectedDate(dateISO)}
                >
                  <span className="calendar-day-number">{day}</span>
                  {hasItems && (
                    <div className="calendar-day-items">
                      {allItems.slice(0, maxVisible).map((item, i) => (
                        <div key={i} className={`calendar-day-entry calendar-day-entry-${item.type}`}>
                          <span className="calendar-day-entry-dot" style={item.type === 'event' ? { background: item.color } : undefined} />
                          <span className="calendar-day-entry-label">{item.label}</span>
                        </div>
                      ))}
                      {overflow > 0 && <div className="calendar-day-overflow">+{overflow} mais</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Side panel — always visible */}
      <div className="calendar-side is-open">
        {/* New event form — always visible */}
        <div className="calendar-side-form">
          <h4 className="calendar-side-form-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Evento
          </h4>
          <div className="calendar-side-form-fields">
            <input
              type="text" value={newEventTitle}
              onChange={e => setNewEventTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
              className="form-input" placeholder="Titulo do evento" autoComplete="off"
            />
            <div className="calendar-side-form-row">
              <input
                type="date" value={newEventDate}
                onChange={e => setNewEventDate(e.target.value)}
                className="form-input form-input-date"
              />
              <input
                type="time" value={newEventTime}
                onChange={e => setNewEventTime(e.target.value)}
                className="form-input form-input-time"
              />
              <input
                type="color" value={newEventColor}
                onChange={e => setNewEventColor(e.target.value)}
                className="calendar-side-color-input"
                title="Cor do evento"
              />
            </div>
            <div className="calendar-side-form-row">
              <select
                className="form-input" value={newEventRecurrence}
                onChange={e => setNewEventRecurrence(e.target.value as typeof newEventRecurrence)}
              >
                <option value="none">Sem recorrencia</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
              {newEventRecurrence !== 'none' && (
                <>
                  <input
                    type="number" min={1} className="form-input" style={{ width: 70 }}
                    value={newEventRecurrenceInterval}
                    onChange={e => setNewEventRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                    title="Intervalo"
                  />
                  <input
                    type="date" className="form-input form-input-date"
                    value={newEventRecurrenceUntil}
                    onChange={e => setNewEventRecurrenceUntil(e.target.value)}
                    title="Ate (opcional)"
                  />
                </>
              )}
            </div>
            <div className="calendar-side-form-row">
              <label className="form-checkbox" style={{ gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox" checked={newEventReminderEnabled}
                  onChange={e => setNewEventReminderEnabled(e.target.checked)}
                />
                <span>Lembrete</span>
              </label>
              {newEventReminderEnabled && (
                <select
                  className="form-input" style={{ flex: 1 }}
                  value={newEventReminderOffset}
                  onChange={e => setNewEventReminderOffset(Number(e.target.value))}
                >
                  <option value={0}>Na hora</option>
                  <option value={60}>1h antes</option>
                  <option value={120}>2h antes</option>
                  <option value={1440}>1 dia antes</option>
                </select>
              )}
            </div>
            <button
              className="btn btn-primary" style={{ width: '100%' }}
              onClick={handleAddEvent}
              disabled={!newEventTitle.trim() || !newEventDate || (newEventReminderEnabled && !newEventTime.trim())}
            >
              Criar Evento
            </button>
          </div>
        </div>

        {/* Selected day details */}
        {selectedDate && (
          <>
            <div className="calendar-side-header">
              <div>
                <h3>{formatDateFull(selectedDate)}</h3>
                <p className="calendar-side-subtitle">{selectedEvents.length + selectedCards.length} item(s)</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedDate(null)} title="Fechar">&times;</button>
            </div>
            <div className="calendar-side-content">
              {selectedEvents.length > 0 && (
                <div className="calendar-side-section">
                  <h4 className="calendar-side-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Eventos ({selectedEvents.length})
                  </h4>
                  {selectedEvents.map(event => (
                    <div key={event.id} className="calendar-side-item">
                      <span className="calendar-side-item-color" style={{ background: event.color }} />
                      <div className="calendar-side-item-content">
                        <div className="calendar-side-item-title">{event.title}</div>
                        {event.time && <div className="calendar-side-item-time">{event.time}</div>}
                        {event.description && <div className="calendar-side-item-desc">{event.description}</div>}
                      </div>
                      <button className="calendar-event-delete" onClick={() => onRemoveEvent(event.id)}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {selectedCards.length > 0 && (
                <div className="calendar-side-section">
                  <h4 className="calendar-side-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                    </svg>
                    Cards ({selectedCards.length})
                  </h4>
                  {selectedCards.map(card => (
                    <div key={card.id} className="calendar-side-item">
                      <span className="calendar-side-item-color" style={{ background: 'var(--color-primary)' }} />
                      <div className="calendar-side-item-content">
                        <div className="calendar-side-item-title">{card.title}</div>
                        {card.time && <div className="calendar-side-item-time">{card.time}</div>}
                        {card.priority && (
                          <span className="calendar-side-item-badge" style={{ color: 'var(--color-text-secondary)' }}>{card.priority}</span>
                        )}
                      </div>
                      <span className="calendar-event-badge">Card</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedEvents.length === 0 && selectedCards.length === 0 && (
                <div className="calendar-side-empty-inline">
                  <p>Nenhum evento neste dia.</p>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedDate && (
          <div className="calendar-side-empty-inline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" style={{ opacity: 0.3 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>Selecione um dia para ver os detalhes.</p>
          </div>
        )}
      </div>
    </div>
  )
}
