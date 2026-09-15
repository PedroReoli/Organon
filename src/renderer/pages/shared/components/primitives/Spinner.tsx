
import './primitives.css'

export type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
  /** label opcional para leitor de tela */
  label?: string
}

export const Spinner = ({ size = 'md', className = '', label = 'Carregando' }: SpinnerProps) => {
  const classes = ['ds-spinner', `ds-spinner--${size}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="status" aria-live="polite">
      <span className="ds-spinner-circle" aria-hidden="true" />
      <span className="ds-visually-hidden">{label}</span>
    </span>
  )
}
