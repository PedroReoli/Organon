import React, { useState } from 'react'
import { AppView } from '../../pages/shared/InternalNav'
import logoNameImg from '../../images/logo-name.png'
import faviconImg from '../../images/favicon.png'
import {
  FileText,
  Kanban,
  FolderGit2,
  LayoutGrid,
  Mic,
  History,
  Search,
  Bot,
  Wifi,
  Settings,
  Plus,
  ChevronDown,
} from 'lucide-react'

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
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)

  // Todos os módulos principais centralizados
  const mainNavItems: Array<{ view: AppView; label: string; icon: React.ReactNode }> = [
    { view: 'notes', label: 'NOTAS', icon: <FileText className="w-3.5 h-3.5" /> },
    { view: 'planner', label: 'PLANEJAMENTO', icon: <Kanban className="w-3.5 h-3.5" /> },
    { view: 'projects', label: 'PROJETOS', icon: <FolderGit2 className="w-3.5 h-3.5" /> },
    { view: 'system-design', label: 'CANVAS', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { view: 'transcripts', label: 'WHISPER', icon: <Mic className="w-3.5 h-3.5" /> },
    { view: 'history', label: 'HISTÓRICO', icon: <History className="w-3.5 h-3.5" /> },
  ]

  return (
    <header
      style={{
        height: '58px',
        background: 'color-mix(in srgb, var(--color-surface) 94%, var(--color-background))',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        userSelect: 'none',
        position: 'relative',
      }}
      className="w-full px-4 sm:px-6 flex items-center justify-between gap-4"
    >
      {/* ========================================================
          ZONA ESQUERDA: LOGO ORGANON (TOTAL ESQUERDA)
          ======================================================== */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onNavigateHome}
          title="Cockpit Geral / Início (Organon Home)"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          className="group relative flex items-center justify-center py-1 px-2 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {/* Ambient Glow no Hover */}
          <div
            style={{
              background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 70%)',
            }}
            className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
          />

          <img
            src={logoNameImg}
            alt="Organon"
            style={{ height: '36px', objectFit: 'contain' }}
            className="relative z-10 drop-shadow-sm transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            onError={(e) => {
              e.currentTarget.src = faviconImg
            }}
          />

          {/* Ponto indicador de Cockpit Ativo */}
          {activeView === 'today' && (
            <span
              style={{ background: 'var(--color-primary)' }}
              className="absolute -bottom-1 w-2 h-2 rounded-full shadow-[0_0_8px_var(--color-primary)] animate-pulse"
            />
          )}
        </button>
      </div>

      {/* ========================================================
          ZONA CENTRAL: LINKS DE NAVEGAÇÃO & FERRAMENTAS NO CENTRO
          ======================================================== */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-1 max-w-4xl">
        {onNavigateView && (
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {mainNavItems.map((item) => {
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
                    borderColor: isActive
                      ? 'color-mix(in srgb, var(--color-primary) 35%, transparent)'
                      : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:text-[var(--color-text)] hover:bg-white/[0.05]"
                >
                  <span
                    style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}
                    className="opacity-75 group-hover:opacity-100 transition-opacity"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      style={{ background: 'var(--color-primary)' }}
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full shadow-[0_0_6px_var(--color-primary)]"
                    />
                  )}
                </button>
              )
            })}

            {/* BOTÃO DE BUSCA (Elegante, centralizado junto aos links) */}
            <button
              type="button"
              onClick={onOpenQuickSearch}
              title="Buscar no Organon (Ctrl+K)"
              style={{
                color: 'var(--color-text-muted)',
              }}
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent text-[12px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:text-[var(--color-text)] hover:bg-white/[0.05] hover:border-[var(--color-border)]"
            >
              <Search className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" />
              <span>BUSCA</span>
              <kbd
                style={{
                  background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
                className="text-[9px] font-mono px-1 py-0.2 rounded border leading-none font-semibold ml-0.5 group-hover:text-[var(--color-text)]"
              >
                ⌘K
              </kbd>
            </button>

            {/* BOTÃO ASSISTENTE IA */}
            {onToggleChat && (
              <button
                type="button"
                onClick={onToggleChat}
                title="Assistente IA Organon"
                style={{
                  background: isChatOpen
                    ? 'var(--color-primary)'
                    : 'transparent',
                  borderColor: isChatOpen
                    ? 'var(--color-primary)'
                    : 'transparent',
                  color: isChatOpen ? '#ffffff' : 'var(--color-text-muted)',
                }}
                className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:text-[var(--color-text)] hover:bg-white/[0.05]"
              >
                <Bot className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" />
                <span>IA</span>
              </button>
            )}

            {/* BOTÃO WI-FI SYNC */}
            <button
              type="button"
              onClick={onOpenSyncModal}
              title={lastSyncAt ? `Sincronizado: ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Sincronização Wi-Fi Local'}
              style={{
                color: 'var(--color-text-muted)',
              }}
              className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent text-[12px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer hover:text-[var(--color-text)] hover:bg-white/[0.05] hover:border-[var(--color-border)]"
            >
              <Wifi className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" />
              <span>SYNC</span>
            </button>
          </nav>
        )}
      </div>

      {/* ========================================================
          ZONA DIREITA: HERO CTA (+ NOVA TAREFA) + CONFIGS (TOTAL DIREITA)
          ======================================================== */}
      <div className="flex items-center justify-end gap-2.5">
        {/* Ditado de Voz */}
        {onOpenVoice && (
          <button
            type="button"
            onClick={onOpenVoice}
            title="Ditado de Voz / Whisper (Ctrl+Shift+V)"
            style={{
              borderColor: 'var(--color-border)',
              background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
              color: 'var(--color-text-muted)',
            }}
            className="p-1.5 rounded-full border hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all cursor-pointer flex items-center justify-center"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        )}

        {/* HERO CTA ACTION PILL: + NOVA TAREFA */}
        <div className="relative">
          <div className="flex items-center shadow-sm">
            <button
              type="button"
              onClick={onNewTask}
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-primary-text, #ffffff)',
                boxShadow: '0 2px 10px color-mix(in srgb, var(--color-primary) 35%, transparent)',
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide uppercase transition-all duration-200 hover:brightness-110 hover:shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova Tarefa</span>
            </button>

            {onNewNote && (
              <button
                type="button"
                onClick={() => setShowCreateDropdown(prev => !prev)}
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 85%, black)',
                  color: 'var(--color-primary-text, #ffffff)',
                }}
                className="ml-0.5 p-1.5 rounded-full hover:brightness-125 transition-all cursor-pointer"
                title="Mais opções de criação"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dropdown de Criação Rápida */}
          {showCreateDropdown && (
            <div
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setShowCreateDropdown(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setShowCreateDropdown(false)
                  onNewTask?.()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-text)] hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Nova Tarefa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateDropdown(false)
                  onNewNote?.()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-text)] hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Nova Nota</span>
              </button>
            </div>
          )}
        </div>

        {/* Botão de Configurações */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configurações do Sistema"
            style={{ color: 'var(--color-text-muted)' }}
            className="p-1.5 rounded-lg hover:text-[var(--color-text)] hover:bg-white/[0.06] transition-all cursor-pointer flex items-center justify-center group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        )}
      </div>
    </header>
  )
}
