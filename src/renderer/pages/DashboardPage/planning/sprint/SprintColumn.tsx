/**
 * SprintColumn — coluna de 1 dia no Sprint Board.
 *
 * Contem header, lista de cards sortable, e botao inline para criar card
 * novo direto no dia. Reage a feedback visual do DnD:
 * - `is-over` quando o ponteiro esta em cima.
 * - `is-target` quando a collision detection aponta para ela.
 * - `is-source` quando o card ativo veio daqui.
 * - `is-today` quando e o dia atual.
 *
 * Definido no upgrade 01.
 */

import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Day, Project } from '@types'
import { dndIds } from '../dnd/dndIds'
import { SprintCard } from './SprintCard'
import { SprintColumnHeader } from './SprintColumnHeader'

interface SprintColumnProps {
  day: Day
  dateISO: string
  cards: Card[]
  projectsById?: Record<string, Project>
  isToday: boolean
  isTarget: boolean
  isSource: boolean
  onCardClick?: (card: Card) => void
  onCardContextMenu?: (event: React.MouseEvent, card: Card) => void
  onQuickAddCard?: (title: string, day: Day) => void
  onOpenHourly?: (day: Day, dateISO: string) => void
}

export const SprintColumn: React.FC<SprintColumnProps> = ({
  day,
  dateISO,
  cards,
  projectsById,
  isToday,
  isTarget,
  isSource,
  onCardClick,
  onCardContextMenu,
  onQuickAddCard,
  onOpenHourly,
}) => {
  const droppableId = dndIds.sprintCol(day)
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const [draftTitle, setDraftTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const doneCount = cards.filter((c) => c.status === 'done').length

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = draftTitle.trim()
    if (!trimmed) {
      setIsAdding(false)
      return
    }
    onQuickAddCard?.(trimmed, day)
    setDraftTitle('')
    setIsAdding(false)
  }

  const className = [
    'sprint-column',
    isToday ? 'is-today' : '',
    isOver ? 'is-over' : '',
    isTarget ? 'is-target' : '',
    isSource ? 'is-source' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const sortableIds = cards.map((c) => dndIds.card(c.id))

  return (
    <div ref={setNodeRef} className={className} data-day={day}>
      <SprintColumnHeader
        day={day}
        dateISO={dateISO}
        totalCount={cards.length}
        doneCount={doneCount}
        isToday={isToday}
        onOpenHourly={onOpenHourly}
      />

      <div className="sprint-column-body">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
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
          <div className="sprint-column-empty">Sem cards</div>
        )}
      </div>

      {onQuickAddCard && (
        <div className="sprint-column-add" data-no-dnd>
          {isAdding ? (
            <form onSubmit={handleSubmit} className="sprint-column-add-form">
              <input
                type="text"
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => handleSubmit()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setDraftTitle('')
                    setIsAdding(false)
                  }
                }}
                placeholder="Titulo do card"
                className="sprint-column-add-input"
              />
            </form>
          ) : (
            <button
              type="button"
              className="sprint-column-add-btn"
              onClick={() => setIsAdding(true)}
            >
              + Adicionar card
            </button>
          )}
        </div>
      )}
    </div>
  )
}
