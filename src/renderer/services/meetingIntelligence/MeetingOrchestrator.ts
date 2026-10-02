import { analyzeConversationTurn } from './contextAnalysis'
import { formatMeetingMemory } from './meetingMemory'
import type {
  AgentTaskResponse,
  MeetingIntelligenceData,
  MeetingMemoryDigest,
  MeetingResearchTask,
  ProjectContextConfig,
  ResearchScope,
  TopicInsight,
} from './types'

export type MeetingUpdateListener = (data: MeetingIntelligenceData) => void

const emptyData = (): MeetingIntelligenceData => ({
  schemaVersion: 2,
  questions: [], findings: [], decisions: [], actionItems: [], auditLog: [], tasks: [],
  topics: [], openQuestions: [], risks: [], contradictions: [], suggestions: [],
})

function normalizeData(data?: MeetingIntelligenceData): MeetingIntelligenceData {
  const base = emptyData()
  return {
    ...base,
    ...(data || {}),
    schemaVersion: 2,
    questions: data?.questions || [],
    findings: data?.findings || [],
    decisions: data?.decisions || [],
    actionItems: data?.actionItems || [],
    auditLog: data?.auditLog || [],
    tasks: data?.tasks || [],
    topics: data?.topics || [],
    openQuestions: data?.openQuestions || [],
    risks: data?.risks || [],
    contradictions: data?.contradictions || [],
    suggestions: data?.suggestions || [],
  }
}

export class MeetingOrchestrator {
  private listeners = new Set<MeetingUpdateListener>()
  private transcript: string[] = []
  private statements: string[] = []
  private seenStatements = new Set<string>()
  private recent = new Map<string, number>()
  private pending = Promise.resolve()
  private disposed = false
  private offProgress?: () => void
  private api = window.electronAPI as any
  private data = emptyData()

  constructor(private meetingTitle: string, private projectContext?: ProjectContextConfig) {
    this.offProgress = this.api?.onMeetingAgentProgress?.(({ id, stage }: { id: string; stage: string }) => {
      const task = this.data.tasks?.find(item => item.id === id)
      if (task?.status === 'running') { task.stage = stage; this.notify() }
    })
  }

  restore(data: MeetingIntelligenceData, transcript: string) {
    this.data = normalizeData(JSON.parse(JSON.stringify(data || emptyData())))
    this.data.tasks = (this.data.tasks || []).map(task => ['queued', 'running'].includes(task.status)
      ? { ...task, status: 'cancelled', stage: 'Sessão anterior encerrada' }
      : task)
    this.transcript = transcript ? [transcript] : []
    this.statements = transcript.split(/(?<=[.!?])\s+|\n+/).filter(Boolean).slice(-40)
    this.seenStatements = new Set(this.statements.map(item => item.trim().toLocaleLowerCase('pt-BR')))
    this.notify()
  }

  setTranscript(text: string) { this.transcript = text ? [text] : [] }
  setMemory(memory: MeetingMemoryDigest) { this.data.memory = memory; this.notify() }
  configure(config?: ProjectContextConfig) { this.projectContext = config }
  subscribe(listener: MeetingUpdateListener) { this.listeners.add(listener); listener(this.data); return () => { this.listeners.delete(listener) } }
  private notify() { if (!this.disposed) for (const listener of this.listeners) listener({ ...this.data }) }
  private log(action: string, details: string) {
    this.data.auditLog.unshift({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString('pt-BR'), action, details })
    this.data.auditLog = this.data.auditLog.slice(0, 100)
  }
  getData() { return this.data }

  async cancel(id: string) {
    const task = this.data.tasks?.find(item => item.id === id)
    if (!task || task.status === 'completed' || task.status === 'failed') return
    task.status = 'cancelled'; task.stage = 'Cancelada'; this.notify()
    await this.api?.meetingAgentCancel?.(id)
  }

  async handleSuggestion(id: string, action: 'accept' | 'dismiss') {
    const item = this.data.suggestions?.find(suggestion => suggestion.id === id)
    if (!item || item.status !== 'pending') return
    item.status = action === 'accept' ? 'accepted' : 'dismissed'
    if (action === 'dismiss') { this.log('SuggestionDismissed', item.type); this.notify(); return }
    if (item.type === 'confirm_decision') {
      const decision = this.data.decisions.find(candidate => candidate.text === item.sourceText)
      if (decision) { decision.confirmed = true; decision.origin = decision.origin || 'deterministic' }
    }
    this.log('SuggestionAccepted', item.type)
    this.notify()
    if (item.suggestedScope) await this.ask(item.sourceText, item.suggestedScope)
  }

  dispose() {
    this.disposed = true
    this.offProgress?.()
    this.data.tasks?.filter(task => task.status === 'running').forEach(task => { void this.api?.meetingAgentCancel?.(task.id) })
    this.listeners.clear()
  }

  exportReport(): string {
    const memory = this.data.memory
    return [
      `# ${this.meetingTitle}`,
      this.data.executiveSummary ? `## Resumo\n\n${this.data.executiveSummary}` : '',
      ...this.data.findings.map(finding => `## ${finding.question}\n\n${finding.summary}\n\n${finding.sources.map(source => `- [${source.title}](${source.pathOrUrl}) ${source.lineRange || ''}`).join('\n')}`),
      '## Decisões', ...this.data.decisions.map(item => `- ${item.confirmed ? '[confirmada] ' : '[revisar] '}${item.text}`),
      '## Ações', ...this.data.actionItems.map(item => `- [${item.status === 'done' ? 'x' : ' '}] ${item.task}${item.assignee ? ` — ${item.assignee}` : ''}${item.dueDate ? ` — ${item.dueDate}` : ''}`),
      '## Perguntas abertas', ...(this.data.openQuestions || []).filter(item => item.status === 'open').map(item => `- ${item.text}`),
      '## Riscos', ...(this.data.risks || []).filter(item => item.status === 'open').map(item => `- [${item.severity}] ${item.text}`),
      memory?.sourceMeetingIds.length ? `## Contexto anterior\n\n${formatMeetingMemory(memory)}` : '',
    ].filter(Boolean).join('\n\n')
  }

  ask(question: string, scope: ResearchScope, automatic = false): Promise<void> {
    const clean = question.trim()
    if (this.disposed || clean.length < 4) return Promise.resolve()
    const active = this.data.tasks!.filter(task => task.status === 'queued' || task.status === 'running')
    if (active.length >= 4) { this.log('QueueFull', 'Fila cheia. Aguarde as pesquisas atuais.'); this.notify(); return Promise.resolve() }
    const signature = `${scope}:${clean.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')}`
    if (automatic && Date.now() - (this.recent.get(signature) || 0) < 90_000) return Promise.resolve()
    this.recent.set(signature, Date.now())
    const task: MeetingResearchTask = { id: crypto.randomUUID(), question: clean, scope, status: 'queued', stage: 'Na fila' }
    this.data.tasks!.unshift(task)
    this.data.tasks = this.data.tasks!.slice(0, 40)
    this.data.questions.unshift({ id: task.id, text: clean, timestamp: new Date().toLocaleTimeString('pt-BR') })
    this.notify()
    this.pending = this.pending.then(async () => {
      if (this.disposed || task.status === 'cancelled') return
      task.status = 'running'; task.stage = 'Iniciando agentes'; this.data.currentTopic = clean; this.notify()
      try {
        if (!this.api?.meetingAgentRun) throw new Error('Abra o Organon desktop atualizado para usar os agentes.')
        const transcriptContext = scope === 'report' ? this.transcript.join(' ') : this.transcript.join(' ').slice(-6_000)
        const memoryContext = formatMeetingMemory(this.data.memory).slice(0, 6_000)
        const answer: AgentTaskResponse = await this.api.meetingAgentRun({
          id: task.id, question: clean, scope,
          projectPath: this.projectContext?.enabled ? this.projectContext.path : undefined,
          context: [transcriptContext, memoryContext].filter(Boolean).join('\n\n'),
          previousReport: scope === 'report' ? this.exportReport() : undefined,
          providerId: this.projectContext?.agentProviderId || 'auto',
          allowExternalAI: this.projectContext?.allowExternalAI === true,
          allowLocalAI: this.projectContext?.allowLocalAI !== false,
        })
        if (this.disposed || (task.status as string) === 'cancelled') return
        if (!answer.findings?.trim()) throw new Error('O agente não retornou uma resposta.')
        if (scope === 'report') answer.sources = Array.from(new Map([...this.data.findings.flatMap(finding => finding.sources), ...answer.sources].map(source => [source.pathOrUrl, source])).values())
        this.data.findings.unshift({ id: task.id, timestamp: new Date().toLocaleTimeString('pt-BR'), question: clean, summary: answer.findings, sources: answer.sources, confidence: 0.8, providerId: answer.providerId })
        task.status = 'completed'; task.stage = 'Concluída'; this.log('ResearchCompleted', `${scope}: ${answer.sources.length} fontes retornadas por ${answer.providerId || 'provedor automático'}.`)
      } catch (error) {
        if ((task.status as string) !== 'cancelled') { task.status = 'failed'; task.error = error instanceof Error ? error.message : 'Falha na pesquisa.'; task.stage = task.error }
        this.log('ResearchFailed', task.stage)
      } finally { this.notify() }
    })
    return this.pending
  }

  processTranscriptSnippet(snippet: string): Promise<void> {
    const text = snippet.trim()
    if (this.disposed || text.length < 5) return Promise.resolve()
    const statementKey = text.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
    if (this.seenStatements.has(statementKey)) return Promise.resolve()
    this.seenStatements.add(statementKey)
    if (this.seenStatements.size > 500) this.seenStatements = new Set([...this.seenStatements].slice(-300))
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    const insight = analyzeConversationTurn(text, {
      hasProject: Boolean(this.projectContext?.enabled && this.projectContext.path),
      allowWeb: this.projectContext?.allowExternalAI === true && this.projectContext?.allowWebResearch !== false,
      priorStatements: this.statements,
      openQuestions: (this.data.openQuestions || []).filter(item => item.status === 'open').map(item => item.text),
    })
    this.transcript.push(text)
    this.statements.push(text)
    this.statements = this.statements.slice(-40)
    this.mergeTopics(insight.topics, timestamp)
    if (insight.question && !(this.data.openQuestions || []).some(item => item.status === 'open' && item.text === text)) {
      this.data.openQuestions!.unshift({ id: crypto.randomUUID(), text, timestamp, status: 'open', confidence: insight.question.confidence })
    }
    if (insight.answeredQuestion) {
      const question = this.data.openQuestions!.find(item => item.status === 'open' && item.text === insight.answeredQuestion!.question)
      if (question) { question.status = 'answered'; question.answer = insight.answeredQuestion.answer }
    }
    if (insight.decision) this.data.decisions.unshift({ id: crypto.randomUUID(), text, timestamp, confirmed: false, confidence: insight.decision.confidence, origin: 'deterministic' })
    if (insight.action) this.data.actionItems.unshift({ id: crypto.randomUUID(), timestamp, task: insight.action.task, assignee: insight.action.assignee, dueDate: insight.action.dueDate, status: 'pending', confirmed: false, confidence: insight.action.confidence, origin: 'deterministic' })
    if (insight.risk) this.data.risks!.unshift({ ...insight.risk, id: crypto.randomUUID(), timestamp, status: 'open' })
    if (insight.contradiction) this.data.contradictions!.unshift({ ...insight.contradiction, id: crypto.randomUUID(), timestamp, status: 'review' })
    const mode = this.projectContext?.copilotMode || (this.projectContext?.automaticResearch ? 'automatic' : 'assist')
    if (mode !== 'manual') this.data.suggestions!.unshift(...insight.suggestions.map(item => ({ ...item, id: crypto.randomUUID(), timestamp, status: 'pending' as const })))
    this.data.suggestions = this.data.suggestions!.slice(0, 30)
    this.notify()
    if (mode === 'automatic' && insight.question) {
      if (insight.intent.intent === 'project_question' && this.projectContext?.enabled) void this.ask(text, 'project', true)
      else if (insight.intent.intent === 'external_tech_question' && this.projectContext?.allowExternalAI === true && this.projectContext.allowWebResearch !== false) void this.ask(text, 'web', true)
    }
    return Promise.resolve()
  }

  private mergeTopics(topics: ConversationAnalysisTopics, timestamp: string) {
    for (const topic of topics) {
      const existing = this.data.topics!.find(item => item.label === topic.label)
      if (existing) { existing.mentions += 1; existing.lastTimestamp = timestamp; existing.confidence = Math.max(existing.confidence, topic.confidence) }
      else this.data.topics!.push({ id: crypto.randomUUID(), label: topic.label, mentions: 1, lastTimestamp: timestamp, confidence: topic.confidence })
    }
    this.data.topics = this.data.topics!.sort((left, right) => right.mentions - left.mentions).slice(0, 20)
    this.data.currentTopic = this.data.topics[0]?.label || this.data.currentTopic
  }
}

type ConversationAnalysisTopics = Array<Pick<TopicInsight, 'label' | 'confidence'>>
