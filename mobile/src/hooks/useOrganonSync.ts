import { useCallback, useEffect, useRef, useState } from 'react'
import { isOrganonAuthenticated } from '../api/organon'
import { pushAllToApi, pullFromApi, hasRemoteChanges } from '../api/sync'
import type { PartialSyncedStore } from '../api/sync'
import type { MobileStore } from '../types'

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

/**
 * Gerencia pull no startup e push debounced nas mudanças.
 * Auth (Bearer tokens) é configurado pelo useAuth — este hook só faz sync.
 */
export function useOrganonSync(
  isAuthenticated: boolean,
  lastSyncAt: string | undefined,
  onPullComplete: (store: PartialSyncedStore, serverTime: string) => void,
): {
  syncStatus: SyncStatus
  triggerSync: (store: MobileStore) => void
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestStoreRef = useRef<MobileStore | null>(null)
  const isPullingRef = useRef(false)
  const onPullCompleteRef = useRef(onPullComplete)
  onPullCompleteRef.current = onPullComplete

  // Startup pull quando autenticação fica disponível
  useEffect(() => {
    if (!isAuthenticated) return
    if (isPullingRef.current) return
    isPullingRef.current = true

    void (async () => {
      try {
        const hasChanges = await hasRemoteChanges(lastSyncAt)
        if (hasChanges) {
          setSyncStatus('syncing')
          const result = await pullFromApi(lastSyncAt)
          onPullCompleteRef.current(result.store, result.serverTime)
          setSyncStatus('synced')
        }
      } catch {
        setSyncStatus('error')
      } finally {
        isPullingRef.current = false
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const triggerSync = useCallback((store: MobileStore) => {
    if (!isOrganonAuthenticated() || isPullingRef.current) return
    latestStoreRef.current = store
    setSyncStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!latestStoreRef.current || !isOrganonAuthenticated()) return
      setSyncStatus('syncing')
      try {
        await pushAllToApi(latestStoreRef.current)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 10000)
  }, [])

  return { syncStatus, triggerSync }
}
