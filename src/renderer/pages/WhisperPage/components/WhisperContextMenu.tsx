import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WhisperFolder, WhisperRecord } from '../types/whisper.types'

interface WhisperContextMenuProps {
  ctxMenu: { x: number; y: number; recordId: string } | null
  record: WhisperRecord | null
  folders: WhisperFolder[]
  onClose: () => void
  onRename: (record: WhisperRecord) => void
  onCopy: (record: WhisperRecord) => void
  onMove: (record: WhisperRecord, folderId: string | null) => void
  onDelete: (record: WhisperRecord) => void
}

export const WhisperContextMenu: React.FC<WhisperContextMenuProps> = ({
  ctxMenu,
  record,
  folders,
  onClose,
  onRename,
  onCopy,
  onMove,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!menuRef.current || !ctxMenu) return
    const rect = menuRef.current.getBoundingClientRect()
    const winW = window.innerWidth
    const winH = window.innerHeight

    let posX = ctxMenu.x
    let posY = ctxMenu.y

    if (posX + rect.width > winW - 12) {
      posX = Math.max(12, winW - rect.width - 12)
    }
    if (posY + rect.height > winH - 12) {
      posY = Math.max(12, winH - rect.height - 12)
    }

    setPos({ x: posX, y: posY })
    menuRef.current.focus({ preventScroll: true })
  }, [ctxMenu])

  if (!ctxMenu || !record) return null

  const menuItemStyle = (id: string, isDanger = false): React.CSSProperties => {
    const isHovered = hoveredItem === id
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '7px 10px',
      borderRadius: '6px',
      border: 'none',
      background: isHovered
        ? isDanger
          ? 'rgba(239, 68, 68, 0.15)'
          : 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
        : 'transparent',
      color: isDanger
        ? '#ef4444'
        : isHovered
          ? 'var(--color-text)'
          : 'var(--color-text)',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 0.12s ease, color 0.12s ease',
      whiteSpace: 'nowrap',
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '9.5px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: 'var(--color-text-muted)',
    padding: '6px 10px 4px 10px',
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Opções da Reunião"
      tabIndex={-1}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: '230px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.05)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        userSelect: 'none',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header do Menu */}
      <div
        style={{
          padding: '6px 10px 8px 10px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '4px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Gravação Selecionada
        </div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '2px',
          }}
        >
          {record.title || 'Sem título'}
        </div>
      </div>

      {/* Seção 1: Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={sectionLabelStyle}>Ações</div>

        <button
          style={menuItemStyle('rename')}
          onMouseEnter={() => setHoveredItem('rename')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            onRename(record)
            onClose()
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Renomear</span>
        </button>

        <button
          style={menuItemStyle('copy')}
          onMouseEnter={() => setHoveredItem('copy')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            onCopy(record)
            onClose()
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copiar Transcrição</span>
        </button>
      </div>

      {/* Divisor */}
      <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

      {/* Seção 2: Mover para Pasta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={sectionLabelStyle}>Mover para Pasta</div>

        <button
          style={menuItemStyle('move-null')}
          onMouseEnter={() => setHoveredItem('move-null')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            onMove(record, null)
            onClose()
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Sem Pasta (Raiz)</span>
        </button>

        {folders.map(folder => (
          <button
            key={folder.id}
            style={menuItemStyle(`folder-${folder.id}`)}
            onMouseEnter={() => setHoveredItem(`folder-${folder.id}`)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              onMove(record, folder.id)
              onClose()
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={folder.color || 'currentColor'} strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{folder.name}</span>
          </button>
        ))}
      </div>

      {/* Divisor */}
      <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

      {/* Seção 3: Excluir */}
      <button
        style={menuItemStyle('delete', true)}
        onMouseEnter={() => setHoveredItem('delete')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={() => {
          onDelete(record)
          onClose()
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        <span>Excluir Gravação</span>
      </button>
    </div>,
    document.body,
  )
}
