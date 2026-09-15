import React, { useState } from 'react'
import { Popover } from '../../shared/components/primitives/Popover'
import { SpeakerSegment } from '../types/whisper.types'

interface Props {
  segments: SpeakerSegment[]
  selectedSegmentId?: string | null
  selectedSegmentIds?: string[]
  onSelectSegment?: (segment: SpeakerSegment, e: React.MouseEvent) => void
  onTextMouseUp?: (selectedText: string) => void
  onCopySegment?: (segment: SpeakerSegment) => void
  onPinHighlight?: (text: string) => void
  onAddToNote?: (text: string) => void
  onMarkAction?: (text: string) => void
  onMarkDecision?: (text: string) => void
  onSearchProject?: (query: string) => void
  onSearchWeb?: (query: string) => void
}

type SegmentActionId =
  | 'copy'
  | 'pinHighlight'
  | 'addToNote'
  | 'markAction'
  | 'markDecision'
  | 'searchProject'
  | 'searchWeb'

const ACTIONS: Array<{ id: SegmentActionId; label: string; tone?: 'default' | 'accent' | 'danger' }> = [
  { id: 'copy', label: 'Copiar trecho' },
  { id: 'pinHighlight', label: 'Destacar', tone: 'accent' },
  { id: 'addToNote', label: 'Adicionar à nota', tone: 'accent' },
  { id: 'markAction', label: 'Criar tarefa' },
  { id: 'markDecision', label: 'Marcar decisão' },
  { id: 'searchProject', label: 'Pesquisar no projeto' },
  { id: 'searchWeb', label: 'Pesquisar na web', tone: 'danger' },
]

export const SpeakerTimeline: React.FC<Props> = ({
  segments,
  selectedSegmentId = null,
  selectedSegmentIds = [],
  onSelectSegment,
  onTextMouseUp,
  onCopySegment,
  onPinHighlight,
  onAddToNote,
  onMarkAction,
  onMarkDecision,
  onSearchProject,
  onSearchWeb,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  const handleMouseUp = () => {
    const selection = window.getSelection()
    const selectedText = selection ? selection.toString().trim() : ''
    if (selectedText && selectedText.length > 2 && onTextMouseUp) {
      onTextMouseUp(selectedText)
    }
  }

  const handleAction = (actionId: SegmentActionId, segment: SpeakerSegment) => {
    const text = segment.text.trim()

    if (actionId === 'copy') {
      if (onCopySegment) {
        onCopySegment(segment)
      } else {
        handleCopy(segment.id, text)
      }
      return
    }

    if (actionId === 'pinHighlight') {
      onPinHighlight?.(text)
      return
    }

    if (actionId === 'addToNote') {
      onAddToNote?.(text)
      return
    }

    if (actionId === 'markAction') {
      onMarkAction?.(text)
      return
    }

    if (actionId === 'markDecision') {
      onMarkDecision?.(text)
      return
    }

    if (actionId === 'searchProject') {
      onSearchProject?.(text)
      return
    }

    if (actionId === 'searchWeb') {
      onSearchWeb?.(text)
    }
  }

  const renderActionIcon = (actionId: SegmentActionId) => {
    if (actionId === 'copy') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )
    }

    if (actionId === 'pinHighlight') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 3l7 7-4 1-3 3-2 6-2-2 2-6 3-3 1-4z" />
          <path d="M5 19l5-5" />
        </svg>
      )
    }

    if (actionId === 'addToNote') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )
    }

    if (actionId === 'markAction') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )
    }

    if (actionId === 'markDecision') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20" />
          <path d="M5 7h14" />
          <path d="M7 17h10" />
        </svg>
      )
    }

    if (actionId === 'searchProject') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    }

    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 0 18" />
      </svg>
    )
  }

  if (segments.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '12.5px',
          padding: '24px 16px',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
        <span>Inicie a gravação para visualizar a transcrição em tempo real</span>
      </div>
    )
  }

  return (
    <div
      onMouseUp={handleMouseUp}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    >
      {segments.map(seg => {
        const isUser = seg.speaker === 'user' || seg.speaker === 'candidate'
        const sourceKind = seg.sourceKind ?? (isUser ? 'microphone' : 'mixed')
        const isMultiSelected = selectedSegmentIds.includes(seg.id)
        const isSelected = selectedSegmentId === seg.id || isMultiSelected
        const isCopied = copiedId === seg.id
        const isHovered = hoveredId === seg.id
        const isActionsVisible = isHovered || openMenuId === seg.id || isSelected

        const sourceTheme = sourceKind === 'system'
          ? {
              border: '#22c55e',
              chipBg: 'rgba(34,197,94,0.14)',
              chipText: '#15803d',
              bubbleBg: 'rgba(34,197,94,0.04)',
              bubbleBorder: 'rgba(34,197,94,0.18)',
              avatarBg: '#dcfce7',
              avatarText: '#166534',
              label: 'Sistema',
              initial: 'S',
            }
          : sourceKind === 'mixed'
            ? {
                border: '#8b5cf6',
                chipBg: 'rgba(139,92,246,0.14)',
                chipText: '#6d28d9',
                bubbleBg: 'rgba(139,92,246,0.04)',
                bubbleBorder: 'rgba(139,92,246,0.18)',
                avatarBg: '#ede9fe',
                avatarText: '#6d28d9',
                label: 'Misto',
                initial: 'M',
              }
            : {
                border: 'var(--color-primary)',
                chipBg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                chipText: 'var(--color-primary)',
                bubbleBg: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))',
                bubbleBorder: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-border))',
                avatarBg: 'color-mix(in srgb, var(--color-primary) 16%, white)',
                avatarText: 'var(--color-primary)',
                label: 'Mic',
                initial: 'M',
              }

        return (
          <div
            key={seg.id}
            onMouseEnter={() => setHoveredId(seg.id)}
            onMouseLeave={() => {
              setHoveredId(prev => (prev === seg.id ? null : prev))
            }}
            onClick={e => onSelectSegment?.(seg, e)}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '7px 10px 7px 12px',
              borderRadius: '8px',
              borderStyle: 'solid',
              borderWidth: '1px 1px 1px 3.5px',
              borderColor: isMultiSelected
                ? 'var(--color-primary)'
                : isSelected
                  ? sourceTheme.border
                  : (isHovered ? 'color-mix(in srgb, var(--color-primary) 28%, var(--color-border))' : 'var(--color-border)'),
              background: isMultiSelected
                ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                : isSelected
                  ? 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))'
                  : isHovered
                    ? 'color-mix(in srgb, var(--color-primary) 3%, var(--color-surface))'
                    : 'var(--color-surface)',
              color: 'var(--color-text)',
              boxShadow: isMultiSelected || isSelected
                ? '0 4px 12px rgba(0,0,0,0.08)'
                : isHovered
                  ? '0 2px 6px rgba(0,0,0,0.04)'
                  : 'none',
              cursor: onSelectSegment ? 'pointer' : 'default',
              transition: 'all 0.12s ease',
              boxSizing: 'border-box',
            }}
          >
            {/* Header da Fala Ultra-Compacto */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {/* Checkbox de Multi-Seleção estilo Explorer */}
                <span
                  aria-hidden="true"
                  onClick={e => {
                    e.stopPropagation()
                    onSelectSegment?.(seg, { ctrlKey: true } as any)
                  }}
                  title="Clique para selecionar este trecho (Ctrl + Clique para múltiplos)"
                  style={{
                    width: '13px',
                    height: '13px',
                    borderRadius: '3px',
                    border: isMultiSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isMultiSelected ? 'var(--color-primary)' : 'transparent',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.12s ease',
                    opacity: isMultiSelected || isHovered ? 1 : 0.4,
                  }}
                >
                  {isMultiSelected && '✓'}
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8.5px',
                    fontWeight: 800,
                    background: sourceTheme.avatarBg,
                    color: sourceTheme.avatarText,
                    border: `1px solid ${sourceTheme.border}`,
                    flexShrink: 0,
                  }}
                >
                  {sourceTheme.initial}
                </span>

                <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {seg.speakerName}
                </span>

                {seg.sourceKind && (
                  <span
                    style={{
                      fontSize: '8.5px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: sourceTheme.chipBg,
                      color: sourceTheme.chipText,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      lineHeight: '1',
                    }}
                  >
                    {sourceTheme.label}
                  </span>
                )}

                <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {seg.timestamp}
                </span>
              </div>

              {/* Botão de Ações em Hover */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isActionsVisible ? 1 : 0,
                  pointerEvents: isActionsVisible ? 'auto' : 'none',
                  transition: 'opacity 0.12s ease',
                }}
              >
                {isCopied && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'rgba(34,197,94,0.14)',
                      color: '#16a34a',
                    }}
                  >
                    Copiado
                  </span>
                )}

                <Popover.Root
                  open={openMenuId === seg.id}
                  onOpenChange={open => setOpenMenuId(open ? seg.id : null)}
                >
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                      }}
                      title="Mais ações"
                      aria-label="Mais ações"
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '5px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-background)',
                        color: 'var(--color-text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </Popover.Trigger>

                  <Popover.Portal>
                    <Popover.Content
                      side="top"
                      align="end"
                      sideOffset={6}
                      collisionPadding={10}
                      onOpenAutoFocus={e => e.preventDefault()}
                      onCloseAutoFocus={e => e.preventDefault()}
                      style={{
                        width: '230px',
                        padding: '6px',
                        borderRadius: '10px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
                        backdropFilter: 'blur(16px)',
                        zIndex: 999,
                      }}
                    >
                      <div
                        style={{
                          padding: '3px 6px 6px',
                          borderBottom: '1px solid var(--color-border)',
                          marginBottom: '4px',
                        }}
                      >
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Ações do trecho
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {seg.speakerName} · {seg.timestamp}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {ACTIONS.map(action => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              handleAction(action.id, seg)
                              setOpenMenuId(null)
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'transparent',
                              color: action.tone === 'danger' ? '#ef4444' : 'var(--color-text)',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 0.12s ease',
                            }}
                          >
                            {renderActionIcon(action.id)}
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </div>

            {/* Texto da Fala */}
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.45,
                color: 'var(--color-text)',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                cursor: 'text',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {seg.text}
            </div>
          </div>
        )
      })}
    </div>
  )
}
