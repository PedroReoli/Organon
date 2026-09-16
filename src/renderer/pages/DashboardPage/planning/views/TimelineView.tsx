/**
 * TimelineView — vista de próximos N dias agrupados por data.
 * Alta estética, densidade Notion/Linear e suporte a cards/eventos.
 */

import React, { useMemo } from 'react'
import type { CalendarEvent, Card, CardPriority, CardStatus } from '@types'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from '@types'
import { expandCalendarEvents, getTodayISO, formatDateShort } from '@utils'
import { addDays } from '../PlanningSideWidgets'

interface TimelineItem {
  type: 'event' | 'card'
  id: string
  title: string
  time: string | null
  color: string
  status?: CardStatus
  priority?: CardPriority | null
  sourceEvent?: CalendarEvent
}

interface TimelineViewProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  selectedDate: string | null
  onSelectDate: (iso: string) => void
  onEditEvent: (event: CalendarEvent) => void
  onCreateEvent: (date: string) => void
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => void
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void
  onOpenCard?: (card: Card) => void
}

const DAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getDayLabel(iso: string): { label: string; sublabel: string; isToday: boolean } {
  const d = new Date(iso + 'T00:00:00')
  const today = getTodayISO()
  const isToday = iso === today
  const isTomorrow = iso === addDays(today, 1)

  let label = `${DAY_LONG[d.getDay()]}`
  if (isToday) label = 'Hoje'
  else if (isTomorrow) label = 'Amanhã'

  const sublabel = `${d.getDate()} de ${MONTH_SHORT[d.getMonth()]}`
  return { label, sublabel, isToday }
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  cards,
  calendarEvents,
  selectedDate,
  onSelectDate,
  onEditEvent,
  onCreateEvent,
}) => {
  const today = getTodayISO()
  const tlStart = selectedDate ?? today
  const tlEnd = addDays(tlStart, 29)

  const grouped = useMemo(() => {
    const expanded = expandCalendarEvents(calendarEvents, tlStart, tlEnd)
    const map: Record<string, TimelineItem[]> = {}
    for (const e of expanded) {
      if (e.date < tlStart) continue
      if (!map[e.date]) map[e.date] = []
      map[e.date].push({ type: 'event', id: e.id, title: e.title, time: e.time, color: e.color || 'var(--color-primary)', sourceEvent: e })
    }
    for (const c of cards) {
      if (!c.hasDate || !c.date || c.date < tlStart || c.date > tlEnd || c.status === 'done') continue
      if (!map[c.date]) map[c.date] = []
      map[c.date].push({ type: 'card', id: c.id, title: c.title, time: c.time, color: STATUS_COLORS[c.status] || '#10b981', status: c.status, priority: c.priority })
    }
    for (const d of Object.keys(map)) {
      map[d].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
    }
    return map
  }, [cards, calendarEvents, tlStart, tlEnd])

  const dates = useMemo(() => {
    const all: string[] = []
    for (let i = 0; i < 30; i++) all.push(addDays(tlStart, i))
    return all.filter((d) => grouped[d]?.length > 0)
  }, [grouped, tlStart])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Linha do Tempo
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
            {selectedDate && selectedDate !== today
              ? `A partir de ${formatDateShort(selectedDate)}`
              : 'Próximos 30 dias de eventos e tarefas ativas'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedDate && (
            <button
              type="button"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => onSelectDate(today)}
            >
              Ir para Hoje
            </button>
          )}
          <button
            type="button"
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}
            onClick={() => onCreateEvent(tlStart)}
          >
            + Criar Evento
          </button>
        </div>
      </div>

      {dates.length === 0 ? (
        <div style={{ margin: 'auto', textAlign: 'center', padding: '48px 24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', maxWidth: '420px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>Sem itens agendados</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>Nenhum evento ou tarefa programada nos próximos 30 dias.</p>
          <button
            type="button"
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => onCreateEvent(tlStart)}
          >
            + Agendar evento agora
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
          {dates.map((date) => {
            const { label, sublabel, isToday } = getDayLabel(date)
            const items = grouped[date]

            return (
              <div
                key={date}
                style={{
                  background: 'var(--color-surface, #111827)',
                  border: isToday ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: isToday ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
                }}
              >
                {/* Header do Dia */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: isToday ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {sublabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}
                    onClick={() => onCreateEvent(date)}
                    title="Novo evento neste dia"
                  >
                    +
                  </button>
                </div>

                {/* Lista de Itens */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => item.sourceEvent && onEditEvent(item.sourceEvent)}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--color-border)',
                        borderLeft: `4px solid ${item.color}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        cursor: item.sourceEvent ? 'pointer' : 'default',
                        transition: 'transform 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: item.type === 'event' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: item.type === 'event' ? 'var(--color-primary)' : '#10b981',
                            flexShrink: 0,
                          }}
                        >
                          {item.type === 'event' ? 'Evento' : 'Tarefa'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {item.time && (
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            ⏰ {item.time}
                          </span>
                        )}
                        {item.priority && (
                          <span style={{ color: PRIORITY_COLORS[item.priority], fontWeight: 600 }}>
                            ● {item.priority}
                          </span>
                        )}
                        {item.status && item.type === 'card' && (
                          <span style={{ color: STATUS_COLORS[item.status] }}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
