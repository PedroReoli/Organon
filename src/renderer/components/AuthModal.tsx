import React, { useState } from 'react'

interface AuthModalProps {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string, name: string) => Promise<void>
  authError: string | null
  onClearError: () => void
  onClose: () => void
}

type Tab = 'login' | 'register'

export const AuthModal: React.FC<AuthModalProps> = ({
  onLogin,
  onRegister,
  authError,
  onClearError,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('login')
  const [isLoading, setIsLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  function switchTab(t: Tab) {
    setTab(t)
    onClearError()
    setConfirmError(null)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onLogin(loginEmail, loginPassword)
      onClose()
    } catch {
      // error shown via authError prop
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regPassword !== regConfirm) {
      setConfirmError('As senhas não coincidem.')
      return
    }
    setConfirmError(null)
    setIsLoading(true)
    try {
      await onRegister(regEmail, regPassword, regName)
      onClose()
    } catch {
      // error shown via authError prop
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {tab === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>
          <button
            onClick={onClose}
            className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.1))' }}>
          <button
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'login' ? 'var(--color-primary)' : 'transparent',
              color: tab === 'login' ? '#fff' : 'var(--color-text)',
              opacity: tab === 'login' ? 1 : 0.6,
            }}
            onClick={() => switchTab('login')}
          >
            Entrar
          </button>
          <button
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'register' ? 'var(--color-primary)' : 'transparent',
              color: tab === 'register' ? '#fff' : 'var(--color-text)',
              opacity: tab === 'register' ? 1 : 0.6,
            }}
            onClick={() => switchTab('register')}
          >
            Criar conta
          </button>
        </div>

        {/* Error */}
        {(authError || confirmError) && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            {confirmError || authError}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="seu@email.com"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Senha</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Nome</label>
              <input
                type="text"
                required
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Seu nome"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="seu@email.com"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Confirmar senha</label>
              <input
                type="password"
                required
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
