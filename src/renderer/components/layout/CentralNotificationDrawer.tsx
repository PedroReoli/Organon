import React from 'react'

export interface SystemNotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  type: 'warning' | 'info' | 'error' | 'success'
  category: 'reminder' | 'task' | 'git' | 'sync'
  actionView?: string
}

interface CentralNotificationDrawerProps {
  isOpen: boolean
  notifications: SystemNotificationItem[]
  onClose: () => void
  onClearAll: () => void
  onNavigateView?: (view: string) => void
}

export const CentralNotificationDrawer: React.FC<CentralNotificationDrawerProps> = ({
  isOpen,
  notifications,
  onClose,
  onClearAll,
  onNavigateView,
}) => {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 54,
        right: 16,
        width: 380,
        maxHeight: 520,
        background: 'var(--color-surface, #1e1e2d)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
        borderRadius: 14,
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            Central de Notificações
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 99,
              background: 'var(--color-primary, #6366f1)',
              color: '#ffffff',
            }}
          >
            {notifications.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
            Nenhuma notificação no momento.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => item.actionView && onNavigateView?.(item.actionView)}
              style={{
                padding: 10,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: item.actionView ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      item.type === 'error'
                        ? '#ef4444'
                        : item.type === 'warning'
                        ? '#f59e0b'
                        : item.type === 'success'
                        ? '#10b981'
                        : 'var(--color-primary, #6366f1)',
                  }}
                >
                  {item.title}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{item.timestamp}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.3 }}>{item.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
