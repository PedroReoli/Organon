/**
 * PlanningHomePage — dashboard inicial do Hub Planejamento.
 *
 * Inspirado em NotesHomePage. Tem:
 * - Header com titulo + sprint corrente + botao 'Novo card/evento'
 * - 4 hub cards (Periodo / Horaria / Sprint / Mes) com contagens
 * - Stats row (5 KPIs)
 * - Section: Sprint atual com progress bar e lista
 * - Section: Proximos eventos
 * - Section: Hoje + mini calendario lado a lado
 * - Section: Relatorios
 *
 * Upgrade 01.
 */

import React, { useMemo } from 'react'
import type { Card, CalendarEvent, SprintMetadata } from '@types'
import { STATUS_COLORS } from '@types'
import { getTodayISO, formatDateFull, expandCalendarEvents } from '@utils'
import { Button } from '@shared/components/primitives'
import { getCurrentSprintId, getSprintRange } from './sprint/sprintWeek'
import { MiniCal } from './PlanningSideWidgets'

export type PlanningTabId = 'home' | 'period' | 'hourly' | 'sprint' | 'month' | 'timeline' | 'eisenhower' | 'analytics'


interface PlanningHomePageProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  sprintMetadata: SprintMetadata[]
  onNavigate: (tab: PlanningTabId) => void
  onCreateCard: () => void
  onCreateEvent: () => void
  onSelectDate: (iso: string) => void
}

const HubCardIcon = ({ name }: { name: string }) => {
  const map: Record<string, React.ReactNode> = {
    period: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    hourly: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
    sprint: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <rect x="3" y="3" width="6" height="18" rx="1" />
        <rect x="10" y="3" width="6" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="9" rx="1" />
      </svg>
    ),
    month: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  }
  return map[name] ?? null
}

export const PlanningHomePage: React.FC<PlanningHomePageProps> = ({
  cards,
  calendarEvents,
  sprintMetadata,
  onNavigate,
  onCreateCard,
  onCreateEvent,
  onSelectDate,
}) => {
  const today = getTodayISO()
  const currentSprintId = useMemo(() => getCurrentSprintId(), [])
  const sprintRange = useMemo(() => getSprintRange(currentSprintId), [currentSprintId])
  const currentMetadata = useMemo(
    () => sprintMetadata.find((m) => m.id === currentSprintId),
    [sprintMetadata, currentSprintId],
  )

  const sprintCards = useMemo(() => cards.filter((c) => c.inSprint), [cards])
  const sprintDone = useMemo(
    () => sprintCards.filter((c) => c.status === 'done').length,
    [sprintCards],
  )

  const todayCards = useMemo(
    () => cards.filter((c) => c.hasDate && c.date === today),
    [cards, today],
  )
  const todayEvents = useMemo(
    () => expandCalendarEvents(calendarEvents, today, today),
    [calendarEvents, today],
  )

  const overdueCards = useMemo(
    () => cards.filter((c) => c.hasDate && c.date && c.date < today && c.status !== 'done'),
    [cards, today],
  )

  // Period count: cards com period definido na semana corrente
  const periodCount = useMemo(
    () => cards.filter((c) => c.location.period && c.hasDate && c.date && c.date >= sprintRange.startDate && c.date <= sprintRange.endDate).length,
    [cards, sprintRange],
  )
  const hourlyCount = useMemo(
    () => cards.filter((c) => c.time && c.hasDate && c.date && c.date >= sprintRange.startDate && c.date <= sprintRange.endDate).length,
    [cards, sprintRange],
  )

  // Eventos dos proximos 7 dias
  const upcomingEvents = useMemo(() => {
    const end = new Date(today)
    end.setDate(end.getDate() + 7)
    const endISO = end.toISOString().slice(0, 10)
    return expandCalendarEvents(calendarEvents, today, endISO)
      .sort((a, b) => `${a.date}T${a.time ?? '00:00'}`.localeCompare(`${b.date}T${b.time ?? '00:00'}`))
      .slice(0, 6)
  }, [calendarEvents, today])

  const sprintProgress = sprintCards.length === 0 ? 0 : (sprintDone / sprintCards.length) * 100

  const sprintLabel = currentMetadata?.label ? ` · ${currentMetadata.label}` : ''
  const sprintDisplayId = currentSprintId.replace('-W', ' · S')

  const hubs = [
    {
      id: 'period' as const,
      label: 'Período',
      sublabel: `${periodCount} cards`,
      icon: <HubCardIcon name="period" />,
      color: 'var(--color-primary)',
    },
    {
      id: 'hourly' as const,
      label: 'Horária',
      sublabel: `${hourlyCount} cards`,
      icon: <HubCardIcon name="hourly" />,
      color: 'var(--color-primary)',
    },
    {
      id: 'sprint' as const,
      label: 'Sprint',
      sublabel: `${sprintCards.length} cards`,
      icon: <HubCardIcon name="sprint" />,
      color: '#f59e0b',
    },
    {
      id: 'month' as const,
      label: 'Mês',
      sublabel: 'Calendário',
      icon: <HubCardIcon name="month" />,
      color: '#22c55e',
    },
  ]

  const stats = [
    { label: 'Sprint', n: sprintCards.length },
    { label: 'Done', n: `${sprintDone}/${sprintCards.length}` },
    { label: 'Hoje', n: todayCards.length + todayEvents.length },
    { label: 'Atrasados', n: overdueCards.length },
    { label: 'Prox evento', n: upcomingEvents[0]?.time ?? '—' },
  ]

  return (
    <div className="planning-home">
      <div className="planning-home-header">
        <div>
          <h2 className="planning-home-title">Planejamento</h2>
          <p className="planning-home-subtitle">
            Sprint {sprintDisplayId}{sprintLabel} · {sprintRange.startDate} a {sprintRange.endDate}
          </p>
        </div>
        <div className="planning-home-actions">
          <Button variant="secondary" onClick={onCreateEvent}>+ Evento</Button>
          <Button variant="primary" onClick={onCreateCard}>+ Card</Button>
        </div>
      </div>

      <div className="planning-home-hubs">
        {hubs.map((hub) => (
          <button
            key={hub.id}
            className="planning-home-hub-card"
            onClick={() => onNavigate(hub.id)}
            style={{ '--hub-color': hub.color } as React.CSSProperties}
          >
            <span className="planning-home-hub-icon">{hub.icon}</span>
            <span className="planning-home-hub-label">{hub.label}</span>
            <span className="planning-home-hub-sub">{hub.sublabel}</span>
          </button>
        ))}
      </div>

      <div className="planning-home-stats">
        {stats.map((s) => (
          <div key={s.label} className="planning-home-stat">
            <span className="planning-home-stat-n">{s.n}</span>
            <span className="planning-home-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="planning-home-body">
        <section className="planning-home-section planning-home-section--sprint">
          <div className="planning-home-section-head">
            <h3>Sprint atual: {sprintDisplayId}{sprintLabel}</h3>
            <button type="button" className="planning-home-section-link" onClick={() => onNavigate('sprint')}>
              Ver board →
            </button>
          </div>
          <div className="planning-home-progress">
            <div className="planning-home-progress-bar">
              <div className="planning-home-progress-fill" style={{ width: `${sprintProgress}%` }} />
            </div>
            <span className="planning-home-progress-text">
              {sprintDone}/{sprintCards.length} concluídos
            </span>
          </div>
          {sprintCards.length === 0 ? (
            <p className="planning-home-empty">Nenhum card na sprint atual ainda. Marque cards como inSprint para começar.</p>
          ) : (
            <ul className="planning-home-list">
              {sprintCards.slice(0, 5).map((c) => (
                <li key={c.id} className="planning-home-list-item">
                  <span
                    className="planning-home-list-bar"
                    style={{ background: STATUS_COLORS[c.status] }}
                  />
                  <span className="planning-home-list-title">{c.title || 'Sem título'}</span>
                  {c.date && <span className="planning-home-list-date">{c.date}</span>}
                  {c.priority && <span className="planning-home-list-prio">{c.priority.toUpperCase()}</span>}
                </li>
              ))}
              {sprintCards.length > 5 && (
                <li className="planning-home-list-more">... e mais {sprintCards.length - 5}</li>
              )}
            </ul>
          )}
        </section>

        <section className="planning-home-section planning-home-section--events">
          <div className="planning-home-section-head">
            <h3>Próximos eventos</h3>
            <button type="button" className="planning-home-section-link" onClick={() => onNavigate('timeline')}>
              Ver timeline →
            </button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="planning-home-empty">Sem eventos nos próximos 7 dias.</p>
          ) : (
            <ul className="planning-home-list">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="planning-home-list-item">
                  <span className="planning-home-list-bar" style={{ background: e.color }} />
                  <span className="planning-home-list-title">{e.title}</span>
                  <span className="planning-home-list-date">
                    {formatDateFull(e.date)}
                    {e.time && ` · ${e.time}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="planning-home-grid">
          <section className="planning-home-section">
            <div className="planning-home-section-head">
              <h3>Hoje</h3>
              <button type="button" className="planning-home-section-link" onClick={() => onNavigate('period')}>
                Vista período →
              </button>
            </div>
            {todayCards.length === 0 && todayEvents.length === 0 ? (
              <p className="planning-home-empty">Sem itens hoje.</p>
            ) : (
              <ul className="planning-home-list">
                {todayEvents.map((e) => (
                  <li key={`e-${e.id}`} className="planning-home-list-item">
                    <span className="planning-home-list-bar" style={{ background: e.color }} />
                    <span className="planning-home-list-title">{e.title}</span>
                    {e.time && <span className="planning-home-list-date">{e.time}</span>}
                  </li>
                ))}
                {todayCards.map((c) => (
                  <li key={`c-${c.id}`} className="planning-home-list-item">
                    <span className="planning-home-list-bar" style={{ background: STATUS_COLORS[c.status] }} />
                    <span className="planning-home-list-title">{c.title}</span>
                    {c.time && <span className="planning-home-list-date">{c.time}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="planning-home-section planning-home-section--minical">
            <div className="planning-home-section-head">
              <h3>Calendário</h3>
            </div>
            <MiniCal
              events={calendarEvents}
              cards={cards}
              catMap={{}}
              selectedDate={null}
              onSelect={onSelectDate}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
