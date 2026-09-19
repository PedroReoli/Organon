import { useEffect } from 'react'

/**
 * Hook global para controlar atalhos de barra lateral:
 * - Ctrl+B (sem Shift): alterna barras laterais esquerdas (organon:toggle-left-sidebar)
 *   (se houver seleção de texto ativa no editor, preserva o negrito)
 * - Ctrl+Shift+B: alterna barras laterais direitas (organon:toggle-right-sidebar)
 */
export function useSidebarShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key.toLowerCase() !== 'b') return

      if (e.shiftKey) {
        // Ctrl+Shift+B -> Barra lateral direita
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('organon:toggle-right-sidebar'))
      } else {
        // Ctrl+B -> Barra lateral esquerda
        // Se houver texto selecionado no editor ou input, permite que o atalho de bold funcione
        const selection = window.getSelection()
        const hasTextSelected = Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0)

        if (!hasTextSelected) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('organon:toggle-left-sidebar'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
