import { useEffect, useState } from 'react'
import './a11y.css'

interface LiveRegionProps {
  message: string
  /** politeness do anuncio. 'polite' espera o leitor terminar; 'assertive' interrompe */
  politeness?: 'polite' | 'assertive'
  /** ms antes de limpar a mensagem (para permitir reanuncio do mesmo texto) */
  clearAfter?: number
}

/**
 * Regiao ARIA live para anuncios programaticos a leitores de tela.
 *
 * Uso:
 *   <LiveRegion message="Card criado" politeness="polite" />
 *
 * Para anuncios efêmeros, troque a key para forcar remount:
 *   <LiveRegion key={messageKey} message={msg} />
 *
 * Definido no upgrade 20.
 */
export const LiveRegion = ({ message, politeness = 'polite', clearAfter = 5000 }: LiveRegionProps) => {
  const [text, setText] = useState(message)

  useEffect(() => {
    setText(message)
    if (!message || clearAfter <= 0) return
    const timer = window.setTimeout(() => setText(''), clearAfter)
    return () => window.clearTimeout(timer)
  }, [message, clearAfter])

  return (
    <div role="status" aria-live={politeness} aria-atomic="true" className="ds-visually-hidden">
      {text}
    </div>
  )
}
