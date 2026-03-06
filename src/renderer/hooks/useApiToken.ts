// Hook de configuração do token da Organon API
// Substitui useAuth.ts — sem login/logout, só configuração de token

import { useState, useEffect, useCallback } from 'react'
import { configureOrganon, organonApi, hasOrganonToken } from '../../api/organon'

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

export interface UseApiTokenReturn {
  isConfigured: boolean
  isValidating: boolean
  tokenError: string | null
  /** Valida e salva o token. Retorna true se ok. */
  configure: (baseUrl: string, token: string) => Promise<boolean>
  clearError: () => void
}

export function useApiToken(initialBaseUrl: string, initialToken: string): UseApiTokenReturn {
  // hasOrganonToken() é true se o token veio do .env (já configurado no módulo)
  const [isConfigured, setIsConfigured] = useState(() => hasOrganonToken())
  const [isValidating, setIsValidating] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Configura o client no mount se tiver token salvo nas settings (sobrescreve .env)
  useEffect(() => {
    if (initialToken) {
      configureOrganon({ baseUrl: initialBaseUrl || DEFAULT_BASE_URL, token: initialToken })
      setIsConfigured(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // só no mount

  const configure = useCallback(async (baseUrl: string, token: string): Promise<boolean> => {
    if (!token.trim()) {
      setTokenError('Token não pode ser vazio.')
      return false
    }

    setTokenError(null)
    setIsValidating(true)

    try {
      configureOrganon({ baseUrl: baseUrl || DEFAULT_BASE_URL, token: token.trim() })
      const ok = await organonApi.ping()

      if (!ok) {
        setTokenError('Token inválido ou API inacessível.')
        return false
      }

      setIsConfigured(true)
      return true
    } catch {
      setTokenError('Erro de conexão. Verifique a URL e o token.')
      return false
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    isConfigured,
    isValidating,
    tokenError,
    configure,
    clearError: () => setTokenError(null),
  }
}
