import { useEffect, useState } from 'react'
import { MeetingIntelligenceData, ResearchScope } from '../../../services/meetingIntelligence/types'
interface Props {
  data: MeetingIntelligenceData; hasProject: boolean; allowWeb: boolean
  onAsk: (question: string, scope: ResearchScope) => Promise<void>; onCancel: (id: string) => void; onExport: () => string
}
export function MeetingResearchConsole({ data, hasProject, allowWeb, onAsk, onCancel, onExport }: Props) {
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState<ResearchScope>('web')
  const [status, setStatus] = useState('Verificando agente…')
  const [available, setAvailable] = useState(false)
  const [copied, setCopied] = useState(false)
  const refresh = () => { void (window.electronAPI as any)?.meetingAgentStatus?.().then((value: { available: boolean; detail: string }) => { setAvailable(value.available); setStatus(value.detail) }).catch(() => setStatus('Não foi possível verificar o agente.')) }
  useEffect(refresh, [])
  const tasks = data.tasks || []
  const active = tasks.filter(task => task.status === 'running' || task.status === 'queued')
  const canAsk = available && question.trim().length >= 4 && active.length < 4 && (scope === 'web' ? allowWeb : scope === 'both' ? hasProject && allowWeb : hasProject)
  const submit = () => { if (canAsk) { void onAsk(question, scope); setQuestion('') } }
  return <section style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, display: 'grid', gap: 10 }} aria-label="Orquestração de agentes">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><strong>Assistente da reunião</strong><div role="status" style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{status}</div></div>
      <button onClick={refresh}>Verificar conexão</button>
    </div>
    <form onSubmit={event => { event.preventDefault(); submit() }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <input aria-label="Pergunta para os agentes" maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ex.: compare nossa autenticação com a documentação oficial" style={{ flex: '1 1 260px', minWidth: 0, padding: 10, background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 6 }} />
      <select aria-label="Fontes de pesquisa" value={scope} onChange={event => setScope(event.target.value as ResearchScope)}>
        <option value="web" disabled={!allowWeb}>Internet</option><option value="project" disabled={!hasProject}>Pasta / código</option><option value="both" disabled={!hasProject || !allowWeb}>Internet + pasta</option>
      </select>
      <button type="submit" disabled={!canAsk}>Acionar agentes</button>
    </form>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button disabled={!available || active.length >= 4} onClick={() => void onAsk('Gere o relatório desta reunião com respostas, evidências, decisões e pendências.', 'report')}>Gerar relatório com IA</button>
      <button disabled={!data.findings.length} onClick={async () => { await navigator.clipboard.writeText(onExport()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? 'Relatório copiado' : 'Copiar relatório com fontes'}</button>
      <button disabled={!data.findings.length} onClick={() => { const url = URL.createObjectURL(new Blob([onExport()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'relatorio-reuniao.md'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }}>Baixar Markdown</button>
    </div>
    {tasks.slice(0, 6).map(task => <div key={task.id} style={{ paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{task.question}</strong>{['queued', 'running'].includes(task.status) && <button onClick={() => onCancel(task.id)}>Cancelar</button>}{task.status === 'failed' && <button onClick={() => void onAsk(task.question, task.scope)}>Tentar novamente</button>}</div>
      <div role={task.status === 'failed' ? 'alert' : 'status'} style={{ color: task.status === 'failed' ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)', marginTop: 4 }}>{task.stage}</div>
    </div>)}
  </section>
}
