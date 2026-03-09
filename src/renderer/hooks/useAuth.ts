// Hook de autenticação da Organon API
// Gerencia login/logout/register e restauração de sessão via token persistido

import { useState, useEffect, useCallback } from 'react'
import {
  organonApi,
  configureOrganon,
  setOrganonCallbacks,
  getOrganonTokens,
} from '../../api/organon'
import type { OrganonUser } from '../../api/organon'

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const getString = (value: unknown): string => (typeof value === 'string' ? value : '')

const readAccessToken = (payload: unknown): string => {
  const root = asRecord(payload)
  return getString(root.token ?? root.accessToken ?? root.access_token)
}

export interface UseAuthReturn {
  isAuthenticated: boolean
  /** true enquanto tenta restaurar sessão do token salvo */
  isRestoring: boolean
  user: OrganonUser | null
  authError: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

/**
 * @param baseUrl               URL base da API (settings.apiBaseUrl)
 * @param persistedRefreshToken refreshToken persistido (settings.apiRefreshToken)
 * @param onSessionChange       Chamado quando tokens mudam — persiste no store
 */
export function useAuth(
  baseUrl: string,
  persistedRefreshToken: string,
  onSessionChange: (accessToken: string, email: string, refreshToken: string) => void,
): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isRestoring, setIsRestoring] = useState(!!persistedRefreshToken)
  const [user, setUser] = useState<OrganonUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Configurar baseUrl e callbacks de refresh automático
  useEffect(() => {
    configureOrganon({ baseUrl: baseUrl || DEFAULT_BASE_URL })
    setOrganonCallbacks({
      onTokensUpdated: (at, rt) => {
        if (!at) {
          // Sessão invalidada (refresh falhou)
          setIsAuthenticated(false)
          setUser(null)
          onSessionChange('', '', '')
          return
        }
        // Token renovado silenciosamente
        onSessionChange(at, user?.email ?? '', rt)
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl])

  // Auto-restaurar sessão via refreshToken persistido
  useEffect(() => {
    if (!persistedRefreshToken) {
      setIsRestoring(false)
      return
    }

    void (async () => {
      setIsRestoring(true)
      try {
        // Usa o refreshToken para obter novo accessToken
        configureOrganon({ refreshToken: persistedRefreshToken })
        await organonApi.auth.refresh() // atualiza _accessToken + _refreshToken internamente
        const { accessToken, refreshToken } = getOrganonTokens()
        const me = await organonApi.auth.me()
        setUser(me.data)
        setIsAuthenticated(true)
        onSessionChange(accessToken, me.data.email, refreshToken)
      } catch {
        // refreshToken inválido/expirado — limpa sessão
        configureOrganon({ accessToken: '', refreshToken: '' })
        setIsAuthenticated(false)
        onSessionChange('', '', '')
      } finally {
        setIsRestoring(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // só no mount

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null)
      try {
        const res = await organonApi.auth.login(email, password)
        const token = readAccessToken(res.data)
        if (!token) throw new Error('Resposta de autenticação inválida. Faça login novamente.')
        const refreshToken = getString((res.data as Record<string, unknown>).refreshToken ?? '')
        configureOrganon({ accessToken: token, refreshToken })
        setUser(res.data.user)
        setIsAuthenticated(true)
        onSessionChange(token, email, refreshToken)
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
        const token = readAccessToken(res.data)
        if (!token) throw new Error('Resposta de autenticação inválida. Tente novamente.')
        const refreshToken = getString((res.data as Record<string, unknown>).refreshToken ?? '')
        configureOrganon({ accessToken: token, refreshToken })
        setUser(res.data.user)
        setIsAuthenticated(true)
        onSessionChange(token, res.data.user.email, refreshToken)
        return true
      } catch (err) {
        setAuthError((err as Error).message || 'Erro ao criar conta.')
        return false
      }
    },
    [onSessionChange],
  )

  const logout = useCallback(async () => {
    await organonApi.auth.logout().catch(() => {})
    configureOrganon({ accessToken: '', refreshToken: '' })
    setUser(null)
    setIsAuthenticated(false)
    onSessionChange('', '', '')
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
