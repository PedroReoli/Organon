import React from 'react'
import { AppView } from '../../pages/shared/InternalNav'
import logoNameImg from '../../images/logo-name.png'
import faviconImg from '../../images/favicon.png'

interface Props {
  activeView: AppView
  hubTitle?: string
  viewTitle: string
  onNavigateHome: () => void
  onNavigateView?: (view: AppView) => void
  onOpenQuickSearch: () => void
  onOpenSettings?: () => void
  onOpenSyncModal?: () => void
  onOpenVoice?: () => void
  onToggleChat?: () => void
  onNewTask?: () => void
  onNewNote?: () => void
  isChatOpen?: boolean
  lastSyncAt?: string
  syncStatus?: string
}

export const TopNavbarShell: React.FC<Props> = ({
  activeView,
  hubTitle: _hubTitle,
  viewTitle: _viewTitle,
  onNavigateHome,
  onNavigateView,
  onOpenQuickSearch,
  onOpenSettings,
  onOpenSyncModal,
  onOpenVoice,
  onToggleChat,
  onNewTask,
  onNewNote,
  isChatOpen = false,
  lastSyncAt,
  syncStatus: _syncStatus = 'synced',
}) => {
  const navItems: Array<{ view: AppView; label: string }> = [
    { view: 'notes', label: 'Notas' },
    { view: 'planner', label: 'Planejamento' },
    { view: 'projects', label: 'Projetos' },
    { view: 'transcripts', label: 'Whisper' },
    { view: 'history', label: 'Histórico' },
  ]

  return (
    <header
      style={{
        height: '52px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100,
        userSelect: 'none',
        gap: '12px',
      }}
    >
      {/* Canto Esquerdo: Logo Name do Organon (Clicável -> Home) + Nav Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onNavigateHome}
          title="Voltar ao Dashboard Principal (Organon Home)"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '10px',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 15%, transparent)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <img
            src={logoNameImg}
            alt="Organon"
            style={{ height: '26px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.src = faviconImg
            }}
          />
        </button>

        {/* Primary Module Navigation Tabs */}
        {onNavigateView && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            {navItems.map((item) => {
              const isActive = activeView === item.view || (item.view === 'planner' && activeView === 'agenda')
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onNavigateView(item.view)}
                  style={{
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))'
                      : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontWeight: isActive ? 600 : 450,
                    fontSize: '12.5px',
                    padding: '5px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}
      </div>

      {/* Centro: Input de Busca Global Rápida (Ctrl+K) */}
      <div style={{ flex: 1, maxWidth: '320px' }}>
        <button
          onClick={onOpenQuickSearch}
          title="Buscar tarefas, notas, contatos e arquivos (Ctrl+K)"
          style={{
            width: '100%',
            height: '32px',
            padding: '0 12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Buscar no Organon...</span>
          </div>
          <kbd
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '1px 4px',
              borderRadius: '4px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Canto Direito: Ações Rápidas, Voz, Chat IA, WiFi Sync e Configurações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onNewTask && (
          <button
            type="button"
            onClick={onNewTask}
            title="Criar Nova Tarefa / Card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              padding: '5px 11px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'var(--color-primary-text, #ffffff)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nova Tarefa</span>
          </button>
        )}

        {onNewNote && (
          <button
            type="button"
            onClick={onNewNote}
            title="Criar Nova Nota"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
              background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 18%, var(--color-surface))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nota</span>
          </button>
        )}

        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            title="Ditado de Voz / Super Whisper (Ctrl+Shift+V)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 11px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span>Voz</span>
          </button>
        )}

        {onToggleChat && (
          <button
            onClick={onToggleChat}
            title="Assistente IA Organon"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '10px',
              border: 'none',
              background: isChatOpen ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))',
              color: isChatOpen ? '#ffffff' : 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>IA</span>
          </button>
        )}

        <button
          onClick={onOpenSyncModal}
          title={lastSyncAt ? `Última sincronização: ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Sincronização ativa'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            color: 'var(--color-primary)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" />
          </svg>
          <span>Wi-Fi Sync</span>
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Configurações do Sistema"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
