/**
 * DragOverlay customizado do planner — preview do card sendo arrastado.
 *
 * Renderiza uma versao "fantasma" mais leve do card com sombra forte
 * e indicador da duracao quando aplicavel.
 *
 * Definido no upgrade 01.
 */

import React from 'react'
import { DragOverlay, defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core'
import type { Card } from '@types'
import { STATUS_COLORS, PRIORITY_COLORS } from '@types'

interface DnDOverlayCardProps {
  activeCard: Card | null
  /** Modo de visualizacao (afeta tamanho do preview). 'sprint' = retangulo padrao. 'hourly' = altura proporcional a duracao. */
  mode?: 'sprint' | 'hourly'
  /** Slot height (px) usado no calculo de altura no modo hourly. */
  slotHeight?: number
  /** Interval (min) do hourly grid. */
  intervalMinutes?: number
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  duration: 250,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}

export const DnDOverlayCard: React.FC<DnDOverlayCardProps> = ({
  activeCard,
  mode = 'sprint',
  slotHeight = 48,
  intervalMinutes = 60,
}) => {
  return (
    <DragOverlay dropAnimation={dropAnimation}>
      {activeCard && (
        <div
          className="ds-dnd-overlay"
          style={{
            ['--accent' as string]: STATUS_COLORS[activeCard.status],
            ...(mode === 'hourly' && activeCard.durationMinutes
              ? {
                  height:
                    Math.max(
                      1,
                      Math.round(
                        (activeCard.durationMinutes / intervalMinutes) * 1,
                      ),
                    ) * slotHeight - 2,
                  width: 140,
                }
              : { width: 220 }),
          }}
        >
          <div className="ds-dnd-overlay-bar" />
          <div className="ds-dnd-overlay-body">
            <div className="ds-dnd-overlay-title">{activeCard.title}</div>
            <div className="ds-dnd-overlay-meta">
              {activeCard.priority && (
                <span
                  className="ds-dnd-overlay-priority"
                  style={{
                    color: PRIORITY_COLORS[activeCard.priority],
                    background: `${PRIORITY_COLORS[activeCard.priority]}20`,
                  }}
                >
                  {activeCard.priority}
                </span>
              )}
              {activeCard.time && (
                <span className="ds-dnd-overlay-time">{activeCard.time}</span>
              )}
              {activeCard.durationMinutes && (
                <span className="ds-dnd-overlay-duration">
                  {Math.floor(activeCard.durationMinutes / 60)}h
                  {activeCard.durationMinutes % 60 > 0
                    ? `${activeCard.durationMinutes % 60}m`
                    : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </DragOverlay>
  )
}
