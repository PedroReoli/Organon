import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleDashed,
  CircleOff,
  Copy,
  Download,
  FileSearch2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import type {
  MeetingIntelligenceData,
  MeetingProviderId,
  ResearchScope,
} from '../../../services/meetingIntelligence/types'

interface ProviderPolicyView {
  preferredProviderId: MeetingProviderId | 'auto'
  allowExternalAI: boolean
  allowLocalAI: boolean
}

interface ProviderStatusView {
  id: MeetingProviderId
  name: string
  available: boolean
  installed: boolean
  detail: string
  version?: string
  capabilities: { local: boolean }
}

interface Props {
  data: MeetingIntelligenceData
  hasProject: boolean
  allowWeb: boolean
  providerPolicy: ProviderPolicyView
  onAsk: (question: string, scope: ResearchScope) => Promise<void>
  onCancel: (id: string) => void
  onExport: () => string
}

interface MeetingAgentStatusResponse {
  available: boolean
  detail: string
  providers?: ProviderStatusView[]
}

type MeetingAgentStatusApi = typeof window.electronAPI & {
  meetingAgentStatus?: (policy: ProviderPolicyView) => Promise<MeetingAgentStatusResponse>
}

const providerCommand: Partial<Record<MeetingProviderId, string>> = {
  antigravity: 'agy',
  codex: 'codex',
  claude: 'claude',
  gemini: 'gemini',
  ollama: 'ollama',
}

function ProviderStateIcon({ provider }: { provider: ProviderStatusView }) {
  if (provider.available) return <CheckCircle2 size={15} />
  if (provider.installed) return <CircleDashed size={15} />
  return <CircleOff size={15} />
}

export function MeetingResearchConsole({
  data,
  hasProject,
  allowWeb,
  providerPolicy,
  onAsk,
  onCancel,
  onExport,
}: Props) {
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState<ResearchScope>('web')
  const [status, setStatus] = useState('Verificando as IAs instaladas…')
  const [available, setAvailable] = useState(false)
  const [providers, setProviders] = useState<ProviderStatusView[]>([])
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(() => {
    setIsRefreshing(true)
    const api = window.electronAPI as MeetingAgentStatusApi
    void api.meetingAgentStatus?.(providerPolicy)
      .then(value => {
        setAvailable(value.available)
        setStatus(value.detail)
        setProviders(value.providers || [])
      })
      .catch(() => {
        setAvailable(false)
        setStatus('Não foi possível verificar as IAs. Tente novamente.')
      })
      .finally(() => setIsRefreshing(false))
  }, [providerPolicy.allowExternalAI, providerPolicy.allowLocalAI, providerPolicy.preferredProviderId])

  useEffect(refresh, [refresh])

  const tasks = data.tasks || []
  const active = tasks.filter(task => task.status === 'running' || task.status === 'queued')
  const detectedProviders = useMemo(() => providers.filter(provider => provider.available), [providers])
  const policyLocked = !available && detectedProviders.some(provider => !provider.capabilities.local) && !providerPolicy.allowExternalAI
  const visibleStatus = policyLocked
    ? `${detectedProviders.length} IA${detectedProviders.length === 1 ? '' : 's'} detectada${detectedProviders.length === 1 ? '' : 's'}. Autorize IAs externas para usá-las nesta reunião.`
    : status
  const statusTone = available ? 'is-ready' : policyLocked ? 'is-locked' : 'is-error'
  const canAsk =
    available &&
    question.trim().length >= 4 &&
    active.length < 4 &&
    (scope === 'web' ? allowWeb : scope === 'both' ? hasProject && allowWeb : hasProject)

  const submit = () => {
    if (!canAsk) return
    void onAsk(question, scope)
    setQuestion('')
  }

  return (
    <section className="whisper-config-panel whisper-agent-console" aria-label="Orquestração de agentes">
      <div className="whisper-config-header whisper-agent-header">
        <span className="whisper-config-icon is-ai" aria-hidden="true"><Bot size={17} /></span>
        <span className="whisper-config-title">
          <strong>Agentes da reunião</strong>
          <span role="status" className={`whisper-agent-status ${statusTone}`}>
            {policyLocked && <LockKeyhole size={12} />}
            {visibleStatus}
          </span>
        </span>
        <button
          type="button"
          onClick={refresh}
          className="whisper-btn-quiet whisper-refresh-agents"
          title="Verificar novamente as IAs instaladas"
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
          <span>{isRefreshing ? 'Verificando' : 'Verificar'}</span>
        </button>
      </div>

      <div className="whisper-provider-grid" aria-label="IAs detectadas">
        {providers.map(provider => (
          <div
            key={provider.id}
            className={`whisper-provider ${provider.available ? 'is-ready' : provider.installed ? 'is-installed' : 'is-missing'}`}
            title={provider.detail}
          >
            <span className="whisper-provider-state" aria-hidden="true"><ProviderStateIcon provider={provider} /></span>
            <span className="whisper-provider-copy">
              <strong>{provider.name}</strong>
              <span>
                {providerCommand[provider.id] || provider.id}
                {' · '}
                {provider.available ? 'detectado' : provider.installed ? 'instalado' : 'não encontrado'}
              </span>
            </span>
            {provider.capabilities.local && <span className="whisper-provider-local">Local</span>}
          </div>
        ))}
      </div>

      <form
        className="whisper-agent-composer"
        onSubmit={event => {
          event.preventDefault()
          submit()
        }}
      >
        <label htmlFor="meeting-agent-question">
          <FileSearch2 size={14} />
          <span>Pesquisar e responder</span>
        </label>
        <div className="whisper-agent-composer-row">
          <input
            id="meeting-agent-question"
            maxLength={2000}
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Pergunte sobre a conversa, o projeto ou a internet…"
            className="whisper-input"
          />
          <select
            aria-label="Onde pesquisar"
            value={scope}
            onChange={event => setScope(event.target.value as ResearchScope)}
            className="whisper-select"
          >
            <option value="web" disabled={!allowWeb}>Internet</option>
            <option value="project" disabled={!hasProject}>Pasta vinculada</option>
            <option value="both" disabled={!hasProject || !allowWeb}>Pasta + internet</option>
          </select>
          <button type="submit" disabled={!canAsk} className="whisper-btn-primary">
            <Send size={14} />
            <span>Responder</span>
          </button>
        </div>
        {!available && (
          <span className="whisper-composer-hint">
            {policyLocked ? 'Ative “IAs externas” para liberar os provedores detectados.' : 'Nenhuma IA permitida está pronta para responder.'}
          </span>
        )}
      </form>

      <div className="whisper-agent-actions">
        <button
          type="button"
          disabled={!available || active.length >= 4}
          onClick={() => void onAsk('Gere o relatório desta reunião com respostas, evidências, decisões e pendências.', 'report')}
          className="whisper-btn-outline"
        >
          <Sparkles size={13} />
          <span>Gerar relatório</span>
        </button>
        <button
          type="button"
          disabled={!data.findings.length}
          onClick={async () => {
            await navigator.clipboard.writeText(onExport())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="whisper-btn-quiet"
        >
          <Copy size={13} />
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
        <button
          type="button"
          disabled={!data.findings.length}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([onExport()], { type: 'text/markdown;charset=utf-8' }))
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'relatorio-reuniao.md'
            anchor.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}
          className="whisper-btn-quiet"
        >
          <Download size={13} />
          <span>Markdown</span>
        </button>
      </div>

      {tasks.slice(0, 6).map(task => (
        <div key={task.id} className={`whisper-agent-task is-${task.status}`}>
          <div className="whisper-agent-task-heading">
            <strong>{task.question}</strong>
            {['queued', 'running'].includes(task.status) && (
              <button type="button" onClick={() => onCancel(task.id)} className="whisper-btn-quiet is-compact">
                <X size={12} />
                <span>Cancelar</span>
              </button>
            )}
            {task.status === 'failed' && (
              <button type="button" onClick={() => void onAsk(task.question, task.scope)} className="whisper-btn-quiet is-compact">
                <RefreshCw size={12} />
                <span>Tentar novamente</span>
              </button>
            )}
          </div>
          <div role={task.status === 'failed' ? 'alert' : 'status'} className="whisper-agent-task-status">
            {task.status === 'failed' && <AlertCircle size={13} />}
            <span>{task.stage}</span>
          </div>
        </div>
      ))}
    </section>
  )
}
