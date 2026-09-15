import React from 'react'

interface ChatbotHeaderProps {
  onClose?: () => void
  onClearHistory: () => void
  onOpenSettings: () => void
  isConfigured: boolean
}

export const ChatbotHeader: React.FC<ChatbotHeaderProps> = ({
  onClose,
  onClearHistory,
  onOpenSettings,
  isConfigured,
}) => {
  return (
    <div className="chatbot-header" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Assistente IA</h3>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '10px',
          background: isConfigured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isConfigured ? '#22c55e' : '#ef4444',
          fontWeight: 600,
        }}>
          {isConfigured ? 'Conectado' : 'Sem chave'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onOpenSettings}
          title="Configurações de IA"
          className="chatbot-header-btn"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
        >
          ⚙️
        </button>
        <button
          onClick={onClearHistory}
          title="Limpar histórico"
          className="chatbot-header-btn"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
        >
          🗑️
        </button>
        {onClose && (
          <button
            onClick={onClose}
            title="Fechar chat"
            className="chatbot-header-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
