import React from 'react'
import './primitives.css'

interface PillProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export const Pill = ({ children, color, className = '' }: PillProps) => {
  const style = color ? ({ ['--pill-color' as string]: color } as React.CSSProperties) : undefined

  return (
    <span className={`ds-pill ${className}`.trim()} style={style}>
      {children}
    </span>
  )
}
