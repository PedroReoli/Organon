import React from 'react'
import './display.css'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Empty state padronizado: icone + titulo + descricao + acao opcional.
 *
 * Definido no upgrade 19 (componente compartilhado entre views).
 */
export const EmptyState = ({ icon, title, description, action, size = 'md', className = '' }: EmptyStateProps) => {
  const classes = ['ds-empty', `ds-empty--${size}`, className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="status">
      {icon && <div className="ds-empty-icon">{icon}</div>}
      <h3 className="ds-empty-title">{title}</h3>
      {description && <p className="ds-empty-desc">{description}</p>}
      {action && <div className="ds-empty-action">{action}</div>}
    </div>
  )
}
