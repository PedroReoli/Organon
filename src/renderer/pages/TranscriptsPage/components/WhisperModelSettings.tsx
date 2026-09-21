import { useEffect, useState } from 'react'
import { Download, Loader2, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react'
import { WhisperServiceConfig } from '../../../services/whisperService'

type Model = { id: string; name: string; sizeMb: number; downloaded: boolean }

export function WhisperModelSettings({
  config,
  onChange,
}: {
  config: WhisperServiceConfig
  onChange: (config: WhisperServiceConfig) => void
}) {
  const [models, setModels] = useState<Model[]>([])
  const [progress, setProgress] = useState<Record<string, { received: number; total: number }>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const api = window.electronAPI as any

  useEffect(() => {
    void api?.listWhisperModels()
      .then(setModels)
      .catch(() => setError('Não foi possível listar os modelos.'))

    const timer = window.setInterval(() => {
      void api?.whisperDownloadProgress()
        .then(setProgress)
        .catch(() => {})
    }, 500)

    return () => window.clearInterval(timer)
  }, [])

  const download = async (id: string) => {
    setBusy(id)
    setError('')
    try {
      await api.downloadWhisperModel(id)
      setModels(await api.listWhisperModels())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no download.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
        <HardDrive size={14} style={{ color: 'var(--color-primary)' }} />
        <span>Modelos offline rodam 100% no seu computador, com total privacidade e sem internet.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {models.map((model) => {
          const isSelected = config.provider === 'local' && config.model === model.id
          const modelProgress = progress[model.id]
          const percent = modelProgress?.total
            ? Math.round((modelProgress.received / modelProgress.total) * 100)
            : 0

          return (
            <div
              key={model.id}
              className={`wsm-model-item ${isSelected ? 'active' : ''}`}
            >
              <div className="wsm-model-header">
                <label className="wsm-model-label-box">
                  <input
                    type="radio"
                    name="whisper-model"
                    disabled={!model.downloaded}
                    checked={isSelected}
                    onChange={() => onChange({ ...config, provider: 'local', model: model.id })}
                    style={{ accentColor: 'var(--color-primary)', cursor: model.downloaded ? 'pointer' : 'not-allowed' }}
                  />
                  <div>
                    <span className="wsm-model-name">{model.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                      ({model.sizeMb} MB)
                    </span>
                  </div>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {model.downloaded ? (
                    <span className="wsm-model-badge ready" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={11} />
                      <span>Instalado</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => void download(model.id)}
                      className="wsm-model-btn-download"
                    >
                      {busy === model.id ? (
                        <>
                          <Loader2 size={12} className="spin" />
                          <span>Baixando...</span>
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          <span>Baixar Modelo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {busy === model.id && (
                <div style={{ marginTop: '4px' }}>
                  <div className="wsm-progress-bar-wrap">
                    <div
                      className="wsm-progress-bar-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <span>{percent}% concluído</span>
                    <span>
                      {((modelProgress?.received || 0) / 1048576).toFixed(1)} MB / {model.sizeMb} MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {!api && (
        <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
          Abra o Organon no desktop (Electron) para instalar e gerenciar modelos locais.
        </p>
      )}
    </div>
  )
}

