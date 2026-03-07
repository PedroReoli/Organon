import React, { createContext, useContext } from 'react'
import { useAuth, type UseAuthReturn } from './useAuth'
import { useOrganonSync, type SyncStatus } from './useOrganonSync'
import type { MobileStore } from '../types'
import type { PartialSyncedStore } from '../api/sync'

interface SyncContextValue extends UseAuthReturn {
  syncStatus: SyncStatus
  triggerSync: (store: MobileStore) => void
}

const SyncContext = createContext<SyncContextValue>({
  isAuthenticated: false,
  isRestoring: false,
  user: null,
  authError: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  clearError: () => {},
  syncStatus: 'idle',
  triggerSync: () => {},
})

export function AppwriteProvider({
  children,
  baseUrl,
  refreshToken,
  lastSyncAt,
  onPullComplete,
  onSessionChange,
}: {
  children: React.ReactNode
  baseUrl?: string
  refreshToken?: string
  lastSyncAt?: string
  onPullComplete?: (store: PartialSyncedStore, serverTime: string) => void
  onSessionChange?: (refreshToken: string, email: string) => void
}) {
  const auth = useAuth(baseUrl, refreshToken, onSessionChange ?? (() => {}))
  const sync = useOrganonSync(auth.isAuthenticated, lastSyncAt, onPullComplete ?? (() => {}))

  return (
    <SyncContext.Provider value={{ ...auth, ...sync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useAppwriteContext() {
  return useContext(SyncContext)
}
