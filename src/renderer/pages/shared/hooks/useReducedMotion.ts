import { useEffect, useState } from 'react'

/**
 * Retorna true quando o usuario tem `prefers-reduced-motion: reduce` ativo no SO.
 *
 * Util para desabilitar logica baseada em animacao em JS (timers de fade,
 * scroll suave manual, etc). O CSS ja desabilita animation/transition
 * via foundation/reduced-motion.css.
 *
 * Definido no upgrade 20.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)

    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }
    // fallback para browsers antigos
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [])

  return reduced
}
