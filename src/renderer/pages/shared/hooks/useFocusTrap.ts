import { useEffect, useRef } from 'react'

/**
 * Tab trap dentro de um container (modal, popover).
 *
 * Aplica:
 * - Foca primeiro elemento focavel ao montar.
 * - Cicla Tab/Shift+Tab dentro do container.
 * - Restaura foco ao elemento que tinha foco antes ao desmontar.
 *
 * Uso:
 *   const ref = useFocusTrap<HTMLDivElement>(active)
 *   <div ref={ref}>...</div>
 *
 * Definido no upgrade 20.
 *
 * Nota: quando adotarmos Radix UI (Dialog, Popover), este hook torna-se
 * desnecessario para esses casos pois Radix ja gerencia. Mantemos para
 * uso em componentes custom.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean = true) {
  const containerRef = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = getFocusables(container)
    focusables[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = getFocusables(container)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return containerRef
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  )
}
