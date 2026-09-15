// Card compacto para a grade horária
import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { Card } from '@types'
import { PRIORITY_COLORS, STATUS_COLORS } from '@types'

interface CompactCardProps {
  card: Card
  slotHeight: number
  interval: 30 | 60
  onClick: (card: Card) => void
  onContextMenu: (e: React.MouseEvent, card: Card) => void
  onResizePointerDown?: (card: Card, event: React.PointerEvent<HTMLDivElement>) => void
  previewDurationMinutes?: number | null
  isResizing?: boolean
}

export function CompactCard({
  card, slotHeight, interval, onClick, onContextMenu,
  onResizePointerDown, previewDurationMinutes, isResizing = false,
}: CompactCardProps) {
  const effectiveDuration = previewDurationMinutes ?? card.durationMinutes
  const durationSlots     = effectiveDuration != null
    ? Math.max(1, Math.round(effectiveDuration / interval))
    : 1
  const height = durationSlots * slotHeight - 2
  const isTall = height >= slotHeight * 2  // >= 2 slots → mostrar duração

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: card.isLocked,
  })

  const accentColor = STATUS_COLORS[card.status]

  return (
    <div
      ref={setNodeRef}
      className={[
        'compact-card',
        isDragging    ? 'compact-card--dragging'  : '',
        isResizing    ? 'compact-card--resizing'  : '',
        card.status === 'done'    ? 'compact-card--done'    : '',
        card.status === 'blocked' ? 'compact-card--blocked' : '',
        card.isLocked ? 'compact-card--locked'   : '',
      ].filter(Boolean).join(' ')}
      style={{
        height,
        '--accent': accentColor,
        opacity: isDragging ? 0 : 1,
        pointerEvents: isDragging ? 'none' : undefined,
      } as React.CSSProperties}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, card) }}
    >
      {/* Área arrastável */}
      <button
        type="button"
        className="cc-drag"
        onClick={() => { if (!isDragging && !isResizing) onClick(card) }}
        title={card.title}
        {...attributes}
        {...listeners}
      >
        {/* Prioridade + título na mesma linha */}
        <div className="cc-header">
          {card.priority && (
            <span
              className="cc-priority"
              style={{ color: PRIORITY_COLORS[card.priority], background: `${PRIORITY_COLORS[card.priority]}20` }}
            >
              {card.priority}
            </span>
          )}
          <span className="cc-title">{card.title}</span>
        </div>

        {/* Duração (só quando há espaço: ≥ 2 slots) */}
        {isTall && effectiveDuration != null && (
          <span className="cc-duration">{effectiveDuration}min</span>
        )}
      </button>

      {/* Handle de redimensionamento */}
      {card.time && !card.isLocked && onResizePointerDown && (
        <div
          className="cc-resize"
          data-no-dnd="true"
          onPointerDown={e => {
            e.preventDefault()
            e.stopPropagation()
            onResizePointerDown(card, e)
          }}
          title="Arraste para ajustar duração"
        >
          <span className="cc-resize-grip"/>
        </div>
      )}
    </div>
  )
}
