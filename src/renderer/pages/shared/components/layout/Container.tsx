import React from 'react'
import './layout.css'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** max-width: 'sm' = 640, 'md' = 768, 'lg' = 1024, 'xl' = 1280, '2xl' = 1536 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** centralizar horizontalmente */
  centered?: boolean
  as?: keyof JSX.IntrinsicElements
}

/**
 * Layout primitive: container com max-width responsivo.
 *
 * Uso: <Container maxWidth="lg">...</Container>
 */
export const Container = ({
  maxWidth = 'lg',
  centered = true,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...rest
}: ContainerProps) => {
  const widthMap = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  } as const

  const inlineStyle: React.CSSProperties = {
    maxWidth: widthMap[maxWidth],
    ...(centered ? { marginLeft: 'auto', marginRight: 'auto' } : {}),
    ...style,
  }

  const Component = Tag as React.ElementType
  return (
    <Component className={`ds-container ${className}`.trim()} style={inlineStyle} {...rest}>
      {children}
    </Component>
  )
}
