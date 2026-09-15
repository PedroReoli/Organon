// Zona colapsável de cards sem horário definido
import React, { useState } from 'react'
import type { Card } from '@types'
import { CompactCard } from './CompactCard'

interface NoTimeZoneProps {
  cards: Card[]
  slotHeight: number
  interval: 30 | 60
  onCardClick: (card: Card) => void
  onCardContextMenu: (e: React.MouseEvent, card: Card) => void
}

export function NoTimeZone({ cards, slotHeight, interval, onCardClick, onCardContextMenu }: NoTimeZoneProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (cards.length === 0) return null

  return (
    <div className="no-time-zone">
      <button
        className="no-time-zone-toggle"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expandir cards sem horário' : 'Recolher cards sem horário'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
          {collapsed
            ? <polyline points="9 18 15 12 9 6" />
            : <polyline points="15 18 9 12 15 6" />}
        </svg>
        <span>Sem horário ({cards.length})</span>
      </button>
      {!collapsed && (
        <div className="no-time-zone-cards">
          {cards.map(card => (
            <CompactCard
              key={card.id}
              card={card}
              slotHeight={slotHeight}
              interval={interval}
              onClick={onCardClick}
              onContextMenu={onCardContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}
