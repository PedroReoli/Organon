/**
 * SprintCardItem — card visual usado dentro do Sprint Board (e tambem
 * exibido nas vistas Periodo/Horaria com badge sprint quando inSprint).
 *
 * Usa useSortable do dnd-kit. Borda esquerda colorida pelo status,
 * badge 'S' canto superior direito quando inSprint.
 *
 * Upgrade 01.
 */

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card, Project } from '@types'
import { STATUS_COLORS, PRIORITY_COLORS } from '@types'

interface SprintCardItemProps {
  card: Card
  project?: Project | null
  onClick?: (card: Card) => void
  onSelectCard?: (card: Card) => void
  isSelected?: boolean
  showSprintBadge?: boolean
  draggable?: boolean
}

export const SprintCardItem: React.FC<SprintCardItemProps> = ({
  card,
  project,
  onClick,
  onSelectCard,
  isSelected = false,
  showSprintBadge = false,
  draggable = true,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !draggable,
  })

  const style: React.CSSProperties = {
    transform: draggable ? CSS.Translate.toString(transform) : undefined,
    transition: draggable ? transition : undefined,
    borderLeftColor: STATUS_COLORS[card.status],
  }

  const checklistDone = card.checklist?.filter((it) => it.done).length ?? 0
  const checklistTotal = card.checklist?.length ?? 0
  const hasDescription = !!(card.descriptionHtml && card.descriptionHtml.replace(/<[^>]*>/g, '').trim())

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={style}
      className={`sprint-card ${card.isLocked ? 'is-locked' : ''} ${card.inSprint ? 'is-in-sprint' : ''} ${isSelected ? 'is-selected-ctrl' : ''} ${draggable && isDragging ? 'is-dragging-placeholder' : ''}`}
      data-debug-name="planning/sprint/SprintCardItem"
      data-debug-id={card.title || card.id}
      onClick={(e) => {
        e.stopPropagation()
        if (e.ctrlKey || e.metaKey) {
          onSelectCard?.(card)
        } else {
          onClick?.(card)
        }
      }}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      <div className="sprint-card-header">
        {draggable && (
          <span className="sprint-card-drag-handle" title="Arraste para mover">
            <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
              <path d="M6 4h1v1H6V4Zm0 3h1v1H6V7Zm0 3h1v1H6v-1Zm3-6h1v1H9V4Zm0 3h1v1H9V7Zm0 3h1v1H9v-1Z" />
            </svg>
          </span>
        )}
        <span className="sprint-card-title">{card.title || 'Sem titulo'}</span>
        {card.inSprint && showSprintBadge && (
          <span className="sprint-card-badge" title="Card faz parte da sprint atual">
            S
          </span>
        )}
      </div>
      <div className="sprint-card-meta">
        {card.priority && (
          <span
            className="sprint-card-priority"
            style={{ color: PRIORITY_COLORS[card.priority], borderColor: PRIORITY_COLORS[card.priority] }}
          >
            {card.priority.toUpperCase()}
          </span>
        )}
        {card.time && <span className="sprint-card-time">{card.time}</span>}
        {project && (
          <span
            className="sprint-card-project-tag"
            title={`Projeto: ${project.name}`}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              background: project.color ? `${project.color}22` : 'rgba(99,102,241,0.15)',
              color: project.color || 'var(--color-primary, #6366f1)',
              border: `1px solid ${project.color ? `${project.color}44` : 'rgba(99,102,241,0.3)'}`,
            }}
          >
            {project.name}
          </span>
        )}
        {checklistTotal > 0 && (
          <span className="sprint-card-checklist">
            {checklistDone}/{checklistTotal}
          </span>
        )}
        {card.isLocked && (
          <span className="sprint-card-locked" title="Travado">
            <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
              <path d="M11 7V5a3 3 0 0 0-6 0v2H4v6h8V7h-1Zm-4-2a1 1 0 0 1 2 0v2H7V5Z" />
            </svg>
          </span>
        )}
        {hasDescription && (
          <span className="sprint-card-note" title="Tem conteudo">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="9" height="9">
              <path d="M3 2h10v12H3z" />
              <path d="M5 5h6M5 8h6M5 11h3" />
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}
