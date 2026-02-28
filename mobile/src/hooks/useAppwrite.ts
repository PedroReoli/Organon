import { useCallback, useEffect, useRef, useState } from 'react'
import { Models } from 'appwrite'
import { getCurrentUser, signIn, signOut, signUp } from '../api/auth'
import { downloadStore, uploadStore, syncCollectionsToCloud } from '../api/sync'
import type { MobileStore } from '../types'

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

interface UseAppwriteReturn {
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

function translateError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? ''
  if (msg.includes('Invalid credentials')) return 'Email ou senha incorretos'
  if (msg.includes('user_already_exists') || msg.includes('already exists')) return 'Este email já está cadastrado'
  if (msg.includes('password')) return 'A senha deve ter pelo menos 8 caracteres'
  if (msg.includes('rate')) return 'Muitas tentativas. Aguarde um momento'
  if (msg.includes('Network') || msg.includes('fetch')) return 'Erro de conexão. Verifique sua internet'
  return 'Ocorreu um erro. Tente novamente'
}

export function useAppwrite(
  onCloudStoreDownloaded?: (store: MobileStore) => void
): UseAppwriteReturn {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestStoreRef = useRef<MobileStore | null>(null)
  const isHydratingRef = useRef(false)

  const hydrateFromCloud = useCallback(async (userId: string) => {
    isHydratingRef.current = true
    try {
      const cloudStore = await downloadStore(userId)
      if (cloudStore) {
        onCloudStoreDownloaded?.(cloudStore)
      }
    } catch {
      // ignore
    } finally {
      isHydratingRef.current = false
    }
  }, [onCloudStoreDownloaded])

  // On mount: check current session
  useEffect(() => {
    getCurrentUser().then(async (u) => {
      setUser(u)
      if (u) {
        await hydrateFromCloud(u.$id)
      }
    }).finally(() => setIsLoadingAuth(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    try {
      await signIn(email, password)
      const u = await getCurrentUser()
      setUser(u)
      setSyncStatus('idle')
      // Download cloud store after login
      if (u) {
        await hydrateFromCloud(u.$id)
      }
    } catch (err) {
      setAuthError(translateError(err))
      throw err
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthError(null)
    try {
      await signUp(email, password, name)
      const u = await getCurrentUser()
      setUser(u)
      setSyncStatus('idle')
    } catch (err) {
      setAuthError(translateError(err))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
    setSyncStatus('idle')
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  // Debounced auto-sync: called every time store changes
  const triggerSync = useCallback((store: MobileStore) => {
    if (!user || isHydratingRef.current) return
    latestStoreRef.current = store
    setSyncStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!latestStoreRef.current || !user) return
      setSyncStatus('syncing')
      try {
        await uploadStore(latestStoreRef.current, user.$id)
        await syncCollectionsToCloud(latestStoreRef.current, user.$id)
        setSyncStatus('synced')
      } catch (err) {
        console.warn('[sync] Error:', err)
        setSyncStatus('error')
      }
    }, 10000)
  }, [user])

  return { user, isLoadingAuth, authError, syncStatus, login, register, logout, clearAuthError, triggerSync }
}
