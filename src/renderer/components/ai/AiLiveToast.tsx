import React, { useEffect, useState } from 'react'
import { Sparkle, ArrowSquareOut, X } from '@phosphor-icons/react'
import { AiActivityNotification } from '../../hooks/useAiActivityFeed'

interface AiLiveToastProps {
  onOpenActivityFeed: () => void
  onOpenItem: (item: AiActivityNotification) => void
}

export const AiLiveToast: React.FC<AiLiveToastProps> = ({
  onOpenActivityFeed,
  onOpenItem,
}) => {
  const [latestItem, setLatestItem] = useState<AiActivityNotification | null>(null)

  useEffect(() => {
    const handleExternalChanges = (event: Event) => {
      const customEvent = event as CustomEvent<{ changes: any[]; timestamp: string }>
      const changes = customEvent.detail?.changes || []
      if (changes.length > 0) {
        const item = changes[0] as AiActivityNotification
        setLatestItem(item)

        const timer = setTimeout(() => {
          setLatestItem(null)
        }, 6000)

        return () => clearTimeout(timer)
      }
    }

    window.addEventListener('organon:external-changes', handleExternalChanges)
    return () => {
      window.removeEventListener('organon:external-changes', handleExternalChanges)
    }
  }, [])

  if (!latestItem) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 12,
        backgroundColor: 'var(--color-surface, #1e1e2d)',
        border: '1px solid color-mix(in srgb, var(--color-primary, #6366f1) 40%, rgba(255,255,255,0.15))',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: 380,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: 'color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)',
          color: 'var(--color-primary, #818cf8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkle size={18} weight="duotone" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary, #818cf8)' }}>
            {latestItem.agent}
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted, #71717a)' }}>• Tempo real</span>
        </div>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {latestItem.title}
        </h4>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => {
            onOpenActivityFeed()
            setLatestItem(null)
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'var(--color-text-muted, #a1a1aa)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          className="hover:text-white hover:border-white/30"
        >
          Feed
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenItem(latestItem)
            setLatestItem(null)
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            backgroundColor: 'var(--color-primary, #6366f1)',
            border: 'none',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="hover:brightness-110"
        >
          <span>Ver</span>
          <ArrowSquareOut size={11} weight="bold" />
        </button>

        <button
          type="button"
          onClick={() => setLatestItem(null)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted, #71717a)',
            cursor: 'pointer',
            padding: 2,
          }}
          className="hover:text-white"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
