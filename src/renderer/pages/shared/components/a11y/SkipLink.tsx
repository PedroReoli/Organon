import React from 'react'
import './a11y.css'

interface SkipLinkProps {
  /** id do alvo (default: 'main-content') */
  targetId?: string
  /** texto do link */
  children?: React.ReactNode
}

/**
 * Link "pular para o conteudo principal" que aparece so quando recebe foco
 * via Tab. Permite usuarios de teclado/leitor de tela pular a navegacao.
 *
 * Uso (no App.tsx):
 *   <SkipLink />
 *   ...
 *   <main id="main-content">...</main>
 *
 * Definido no upgrade 20.
 */
export const SkipLink = ({
  targetId = 'main-content',
  children = 'Pular para o conteudo principal',
}: SkipLinkProps) => {
  return (
    <a href={`#${targetId}`} className="ds-skip-link">
      {children}
    </a>
  )
}
