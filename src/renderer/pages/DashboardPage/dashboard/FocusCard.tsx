import { useState } from 'react'
import type { Card } from '@types'
import { PERIOD_LABELS, STATUS_COLORS, STATUS_LABELS } from '@types'
import type { AppView } from '../InternalNav'
import { getRecommendedNextTask, evaluateTaskUrgency } from '../../../utils/reminderScheduler'

interface FocusCardProps {
  allTodayCards: Card[]
  onGoToPlannerCard: (cardId: string) => void
  onNavigate: (view: AppView) => void
}

export const FocusCard = ({ allTodayCards, onGoToPlannerCard, onNavigate }: FocusCardProps) => {
  const [page, setPage] = useState(0)
  const itemsPerPage = 4
  const totalPages = Math.ceil(allTodayCards.length / itemsPerPage)
  const pagedCards = allTodayCards.slice(page * itemsPerPage, (page + 1) * itemsPerPage)

  const doneCards = allTodayCards.filter(card => card.status === 'done').length
  const inProgressCards = allTodayCards.filter(card => card.status === 'in_progress').length
  const blockedCards = allTodayCards.filter(card => card.status === 'blocked').length

  const recommendedTask = getRecommendedNextTask(allTodayCards)
  const recommendedUrgency = recommendedTask ? evaluateTaskUrgency(recommendedTask, allTodayCards) : null

  return (
    <article className="today-section today-report-card" style={{ animation: 'dashboardCardFadeIn 0.35s ease-out' }}>
      <div className="today-section-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ marginRight: '2px' }}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <h3>Foco do Dia</h3>
        <span className="today-section-count">{allTodayCards.length}</span>
      </div>

      {recommendedTask && (
        <div style={{ margin: '8px 14px 0 14px', padding: '10px 12px', background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => onGoToPlannerCard(recommendedTask.id)}>
          <div style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Próxima Atividade Recomendada
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '3px', color: 'var(--color-text)' }}>{recommendedTask.title}</div>
          {recommendedUrgency?.recommendationReason && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{recommendedUrgency.recommendationReason}</div>
          )}
        </div>
      )}

      <div className="today-report-body">
        {allTodayCards.length > 0 ? (
          <>
            <div className="today-progress">
              <div className="today-progress-bar">
                {doneCards > 0 && (
                  <div className="today-progress-fill" style={{ width: `${(doneCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.done }} />
                )}
                {inProgressCards > 0 && (
                  <div className="today-progress-fill" style={{ width: `${(inProgressCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.in_progress }} />
                )}
                {blockedCards > 0 && (
                  <div className="today-progress-fill" style={{ width: `${(blockedCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.blocked }} />
                )}
              </div>
              <div className="today-progress-labels">
                {doneCards > 0 && <span style={{ color: STATUS_COLORS.done }}>{doneCards} feitos</span>}
                {inProgressCards > 0 && <span style={{ color: STATUS_COLORS.in_progress }}>{inProgressCards} em andamento</span>}
                {blockedCards > 0 && <span style={{ color: STATUS_COLORS.blocked }}>{blockedCards} bloqueados</span>}
              </div>
            </div>

            <div className="today-report-list">
              {pagedCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  className="today-report-list-item"
                  onClick={() => onGoToPlannerCard(card.id)}
                >
                  <span className="today-item-color" style={{ background: STATUS_COLORS[card.status] }} />
                  <div className="today-item-content">
                    <strong className="today-item-title">{card.title}</strong>
                    <span className="today-item-desc">
                      {card.hasDate && card.time
                        ? card.time
                        : card.location.period
                          ? PERIOD_LABELS[card.location.period]
                          : 'Sem horário definido'}
                    </span>
                  </div>
                  <div className="today-item-badges">
                    <span className="today-item-badge">{STATUS_LABELS[card.status]}</span>
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
        ) : (
          <div className="today-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Nenhum card planejado para hoje.</span>
          </div>
        )}
      </div>

      <button type="button" className="today-section-link" onClick={() => onNavigate('planner')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Abrir planejamento
      </button>
    </article>
  )
}
