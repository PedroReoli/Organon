import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  Radio,
  Sparkles,
} from 'lucide-react'
import type { MeetingIntelligenceData } from '../../../services/meetingIntelligence/types'
import type { LiveReport } from '../types/whisper.types'

interface Props {
  liveReport: LiveReport
  isLiveRecording: boolean
  intelligenceData: MeetingIntelligenceData
  onSuggestion: (id: string, action: 'accept' | 'dismiss') => void
}

export const LiveMeetingPanel = ({ liveReport, isLiveRecording, intelligenceData, onSuggestion }: Props) => {
  const openQuestions = (intelligenceData.openQuestions || []).filter(item => item.status === 'open')
  const currentQuestion = openQuestions[0]?.text || liveReport.currentQuestion
  const discussedConcepts = intelligenceData.topics?.length
    ? intelligenceData.topics.slice(0, 12).map(item => item.label)
    : liveReport.discussedConcepts
  const forgottenPoints = [
    ...(intelligenceData.risks || []).filter(item => item.status === 'open').map(item => `Risco ${item.severity}: ${item.text}`),
    ...(intelligenceData.contradictions || []).filter(item => item.status === 'review').map(item => `Revisar possível contradição: ${item.currentStatement}`),
    ...liveReport.forgottenPoints,
  ].slice(0, 12)
  const actionItems = intelligenceData.actionItems.length
    ? intelligenceData.actionItems
      .filter(item => item.status === 'pending')
      .map(item => `${item.task}${item.assignee ? ` — ${item.assignee}` : ''}${item.dueDate ? ` — prazo ${item.dueDate}` : ''}`)
    : liveReport.actionItems
  const suggestions = (intelligenceData.suggestions || []).filter(item => item.status === 'pending').slice(0, 4)
  const memory = intelligenceData.memory

  return (
    <div className="whisper-side-panel whisper-live-summary">
      <div className="whisper-side-panel-header">
        <div className="whisper-side-panel-heading">
          <span className="whisper-side-panel-icon" aria-hidden="true"><FileText size={16} /></span>
          <span>
            <strong>Ata da conversa</strong>
            <small>Atualizada conforme a reunião avança</small>
          </span>
        </div>
        {isLiveRecording && (
          <span className="whisper-live-pill"><Radio size={12} /><span>Ao vivo</span></span>
        )}
      </div>

      <div className="whisper-side-panel-content">
        {memory && memory.sourceMeetingIds.length > 0 && (
          <div className="whisper-memory-note">
            <Sparkles size={15} />
            <div>
              <strong>Contexto de {memory.contextLabel}</strong>
              <span>
                {memory.pendingActions.length} pendência(s), {memory.openQuestions.length} pergunta(s) e {memory.risks.length} risco(s) de {memory.sourceMeetingIds.length} reunião(ões).
              </span>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <section className="whisper-intelligence-section">
            <div className="whisper-intelligence-section-title">
              <span><Sparkles size={14} /></span>
              <strong>Sugestões do copiloto</strong>
              <span>{suggestions.length}</span>
            </div>
            <div className="whisper-intelligence-list">
              {suggestions.map(item => (
                <article key={item.id} className="whisper-copilot-suggestion">
                  <div><strong>{item.title}</strong><small>{Math.round(item.confidence * 100)}% de confiança</small></div>
                  <p>{item.detail}</p>
                  <div>
                    <button type="button" className="whisper-btn-outline" onClick={() => onSuggestion(item.id, 'accept')}>Aplicar</button>
                    <button type="button" className="whisper-btn-quiet" onClick={() => onSuggestion(item.id, 'dismiss')}>Ignorar</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="whisper-intelligence-section">
          <div className="whisper-intelligence-section-title">
            <span><HelpCircle size={14} /></span>
            <strong>Pergunta em aberto</strong>
            <span>{currentQuestion ? 1 : 0}</span>
          </div>
          {currentQuestion
            ? <div className="whisper-current-question">{currentQuestion}</div>
            : <div className="whisper-intelligence-empty">A pergunta atual aparecerá quando alguém pedir uma resposta.</div>}
        </section>

        <section className="whisper-intelligence-section">
          <div className="whisper-intelligence-section-title">
            <span><Lightbulb size={14} /></span>
            <strong>Assuntos abordados</strong>
            <span>{discussedConcepts.length}</span>
          </div>
          {discussedConcepts.length === 0 ? (
            <div className="whisper-intelligence-empty">Os principais assuntos serão organizados aqui.</div>
          ) : (
            <div className="whisper-topic-tags">{discussedConcepts.map(item => <span key={item}>{item}</span>)}</div>
          )}
        </section>

        <section className="whisper-intelligence-section">
          <div className="whisper-intelligence-section-title">
            <span className="is-warning"><AlertTriangle size={14} /></span>
            <strong>Pontos para revisar</strong>
            <span>{forgottenPoints.length}</span>
          </div>
          {forgottenPoints.length === 0 ? (
            <div className="whisper-intelligence-empty">Nenhum risco ou contradição precisa de atenção agora.</div>
          ) : (
            <ul className="whisper-summary-list is-warning">{forgottenPoints.map(item => <li key={item}>{item}</li>)}</ul>
          )}
        </section>

        <section className="whisper-intelligence-section">
          <div className="whisper-intelligence-section-title">
            <span className="is-ready"><CheckCircle2 size={14} /></span>
            <strong>Próximos passos</strong>
            <span>{actionItems.length}</span>
          </div>
          {actionItems.length === 0 ? (
            <div className="whisper-intelligence-empty">Tarefas e responsáveis confirmados aparecerão aqui.</div>
          ) : (
            <ul className="whisper-summary-list is-ready">{actionItems.map(item => <li key={item}>{item}</li>)}</ul>
          )}
        </section>
      </div>
    </div>
  )
}
