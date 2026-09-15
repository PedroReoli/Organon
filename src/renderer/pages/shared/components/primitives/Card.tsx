import React, { forwardRef } from 'react'
import './primitives.css'

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', interactive = false, className = '', children, ...rest },
  ref,
) {
  const classes = [
    'ds-card',
    `ds-card--${variant}`,
    `ds-card--pad-${padding}`,
    interactive ? 'ds-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  )
})
