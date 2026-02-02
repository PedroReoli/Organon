import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS } from '../types'
import { formatDateShort } from '../utils'

// SVG icons para status
const STATUS_ICONS: Record<string, JSX.Element> = {
  in_progress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  blocked: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  done: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
}

interface CardItemProps {
  card: Card
  isOverlay?: boolean
  compact?: boolean
  projectColor?: string | null
  onClick?: () => void
}

export const CardItem = ({ card, isOverlay, compact, projectColor, onClick }: CardItemProps) => {
  const hasDescription = card.descriptionHtml && card.descriptionHtml !== '<p></p>'
  const hasChecklist = card.checklist && card.checklist.length > 0
  const checklistDone = hasChecklist ? card.checklist.filter(c => c.done).length : 0
  const checklistTotal = hasChecklist ? card.checklist.length : 0

  return (
    <div
      onClick={onClick}
      className={[
        isOverlay ? 'card-overlay' : 'card',
        compact && !isOverlay ? 'card-compact' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Title row: status icon + title + priority */}
      <div className="card-title-row">
        {card.status !== 'todo' && STATUS_ICONS[card.status] && (
          <span
            className="card-status-icon"
            style={{ color: STATUS_COLORS[card.status] }}
            title={STATUS_LABELS[card.status]}
            aria-label={STATUS_LABELS[card.status]}
          >
            {STATUS_ICONS[card.status]}
          </span>
        )}
        <div className="card-title">{card.title}</div>
        {card.priority && (
          <span
            className="card-priority-dot"
            style={{ background: PRIORITY_COLORS[card.priority] }}
            title={card.priority}
            aria-label={card.priority}
          />
        )}
      </div>

      <div className="card-indicators">
        {card.hasDate && card.date && (
          <div className="card-indicator card-indicator-date" title={compact ? formatDateShort(card.date) : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {!compact && <span>{formatDateShort(card.date)}</span>}
          </div>
        )}

        {card.hasDate && card.time && (
          <div className="card-indicator card-indicator-time" title={compact ? card.time : 'Hora'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {!compact && <span>{card.time}</span>}
          </div>
        )}

        {!card.hasDate && (
          <div className="card-indicator card-indicator-nodate" title={compact ? 'Sem data' : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M3 20h3" />
              <path d="M6 20V8a2 2 0 0 1 2-2h8" />
              <path d="M16 6V4a2 2 0 0 1 2-2h2v2" />
            </svg>
            {!compact && <span>Sem data</span>}
          </div>
        )}

        {hasDescription && (
          <div className="card-indicator" title={compact ? 'Com descricao' : undefined} aria-label={compact ? 'Com descricao' : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
        )}

        {hasChecklist && (
          <div className={`card-indicator card-indicator-checklist ${checklistDone === checklistTotal ? 'card-indicator-checklist-done' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>{checklistDone}/{checklistTotal}</span>
          </div>
        )}

        {projectColor && (
          <span className="card-project-dot" style={{ background: projectColor }} title="Vinculado a projeto" />
        )}
      </div>
    </div>
  )
}

interface SortableCardProps {
  card: Card
  compact?: boolean
  projectColor?: string | null
  onClick?: () => void
}

export const SortableCard = ({ card, compact, projectColor, onClick }: SortableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CardItem
        card={card}
        compact={compact}
        projectColor={projectColor}
        onClick={onClick}
      />
    </div>
  )
}
