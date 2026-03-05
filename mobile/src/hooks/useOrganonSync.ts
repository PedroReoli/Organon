import { useCallback, useEffect, useRef, useState } from 'react'
import { configureOrganon, hasOrganonToken } from '../api/organon'
import { pushAllToApi, pullFromApi, hasRemoteChanges } from '../api/sync'
import type { PartialSyncedStore } from '../api/sync'
import type { MobileStore } from '../types'

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

export function useOrganonSync(
  token: string | undefined,
  baseUrl: string | undefined,
  lastSyncAt: string | undefined,
  onPullComplete: (store: PartialSyncedStore, serverTime: string) => void,
): {
  isConfigured: boolean
  syncStatus: SyncStatus
  triggerSync: (store: MobileStore) => void
} {
  const [isConfigured, setIsConfigured] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestStoreRef = useRef<MobileStore | null>(null)
  const isPullingRef = useRef(false)
  const onPullCompleteRef = useRef(onPullComplete)
  onPullCompleteRef.current = onPullComplete

  // On mount: configure client and do startup pull if token exists
  useEffect(() => {
    if (!token) return
    configureOrganon({ baseUrl: baseUrl || DEFAULT_BASE_URL, token })
    setIsConfigured(true)

    isPullingRef.current = true
    ;(async () => {
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
  }, []) // only on mount

  const triggerSync = useCallback((store: MobileStore) => {
    if (!hasOrganonToken() || isPullingRef.current) return
    latestStoreRef.current = store
    setSyncStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!latestStoreRef.current || !hasOrganonToken()) return
      setSyncStatus('syncing')
      try {
        await pushAllToApi(latestStoreRef.current)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 10000)
  }, [])

  return { isConfigured, syncStatus, triggerSync }
}
