import React from 'react'
import './layout.css'

type SpaceToken = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16'

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** gap entre items, mapeia para --space-{gap} */
  gap?: SpaceToken
  /** alinhamento cross-axis */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** justificacao main-axis */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /** ocupar altura disponivel */
  fullHeight?: boolean
  as?: keyof JSX.IntrinsicElements
}

/**
 * Layout primitive: flex column com gap configurado por token.
 *
 * Uso: <Stack gap="4">...</Stack>
 */
export const Stack = ({
  gap = '4',
  align,
  justify,
  fullHeight = false,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}: StackProps) => {
  const inlineStyle: React.CSSProperties = {
    gap: `var(--space-${gap})`,
    ...(align ? { alignItems: alignMap[align] } : {}),
    ...(justify ? { justifyContent: justifyMap[justify] } : {}),
    ...(fullHeight ? { height: '100%' } : {}),
    ...style,
  }

  const Component = Tag as React.ElementType
  return (
    <Component className={`ds-stack ${className}`.trim()} style={inlineStyle} {...rest}>
      {children}
    </Component>
  )
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
} as const
