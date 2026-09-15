import React from 'react'
import './primitives.css'

export type SkeletonShape = 'text' | 'rect' | 'circle'

interface SkeletonProps {
  shape?: SkeletonShape
  width?: number | string
  height?: number | string
  className?: string
}

export const Skeleton = ({ shape = 'text', width, height, className = '' }: SkeletonProps) => {
  const classes = ['ds-skeleton', `ds-skeleton--${shape}`, className].filter(Boolean).join(' ')
  const style: React.CSSProperties = {}
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height

  return <span className={classes} style={style} aria-hidden="true" />
}
