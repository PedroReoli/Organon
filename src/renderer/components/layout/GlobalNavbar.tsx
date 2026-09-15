import React, { useState, useEffect } from 'react'
import { GlobalSearchDropdown } from './GlobalSearchDropdown'

interface GlobalNavbarProps {
  hubTitle: string
  viewTitle?: string
  dynamicSlot?: React.ReactNode
  notificationCount: number
  onToggleNotifications: () => void
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error'
  onOpenSyncModal?: () => void
  onNavigateView?: (view: string) => void
}

export const GlobalNavbar: React.FC<GlobalNavbarProps> = ({
  hubTitle,
  viewTitle,
  dynamicSlot,
  notificationCount,
  onToggleNotifications,
  syncStatus = 'idle',
  onOpenSyncModal,
  onNavigateView,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Atalho global Ctrl+K para abrir/fechar o dropdown de busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header
      style={{
        height: 52,
        background: 'var(--color-surface, #1e1e2d)',
        borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 20,
        zIndex: 100,
        userSelect: 'none',
        backdropFilter: 'blur(20px)',
        position: 'relative',
      }}
    >
      {/* Zona Esquerda: Logo & Breadcrumb Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 99,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-primary, #6366f1)', letterSpacing: -0.5 }}>
            ORGANON
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{hubTitle}</span>
          {viewTitle && viewTitle !== hubTitle && (
            <>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>/</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{viewTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* Zona Central: Slot Dinâmico ou Busca Global Pill com Dropdown */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', paddingHorizontal: 16, position: 'relative' }}>
        {dynamicSlot || (
          <>
            <button
              type="button"
              onClick={() => setIsSearchOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: 360,
                height: 34,
                padding: '0 14px',
                borderRadius: 99,
                border: isSearchOpen ? '1px solid var(--color-primary, #6366f1)' : '1px solid rgba(255,255,255,0.12)',
                background: isSearchOpen ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-muted)',
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: isSearchOpen ? '0 0 12px rgba(99,102,241,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Buscar tarefas, repositórios, notas...</span>
              </div>
              <kbd style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 6, color: 'var(--color-text)' }}>
                Ctrl+K
              </kbd>
            </button>

            {/* Dropdown Popover de Busca */}
            <GlobalSearchDropdown
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onNavigateView={onNavigateView}
            />
          </>
        )}
      </div>

      {/* Zona Direita: Wi-Fi Sync & Notificações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Botão de Sync QR Wi-Fi Pill */}
        <button
          type="button"
          onClick={onOpenSyncModal}
          title="Sincronização Local Wi-Fi"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 99,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--color-text)',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Wi-Fi Sync</span>
        </button>

        {/* Sino de Notificações */}
        <button
          type="button"
          onClick={onToggleNotifications}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 16,
                height: 16,
                borderRadius: 99,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 2,
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
