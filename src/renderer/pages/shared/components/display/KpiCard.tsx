import React from 'react'
import './display.css'

export type KpiVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  variant?: KpiVariant
  hint?: React.ReactNode
  trend?: {
    direction: 'up' | 'down' | 'flat'
    value: string
  }
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Card de KPI generico (numero grande + label + variantes).
 *
 * Substitui os varios `<div className="kpi">...</div>` espalhados em
 * Dashboard, HubAgenda, Financeiro etc.
 *
 * Definido no upgrade 19 e 05.
 */
export const KpiCard = ({ label, value, variant = 'default', hint, trend, icon, onClick, className = '' }: KpiCardProps) => {
  const classes = [
    'ds-kpi',
    `ds-kpi--${variant}`,
    onClick ? 'ds-kpi--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const Component = onClick ? 'button' : 'div'

  return (
    <Component className={classes} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && <div className="ds-kpi-icon">{icon}</div>}
      <div className="ds-kpi-body">
        <div className="ds-kpi-value">{value}</div>
        <div className="ds-kpi-label">{label}</div>
        {hint && <div className="ds-kpi-hint">{hint}</div>}
        {trend && (
          <div className={`ds-kpi-trend ds-kpi-trend--${trend.direction}`}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'flat' && '—'}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Component>
  )
}
