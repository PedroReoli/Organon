// Hook de autenticação da Organon API
// Gerencia login/logout/register e restauração de sessão via token persistido

import { useState, useEffect, useCallback, useRef } from 'react'
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
  updateProfile: (updates: { name?: string }) => Promise<boolean>
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
  // isRestoring começa false; será true quando o effect de restore disparar
  const [isRestoring, setIsRestoring] = useState(false)
  const [user, setUser] = useState<OrganonUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  // Garante que a restauração ocorra apenas uma vez, mesmo que o token mude
  const hasTriedRestoreRef = useRef(false)

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

  // Auto-restaurar sessão quando o token persistido se tornar disponível.
  // IMPORTANTE: useStore carrega o store do disco de forma assíncrona — quando o App
  // monta pela primeira vez, persistedRefreshToken ainda é '' (store não carregou).
  // Por isso dependemos de [persistedRefreshToken] e usamos hasTriedRestoreRef para
  // garantir que a restauração ocorra apenas UMA vez (quando o token aparecer pela 1ª vez).
  useEffect(() => {
    if (!persistedRefreshToken || hasTriedRestoreRef.current) return
    hasTriedRestoreRef.current = true

    void (async () => {
      setIsRestoring(true)
      try {
        configureOrganon({ accessToken: persistedRefreshToken, refreshToken: persistedRefreshToken })
        await organonApi.auth.refresh()
        const { accessToken, refreshToken } = getOrganonTokens()
        const me = await organonApi.auth.me()
        setUser(me.data)
        setIsAuthenticated(true)
        onSessionChange(accessToken, me.data.email, refreshToken)
      } catch {
        configureOrganon({ accessToken: '', refreshToken: '' })
        setIsAuthenticated(false)
        onSessionChange('', '', '')
      } finally {
        setIsRestoring(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedRefreshToken])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null)
      try {
        const res = await organonApi.auth.login(email, password)
        const token = readAccessToken(res.data)
        if (!token) throw new Error('Resposta de autenticação inválida. Faça login novamente.')
        const refreshToken = getString((res.data as unknown as Record<string, unknown>).refreshToken ?? '')
        configureOrganon({ accessToken: token, refreshToken })
        // Marca como restaurado para que o effect de restore não dispare novamente
        // quando updateSettings salvar o token (o que mudaria persistedRefreshToken).
        hasTriedRestoreRef.current = true
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
        const refreshToken = getString((res.data as unknown as Record<string, unknown>).refreshToken ?? '')
        configureOrganon({ accessToken: token, refreshToken })
        // Idem ao login: previne o restore effect de rodar após salvar o token.
        hasTriedRestoreRef.current = true
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

  const updateProfile = useCallback(async (updates: { name?: string }): Promise<boolean> => {
    try {
      const res = await organonApi.auth.updateProfile(updates)
      setUser(res.data)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    isAuthenticated,
    isRestoring,
    user,
    authError,
    login,
    register,
    logout,
    updateProfile,
    clearError: () => setAuthError(null),
  }
}
