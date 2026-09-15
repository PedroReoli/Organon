
import './primitives.css'

interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Divider = ({ orientation = 'horizontal', spacing = 'md', className = '' }: DividerProps) => {
  const classes = ['ds-divider', `ds-divider--${orientation}`, `ds-divider--space-${spacing}`, className]
    .filter(Boolean)
    .join(' ')

  return <div role="separator" aria-orientation={orientation} className={classes} />
}
