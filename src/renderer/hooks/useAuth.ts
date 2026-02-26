import { useState, useEffect, useCallback } from 'react'
import { Models } from 'appwrite'
import { signIn, signUp, signOut, getCurrentUser } from '../../api/auth'

export interface UseAuthReturn {
  user: Models.User<Models.Preferences> | null
  isLoadingAuth: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setIsLoadingAuth(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    try {
      await signIn(email, password)
      const u = await getCurrentUser()
      setUser(u)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login'
      setAuthError(translateAppwriteError(msg))
      throw err
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    setAuthError(null)
    try {
      await signUp(email, password, name)
      const u = await getCurrentUser()
      setUser(u)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta'
      setAuthError(translateAppwriteError(msg))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  return { user, isLoadingAuth, authError, login, register, logout, clearAuthError }
}

function translateAppwriteError(msg: string): string {
  if (msg.includes('Invalid credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('user_already_exists') || msg.includes('already exists')) return 'Este email já está cadastrado.'
  if (msg.includes('Invalid email')) return 'Email inválido.'
  if (msg.includes('Password must be')) return 'A senha deve ter pelo menos 8 caracteres.'
  if (msg.includes('Rate limit')) return 'Muitas tentativas. Aguarde um momento.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Erro de conexão. Verifique sua internet.'
  return msg
}
