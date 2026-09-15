import React from 'react'
import './a11y.css'

interface VisuallyHiddenProps {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
}

/**
 * Esconde visualmente mas mantem acessivel para leitores de tela.
 *
 * Uso:
 *   <button>
 *     <Icon />
 *     <VisuallyHidden>Fechar modal</VisuallyHidden>
 *   </button>
 *
 * Definido no upgrade 20.
 */
export const VisuallyHidden = ({ children, as: Tag = 'span' }: VisuallyHiddenProps) => {
  const Component = Tag as React.ElementType
  return <Component className="ds-visually-hidden">{children}</Component>
}
