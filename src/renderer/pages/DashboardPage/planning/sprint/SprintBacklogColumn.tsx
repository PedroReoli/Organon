/**
 * SprintBacklogColumn — coluna lateral do backlog no Sprint Board.
 *
 * Lista cards sem data/location. Colapsavel (para maximizar espaco das
 * colunas de dia). Permite reorder interno e aceita drag de qualquer
 * coluna de dia.
 *
 * Definido no upgrade 01.
 */

import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Project } from '@types'
import { dndIds } from '../dnd/dndIds'
import { SprintCard } from './SprintCard'

interface SprintBacklogColumnProps {
  cards: Card[]
  projectsById?: Record<string, Project>
  isCollapsed: boolean
  onToggleCollapsed: () => void
  isTarget: boolean
  onCardClick?: (card: Card) => void
  onCardContextMenu?: (event: React.MouseEvent, card: Card) => void
  onQuickAddCard?: (title: string) => void
}

export const SprintBacklogColumn: React.FC<SprintBacklogColumnProps> = ({
  cards,
  projectsById,
  isCollapsed,
  onToggleCollapsed,
  isTarget,
  onCardClick,
  onCardContextMenu,
  onQuickAddCard,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: dndIds.backlog() })
  const [draftTitle, setDraftTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = draftTitle.trim()
    if (!trimmed) return
    onQuickAddCard?.(trimmed)
    setDraftTitle('')
  }

  const className = [
    'sprint-backlog-column',
    isCollapsed ? 'is-collapsed' : '',
    isOver ? 'is-over' : '',
    isTarget ? 'is-target' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const sortableIds = cards.map((c) => dndIds.card(c.id))

  return (
    <div ref={setNodeRef} className={className}>
      <header className="sprint-backlog-header" data-no-dnd>
        {!isCollapsed && <span className="sprint-backlog-title">Backlog</span>}
        <span className="sprint-backlog-count">{cards.length}</span>
        <button
          type="button"
          className="sprint-backlog-toggle"
          onClick={onToggleCollapsed}
          title={isCollapsed ? 'Expandir backlog' : 'Recolher backlog'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
          >
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </header>

      {!isCollapsed && (
        <>
          {onQuickAddCard && (
            <form
              className="sprint-backlog-add"
              onSubmit={handleSubmit}
              data-no-dnd
              style={{ display: 'flex', gap: '6px' }}
            >
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Novo card no backlog"
                className="sprint-backlog-add-input"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Adicionar ao backlog"
              >
                +
              </button>
            </form>
          )}

          <div className="sprint-backlog-body">
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((card) => (
                <SprintCard
                  key={card.id}
                  card={card}
                  project={card.projectId ? projectsById?.[card.projectId] : null}
                  onClick={onCardClick}
                  onContextMenu={onCardContextMenu}
                />
              ))}
            </SortableContext>

            {cards.length === 0 && (
              <div className="sprint-backlog-empty">Backlog vazio</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
