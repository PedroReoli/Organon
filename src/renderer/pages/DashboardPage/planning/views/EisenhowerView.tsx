/**
 * EisenhowerView — Matriz de Eisenhower (Urgente vs Importante) para triagem rápida no Hub Planejamento.
 *
 * 4 Quadrantes:
 * - Q1: Fazer Agora (Urgente + Importante)
 * - Q2: Agendar (Não Urgente + Importante)
 * - Q3: Delegar (Urgente + Não Importante)
 * - Q4: Eliminar (Não Urgente + Não Importante)
 */

import React, { useMemo } from 'react'
import type { Card, Project } from '@types'
import { STATUS_COLORS } from '@types'

interface EisenhowerViewProps {
  cards: Card[]
  projects?: Project[]
  onOpenCard?: (card: Card) => void
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void
}

interface QuadrantConfig {
  id: 'q1' | 'q2' | 'q3' | 'q4'
  title: string
  subtitle: string
  color: string
  badgeBg: string
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: 'q1',
    title: '1. Fazer Agora',
    subtitle: 'Urgente & Importante — Executar imediatamente',
    color: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
  },
  {
    id: 'q2',
    title: '2. Agendar',
    subtitle: 'Não Urgente & Importante — Planejar para o futuro',
    color: 'var(--color-primary)',
    badgeBg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
  },
  {
    id: 'q3',
    title: '3. Delegar',
    subtitle: 'Urgente & Não Importante — Automatizar ou otimizar',
    color: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'q4',
    title: '4. Eliminar',
    subtitle: 'Não Urgente & Não Importante — Reduzir ou arquivar',
    color: '#6b7280',
    badgeBg: 'rgba(107, 114, 128, 0.15)',
  },
]

export const EisenhowerView: React.FC<EisenhowerViewProps> = ({
  cards,
  projects,
  onOpenCard,
  onUpdateCard: _onUpdateCard,
}) => {
  const activeCards = useMemo(() => cards.filter((c) => c.status !== 'done'), [cards])

  // Triagem automática de cards nos 4 quadrantes
  const categorized = useMemo(() => {
    const q1: Card[] = []
    const q2: Card[] = []
    const q3: Card[] = []
    const q4: Card[] = []

    for (const c of activeCards) {
      const isHighPriority = c.priority === 'P1' || c.priority === 'P2'
      const hasCloseDate = c.hasDate && c.date != null

      if (isHighPriority && hasCloseDate) q1.push(c)
      else if (!isHighPriority && hasCloseDate) q2.push(c)
      else if (isHighPriority && !hasCloseDate) q3.push(c)
      else q4.push(c)
    }

    return { q1, q2, q3, q4 }
  }, [activeCards])

  return (
    <div className="eisenhower-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Matriz de Eisenhower</h2>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Triagem rápida de prioridades ({activeCards.length} tarefas pendentes)</span>
        </div>
      </div>

      <div className="eisenhower-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', flex: 1 }}>
        {QUADRANTS.map((quad) => {
          const quadCards = categorized[quad.id]
          return (
            <div
              key={quad.id}
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${quad.color}`,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: quad.color }}>{quad.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{quad.subtitle}</span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: quad.color,
                    background: quad.badgeBg,
                  }}
                >
                  {quadCards.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
                {quadCards.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Nenhuma tarefa neste quadrante
                  </div>
                ) : (
                  quadCards.map((card) => {
                    const proj = projects?.find((p) => p.id === card.projectId)
                    return (
                      <div
                        key={card.id}
                        onClick={() => onOpenCard?.(card)}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <span style={{ width: '4px', height: '16px', borderRadius: '2px', background: STATUS_COLORS[card.status] || quad.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {card.title || 'Sem título'}
                          </div>
                          {proj && <span style={{ fontSize: '10px', color: 'var(--color-primary)' }}>{proj.name}</span>}
                        </div>
                        {card.date && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                            {card.date.slice(5)}
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
