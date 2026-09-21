import { useEffect, useState } from 'react'
import { Bot, RefreshCw, Send, Sparkles, Copy, Download, X, AlertCircle } from 'lucide-react'
import { MeetingIntelligenceData, ResearchScope } from '../../../services/meetingIntelligence/types'

interface Props {
  data: MeetingIntelligenceData
  hasProject: boolean
  allowWeb: boolean
  onAsk: (question: string, scope: ResearchScope) => Promise<void>
  onCancel: (id: string) => void
  onExport: () => string
}

export function MeetingResearchConsole({ data, hasProject, allowWeb, onAsk, onCancel, onExport }: Props) {
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState<ResearchScope>('web')
  const [status, setStatus] = useState('Verificando agente…')
  const [available, setAvailable] = useState(false)
  const [copied, setCopied] = useState(false)

  const refresh = () => {
    void (window.electronAPI as any)?.meetingAgentStatus?.()
      .then((value: { available: boolean; detail: string }) => {
        setAvailable(value.available)
        setStatus(value.detail)
      })
      .catch(() => setStatus('Não foi possível verificar o agente.'))
  }

  useEffect(refresh, [])

  const tasks = data.tasks || []
  const active = tasks.filter((task) => task.status === 'running' || task.status === 'queued')
  const canAsk =
    available &&
    question.trim().length >= 4 &&
    active.length < 4 &&
    (scope === 'web' ? allowWeb : scope === 'both' ? hasProject && allowWeb : hasProject)

  const submit = () => {
    if (canAsk) {
      void onAsk(question, scope)
      setQuestion('')
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      aria-label="Orquestração de agentes"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={15} style={{ color: 'var(--color-primary)' }} />
          <div>
            <strong style={{ fontSize: '12.5px', color: 'var(--color-text)' }}>Assistente IA da Reunião</strong>
            <div role="status" style={{ fontSize: '11px', color: available ? 'var(--color-text-muted)' : '#ef4444', marginTop: '2px' }}>
              {status}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="whisper-btn-outline"
          title="Verificar status do orquestrador de IA"
        >
          <RefreshCw size={11} />
          <span>Verificar Conexão</span>
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
      >
        <input
          aria-label="Pergunta para os agentes"
          maxLength={2000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Faça uma pergunta sobre o projeto ou web (ex: como funciona nossa auth?)..."
          className="whisper-input"
          style={{ flex: '1 1 260px' }}
        />

        <select
          aria-label="Fontes de pesquisa"
          value={scope}
          onChange={(event) => setScope(event.target.value as ResearchScope)}
          className="whisper-select"
        >
          <option value="web" disabled={!allowWeb}>
            Internet
          </option>
          <option value="project" disabled={!hasProject}>
            Pasta / Código
          </option>
          <option value="both" disabled={!hasProject || !allowWeb}>
            Internet + Pasta
          </option>
        </select>

        <button
          type="submit"
          disabled={!canAsk}
          className="whisper-btn-outline"
          style={{
            background: canAsk ? 'var(--color-primary)' : 'var(--color-surface)',
            color: canAsk ? '#ffffff' : 'var(--color-text-muted)',
            fontWeight: 700,
          }}
        >
          <Send size={12} />
          <span>Acionar Agentes</span>
        </button>
      </form>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!available || active.length >= 4}
          onClick={() => void onAsk('Gere o relatório desta reunião com respostas, evidências, decisões e pendências.', 'report')}
          className="whisper-btn-outline"
        >
          <Sparkles size={12} style={{ color: 'var(--color-primary)' }} />
          <span>Gerar Relatório com IA</span>
        </button>

        <button
          type="button"
          disabled={!data.findings.length}
          onClick={async () => {
            await navigator.clipboard.writeText(onExport())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="whisper-btn-outline"
        >
          <Copy size={12} />
          <span>{copied ? 'Relatório Copiado!' : 'Copiar Relatório com Fontes'}</span>
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
          className="whisper-btn-outline"
        >
          <Download size={12} />
          <span>Baixar Markdown</span>
        </button>
      </div>

      {tasks.slice(0, 6).map((task) => (
        <div
          key={task.id}
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <strong style={{ color: 'var(--color-text)' }}>{task.question}</strong>
            {['queued', 'running'].includes(task.status) && (
              <button
                type="button"
                onClick={() => onCancel(task.id)}
                className="whisper-btn-outline"
                style={{ padding: '2px 6px', fontSize: '10.5px' }}
              >
                <X size={10} />
                <span>Cancelar</span>
              </button>
            )}
            {task.status === 'failed' && (
              <button
                type="button"
                onClick={() => void onAsk(task.question, task.scope)}
                className="whisper-btn-outline"
                style={{ padding: '2px 6px', fontSize: '10.5px' }}
              >
                <RefreshCw size={10} />
                <span>Tentar novamente</span>
              </button>
            )}
          </div>
          <div
            role={task.status === 'failed' ? 'alert' : 'status'}
            style={{
              color: task.status === 'failed' ? '#ef4444' : 'var(--color-text-muted)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {task.status === 'failed' && <AlertCircle size={11} />}
            <span>{task.stage}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
