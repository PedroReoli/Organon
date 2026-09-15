import { useEffect, useState } from 'react'
import { WhisperServiceConfig } from '../../../services/whisperService'

type Model = { id: string; name: string; sizeMb: number; downloaded: boolean }
export function WhisperModelSettings({ config, onChange }: { config: WhisperServiceConfig; onChange: (config: WhisperServiceConfig) => void }) {
  const [models, setModels] = useState<Model[]>([])
  const [progress, setProgress] = useState<Record<string, { received: number; total: number }>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const api = window.electronAPI as any
  useEffect(() => {
    void api?.listWhisperModels().then(setModels).catch(() => setError('Não foi possível listar os modelos.'))
    const timer = window.setInterval(() => { void api?.whisperDownloadProgress().then(setProgress).catch(() => {}) }, 500)
    return () => window.clearInterval(timer)
  }, [])
  const download = async (id: string) => {
    setBusy(id); setError('')
    try { await api.downloadWhisperModel(id); setModels(await api.listWhisperModels()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha no download.') }
    finally { setBusy('') }
  }
  return <div style={{ display: 'grid', gap: 12 }}>
    <p>Modelos offline. Após o download, a transcrição funciona sem internet.</p>
    {models.map(model => <div key={model.id} style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <label><input type="radio" name="whisper-model" disabled={!model.downloaded} checked={config.provider === 'local' && config.model === model.id} onChange={() => onChange({ ...config, provider: 'local', model: model.id })} /> {model.name}</label>
        {!model.downloaded && <button disabled={!!busy} onClick={() => void download(model.id)}>{busy === model.id ? 'Baixando…' : 'Baixar'}</button>}
      </div>
      {busy === model.id && <><progress style={{ width: '100%' }} max={progress[model.id]?.total || undefined} value={progress[model.id]?.total ? progress[model.id].received : undefined} /><small>{((progress[model.id]?.received || 0) / 1048576).toFixed(1)} MB recebidos</small></>}
    </div>)}
    {error && <p role="alert">{error}</p>}
    {!api && <p>Abra o Organon desktop para instalar modelos locais.</p>}
  </div>
}
