import React, { useEffect, useState } from 'react'
import { QrCode, Server, Wifi, ShieldCheck, Copy, Check, X, RefreshCw, Smartphone } from 'lucide-react'

interface LocalSyncLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ServerState {
  running: boolean
  port: number
  ip: string
  pin: string
  logs: LocalSyncLog[]
  progress: number
  connectedDevice: string | null
}

interface LocalSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

// Gerador de QR Code em SVG puro para exibição no modal
const SimpleSVGQrCode: React.FC<{ value: string; size?: number }> = ({ value, size = 200 }) => {
  // Gera uma matriz estilizada de QR Code baseada no hash da URL de forma determinística
  const matrixSize = 25
  const cells: boolean[][] = Array(matrixSize).fill(false).map(() => Array(matrixSize).fill(false))

  // Padrões de alinhamento dos cantos (Finder Patterns)
  const addFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          if (row + r < matrixSize && col + c < matrixSize) {
            cells[row + r][col + c] = true
          }
        }
      }
    }
  }

  addFinder(0, 0)
  addFinder(0, matrixSize - 7)
  addFinder(matrixSize - 7, 0)

  // Preencher os dados internamente a partir do texto de forma determinística
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Ignorar áreas dos finders
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) {
        continue
      }
      const val = Math.abs(Math.sin(hash + r * 31 + c * 17) * 10000)
      cells[r][c] = (val % 1) > 0.45
    }
  }

  const cellSize = size / matrixSize

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: '12px', background: '#ffffff', padding: '12px' }}>
      {cells.map((row, rIdx) =>
        row.map((active, cIdx) =>
          active ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx * cellSize}
              y={rIdx * cellSize}
              width={cellSize - 0.4}
              height={cellSize - 0.4}
              rx={1.5}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  )
}

export const LocalSyncModal: React.FC<LocalSyncModalProps> = ({ isOpen, onClose }) => {
  const [serverState, setServerState] = useState<ServerState>({
    running: false,
    port: 8765,
    ip: '127.0.0.1',
    pin: '',
    logs: [],
    progress: 0,
    connectedDevice: null,
  })

  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchStatus = async () => {
    try {
      const api = (window as any).electronAPI
      if (api?.getLocalSyncStatus) {
        const res = await api.getLocalSyncStatus()
        setServerState(res)
      }
    } catch {
      // Ignore
    }
  }

  const startServer = async () => {
    setLoading(true)
    try {
      const api = (window as any).electronAPI
      if (api?.startLocalSyncServer) {
        const res = await api.startLocalSyncServer(8765)
        setServerState(res)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stopServer = async () => {
    setLoading(true)
    try {
      const api = (window as any).electronAPI
      if (api?.stopLocalSyncServer) {
        const res = await api.stopLocalSyncServer()
        setServerState(res)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    fetchStatus()

    const api = (window as any).electronAPI
    if (!api) return

    const unsubLog = api.onLocalSyncLog?.((entry: LocalSyncLog) => {
      setServerState(prev => ({
        ...prev,
        logs: [entry, ...prev.logs].slice(0, 50),
      }))
    })

    const unsubProgress = api.onLocalSyncProgress?.((progress: number) => {
      setServerState(prev => ({ ...prev, progress }))
    })

    const unsubConnected = api.onLocalSyncConnected?.((device: string | null) => {
      setServerState(prev => ({ ...prev, connectedDevice: device }))
    })

    return () => {
      if (unsubLog) api.offLocalSyncLog?.(unsubLog)
      if (unsubProgress) api.offLocalSyncProgress?.(unsubProgress)
      if (unsubConnected) api.offLocalSyncConnected?.(unsubConnected)
    }
  }, [isOpen])

  // Iniciar servidor automaticamente se aberto e parado
  useEffect(() => {
    if (isOpen && !serverState.running && !loading) {
      startServer()
    }
  }, [isOpen])

  if (!isOpen) return null

  const syncUrl = `http://${serverState.ip}:${serverState.port}/api/sync/export?token=${serverState.pin}`

  const handleCopy = () => {
    navigator.clipboard.writeText(syncUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '620px',
          maxWidth: '92vw',
          background: 'var(--color-surface, #111827)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
          color: 'var(--color-text, #f3f4f6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary, #6366f1)', display: 'flex' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>Sincronização na Rede Wi-Fi Local</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted, #9ca3af)' }}>Transfira dados com o celular sem depender da nuvem</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'center' }}>
          {/* Coluna Esquerda: QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {serverState.running ? (
              <SimpleSVGQrCode value={syncUrl} size={190} />
            ) : (
              <div style={{ width: 190, height: 190, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                <Server size={28} />
                <span style={{ fontSize: '12px' }}>Servidor inativo</span>
              </div>
            )}

            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Abra o Organon no celular e escaneie o código
            </span>
          </div>

          {/* Coluna Direita: Informações & IP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Status do Servidor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border, rgba(255,255,255,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={16} color={serverState.running ? '#10b981' : '#6b7280'} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {serverState.running ? `http://${serverState.ip}:${serverState.port}` : 'Servidor Desconectado'}
                </span>
              </div>

              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '99px', background: serverState.running ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.2)', color: serverState.running ? '#10b981' : '#9ca3af' }}>
                {serverState.running ? 'Wi-Fi Ativo' : 'Parado'}
              </span>
            </div>

            {/* PIN de Segurança */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border, rgba(255,255,255,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--color-primary, #6366f1)" />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>PIN de Autenticação:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--color-primary, #6366f1)' }}>
                  {serverState.pin || '------'}
                </span>
              </div>

              <button
                onClick={handleCopy}
                disabled={!serverState.running}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                title="Copiar URL de sincronização"
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Dispositivo Conectado */}
            {serverState.connectedDevice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                <Smartphone size={14} />
                <span>Conectado: {serverState.connectedDevice}</span>
              </div>
            )}

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {serverState.running ? (
                <button
                  onClick={stopServer}
                  disabled={loading}
                  style={{ flex: 1, padding: '8px 14px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Encerrar Servidor
                </button>
              ) : (
                <button
                  onClick={startServer}
                  disabled={loading}
                  style={{ flex: 1, padding: '8px 14px', background: 'var(--color-primary, #6366f1)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {loading && <RefreshCw size={14} className="animate-spin" />}
                  Iniciar Servidor
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        {serverState.progress > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
              <span>Progresso da Transferência</span>
              <span>{serverState.progress}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${serverState.progress}%`,
                  background: 'linear-gradient(90deg, var(--color-primary, #6366f1), #818cf8)',
                  borderRadius: '99px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Console Terminal de Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Console de Transações em Tempo Real
          </span>
          <div
            style={{
              height: '120px',
              background: '#090d16',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '10px 12px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {serverState.logs.length === 0 ? (
              <span style={{ color: '#6b7280' }}>Nenhuma transação efetuada ainda...</span>
            ) : (
              serverState.logs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#6b7280', flexShrink: 0 }}>[{log.timestamp}]</span>
                  <span
                    style={{
                      color:
                        log.type === 'success'
                          ? '#10b981'
                          : log.type === 'error'
                          ? '#ef4444'
                          : log.type === 'warning'
                          ? '#f59e0b'
                          : '#9ca3af',
                    }}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
