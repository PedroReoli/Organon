import React from 'react'
import './layout.css'

type SpaceToken = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16'

interface ClusterProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: SpaceToken
  align?: 'start' | 'center' | 'end' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  as?: keyof JSX.IntrinsicElements
}

/**
 * Layout primitive: flex row com wrap (cluster).
 *
 * Uso: <Cluster gap="2">...</Cluster>
 */
export const Cluster = ({
  gap = '2',
  align = 'center',
  justify = 'start',
  wrap = true,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}: ClusterProps) => {
  const inlineStyle: React.CSSProperties = {
    gap: `var(--space-${gap})`,
    alignItems: alignMap[align],
    justifyContent: justifyMap[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...style,
  }

  const Component = Tag as React.ElementType
  return (
    <Component className={`ds-cluster ${className}`.trim()} style={inlineStyle} {...rest}>
      {children}
    </Component>
  )
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
} as const

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const
