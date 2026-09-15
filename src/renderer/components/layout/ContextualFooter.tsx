import React from 'react'

export interface FooterAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary'
}

interface ContextualFooterProps {
  metricsText: string
  actions?: FooterAction[]
}

export const ContextualFooter: React.FC<ContextualFooterProps> = ({
  metricsText,
  actions = [],
}) => {
  return (
    <footer
      style={{
        height: 50,
        background: 'var(--color-surface, #1e1e2d)',
        borderTop: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 20,
        fontSize: 12,
        color: 'var(--color-text-muted)',
        zIndex: 90,
        userSelect: 'none',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Métricas Rápidas do Módulo em Pill Arredondado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 99,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="14" height="14">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 12 }}>{metricsText}</span>
      </div>

      {/* Botões de Ação Rápida Arredondados com Ícones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            onClick={act.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: act.variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.12)',
              background: act.variant === 'primary' ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.05)',
              color: act.variant === 'primary' ? '#ffffff' : 'var(--color-text)',
              boxShadow: act.variant === 'primary' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {act.icon || (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{act.label}</span>
          </button>
        ))}
      </div>
    </footer>
  )
}
