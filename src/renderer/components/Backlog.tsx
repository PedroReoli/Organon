import { useState, KeyboardEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card } from '../types'
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS } from '../types'
import { SortableCard } from './Card'

interface BacklogProps {
  cards: Card[]
  onAddCard: (title: string) => void
  onCardClick: (card: Card) => void
}

export const Backlog = ({ cards, onAddCard, onCardClick }: BacklogProps) => {
  const [newCardTitle, setNewCardTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
  })

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newCardTitle.trim()) {
      onAddCard(newCardTitle)
      setNewCardTitle('')
    }
  }

  const handleAddClick = () => {
    if (newCardTitle.trim()) {
      onAddCard(newCardTitle)
      setNewCardTitle('')
    }
  }

  return (
    <aside className="backlog">
      <header className="backlog-header">
        <h2>Backlog</h2>
        <span className="backlog-count">{cards.length}</span>
      </header>

      <div className="backlog-input-container">
        <div className="backlog-input-wrapper">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Novo card..."
            className="backlog-input"
          />
          <button
            onClick={handleAddClick}
            disabled={!newCardTitle.trim()}
            className="backlog-add-btn"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`backlog-list ${isOver ? 'drag-over' : ''}`}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="backlog-empty">
              <div className="backlog-empty-icon">📋</div>
              <p>Nenhum card no backlog</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Crie um novo card acima
              </p>
            </div>
          ) : (
            <div className="card-list">
              {cards.map(card => (
                <SortableCard
                  key={card.id}
                  card={card}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>

      <div className="backlog-legend">
        <div className="backlog-legend-section">
          <span className="backlog-legend-title">Prioridade</span>
          <div className="backlog-legend-items">
            {(['P1', 'P2', 'P3', 'P4'] as const).map(p => (
              <span key={p} className="backlog-legend-item">
                <span className="backlog-legend-dot" style={{ background: PRIORITY_COLORS[p] }} />
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="backlog-legend-section">
          <span className="backlog-legend-title">Status</span>
          <div className="backlog-legend-items">
            {(['in_progress', 'blocked', 'done'] as const).map(s => (
              <span key={s} className="backlog-legend-item">
                <span className="backlog-legend-icon" style={{ color: STATUS_COLORS[s] }}>
                  {s === 'in_progress' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  )}
                  {s === 'blocked' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  )}
                  {s === 'done' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
