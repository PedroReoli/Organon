import React, { useEffect, useState } from 'react'

interface UpdateModalProps {
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ onClose }) => {
  const [checking, setChecking] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [currentVersion, setCurrentVersion] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadReady, setDownloadReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let progressListener: any = null
    let downloadedListener: any = null

    const check = async () => {
      setChecking(true)
      setError(null)
      try {
        const res = await (window as any).electronAPI?.checkForUpdates?.()
        if (res) {
          setCurrentVersion(res.currentVersion || '')
          setUpdateAvailable(res.updateAvailable || false)
          setUpdateInfo(res.updateInfo || null)
          if (res.isDev) {
            setError('Você está rodando em ambiente de desenvolvimento (npm run dev). O auto-updater é ativado na versão instalada.')
          }
        }
      } catch (err: any) {
        setError('Não foi possível consultar novas atualizações.')
      } finally {
        setChecking(false)
      }
    }

    check()

    if ((window as any).electronAPI?.onUpdateDownloadProgress) {
      progressListener = (window as any).electronAPI.onUpdateDownloadProgress((prog: { percent: number }) => {
        setDownloadProgress(prog.percent)
      })
    }

    if ((window as any).electronAPI?.onUpdateDownloaded) {
      downloadedListener = (window as any).electronAPI.onUpdateDownloaded(() => {
        setDownloading(false)
        setDownloadReady(true)
      })
    }

    return () => {
      if (progressListener && (window as any).electronAPI?.offUpdateDownloadProgress) {
        (window as any).electronAPI.offUpdateDownloadProgress(progressListener)
      }
      if (downloadedListener && (window as any).electronAPI?.offUpdateDownloaded) {
        (window as any).electronAPI.offUpdateDownloaded(downloadedListener)
      }
    }
  }, [])

  const handleStartDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await (window as any).electronAPI?.downloadUpdate?.()
      if (!res?.success) {
        setError(res?.error || 'Erro ao iniciar o download da atualização.')
        setDownloading(false)
      }
    } catch (err: any) {
      setError('Falha ao baixar a atualização.')
      setDownloading(false)
    }
  }

  const handleInstall = async () => {
    try {
      await (window as any).electronAPI?.installUpdate?.()
    } catch {
      setError('Erro ao solicitar instalação.')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--color-surface, #1e1e2d)',
          borderRadius: '16px',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          color: 'var(--color-text, #ffffff)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>Atualizações do Organon</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
                Versão atual: v{currentVersion || '1.0.0'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #94a3b8)',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {checking && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)' }}>
              Verificando se há novas versões disponíveis...
            </div>
          )}

          {!checking && error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {!checking && !updateAvailable && !error && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Você já está na versão mais recente!</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Organon v{currentVersion} está atualizado e seguro.
              </div>
            </div>
          )}

          {!checking && updateAvailable && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Nova versão disponível:</span>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '99px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#818cf8',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  v{updateInfo?.version || 'Nova'}
                </span>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontSize: '12px',
                  marginBottom: '16px',
                  lineHeight: '1.4',
                }}
              >
                ✓ <strong>Segurança Garantida</strong>: Um backup automático completo de todos os seus dados será criado antes da instalação.
              </div>

              {updateInfo?.releaseNotes && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    marginBottom: '16px',
                  }}
                >
                  {updateInfo.releaseNotes}
                </div>
              )}

              {downloading && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Baixando atualização...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${downloadProgress}%`,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {downloadReady && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    fontSize: '13px',
                    marginBottom: '16px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  Download concluído! Clique abaixo para instalar e reiniciar.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justify: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '99px',
              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.15))',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>

          {updateAvailable && !downloading && !downloadReady && (
            <button
              onClick={handleStartDownload}
              style={{
                padding: '8px 20px',
                borderRadius: '99px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              Atualizar Agora
            </button>
          )}

          {downloadReady && (
            <button
              onClick={handleInstall}
              style={{
                padding: '8px 20px',
                borderRadius: '99px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              Instalar e Reiniciar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
