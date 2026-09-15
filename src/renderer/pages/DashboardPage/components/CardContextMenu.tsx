import { useEffect, useRef } from 'react'
import type { Card, CardPriority, CardStatus } from '@types'
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '@types'

interface CardContextMenuProps {
  x: number
  y: number
  card: Card
  onClose: () => void
  onEdit: (card: Card) => void
  onToggleLock: (card: Card) => void
  onDelete: (card: Card) => void
  onSetStatus: (card: Card, status: CardStatus) => void
  onSetPriority: (card: Card, priority: CardPriority | null) => void
}

const PRIORITIES: (CardPriority | null)[] = [null, 'P1', 'P2', 'P3', 'P4']

export const CardContextMenu = ({
  x, y, card, onClose,
  onEdit, onToggleLock, onDelete, onSetStatus, onSetPriority,
}: CardContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Ajusta posição para não sair da tela
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 320),
    zIndex: 9999,
  }

  return (
    <div
      ref={menuRef}
      className="card-ctx-menu"
      style={menuStyle}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Cabeçalho com título do card */}
      <div className="card-ctx-header">
        <span className="card-ctx-title">{card.title}</span>
      </div>

      {/* Editar */}
      <button className="card-ctx-menu-item" onClick={() => { onEdit(card); onClose() }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
          <path d="M11.5 2.5a2.12 2.12 0 0 1 3 3L5 15H2v-3L11.5 2.5z" />
        </svg>
        Editar
      </button>

      <div className="card-ctx-separator" />

      {/* Status */}
      <div className="card-ctx-section-label">Status</div>
      {STATUS_ORDER.map(s => (
        <button
          key={s}
          className={`card-ctx-menu-item card-ctx-status-item ${card.status === s ? 'is-active' : ''}`}
          onClick={() => { onSetStatus(card, s); onClose() }}
        >
          <span
            className="card-ctx-dot"
            style={{ background: STATUS_COLORS[s] }}
          />
          {STATUS_LABELS[s]}
          {card.status === s && (
            <svg className="card-ctx-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
              <polyline points="2 8 6 12 14 4" />
            </svg>
          )}
        </button>
      ))}

      <div className="card-ctx-separator" />

      {/* Prioridade */}
      <div className="card-ctx-section-label">Prioridade</div>
      {PRIORITIES.map(p => (
        <button
          key={p ?? 'none'}
          className={`card-ctx-menu-item card-ctx-priority-item ${card.priority === p ? 'is-active' : ''}`}
          onClick={() => { onSetPriority(card, p); onClose() }}
        >
          {p ? (
            <span className="card-ctx-dot" style={{ background: PRIORITY_COLORS[p] }} />
          ) : (
            <span className="card-ctx-dot card-ctx-dot--none" />
          )}
          {p ? `${p} – ${PRIORITY_LABELS[p]}` : 'Sem prioridade'}
          {card.priority === p && (
            <svg className="card-ctx-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
              <polyline points="2 8 6 12 14 4" />
            </svg>
          )}
        </button>
      ))}

      <div className="card-ctx-separator" />

      {/* Lock */}
      <button className="card-ctx-menu-item" onClick={() => { onToggleLock(card); onClose() }}>
        {card.isLocked ? (
          <>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
              <rect x="2" y="7" width="12" height="8" rx="1.5" />
              <path d="M4.5 7V5a3.5 3.5 0 0 1 6.6-1.6" />
            </svg>
            Destravar card
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
              <rect x="2" y="7" width="12" height="8" rx="1.5" />
              <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" />
            </svg>
            Travar neste dia
          </>
        )}
      </button>

      {/* Deletar */}
      <button
        className="card-ctx-menu-item card-ctx-menu-item--danger"
        onClick={() => { onDelete(card); onClose() }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
          <polyline points="2 4 14 4" />
          <path d="M6 4V2h4v2M5 4l1 10h4l1-10" />
        </svg>
        Excluir
      </button>
    </div>
  )
}
