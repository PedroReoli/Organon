import React, { useState } from 'react'

export const ScreenShareStealthBadge: React.FC = () => {
  const [isStealth, setIsStealth] = useState(false)

  const toggleStealth = async () => {
    const nextState = !isStealth
    setIsStealth(nextState)

    if (window.electronAPI?.setContentProtection) {
      try {
        await window.electronAPI.setContentProtection(nextState)
      } catch (err) {
        console.error('Erro ao alternar modo de proteção de tela:', err)
      }
    }
  }

  return (
    <button
      onClick={toggleStealth}
      title={
        isStealth
          ? 'Modo Stealth Ativo: Janela oculta em compartilhamento de tela (Google Meet, Zoom, Teams)'
          : 'Ativar Modo Stealth: Ocultar janela durante compartilhamento de tela'
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: isStealth ? '#22c55e' : 'var(--color-border)',
        background: isStealth ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-background)',
        color: isStealth ? '#22c55e' : 'var(--color-text-muted)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        {isStealth && <polyline points="9 12 11 14 15 10" />}
      </svg>
      <span>{isStealth ? 'Modo Stealth Ativo (Oculto)' : 'Modo Stealth (Proteção)'}</span>
    </button>
  )
}
