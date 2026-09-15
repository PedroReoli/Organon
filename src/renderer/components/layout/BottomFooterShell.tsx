import React, { useState } from 'react'
import { AppView } from '../../pages/shared/InternalNav'

interface Props {
  activeView: AppView
  hubTitle?: string
  hubViews?: Array<{ view: AppView; label: string }>
  onNavigateView: (view: AppView) => void
  onAddCard: () => void
  onOpenVoice: () => void
  onToggleChat: () => void
  isChatOpen: boolean
  cardsCount?: number
  notesCount?: number
}

export const BottomFooterShell: React.FC<Props> = ({
  activeView,
  hubTitle,
  hubViews = [],
  onNavigateView,
  onAddCard,
  onOpenVoice,
  onToggleChat,
  isChatOpen,
  cardsCount = 0,
  notesCount = 0,
}) => {
  const [footerLevel, setFooterLevel] = useState<'hub' | 'dedicated'>('hub')

  const isHomeView = activeView === 'today'

  return (
    <>
      <style>{`
        @keyframes footerSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <footer
        style={{
          height: '48px',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 100,
          fontSize: '12.5px',
          userSelect: 'none',
        }}
      >
        {/* Esquerda / Centro: Conteúdo Condicional com Animação de Transição */}
        <div
          key={`${activeView}-${footerLevel}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
            overflowX: 'auto',
            animation: 'footerSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isHomeView ? (
            // MODO 1: Dashboard Inicial
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--color-text-muted)', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span><strong>{cardsCount}</strong> cards ativos</span>
              </div>
              <span>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span><strong>{notesCount}</strong> notas salvas</span>
              </div>
              <span>·</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>Backup OK</span>
            </div>
          ) : footerLevel === 'hub' ? (
            // MODO 2 - NÍVEL 1: Sub-Telas do Mesmo Hub (Pills de Navegação com Ícones SVG)
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hubViews.map(item => {
                const isActive = activeView === item.view
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigateView(item.view)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                      background: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'var(--color-background)',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {item.view === 'planner' || item.view === 'calendar' || item.view === 'agenda' ? (
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                      ) : item.view === 'notes' ? (
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      ) : item.view === 'transcripts' ? (
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      ) : item.view === 'system-design' ? (
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      ) : (
                        <circle cx="12" cy="12" r="8" />
                      )}
                    </svg>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            // MODO 2 - NÍVEL 2: Rodapé Dedicado da Tela Atual
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text)', fontSize: '12.5px' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Ferramentas Dedicadas — {activeView.toUpperCase()}
              </span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                {activeView === 'transcripts'
                  ? 'Assistente Whisper • Gravação de Áudio Dual-Channel • Análise ao Vivo'
                  : activeView === 'system-design'
                  ? 'Canvas de Arquitetura Offline • Leitor de SPOFs por IA • Exportação Mermaid'
                  : activeView === 'planner' || activeView === 'calendar'
                  ? 'Kanban de Tarefas • Gestão de Eventos & Metas Diárias'
                  : activeView === 'notes'
                  ? 'Editor Markdown • Organização de Pastas • Sincronização Local'
                  : `Painel especializado da aba ${activeView}`}
              </span>
            </div>
          )}
        </div>

      {/* Direita: Ações Globais & Botões Fixos de Voz/Chat IA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Botão de Alternância de Nível (Apenas no Modo 2) */}
        {!isHomeView && (
          <button
            onClick={() => setFooterLevel(prev => (prev === 'hub' ? 'dedicated' : 'hub'))}
            title={footerLevel === 'hub' ? 'Ver ferramentas dedicadas desta tela' : 'Voltar para os atalhos do Hub'}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>{footerLevel === 'hub' ? 'Ferramentas da Tela' : 'Navegar pelo Hub'}</span>
          </button>
        )}

        {isHomeView && (
          <button
            onClick={onAddCard}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Novo Card</span>
          </button>
        )}

        {/* BOTÃO FIXO: DITADO DE VOZ */}
        <button
          onClick={onOpenVoice}
          title="Ativar Ditado de Voz / Super Whisper (Ctrl+Shift+V)"
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span>Voz</span>
        </button>

        {/* BOTÃO FIXO: CHAT IA */}
        <button
          onClick={onToggleChat}
          title="Alternar Chat Assistente IA Organon"
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            border: 'none',
            background: isChatOpen ? 'var(--color-primary)' : 'var(--color-background)',
            color: isChatOpen ? '#ffffff' : 'var(--color-text)',
            boxShadow: isChatOpen ? 'none' : 'inset 0 0 0 1px var(--color-border)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat IA</span>
        </button>
      </div>
    </footer>
    </>
  )
}
