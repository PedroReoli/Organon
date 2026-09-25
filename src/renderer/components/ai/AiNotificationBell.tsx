import React from 'react'
import { Bell } from '@phosphor-icons/react'

interface AiNotificationBellProps {
  unreadCount: number
  isOpen: boolean
  onClick: () => void
}

export const AiNotificationBell: React.FC<AiNotificationBellProps> = ({
  unreadCount,
  isOpen,
  onClick,
}) => {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        title={unreadCount > 0 ? `${unreadCount} nova(s) atividade(s) de IA / CLI` : 'Central de Atividades & IA'}
        style={{
          borderColor: isOpen ? 'var(--color-primary, #6366f1)' : 'var(--color-border)',
          background: isOpen
            ? 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, var(--color-surface))'
            : 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
          color: unreadCount > 0 || isOpen ? 'var(--color-primary, #818cf8)' : 'var(--color-text-muted)',
        }}
        className="relative p-1.5 rounded-lg border hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all cursor-pointer flex items-center justify-center"
      >
        <Bell size={16} weight={unreadCount > 0 ? 'fill' : 'duotone'} />

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 99,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: 9.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
