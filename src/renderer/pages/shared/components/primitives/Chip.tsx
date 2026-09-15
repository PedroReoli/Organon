import React from 'react'
import './primitives.css'

interface ChipProps {
  children: React.ReactNode
  onRemove?: () => void
  color?: string
  className?: string
}

export const Chip = ({ children, onRemove, color, className = '' }: ChipProps) => {
  const style = color ? ({ ['--chip-color' as string]: color } as React.CSSProperties) : undefined

  return (
    <span className={`ds-chip ${className}`.trim()} style={style}>
      <span className="ds-chip-label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="ds-chip-remove"
          onClick={onRemove}
          aria-label="Remover"
        >
          ×
        </button>
      )}
    </span>
  )
}
