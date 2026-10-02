import { useState } from 'react'
import {
  Activity,
  ChevronDown,
  FolderOpen,
  LockKeyhole,
  SlidersHorizontal,
  Wifi,
} from 'lucide-react'
import type {
  MeetingIntelligenceData,
  ProjectContextConfig,
  ResearchScope,
} from '../../../services/meetingIntelligence/types'
import { MeetingResearchConsole } from './MeetingResearchConsole'
import { ProjectContextSelector } from './ProjectContextSelector'

interface Props {
  config?: ProjectContextConfig
  data: MeetingIntelligenceData
  onChange: (config: ProjectContextConfig) => void
  onAsk: (question: string, scope: ResearchScope) => Promise<void>
  onCancel: (id: string) => void
  onExport: () => string
}

export function WhisperContextWorkspace({
  config,
  data,
  onChange,
  onAsk,
  onCancel,
  onExport,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const activeTasks = (data.tasks || []).filter(task => task.status === 'running' || task.status === 'queued').length
  const hasProject = Boolean(config?.enabled && config.path)
  const hasWebAccess = config?.allowExternalAI === true && config.allowWebResearch !== false

  return (
    <section className={`whisper-context-ribbon ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="whisper-context-ribbon-header"
        aria-expanded={isOpen}
        aria-controls="whisper-context-workspace"
        onClick={() => setIsOpen(value => !value)}
      >
        <span className="whisper-context-heading">
          <span className="whisper-context-heading-icon" aria-hidden="true">
            <SlidersHorizontal size={15} />
          </span>
          <span className="whisper-context-heading-copy">
            <strong>Contexto e agentes</strong>
            <span>Fontes, permissões e IAs desta sessão</span>
          </span>
        </span>

        <span className="whisper-context-summary">
          <span className={`whisper-context-badge ${config?.path ? 'is-ready' : ''}`}>
            <FolderOpen size={12} />
            <span>{config?.path ? config.name || 'Pasta vinculada' : 'Sem pasta'}</span>
          </span>
          <span className={`whisper-context-badge ${hasWebAccess ? 'is-web' : ''}`}>
            {hasWebAccess ? <Wifi size={12} /> : <LockKeyhole size={12} />}
            <span>{hasWebAccess ? 'Web autorizada' : 'Somente local'}</span>
          </span>
          {activeTasks > 0 && (
            <span className="whisper-context-badge is-active" aria-live="polite">
              <Activity size={12} />
              <span>{activeTasks} em execução</span>
            </span>
          )}
          <span className="whisper-context-toggle-label">
            <span>{isOpen ? 'Recolher' : 'Configurar'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </span>
        </span>
      </button>

      {isOpen && (
        <div id="whisper-context-workspace" className="whisper-context-ribbon-content">
          <ProjectContextSelector config={config} onChange={onChange} />
          <MeetingResearchConsole
            data={data}
            hasProject={hasProject}
            allowWeb={hasWebAccess}
            providerPolicy={{
              preferredProviderId: config?.agentProviderId || 'auto',
              allowExternalAI: config?.allowExternalAI === true,
              allowLocalAI: config?.allowLocalAI !== false,
            }}
            onAsk={onAsk}
            onCancel={onCancel}
            onExport={onExport}
          />
        </div>
      )}
    </section>
  )
}
