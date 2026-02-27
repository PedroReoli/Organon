import React, { createContext, useContext } from 'react'
import { useAppwrite, type SyncStatus } from './useAppwrite'
import type { MobileStore } from '../types'
import type { Models } from 'appwrite'

interface AppwriteContextValue {
  user: Models.User<Models.Preferences> | null
  isLoadingAuth: boolean
  authError: string | null
  syncStatus: SyncStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
  triggerSync: (store: MobileStore) => void
}

const AppwriteContext = createContext<AppwriteContextValue>({
  user: null,
  isLoadingAuth: false,
  authError: null,
  syncStatus: 'idle',
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  clearAuthError: () => {},
  triggerSync: () => {},
})

export function AppwriteProvider({
  children,
  onCloudStoreDownloaded,
}: {
  children: React.ReactNode
  onCloudStoreDownloaded?: (store: MobileStore) => void
}) {
  const value = useAppwrite(onCloudStoreDownloaded)
  return <AppwriteContext.Provider value={value}>{children}</AppwriteContext.Provider>
}

export function useAppwriteContext() {
  return useContext(AppwriteContext)
}
