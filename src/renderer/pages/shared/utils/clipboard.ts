/**
 * Helper unificado de copy-to-clipboard.
 *
 * Antes: cada feature (ColorsView, Playbook, ClipboardView) implementava
 * o proprio with fallback para `document.execCommand`. Agora todos importam
 * daqui.
 *
 * Definido no upgrade 19. Suporta Electron + browsers modernos + fallback.
 */

export interface CopyResult {
  ok: boolean
  method: 'clipboard-api' | 'electron' | 'exec-command' | 'failed'
  error?: string
}

/**
 * Copia texto para o clipboard. Retorna resultado com metodo usado.
 *
 * Tenta nesta ordem:
 * 1. Electron IPC (se disponivel)
 * 2. navigator.clipboard.writeText
 * 3. document.execCommand('copy') como fallback
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (text == null) return { ok: false, method: 'failed', error: 'no-text' }

  // 1. Electron
  const electronApi = (typeof window !== 'undefined' ? (window as unknown as { electronAPI?: { writeClipboard?: (text: string) => Promise<void> | void } }).electronAPI : undefined)
  if (electronApi?.writeClipboard) {
    try {
      await electronApi.writeClipboard(text)
      return { ok: true, method: 'electron' }
    } catch (err) {
      // segue para proxima tentativa
    }
  }

  // 2. Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return { ok: true, method: 'clipboard-api' }
    } catch (err) {
      // segue para fallback
    }
  }

  // 3. Fallback execCommand
  if (typeof document !== 'undefined' && document.execCommand) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (success) return { ok: true, method: 'exec-command' }
    } catch (err) {
      // ignore
    }
  }

  return { ok: false, method: 'failed', error: 'no-method-available' }
}

/**
 * Le texto do clipboard. Retorna null se nao conseguir.
 */
export async function readFromClipboard(): Promise<string | null> {
  const electronApi = (typeof window !== 'undefined' ? (window as unknown as { electronAPI?: { readClipboard?: () => Promise<string> | string } }).electronAPI : undefined)
  if (electronApi?.readClipboard) {
    try {
      const value = await electronApi.readClipboard()
      return typeof value === 'string' ? value : null
    } catch (err) {
      // segue
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText()
    } catch (err) {
      return null
    }
  }

  return null
}
