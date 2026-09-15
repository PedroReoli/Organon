import React, { forwardRef } from 'react'
import './primitives.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    className = '',
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    fullWidth ? 'ds-btn--full' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="ds-btn-spinner" aria-hidden="true" />}
      {!loading && iconLeft && <span className="ds-btn-icon">{iconLeft}</span>}
      <span className="ds-btn-label">{children}</span>
      {!loading && iconRight && <span className="ds-btn-icon">{iconRight}</span>}
    </button>
  )
})
