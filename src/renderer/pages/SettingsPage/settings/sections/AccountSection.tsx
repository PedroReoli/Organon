import React from 'react'
import type { StoreSummary } from '@types'
import { fmtSyncTime } from '@Settings/settings/utils'
import { Button } from '@shared/components/primitives'

interface AccountSectionProps {
  activeSection:          string
  userLoggedIn?:          boolean
  authUser?:              { email: string; name: string | null } | null
  authError?:             string | null
  onClearAuthError?:      () => void
  authLoading?:           boolean
  profilePhotoDataUrl?:   string
  onUpdateProfilePhoto?:  (dataUrl: string | null) => void
  storeSummary?:          StoreSummary
  onLogin?:               (email: string, password: string) => Promise<boolean>
  onRegister?:            (email: string, password: string, name?: string) => Promise<boolean>
  onLogout?:              () => Promise<void>
  // Profile edit (from hook)
  editingProfileName:     boolean
  setEditingProfileName:  (v: boolean) => void
  profileNameDraft:       string
  setProfileNameDraft:    (v: string) => void
  profileSaving:          boolean
  profilePhotoInputRef:   React.RefObject<HTMLInputElement>
  handleSaveProfileName:  () => void
  handleProfilePhotoChange:(e: React.ChangeEvent<HTMLInputElement>) => void
  // Auth form (from hook)
  authTab:                'login' | 'register'
  setAuthTab:             (v: 'login' | 'register') => void
  authEmail:              string
  setAuthEmail:           (v: string) => void
  authPassword:           string
  setAuthPassword:        (v: string) => void
  authPasswordConfirm:    string
  setAuthPasswordConfirm: (v: string) => void
  showAuthPassword:       boolean
  setShowAuthPassword:    (updater: (v: boolean) => boolean) => void
  authLocalError:         string | null
  setAuthLocalError:      (v: string | null) => void
  authName:               string
  setAuthName:            (v: string) => void
  authSubmitting:         boolean
  setAuthSubmitting:      (v: boolean) => void
}

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.06 2-3.86 3.6-5.26M9.9 4.24A11.1 11.1 0 0 1 12 4c5 0 9.27 3.11 11 8a11.8 11.8 0 0 1-4.06 5.94" />
    <path d="M1 1l22 22" />
    <path d="M9.53 9.53A3.5 3.5 0 0 0 14.47 14.47" />
  </svg>
)

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EditIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
    <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" />
  </svg>
)

const SyncIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
    <path d="M14 8A6 6 0 0 1 2.5 11.5M2 8a6 6 0 0 1 11.5-3.5" />
    <path d="M14 5v3h-3M2 11v-3h3" />
  </svg>
)

export const AccountSection = ({
  activeSection, userLoggedIn, authUser, authError, onClearAuthError, authLoading,
  profilePhotoDataUrl, onUpdateProfilePhoto, storeSummary, onLogin, onRegister, onLogout,
  editingProfileName, setEditingProfileName, profileNameDraft, setProfileNameDraft,
  profileSaving, profilePhotoInputRef, handleSaveProfileName, handleProfilePhotoChange,
  authTab, setAuthTab, authEmail, setAuthEmail, authPassword, setAuthPassword,
  authPasswordConfirm, setAuthPasswordConfirm, showAuthPassword, setShowAuthPassword,
  authLocalError, setAuthLocalError, authName, setAuthName, authSubmitting, setAuthSubmitting,
}: AccountSectionProps) => (
  <section className={`settings-section ${activeSection !== 'account' ? 'settings-section-hidden' : ''}`}>
    <div className="settings-section-header">
      <h3>Conta</h3>
    </div>

    <div className="settings-data-grid">
      {userLoggedIn && authUser ? (
        <>
          {/* Perfil + ação de saída em linha */}
          <div className="settings-data-card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {profilePhotoDataUrl ? (
                  <img
                    src={profilePhotoDataUrl}
                    alt="Foto de perfil"
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--color-primary, var(--color-primary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 18,
                  }}>
                    {(authUser.name ?? authUser.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => profilePhotoInputRef.current?.click()}
                  title="Alterar foto"
                  style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <EditIcon />
                </button>
                <input ref={profilePhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoChange} />
              </div>

              {/* Nome + email */}
              <div style={{ minWidth: 0, flex: 1 }}>
                {editingProfileName ? (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ fontSize: 12, padding: '3px 7px', flex: 1, minWidth: 0 }}
                      value={profileNameDraft}
                      onChange={e => setProfileNameDraft(e.target.value)}
                      placeholder="Seu nome"
                      autoFocus
                      disabled={profileSaving}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  void handleSaveProfileName()
                        if (e.key === 'Escape') setEditingProfileName(false)
                      }}
                    />
                    <Button variant="primary" size="sm" onClick={() => void handleSaveProfileName()} disabled={profileSaving}>
                      {profileSaving ? '...' : 'Salvar'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingProfileName(false)} disabled={profileSaving}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{authUser.name || 'Sem nome'}</span>
                    <button
                      onClick={() => { setProfileNameDraft(authUser.name ?? ''); setEditingProfileName(true) }}
                      title="Editar nome"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      <EditIcon />
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                  {authUser.email}
                </div>
                {profilePhotoDataUrl && !editingProfileName && (
                  <button
                    onClick={() => onUpdateProfilePhoto?.(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: 'var(--color-danger)', marginTop: 2 }}
                  >
                    Remover foto
                  </button>
                )}
              </div>

              {/* Sair */}
              <Button
                variant="danger"
                size="sm"
                style={{ flexShrink: 0 }}
                onClick={() => onLogout?.()}
              >
                Sair
              </Button>
            </div>
          </div>

          {/* Dados sincronizados */}
          {storeSummary && (
            <div className="settings-data-card" style={{ padding: '12px 14px' }}>
              {/* Cabeçalho linha: título + última sync */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Dados sincronizados
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-muted)' }}>
                  <SyncIcon />
                  <span style={{ fontSize: 11 }}>{fmtSyncTime(storeSummary.lastSyncAt)}</span>
                </div>
              </div>

              {/* Contadores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6, marginBottom: storeSummary.recentNotes.length > 0 ? 10 : 0 }}>
                {storeSummary.counts.map(c => (
                  <div key={c.label} style={{
                    background: 'var(--color-bg-secondary, rgba(255,255,255,.04))',
                    borderRadius: 6, padding: '7px 10px',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary, var(--color-primary))', lineHeight: 1 }}>{c.n}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Notas recentes */}
              {storeSummary.recentNotes.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                    Notas recentes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {storeSummary.recentNotes.map(n => (
                      <div key={n.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '5px 8px',
                        background: 'var(--color-bg-secondary, rgba(255,255,255,.04))',
                        borderRadius: 5, gap: 8,
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.title || '(sem título)'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                          {fmtSyncTime(n.updatedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── Não logado ── */
        <div className="settings-data-card" style={{ maxWidth: 380 }}>
          {authLoading ? (
            <p className="settings-help-text">Restaurando sessão...</p>
          ) : (
            <>
              {/* Abas */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--color-border, rgba(255,255,255,.1))' }}>
                {(['login', 'register'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setAuthTab(tab)
                      if (tab === 'login') setAuthPasswordConfirm('')
                      setShowAuthPassword(() => false)
                      setAuthLocalError(null)
                      onClearAuthError?.()
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      color: authTab === tab ? 'var(--color-primary, var(--color-primary))' : 'var(--color-text-muted)',
                      borderBottom: authTab === tab ? '2px solid var(--color-primary, var(--color-primary))' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    {tab === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>

              {/* Formulário */}
              <form
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                onSubmit={async (e) => {
                  e.preventDefault()
                  setAuthLocalError(null)
                  onClearAuthError?.()
                  if (authTab === 'register' && authPassword !== authPasswordConfirm) {
                    setAuthLocalError('As senhas não coincidem.')
                    return
                  }
                  setAuthSubmitting(true)
                  try {
                    if (authTab === 'login') await onLogin?.(authEmail, authPassword)
                    else                     await onRegister?.(authEmail, authPassword, authName || undefined)
                  } finally {
                    setAuthSubmitting(false)
                  }
                }}
              >
                {authTab === 'register' && (
                  <input
                    className="form-input" type="text" placeholder="Nome (opcional)"
                    value={authName} disabled={authSubmitting}
                    onChange={e => { setAuthName(e.target.value); setAuthLocalError(null); onClearAuthError?.() }}
                  />
                )}
                <input
                  className="form-input" type="email" placeholder="E-mail"
                  value={authEmail} required disabled={authSubmitting}
                  onChange={e => { setAuthEmail(e.target.value); setAuthLocalError(null); onClearAuthError?.() }}
                />
                <div className="settings-auth-password-field">
                  <input
                    className="form-input settings-auth-password-input"
                    type={showAuthPassword ? 'text' : 'password'} placeholder="Senha (mínimo 8 caracteres)"
                    value={authPassword} required minLength={8} disabled={authSubmitting}
                    onChange={e => { setAuthPassword(e.target.value); setAuthLocalError(null); onClearAuthError?.() }}
                  />
                  <button type="button" className="settings-auth-password-toggle" onClick={() => setShowAuthPassword(v => !v)} disabled={authSubmitting} title={showAuthPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-label={showAuthPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showAuthPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {authTab === 'register' && (
                  <div className="settings-auth-password-field">
                    <input
                      className="form-input settings-auth-password-input"
                      type={showAuthPassword ? 'text' : 'password'} placeholder="Confirmar senha"
                      value={authPasswordConfirm} required minLength={8} disabled={authSubmitting}
                      onChange={e => { setAuthPasswordConfirm(e.target.value); setAuthLocalError(null); onClearAuthError?.() }}
                    />
                    <button type="button" className="settings-auth-password-toggle" onClick={() => setShowAuthPassword(v => !v)} disabled={authSubmitting} title={showAuthPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-label={showAuthPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showAuthPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                )}

                {(authLocalError || authError) && (
                  <p style={{ color: 'var(--color-danger)', fontSize: 11, margin: 0 }}>{authLocalError ?? authError}</p>
                )}

                <Button
                  variant="primary"
                  type="submit"
                  fullWidth
                  disabled={authSubmitting || !authEmail || !authPassword || (authTab === 'register' && (!authPasswordConfirm || authPassword !== authPasswordConfirm))}
                >
                  {authSubmitting
                    ? (authTab === 'login' ? 'Entrando...' : 'Criando conta...')
                    : (authTab === 'login' ? 'Entrar' : 'Criar conta')}
                </Button>
              </form>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border, rgba(255,255,255,.08))' }}>
                <Button variant="secondary" disabled fullWidth style={{ opacity: 0.45 }}>
                  <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                    <path d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/>
                    <path d="M10 20c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20z" fill="#34A853"/>
                    <path d="M4.4 12c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V5.4H1.1A10 10 0 0 0 0 10c0 1.6.4 3.2 1.1 4.6L4.4 12z" fill="#FBBC05"/>
                    <path d="M10 3.9c1.5 0 2.8.5 3.8 1.5L16.7 3C15 1.4 12.7.5 10 .5A10 10 0 0 0 1.1 5.5l3.3 2.5C5.2 5.6 7.4 3.9 10 3.9z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                  <span style={{ fontSize: 10, background: 'var(--color-surface-2, rgba(255,255,255,.1))', padding: '1px 5px', borderRadius: 3 }}>Em breve</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </section>
)
