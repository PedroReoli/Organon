import { useState } from 'react'
import type { CalendarEvent } from '@types'
import type { AppView } from '../InternalNav'

interface AgendaCardProps {
  todayEvents: CalendarEvent[]
  onGoToCalendarDate: (dateISO: string) => void
  onNavigate: (view: AppView) => void
}

export const AgendaCard = ({ todayEvents, onGoToCalendarDate, onNavigate }: AgendaCardProps) => {
  const [page, setPage] = useState(0)
  const itemsPerPage = 4
  const totalPages = Math.ceil(todayEvents.length / itemsPerPage)
  const pagedEvents = todayEvents.slice(page * itemsPerPage, (page + 1) * itemsPerPage)

  return (
    <article className="today-section today-report-card" style={{ animation: 'dashboardCardFadeIn 0.3s ease-out' }}>
      <div className="today-section-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ marginRight: '2px' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <h3>Agenda de Hoje</h3>
        <span className="today-section-count">{todayEvents.length}</span>
      </div>

      {todayEvents.length === 0 ? (
        <div className="today-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>Nenhum evento programado para hoje.</span>
        </div>
      ) : (
        <>
          <div className="today-report-list">
            {pagedEvents.map(event => (
              <button
                key={event.id}
                type="button"
                className="today-report-list-item"
                onClick={() => onGoToCalendarDate(event.date)}
              >
                <span className="today-item-color" style={{ background: event.color || 'var(--color-primary)' }} />
                <div className="today-item-content">
                  <strong className="today-item-title">{event.time ? `${event.time} • ${event.title}` : event.title}</strong>
                  {event.description && <span className="today-item-desc">{event.description}</span>}
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', fontSize: '11px', color: 'var(--color-text-dim)' }}>
              <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>‹ Anteriores</button>
              <span>Página {page + 1} de {totalPages}</span>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Próximos ›</button>
            </div>
          )}
        </>
      )}

      <button type="button" className="today-section-link" onClick={() => onNavigate('calendar')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Abrir calendário
      </button>
    </article>
  )
}
