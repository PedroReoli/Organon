/**
 * Hook que executa o expurgo de itens expirados do clipboard uma vez por
 * carga do app. Snippets e items pinned nunca expiram. Upgrade 18.
 */

import { useEffect, useRef } from 'react'

interface UseClipboardExpirationOptions {
  retentionDays: number
  onPurge: (retentionDays: number) => number
}

export function useClipboardExpiration(options: UseClipboardExpirationOptions): void {
  const { retentionDays, onPurge } = options
  const didPurgeRef = useRef(false)

  useEffect(() => {
    if (didPurgeRef.current) return
    if (retentionDays <= 0) return
    didPurgeRef.current = true
    // Atrasa o purge para nao bloquear primeiro paint
    const timer = window.setTimeout(() => {
      onPurge(retentionDays)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [retentionDays, onPurge])
}
