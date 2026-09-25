import React, { useState, useEffect } from 'react'
import { CheckCircle, Circle, ArrowsClockwise, Terminal, HardDrives } from '@phosphor-icons/react'
import { isElectron } from '@utils'

interface AiCliStatusPillProps {
  onOpenCliRunner: () => void
}

export const AiCliStatusPill: React.FC<AiCliStatusPillProps> = ({ onOpenCliRunner }) => {
  const [showPopover, setShowPopover] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [status, setStatus] = useState<{
    dataPath?: string
    realtimeActive?: boolean
    lastSync?: string
  }>({
    dataPath: 'E:\\Apps',
    realtimeActive: true,
    lastSync: 'Agora',
  })

  useEffect(() => {
    if (isElectron() && window.electronAPI?.getCliStatus) {
      window.electronAPI.getCliStatus().then((res) => {
        if (res) {
          setStatus({
            dataPath: res.dataPath,
            realtimeActive: res.realtimeActive,
            lastSync: new Date(res.timestamp).toLocaleTimeString(),
          })
        }
      })
    }
  }, [])

  const handleForceSync = async () => {
    setIsSyncing(true)
    try {
      if (isElectron() && window.electronAPI?.executeCliCommand) {
        await window.electronAPI.executeCliCommand('sync')
      }
      setTimeout(() => {
        setIsSyncing(false)
        setStatus((prev) => ({ ...prev, lastSync: 'Agora' }))
      }, 400)
    } catch {
      setIsSyncing(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPopover((prev) => !prev)}
        title="Status da IA & Conexão CLI em Tempo Real"
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#34d399',
        }}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer select-none"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11.5px] font-semibold hidden md:inline">IA & CLI</span>
      </button>

      {/* Popover Status Details */}
      {showPopover && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            background: 'var(--color-surface, #181825)',
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
            borderRadius: 14,
            boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            zIndex: 9999,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
          onMouseLeave={() => setShowPopover(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={15} weight="fill" className="text-emerald-400" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
                Ponte de IA Conectada
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
              }}
            >
              0ms lag
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-muted, #a1a1aa)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <HardDrives size={13} weight="duotone" />
              <span>Storage: <strong style={{ color: '#fff' }}>{status.dataPath || 'E:\\Apps'}</strong></span>
            </div>
            <div>
              <span>Modo: <strong style={{ color: '#34d399' }}>Sincronização Reativa Ativa</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
              className="hover:bg-white/10 transition-all"
            >
              <ArrowsClockwise size={13} className={isSyncing ? 'animate-spin' : ''} weight="bold" />
              <span>{isSyncing ? 'Sincronizando...' : 'Forçar Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPopover(false)
                onOpenCliRunner()
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'var(--color-primary, #6366f1)',
                border: 'none',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              className="hover:brightness-110 transition-all"
            >
              <Terminal size={13} weight="bold" />
              <span>CLI</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
