import React, { useState } from 'react'
import {
  X,
  Sparkle,
  Kanban,
  Notebook,
  GitFork,
  ArrowSquareOut,
  ClockCounterClockwise,
  CheckCircle,
  Trash,
  GitDiff,
  Terminal,
  SpeakerHigh,
  SpeakerSlash,
} from '@phosphor-icons/react'
import { AiActivityNotification } from '../../hooks/useAiActivityFeed'

interface AiActivityDrawerProps {
  isOpen: boolean
  notifications: AiActivityNotification[]
  unreadCount: number
  isMuted?: boolean
  onToggleMute?: () => void
  onClose: () => void
  onClearAll: () => void
  onMarkAllAsRead: () => void
  onOpenItem: (item: AiActivityNotification) => void
  onRollback: (item: AiActivityNotification) => void
  onOpenDiffModal: (item: AiActivityNotification) => void
  onOpenCliRunner?: () => void
}

export const AiActivityDrawer: React.FC<AiActivityDrawerProps> = ({
  isOpen,
  notifications,
  unreadCount,
  isMuted = false,
  onToggleMute,
  onClose,
  onClearAll,
  onMarkAllAsRead,
  onOpenItem,
  onRollback,
  onOpenDiffModal,
  onOpenCliRunner,
}) => {
  const [filter, setFilter] = useState<'all' | 'ai' | 'task' | 'note'>('all')

  if (!isOpen) return null

  const filtered = notifications.filter((n) => {
    if (filter === 'ai') return n.agent === 'Antigravity' || n.agent === 'Claude' || n.agent === 'Gemini'
    if (filter === 'task') return n.category === 'task'
    if (filter === 'note') return n.category === 'note'
    return true
  })

  const getAgentBadgeStyle = (agent: string) => {
    switch (agent) {
      case 'Antigravity':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' }
      case 'Claude':
        return { bg: 'rgba(217, 119, 6, 0.15)', text: '#fbbf24', border: 'rgba(217, 119, 6, 0.3)' }
      case 'Gemini':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task':
        return <Kanban size={13} weight="duotone" className="text-blue-400" />
      case 'note':
        return <Notebook size={13} weight="duotone" className="text-amber-400" />
      case 'project':
        return <GitFork size={13} weight="duotone" className="text-purple-400" />
      default:
        return <Sparkle size={13} weight="duotone" className="text-emerald-400" />
    }
  }

  const formatRelativeTime = (iso: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
      if (diffSec < 60) return `${Math.max(1, diffSec)}s atrás`
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m atrás`
      const diffHours = Math.floor(diffMin / 60)
      if (diffHours < 24) return `${diffHours}h atrás`
      return new Date(iso).toLocaleDateString()
    } catch {
      return 'recente'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        right: 16,
        width: 540,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 76px)',
        backgroundColor: 'var(--color-surface, #181825)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
        borderRadius: 14,
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              padding: 5,
              borderRadius: 6,
              background: 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)',
              color: 'var(--color-primary, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkle size={15} weight="duotone" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text, #fff)' }}>
              Central de Atividades & IA
            </h3>
            <span style={{ fontSize: 10.5, color: 'var(--color-text-muted, #a1a1aa)' }}>
              Sincronização em tempo real ativa
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Ativar sons de notificação' : 'Mutar sons de notificação'}
              style={{
                background: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                border: '1px solid',
                borderColor: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                color: isMuted ? '#f87171' : 'var(--color-text-muted, #a1a1aa)',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
              }}
              className="hover:text-white"
            >
              {isMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
              <span>{isMuted ? 'Mudo' : 'Som'}</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              title="Marcar todas como lidas"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted, #a1a1aa)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
              }}
              className="hover:text-white"
            >
              <CheckCircle size={15} weight="duotone" />
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              title="Limpar histórico"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted, #a1a1aa)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
              }}
              className="hover:text-red-400"
            >
              <Trash size={15} weight="duotone" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #a1a1aa)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
            }}
            className="hover:text-white"
          >
            <X size={15} weight="bold" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Quick Action */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['all', 'ai', 'task', 'note'] as const).map((tab) => {
            const labels = { all: 'Todas', ai: 'IAs', task: 'Tarefas', note: 'Notas' }
            const active = filter === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 5,
                  border: '1px solid',
                  borderColor: active
                    ? 'var(--color-primary, #6366f1)'
                    : 'transparent',
                  background: active
                    ? 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--color-primary, #818cf8)' : 'var(--color-text-muted, #a1a1aa)',
                  cursor: 'pointer',
                }}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>

        {onOpenCliRunner && (
          <button
            type="button"
            onClick={onOpenCliRunner}
            title="Abrir Terminal CLI Integrado (Ctrl+')"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10.5,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 5,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--color-text, #fff)',
              cursor: 'pointer',
            }}
            className="hover:bg-white/10"
          >
            <Terminal size={12} weight="bold" />
            <span>CLI Runner</span>
          </button>
        )}
      </div>

      {/* Notifications List (Compact Grid) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
        className="custom-scrollbar"
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-text-muted, #71717a)',
            }}
          >
            <Sparkle size={26} weight="duotone" className="text-zinc-600" />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>
              Nenhuma atividade registrada no momento.
            </p>
            <span style={{ fontSize: 10.5 }}>
              Alterações feitas por IAs ou comandos CLI aparecerão aqui em tempo real.
            </span>
          </div>
        ) : (
          filtered.map((item) => {
            const badge = getAgentBadgeStyle(item.agent)
            return (
              <div
                key={item.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: item.read
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'color-mix(in srgb, var(--color-primary, #6366f1) 8%, rgba(255,255,255,0.03))',
                  border: '1px solid',
                  borderColor: item.read
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'color-mix(in srgb, var(--color-primary, #6366f1) 30%, rgba(255,255,255,0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  transition: 'all 0.12s ease',
                }}
              >
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {item.agent}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {getCategoryIcon(item.category)}
                      <span style={{ fontSize: 10.5, color: 'var(--color-text-muted, #a1a1aa)', fontWeight: 500 }}>
                        {item.category === 'task' ? 'Planejamento' : item.category === 'note' ? 'Notas' : 'Geral'}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted, #71717a)', marginLeft: 'auto' }}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-text, #fff)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted, #a1a1aa)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </p>
                </div>

                {/* Actions Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {item.previousSnapshot && (
                    <button
                      type="button"
                      onClick={() => onOpenDiffModal(item)}
                      title="Ver o que mudou"
                      style={{
                        padding: '4px 6px',
                        borderRadius: 5,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--color-text-muted, #e4e4e7)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      className="hover:bg-white/10"
                    >
                      <GitDiff size={12} weight="bold" />
                      <span>Diff</span>
                    </button>
                  )}

                  {item.previousSnapshot && (
                    <button
                      type="button"
                      onClick={() => onRollback(item)}
                      title="Desfazer alteração da IA"
                      style={{
                        padding: '4px 6px',
                        borderRadius: 5,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      className="hover:bg-red-500/20"
                    >
                      <ClockCounterClockwise size={12} weight="bold" />
                      <span>Desfazer</span>
                    </button>
                  )}

                  {(item.targetType || item.category === 'task' || item.category === 'note') && (
                    <button
                      type="button"
                      onClick={() => onOpenItem(item)}
                      title="Abrir item no app"
                      style={{
                        padding: '4px 8px',
                        borderRadius: 5,
                        background: 'var(--color-primary, #6366f1)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      className="hover:brightness-110"
                    >
                      <span>Abrir</span>
                      <ArrowSquareOut size={11} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
