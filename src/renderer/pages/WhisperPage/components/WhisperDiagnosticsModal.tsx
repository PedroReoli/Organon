import React from 'react'
import { X } from 'lucide-react'
import { WhisperPathDiagnostic } from '../hooks/useWhisperDiagnostics'

interface WhisperDiagnosticsModalProps {
  isOpen: boolean
  onClose: () => void
  whisperPathDiagnostics: WhisperPathDiagnostic[]
  readyDiagnosticsCount: number
}

export const WhisperDiagnosticsModal: React.FC<WhisperDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  whisperPathDiagnostics,
  readyDiagnosticsCount,
}) => {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text)' }}>
              Status dos Motores Whisper
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {readyDiagnosticsCount}/4 caminhos de transcrição operacionais
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {whisperPathDiagnostics.map(item => (
            <div
              key={item.kind}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: item.state === 'ready'
                  ? 'rgba(34,197,94,0.3)'
                  : item.state === 'optional'
                    ? 'var(--color-border)'
                    : 'rgba(245,158,11,0.3)',
                background: item.state === 'ready'
                  ? 'rgba(34,197,94,0.06)'
                  : item.state === 'optional'
                    ? 'var(--color-background)'
                    : 'rgba(245,158,11,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{item.label}</strong>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    color: item.state === 'ready'
                      ? '#15803d'
                      : item.state === 'optional'
                        ? 'var(--color-text-muted)'
                        : '#b45309',
                    background: item.state === 'ready'
                      ? 'rgba(34,197,94,0.16)'
                      : item.state === 'optional'
                        ? 'rgba(148,163,184,0.14)'
                        : 'rgba(245,158,11,0.16)',
                  }}
                >
                  {item.state === 'ready' ? 'Pronto' : item.state === 'optional' ? 'Opcional' : 'Faltando'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Concluído
        </button>
      </div>
    </div>
  )
}
