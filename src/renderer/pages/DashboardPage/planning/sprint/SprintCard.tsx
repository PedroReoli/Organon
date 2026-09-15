/**
 * SprintCard — card no formato kanban usado nas colunas do Sprint Board.
 *
 * Diferente do CardItem (planner antigo), foca em densidade e metadados
 * visuais alinhados ao visual Trello:
 * - Barra lateral colorida por status.
 * - Titulo com 2 linhas + ellipsis.
 * - Linha de badges: prioridade, hora, duracao, dot do projeto, checklist N/M, lock.
 *
 * Definido no upgrade 01.
 */

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card, Project } from '@types'
import { PRIORITY_COLORS, STATUS_COLORS } from '@types'
import { dndIds } from '../dnd/dndIds'

interface SprintCardProps {
  card: Card
  project?: Project | null
  onClick?: (card: Card) => void
  onContextMenu?: (event: React.MouseEvent, card: Card) => void
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}

export const SprintCard: React.FC<SprintCardProps> = ({
  card,
  project,
  onClick,
  onContextMenu,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndIds.card(card.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ['--accent' as string]: STATUS_COLORS[card.status],
    opacity: isDragging ? 0.4 : undefined,
  }

  const doneChecklist = card.checklist.filter((c) => c.done).length
  const totalChecklist = card.checklist.length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'sprint-card',
        card.isLocked ? 'is-locked' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onClick?.(card)}
      onContextMenu={(e) => onContextMenu?.(e, card)}
      {...attributes}
      {...listeners}
    >
      <div className="sprint-card-bar" />
      <div className="sprint-card-body">
        <div className="sprint-card-title">{card.title}</div>
        <div className="sprint-card-meta">
          {card.priority && (
            <span
              className="sprint-card-priority"
              style={{
                color: PRIORITY_COLORS[card.priority],
                background: `${PRIORITY_COLORS[card.priority]}20`,
              }}
            >
              {card.priority}
            </span>
          )}
          {card.time && <span className="sprint-card-time">{card.time}</span>}
          {card.durationMinutes != null && (
            <span className="sprint-card-duration">
              {formatDuration(card.durationMinutes)}
            </span>
          )}
          {project && (
            <span
              className="sprint-card-project"
              style={{ background: project.color ?? 'var(--color-muted)' }}
              title={project.name}
            />
          )}
          {totalChecklist > 0 && (
            <span className="sprint-card-checklist">
              {doneChecklist}/{totalChecklist}
            </span>
          )}
          {card.isLocked && (
            <span className="sprint-card-lock" title="Card travado neste dia">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="11"
                height="11"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
