import React, { forwardRef } from 'react'
import './primitives.css'

export type IconButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'
export type IconButtonSize = 'sm' | 'md' | 'lg'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** label obrigatorio para acessibilidade */
  'aria-label': string
  children: React.ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'default', size = 'md', className = '', children, ...rest },
  ref,
) {
  const classes = ['ds-icon-btn', `ds-icon-btn--${variant}`, `ds-icon-btn--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type="button" className={classes} {...rest}>
      {children}
    </button>
  )
})
