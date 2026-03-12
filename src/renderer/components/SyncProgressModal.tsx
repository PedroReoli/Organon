import { useEffect, useState } from 'react'
import { pushAllToApi } from '../../api/sync'
import type { Settings } from '../types'
import type { PushProgress } from '../../api/sync'

interface Props {
  settings: Settings
}

export function SyncProgressModal({ settings }: Props) {
  const [status, setStatus] = useState<'pushing' | 'done' | 'error'>('pushing')
  const [progress, setProgress] = useState<PushProgress | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const rawStore = await window.electronAPI.loadStore()

        // Garante que o token está gravado no disco ANTES de qualquer coisa.
        // Sem isso, window.location.reload() carregaria o store sem o token
        // e o usuário seria deslogado.
        await window.electronAPI.saveStore({ ...rawStore, settings })

        // Carrega conteúdo das notas
        const noteContents = new Map<string, string>()
        await Promise.all(
          rawStore.notes.map(async (note) => {
            try {
              const content = await window.electronAPI.readNote(note.mdPath)
              noteContents.set(note.id, content ?? '')
            } catch { /* ignora falhas individuais */ }
          }),
        )

        // Envia todos os dados locais para a API, categoria por categoria
        await pushAllToApi(rawStore, noteContents, (p) => setProgress(p))

        // Salva lastSyncAt para que o startup sync saiba que já houve uma sync
        const syncedAt = new Date().toISOString()
        await window.electronAPI.saveStore({ ...rawStore, settings, lastSyncAt: syncedAt })

        setStatus('done')
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        console.error('[SyncModal] erro:', err)
        setErrorMsg((err as Error).message ?? 'Erro desconhecido')
        setStatus('error')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // roda apenas uma vez ao montar

  const pct =
    progress && progress.totalGroups > 0
      ? Math.round((progress.groupIndex / progress.totalGroups) * 100)
      : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-bg, #1e1e2e)',
        border: '1px solid var(--color-border, #313244)',
        borderRadius: 12, padding: '32px 40px',
        minWidth: 420, maxWidth: 520,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>

        {status === 'pushing' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--color-text, #cdd6f4)' }}>
              Sincronizando com a nuvem
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted, #a6adc8)', marginBottom: 20, minHeight: 20 }}>
              {progress
                ? `Enviando ${progress.label} — ${progress.count} ${progress.count === 1 ? 'item' : 'itens'}`
                : 'Preparando dados...'}
            </div>

            {/* Barra de progresso */}
            <div style={{
              background: 'var(--color-bg-secondary, #313244)',
              borderRadius: 6, height: 8, overflow: 'hidden',
            }}>
              <div style={{
                background: 'var(--color-accent, #89b4fa)',
                height: '100%', width: `${pct}%`,
                transition: 'width 0.35s ease',
                borderRadius: 6,
              }} />
            </div>

            {progress && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted, #a6adc8)', marginTop: 8 }}>
                {progress.groupIndex} de {progress.totalGroups} categorias
              </div>
            )}
          </>
        )}

        {status === 'done' && (
          <div style={{ fontSize: 15, color: 'var(--color-success, #a6e3a1)', fontWeight: 600 }}>
            Sincronização concluída!
          </div>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 15, color: 'var(--color-danger, #f38ba8)', fontWeight: 600, marginBottom: 8 }}>
              Erro na sincronização
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted, #a6adc8)', marginBottom: 20, wordBreak: 'break-word' }}>
              {errorMsg}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--color-accent, #89b4fa)', color: '#1e1e2e',
                border: 'none', borderRadius: 6, padding: '8px 20px',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}
            >
              Continuar mesmo assim
            </button>
          </>
        )}

      </div>
    </div>
  )
}
