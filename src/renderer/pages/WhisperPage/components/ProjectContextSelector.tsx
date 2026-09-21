import { Folder, FolderOpen, Globe, Search, Volume2, Unlink } from 'lucide-react'
import { ProjectContextConfig } from '../../../services/meetingIntelligence/types'

const defaults: ProjectContextConfig = {
  enabled: false,
  name: '',
  path: '',
  allowWebResearch: true,
  automaticResearch: true,
  watchChanges: false,
  systemAudio: true,
  readOnly: true,
  agentProviderId: 'codex',
}

export function ProjectContextSelector({
  config,
  onChange,
}: {
  config?: ProjectContextConfig
  onChange: (config: ProjectContextConfig) => void
}) {
  const value = { ...defaults, ...config }
  const update = (patch: Partial<ProjectContextConfig>) => onChange({ ...value, ...patch })

  const chooseFolder = async () => {
    const folder = await window.electronAPI?.projectSelectFolder?.()
    if (folder) update({ path: folder.path, name: folder.name, enabled: true })
  }

  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      aria-label="Contexto da reunião"
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={15} style={{ color: 'var(--color-primary)' }} />
          <strong style={{ fontSize: '12.5px', color: 'var(--color-text)' }}>Contexto do Projeto & Pastas</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => void chooseFolder()}
            className="whisper-btn-outline"
          >
            {value.path ? <FolderOpen size={12} /> : <Folder size={12} />}
            <span>{value.path ? 'Trocar Pasta' : 'Vincular Pasta'}</span>
          </button>

          {value.path && (
            <button
              type="button"
              onClick={() => update({ enabled: false, path: '', name: '', watchChanges: false })}
              className="whisper-btn-outline"
              title="Desvincular pasta do contexto"
            >
              <Unlink size={12} />
              <span>Desvincular</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', overflowWrap: 'anywhere' }}>
        {value.path ? (
          <span>Pasta ativa: <strong style={{ color: 'var(--color-text)' }}>{value.path}</strong></span>
        ) : (
          <span>Nenhuma pasta vinculada. Pesquisa web disponível sem restrições.</span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '11.5px', color: 'var(--color-text)' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value.automaticResearch}
            onChange={(event) => update({ automaticResearch: event.target.checked })}
          />
          <Search size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span>Pesquisar perguntas da conversa</span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value.allowWebResearch}
            onChange={(event) => update({ allowWebResearch: event.target.checked })}
          />
          <Globe size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span>Usar internet</span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: value.path ? 'pointer' : 'not-allowed', opacity: value.path ? 1 : 0.6 }}>
          <input
            type="checkbox"
            checked={value.enabled}
            disabled={!value.path}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          <span>Analisar código da pasta</span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: value.enabled ? 'pointer' : 'not-allowed', opacity: value.enabled ? 1 : 0.6 }}>
          <input
            type="checkbox"
            checked={value.watchChanges}
            disabled={!value.enabled}
            onChange={(event) => update({ watchChanges: event.target.checked })}
          />
          <span>Acompanhar alterações</span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value.systemAudio}
            onChange={(event) => update({ systemAudio: event.target.checked })}
          />
          <Volume2 size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span>Capturar áudio do sistema</span>
        </label>
      </div>
    </div>
  )
}

