import React from 'react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  style,
}) => {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: '16px',
            color: 'var(--color-text-muted, #6b7280)',
            opacity: 0.8,
          }}
        >
          {icon}
        </div>
      )}

      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--color-text, #ffffff)',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: '0 0 16px 0',
            maxWidth: '360px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--color-text-muted, #9ca3af)',
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  )
}
