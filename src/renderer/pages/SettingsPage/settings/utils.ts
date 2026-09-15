import type { KeyboardShortcut } from '@types'

export function fmtSyncTime(iso?: string): string {
  if (!iso) return 'Nunca sincronizado'
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'Agora mesmo'
  if (diffMin < 60) return `Há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Há ${diffH} hora${diffH > 1 ? 's' : ''}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatShortcut(keys: KeyboardShortcut['keys']): string[] {
  const parts: string[] = []
  if (keys.ctrl)  parts.push('Ctrl')
  if (keys.shift) parts.push('Shift')
  if (keys.alt)   parts.push('Alt')
  if (keys.meta)  parts.push('Cmd')
  const keyMap: Record<string, string> = {
    ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: 'Backspace',
    Delete: 'Delete', Meta: 'Cmd',
  }
  parts.push(keyMap[keys.key] || keys.key.toUpperCase())
  return parts
}
