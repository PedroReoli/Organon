import React from 'react'
import './primitives.css'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  className?: string
}

export const Badge = ({ variant = 'default', size = 'sm', children, className = '' }: BadgeProps) => {
  const classes = ['ds-badge', `ds-badge--${variant}`, `ds-badge--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}
