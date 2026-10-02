import { useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  HelpCircle,
  History,
  Link2,
  ListTodo,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { MeetingIntelligenceData } from '../../../services/meetingIntelligence/types'
import { MeetingAuditLogModal } from './MeetingAuditLogModal'

interface Props {
  data: MeetingIntelligenceData
  agentProviderName?: string
}

type FilterMode = 'all' | 'findings' | 'decisions' | 'actions'

function IntelligenceSection({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="whisper-intelligence-section">
      <div className="whisper-intelligence-section-title">
        <span aria-hidden="true">{icon}</span>
        <strong>{title}</strong>
        <span>{count}</span>
      </div>
      {children}
    </section>
  )
}

function EmptyPanelState({ children }: { children: ReactNode }) {
  return <div className="whisper-intelligence-empty">{children}</div>
}

export const MeetingIntelligencePanel = ({ data, agentProviderName = 'Seleção automática' }: Props) => {
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const openSource = async (pathOrUrl: string) => {
    if (pathOrUrl.startsWith('file://')) {
      const withoutHash = pathOrUrl.split('#', 1)[0]
      const decoded = decodeURIComponent(withoutHash.replace(/^file:\/\/\/+/, ''))
      const normalized = decoded.replace(/^\/([A-Za-z]:)/, '$1')
      if (window.electronAPI?.openPath) {
        await window.electronAPI.openPath(normalized)
        return
      }
    }
    await window.electronAPI?.openExternal?.(pathOrUrl)
  }

  const handleCopySummary = async () => {
    const textLines: string[] = ['=== INTELIGÊNCIA DA REUNIÃO ===']
    if (data.currentTopic) textLines.push(`Tópico atual: ${data.currentTopic}`)
    if (data.executiveSummary) textLines.push('', data.executiveSummary)

    if (data.findings.length) {
      textLines.push('', `--- RESPOSTAS (${data.findings.length}) ---`)
      data.findings.forEach(finding => {
        textLines.push(`• ${finding.question}`, `  ${finding.summary}`)
        finding.sources.forEach(source => textLines.push(`  Fonte: ${source.title} — ${source.pathOrUrl} ${source.lineRange || ''}`))
      })
    }
    if (data.decisions.length) {
      textLines.push('', `--- DECISÕES (${data.decisions.length}) ---`)
      data.decisions.forEach(decision => textLines.push(`• ${decision.text}`))
    }
    if (data.actionItems.length) {
      textLines.push('', `--- AÇÕES (${data.actionItems.length}) ---`)
      data.actionItems.forEach(action => textLines.push(`[ ] ${action.task}`))
    }

    await navigator.clipboard.writeText(textLines.join('\n'))
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const filters: Array<{ id: FilterMode; label: string; count?: number }> = [
    { id: 'all', label: 'Visão geral' },
    { id: 'findings', label: 'Respostas', count: data.findings.length },
    { id: 'decisions', label: 'Decisões', count: data.decisions.length },
    { id: 'actions', label: 'Tarefas', count: data.actionItems.length },
  ]

  return (
    <div className="whisper-side-panel">
      {isAuditOpen && <MeetingAuditLogModal logs={data.auditLog} onClose={() => setIsAuditOpen(false)} />}

      <div className="whisper-side-panel-header">
        <div className="whisper-side-panel-heading">
          <span className="whisper-side-panel-icon" aria-hidden="true"><Sparkles size={16} /></span>
          <span>
            <strong>Inteligência da reunião</strong>
            <small>{agentProviderName}</small>
          </span>
        </div>
        <div className="whisper-side-panel-actions">
          <button type="button" onClick={() => void handleCopySummary()} className="whisper-btn-quiet" title="Copiar relatório">
            <Copy size={13} />
            <span>{copyFeedback ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button type="button" onClick={() => setIsAuditOpen(true)} className="whisper-btn-quiet" title="Ver auditoria">
            <History size={13} />
            <span>{data.auditLog.length}</span>
          </button>
        </div>
      </div>

      <div className="whisper-filter-tabs" role="tablist" aria-label="Filtrar inteligência">
        {filters.map(filter => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={filterMode === filter.id}
            className={filterMode === filter.id ? 'is-active' : ''}
            onClick={() => setFilterMode(filter.id)}
          >
            <span>{filter.label}</span>
            {filter.count !== undefined && <small>{filter.count}</small>}
          </button>
        ))}
      </div>

      <div className="whisper-side-panel-content">
        {(data.currentTopic || data.executiveSummary) && (
          <div className="whisper-topic-focus">
            <span aria-hidden="true"><MessageSquareText size={15} /></span>
            <div>
              {data.currentTopic && <strong>{data.currentTopic}</strong>}
              {data.executiveSummary && <p>{data.executiveSummary}</p>}
            </div>
          </div>
        )}

        {filterMode === 'all' && (
          <IntelligenceSection icon={<HelpCircle size={14} />} title="Perguntas detectadas" count={data.questions.length}>
            {data.questions.length === 0 ? (
              <EmptyPanelState>As perguntas da conversa aparecerão aqui.</EmptyPanelState>
            ) : (
              <div className="whisper-intelligence-list">
                {data.questions.slice(0, 5).map(question => (
                  <div key={question.id} className="whisper-question-row">
                    <span>?</span>
                    <div><strong>{question.text}</strong><small>{question.timestamp}</small></div>
                  </div>
                ))}
              </div>
            )}
          </IntelligenceSection>
        )}

        {(filterMode === 'all' || filterMode === 'findings') && (
          <IntelligenceSection icon={<FileText size={14} />} title="Respostas com fontes" count={data.findings.length}>
            {data.findings.length === 0 ? (
              <EmptyPanelState>Faça uma pergunta ou inicie a reunião para pesquisar com fontes.</EmptyPanelState>
            ) : (
              <div className="whisper-intelligence-list">
                {data.findings.map(finding => (
                  <article key={finding.id} className="whisper-finding-card">
                    <strong>{finding.question}</strong>
                    <p>{finding.summary}</p>
                    {finding.privacy?.applied && (
                      <span className="whisper-privacy-note"><ShieldCheck size={12} /> {finding.privacy.total} dado(s) ocultado(s)</span>
                    )}
                    {finding.sources.length > 0 && (
                      <div className="whisper-finding-sources">
                        {finding.sources.map((source, index) => (
                          <button key={`${source.pathOrUrl}-${index}`} type="button" onClick={() => void openSource(source.pathOrUrl)}>
                            <Link2 size={12} />
                            <span>{source.title}{source.lineRange ? ` · ${source.lineRange}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </IntelligenceSection>
        )}

        {(filterMode === 'all' || filterMode === 'decisions') && (
          <IntelligenceSection icon={<ClipboardCheck size={14} />} title="Decisões" count={data.decisions.length}>
            {data.decisions.length === 0 ? (
              <EmptyPanelState>Decisões confirmadas durante a conversa aparecerão aqui.</EmptyPanelState>
            ) : (
              <div className="whisper-intelligence-list">
                {data.decisions.map(decision => (
                  <div key={decision.id} className="whisper-decision-row"><CheckCircle2 size={14} /><span>{decision.text}</span></div>
                ))}
              </div>
            )}
          </IntelligenceSection>
        )}

        {(filterMode === 'all' || filterMode === 'actions') && (
          <IntelligenceSection icon={<ListTodo size={14} />} title="Próximos passos" count={data.actionItems.length}>
            {data.actionItems.length === 0 ? (
              <EmptyPanelState>Tarefas, responsáveis e prazos aparecerão aqui.</EmptyPanelState>
            ) : (
              <div className="whisper-intelligence-list">
                {data.actionItems.map(action => (
                  <div key={action.id} className="whisper-action-row">
                    <span className={action.status === 'done' ? 'is-done' : ''} />
                    <div>
                      <strong>{action.task}</strong>
                      {(action.assignee || action.dueDate) && <small>{[action.assignee, action.dueDate].filter(Boolean).join(' · ')}</small>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </IntelligenceSection>
        )}
      </div>
    </div>
  )
}
