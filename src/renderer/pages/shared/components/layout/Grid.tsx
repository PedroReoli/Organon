import React from 'react'
import './layout.css'

type SpaceToken = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16'

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** numero de colunas ou template-columns custom */
  columns?: number | string
  gap?: SpaceToken
  /** min width de cada coluna em auto-fit (cria grid responsivo) */
  minColumnWidth?: string
  as?: keyof JSX.IntrinsicElements
}

/**
 * Layout primitive: CSS Grid com colunas configuraveis.
 *
 * Uso: <Grid columns={3} gap="4">...</Grid>
 *      <Grid minColumnWidth="240px" gap="3">...</Grid>
 */
export const Grid = ({
  columns,
  gap = '4',
  minColumnWidth,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}: GridProps) => {
  let templateColumns: string

  if (minColumnWidth) {
    templateColumns = `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`
  } else if (typeof columns === 'number') {
    templateColumns = `repeat(${columns}, minmax(0, 1fr))`
  } else if (columns) {
    templateColumns = columns
  } else {
    templateColumns = 'repeat(2, minmax(0, 1fr))'
  }

  const inlineStyle: React.CSSProperties = {
    gridTemplateColumns: templateColumns,
    gap: `var(--space-${gap})`,
    ...style,
  }

  const Component = Tag as React.ElementType
  return (
    <Component className={`ds-grid ${className}`.trim()} style={inlineStyle} {...rest}>
      {children}
    </Component>
  )
}
