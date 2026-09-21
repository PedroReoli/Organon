import React, { useState } from 'react'
import { Shield, ShieldCheck } from 'lucide-react'

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
      type="button"
      onClick={toggleStealth}
      title={
        isStealth
          ? 'Modo Stealth ATIVO: Janela invisível em gravações e compartilhamento de tela (Meet, Zoom, Teams)'
          : 'Modo Stealth: Clique para ocultar o aplicativo em compartilhamentos de tela'
      }
      className={`whisper-btn-icon-label ${isStealth ? 'active' : ''}`}
      style={{
        borderColor: isStealth ? '#22c55e' : undefined,
        background: isStealth ? 'rgba(34, 197, 94, 0.14)' : undefined,
        color: isStealth ? '#16a34a' : undefined,
      }}
    >
      {isStealth ? (
        <ShieldCheck size={13} style={{ color: '#16a34a' }} />
      ) : (
        <Shield size={13} />
      )}
      <span className="whisper-btn-text">{isStealth ? 'Protegido' : 'Stealth'}</span>
    </button>
  )
}

