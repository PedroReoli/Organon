// Hook de autenticação da Organon API (mobile)
// Idêntico ao desktop — login/logout/register + auto-refresh

import { useState, useEffect, useCallback } from 'react'
import {
  organonApi,
  configureOrganon,
  setOrganonCallbacks,
  getOrganonRefreshToken,
} from '../api/organon'
import type { OrganonUser } from '../api/organon'

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

export interface UseAuthReturn {
  isAuthenticated: boolean
  isRestoring: boolean
  user: OrganonUser | null
  authError: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export function useAuth(
  baseUrl: string | undefined,
  refreshToken: string | undefined,
  onSessionChange: (refreshToken: string, email: string) => void,
): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRestoring, setIsRestoring] = useState(!!refreshToken)
  const [user, setUser] = useState<OrganonUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    configureOrganon({ baseUrl: baseUrl || DEFAULT_BASE_URL })
    setOrganonCallbacks({
      onTokensUpdated: (at, rt) => {
        if (!at && !rt) {
          setIsAuthenticated(false)
          setUser(null)
          onSessionChange('', '')
        }
        if (rt) onSessionChange(rt, user?.email ?? '')
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl])

  useEffect(() => {
    if (!refreshToken) {
      setIsRestoring(false)
      return
    }

    void (async () => {
      setIsRestoring(true)
      try {
        const res = await organonApi.auth.refresh(refreshToken)
        configureOrganon({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
        const me = await organonApi.auth.me()
        setUser(me.data)
        setIsAuthenticated(true)
        onSessionChange(res.data.refreshToken, me.data.email)
      } catch {
        configureOrganon({ accessToken: '', refreshToken: '' })
        setIsAuthenticated(false)
        onSessionChange('', '')
      } finally {
        setIsRestoring(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null)
      try {
        const res = await organonApi.auth.login(email, password)
        configureOrganon({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
        setUser(res.data.user)
        setIsAuthenticated(true)
        onSessionChange(res.data.refreshToken, email)
        return true
      } catch (err) {
        setAuthError((err as Error).message || 'Erro ao fazer login.')
        return false
      }
    },
    [onSessionChange],
  )

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<boolean> => {
      setAuthError(null)
      try {
        const res = await organonApi.auth.register(email, password, name)
        configureOrganon({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
        setUser(res.data.user)
        setIsAuthenticated(true)
        onSessionChange(res.data.refreshToken, res.data.user.email)
        return true
      } catch (err) {
        setAuthError((err as Error).message || 'Erro ao criar conta.')
        return false
      }
    },
    [onSessionChange],
  )

  const logout = useCallback(async () => {
    try {
      const rt = getOrganonRefreshToken()
      if (rt) await organonApi.auth.logout(rt).catch(() => {})
    } catch { /* ignora */ }
    configureOrganon({ accessToken: '', refreshToken: '' })
    setUser(null)
    setIsAuthenticated(false)
    onSessionChange('', '')
  }, [onSessionChange])

  return {
    isAuthenticated,
    isRestoring,
    user,
    authError,
    login,
    register,
    logout,
    clearError: () => setAuthError(null),
  }
}
