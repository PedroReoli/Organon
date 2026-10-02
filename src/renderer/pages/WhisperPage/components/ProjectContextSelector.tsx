import type { ReactNode } from 'react'
import {
  Bot,
  Cloud,
  FileCode2,
  Folder,
  FolderOpen,
  Globe,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Unlink,
  Volume2,
} from 'lucide-react'
import type { ProjectContextConfig } from '../../../services/meetingIntelligence/types'

const defaults: ProjectContextConfig = {
  enabled: false,
  name: '',
  path: '',
  allowWebResearch: true,
  automaticResearch: false,
  copilotMode: 'assist',
  watchChanges: false,
  systemAudio: true,
  readOnly: true,
  agentProviderId: 'auto',
  allowExternalAI: false,
  allowLocalAI: true,
  redactExternalAI: true,
}

interface PermissionToggleProps {
  checked: boolean
  disabled?: boolean
  icon: ReactNode
  title: string
  description: string
  onChange: (checked: boolean) => void
}

function PermissionToggle({
  checked,
  disabled = false,
  icon,
  title,
  description,
  onChange,
}: PermissionToggleProps) {
  return (
    <label className={`whisper-permission-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="whisper-permission-icon" aria-hidden="true">{icon}</span>
      <span className="whisper-permission-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="whisper-switch-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
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
    <section className="whisper-config-panel whisper-project-context" aria-label="Contexto da reunião">
      <div className="whisper-config-header">
        <span className="whisper-config-icon" aria-hidden="true"><FolderOpen size={17} /></span>
        <span className="whisper-config-title">
          <strong>Contexto da reunião</strong>
          <span>Escolha o que o copiloto pode ouvir, ler e pesquisar.</span>
        </span>
      </div>

      <div className={`whisper-folder-source ${value.path ? 'has-folder' : ''}`}>
        <span className="whisper-folder-source-icon" aria-hidden="true">
          {value.path ? <FolderOpen size={18} /> : <Folder size={18} />}
        </span>
        <span className="whisper-folder-source-copy">
          <strong>{value.path ? value.name || 'Pasta vinculada' : 'Nenhuma pasta vinculada'}</strong>
          <span title={value.path || undefined}>
            {value.path || 'Vincule um projeto para pesquisar documentos e código durante a conversa.'}
          </span>
        </span>
        <span className="whisper-folder-source-actions">
          <button type="button" onClick={() => void chooseFolder()} className="whisper-btn-outline">
            {value.path ? <RefreshCw size={13} /> : <FolderOpen size={13} />}
            <span>{value.path ? 'Trocar' : 'Vincular pasta'}</span>
          </button>
          {value.path && (
            <button
              type="button"
              onClick={() => update({ enabled: false, path: '', name: '', watchChanges: false })}
              className="whisper-btn-quiet"
              title="Desvincular pasta do contexto"
            >
              <Unlink size={13} />
              <span>Desvincular</span>
            </button>
          )}
        </span>
      </div>

      <div className="whisper-context-fields">
        <label className="whisper-field" htmlFor="meeting-provider">
          <span><Bot size={13} /> Provedor preferido</span>
          <select
            id="meeting-provider"
            value={value.agentProviderId}
            onChange={event => update({ agentProviderId: event.target.value as ProjectContextConfig['agentProviderId'] })}
            className="whisper-select"
          >
            <option value="auto">Escolher automaticamente</option>
            <option value="ollama">Ollama local</option>
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
            <option value="gemini">Gemini CLI</option>
            <option value="antigravity">Antigravity (agy)</option>
          </select>
        </label>

        <label className="whisper-field" htmlFor="copilot-mode">
          <span><ShieldCheck size={13} /> Comportamento do copiloto</span>
          <select
            id="copilot-mode"
            value={value.copilotMode}
            onChange={event => {
              const mode = event.target.value as ProjectContextConfig['copilotMode']
              update({ copilotMode: mode, automaticResearch: mode === 'automatic' })
            }}
            className="whisper-select"
            title="Automático executa pesquisas permitidas; Assistido sugere; Manual apenas registra."
          >
            <option value="assist">Assistido — sugere antes de agir</option>
            <option value="automatic">Automático — pesquisa durante a fala</option>
            <option value="manual">Manual — somente quando solicitado</option>
          </select>
        </label>
      </div>

      <div className="whisper-permissions-heading">
        <strong>Fontes e permissões</strong>
        <span>Valem somente para esta configuração de reunião.</span>
      </div>

      <div className="whisper-permission-grid">
        <PermissionToggle
          checked={Boolean(value.allowLocalAI)}
          icon={<HardDrive size={15} />}
          title="IA local"
          description="Usa o Ollama sem enviar conteúdo para fora."
          onChange={allowLocalAI => update({ allowLocalAI })}
        />
        <PermissionToggle
          checked={Boolean(value.allowExternalAI)}
          icon={<Cloud size={15} />}
          title="IAs externas"
          description="Libera Codex, Claude, Gemini e Antigravity nesta reunião."
          onChange={allowExternalAI => update({
            allowExternalAI,
            allowWebResearch: allowExternalAI ? value.allowWebResearch : false,
          })}
        />
        <PermissionToggle
          checked={Boolean(value.redactExternalAI)}
          disabled={!value.allowExternalAI}
          icon={<ShieldCheck size={15} />}
          title="Proteção de dados"
          description="Oculta documentos, contatos, chaves e caminhos pessoais."
          onChange={redactExternalAI => update({ redactExternalAI })}
        />
        <PermissionToggle
          checked={value.allowWebResearch}
          disabled={!value.allowExternalAI}
          icon={<Globe size={15} />}
          title="Pesquisa na internet"
          description="Permite consultar a web quando uma pergunta pedir contexto externo."
          onChange={allowWebResearch => update({ allowWebResearch })}
        />
        <PermissionToggle
          checked={value.enabled}
          disabled={!value.path}
          icon={<FileCode2 size={15} />}
          title="Ler a pasta vinculada"
          description="Pesquisa arquivos e código somente na pasta escolhida."
          onChange={enabled => update({ enabled })}
        />
        <PermissionToggle
          checked={Boolean(value.watchChanges)}
          disabled={!value.enabled}
          icon={<RefreshCw size={15} />}
          title="Acompanhar alterações"
          description="Atualiza o contexto quando arquivos da pasta mudarem."
          onChange={watchChanges => update({ watchChanges })}
        />
        <PermissionToggle
          checked={Boolean(value.systemAudio)}
          icon={<Volume2 size={15} />}
          title="Áudio do sistema"
          description="Inclui a fala das outras pessoas e o som compartilhado."
          onChange={systemAudio => update({ systemAudio })}
        />
      </div>
    </section>
  )
}
