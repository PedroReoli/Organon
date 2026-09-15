
import './display.css'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  className?: string
}

/**
 * Barra de progresso reutilizavel.
 *
 * Definido no upgrade 19. Substitui as varias progress bars custom em
 * Dashboard, Habits, Financeiro, Study, etc.
 */
export const ProgressBar = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) => {
  const safeMax = max > 0 ? max : 1
  const safeValue = Math.max(0, Math.min(value, safeMax))
  const pct = (safeValue / safeMax) * 100

  const classes = ['ds-progress', `ds-progress--${variant}`, `ds-progress--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
    >
      <div className="ds-progress-track">
        <div className="ds-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <div className="ds-progress-label">
          {label ?? `${Math.round(pct)}%`}
        </div>
      )}
    </div>
  )
}
