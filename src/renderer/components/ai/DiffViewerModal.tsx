import React from 'react'
import { X, ArrowRight, ClockCounterClockwise } from '@phosphor-icons/react'
import { AiActivityNotification } from '../../hooks/useAiActivityFeed'

interface DiffViewerModalProps {
  item: AiActivityNotification | null
  onClose: () => void
  onRollback?: (item: AiActivityNotification) => void
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  item,
  onClose,
  onRollback,
}) => {
  if (!item) return null

  const prevText = item.previousSnapshot
    ? JSON.stringify(item.previousSnapshot, null, 2)
    : '(Nenhum snapshot anterior registrado)'
  const currText = item.currentSnapshot
    ? JSON.stringify(item.currentSnapshot, null, 2)
    : '(Item removido ou estado atual não disponível)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '85vh',
          backgroundColor: 'var(--color-surface, #1e1e2d)',
          borderRadius: 16,
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)',
                  color: 'var(--color-primary, #818cf8)',
                }}
              >
                {item.agent}
              </span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text, #fff)' }}>
                {item.title}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted, #a1a1aa)' }}>
              {item.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #a1a1aa)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
            className="hover:text-white hover:bg-white/10"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Diff Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>🔴 Versão Anterior</span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: 11.5,
                  fontFamily: 'monospace',
                  color: '#fca5a5',
                  maxHeight: 340,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {prevText}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>🟢 Modificação da IA (Atual)</span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: 11.5,
                  fontFamily: 'monospace',
                  color: '#6ee7b7',
                  maxHeight: 340,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {currText}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-muted, #71717a)' }}>
            Data da ação: {new Date(item.timestamp).toLocaleString()}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {item.previousSnapshot && onRollback && (
              <button
                type="button"
                onClick={() => {
                  onRollback(item)
                  onClose()
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                className="hover:bg-red-500/25 transition-all"
              >
                <ClockCounterClockwise size={14} weight="bold" />
                <span>Desfazer esta alteração</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--color-primary, #6366f1)',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              className="hover:brightness-110 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
