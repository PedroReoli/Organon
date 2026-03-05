import React, { createContext, useContext } from 'react'
import { useOrganonSync, type SyncStatus } from './useOrganonSync'
import type { MobileStore } from '../types'
import type { PartialSyncedStore } from '../api/sync'

interface SyncContextValue {
  isConfigured: boolean
  syncStatus: SyncStatus
  triggerSync: (store: MobileStore) => void
}

const SyncContext = createContext<SyncContextValue>({
  isConfigured: false,
  syncStatus: 'idle',
  triggerSync: () => {},
})

export function AppwriteProvider({
  children,
  token,
  baseUrl,
  lastSyncAt,
  onPullComplete,
}: {
  children: React.ReactNode
  token?: string
  baseUrl?: string
  lastSyncAt?: string
  onPullComplete?: (store: PartialSyncedStore, serverTime: string) => void
}) {
  const value = useOrganonSync(token, baseUrl, lastSyncAt, onPullComplete ?? (() => {}))
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useAppwriteContext() {
  return useContext(SyncContext)
}
