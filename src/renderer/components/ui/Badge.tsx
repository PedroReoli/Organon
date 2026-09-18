import React from 'react'
import { X } from 'lucide-react'

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: React.ReactNode
  onRemove?: () => void
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--color-surface, rgba(255, 255, 255, 0.08))',
    color: 'var(--color-text-secondary, #d1d5db)',
    border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
  },
  primary: {
    background: 'var(--color-primary-subtle, rgba(99, 102, 241, 0.15))',
    color: 'var(--color-primary, #818cf8)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  success: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  danger: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  info: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-text-muted, #9ca3af)',
    border: '1px dashed var(--color-border, rgba(255, 255, 255, 0.2))',
  },
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  onRemove,
  className = '',
  style,
}) => {
  const isSm = size === 'sm'

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        padding: isSm ? '2px 6px' : '3px 10px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 500,
        lineHeight: 1.3,
        borderRadius: isSm ? '4px' : '6px',
        userSelect: 'none',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            marginLeft: '2px',
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            opacity: 0.7,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
          aria-label="Remover"
        >
          <X size={isSm ? 10 : 12} />
        </button>
      )}
    </span>
  )
}
