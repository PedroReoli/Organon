import { MeetingIntelligenceData, ProjectContextConfig, ResearchScope, MeetingResearchTask, AgentTaskResponse } from './types'
import { IntentRouter } from './IntentRouter'

export type MeetingUpdateListener = (data: MeetingIntelligenceData) => void
export class MeetingOrchestrator {
  private listeners = new Set<MeetingUpdateListener>()
  private transcript: string[] = []
  private recent = new Map<string, number>()
  private pending = Promise.resolve()
  private disposed = false
  private offProgress?: () => void
  private api = window.electronAPI as any
  private data: MeetingIntelligenceData = { questions: [], findings: [], decisions: [], actionItems: [], auditLog: [], tasks: [] }
  constructor(private meetingTitle: string, private projectContext?: ProjectContextConfig, _agentProviderId = 'auto') {
    this.offProgress = this.api?.onMeetingAgentProgress?.(({ id, stage }: { id: string; stage: string }) => {
      const task = this.data.tasks?.find(item => item.id === id)
      if (task?.status === 'running') { task.stage = stage; this.notify() }
    })
  }
  restore(data: MeetingIntelligenceData, transcript: string) {
    this.data = JSON.parse(JSON.stringify(data))
    this.data.tasks = (this.data.tasks || []).map(task => ['queued', 'running'].includes(task.status) ? { ...task, status: 'cancelled', stage: 'Sessão anterior encerrada' } : task)
    this.transcript = [transcript]
    this.notify()
  }
  setTranscript(text: string) { this.transcript = [text] }
  configure(config?: ProjectContextConfig) { this.projectContext = config }
  subscribe(listener: MeetingUpdateListener) { this.listeners.add(listener); listener(this.data); return () => { this.listeners.delete(listener) } }
  private notify() { if (!this.disposed) for (const listener of this.listeners) listener({ ...this.data }) }
  private log(action: string, details: string) { this.data.auditLog.unshift({ id: crypto.randomUUID(), timestamp: new Date().toLocaleTimeString('pt-BR'), action, details }); this.data.auditLog = this.data.auditLog.slice(0, 100) }
  getData() { return this.data }
  async cancel(id: string) {
    const task = this.data.tasks?.find(item => item.id === id)
    if (!task || task.status === 'completed' || task.status === 'failed') return
    task.status = 'cancelled'; task.stage = 'Cancelada'; this.notify()
    await this.api?.meetingAgentCancel?.(id)
  }
  dispose() {
    this.disposed = true
    this.offProgress?.()
    this.data.tasks?.filter(task => task.status === 'running').forEach(task => { void this.api?.meetingAgentCancel?.(task.id) })
    this.listeners.clear()
  }
  exportReport(): string {
    return [`# ${this.meetingTitle}`, ...this.data.findings.map(finding => `## ${finding.question}\n\n${finding.summary}\n\n${finding.sources.map(source => `- [${source.title}](${source.pathOrUrl}) ${source.lineRange || ''}`).join('\n')}`),
      '## Decisões', ...this.data.decisions.map(item => `- ${item.text}`), '## Ações', ...this.data.actionItems.map(item => `- [ ] ${item.task}`)].join('\n\n')
  }
  ask(question: string, scope: ResearchScope, automatic = false): Promise<void> {
    const clean = question.trim()
    if (this.disposed || clean.length < 4) return Promise.resolve()
    const active = this.data.tasks!.filter(task => task.status === 'queued' || task.status === 'running')
    if (active.length >= 4) { this.log('QueueFull', 'Fila cheia. Aguarde as pesquisas atuais.'); this.notify(); return Promise.resolve() }
    const signature = `${scope}:${clean.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')}`
    if (automatic && Date.now() - (this.recent.get(signature) || 0) < 90000) return Promise.resolve()
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
        const answer: AgentTaskResponse = await this.api.meetingAgentRun({ id: task.id, question: clean, scope,
          projectPath: this.projectContext?.enabled ? this.projectContext.path : undefined,
          context: scope === 'report' ? this.transcript.join(' ') : this.transcript.join(' ').slice(-6000), previousReport: scope === 'report' ? this.exportReport() : undefined })
        if (this.disposed || (task.status as string) === 'cancelled') return
        if (!answer.findings?.trim()) throw new Error('O agente não retornou uma resposta.')
        if (scope === 'report') answer.sources = Array.from(new Map([...this.data.findings.flatMap(finding => finding.sources), ...answer.sources].map(source => [source.pathOrUrl, source])).values())
        this.data.findings.unshift({ id: task.id, timestamp: new Date().toLocaleTimeString('pt-BR'), question: clean, summary: answer.findings, sources: answer.sources, confidence: 0 })
        task.status = 'completed'; task.stage = 'Concluída'; this.log('ResearchCompleted', `${scope}: ${answer.sources.length} fontes retornadas.`)
      } catch (error) {
        if ((task.status as string) !== 'cancelled') { task.status = 'failed'; task.error = error instanceof Error ? error.message : 'Falha na pesquisa.'; task.stage = task.error }
        this.log('ResearchFailed', task.stage)
      } finally { this.notify() }
    })
    return this.pending
  }
  async processTranscriptSnippet(snippet: string): Promise<void> {
    const text = snippet.trim()
    if (this.disposed || text.length < 5) return
    this.transcript.push(text)
    const result = IntentRouter.classifyTranscriptWindow(text)
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    if (result.intent === 'decision') { this.data.decisions.unshift({ id: crypto.randomUUID(), text, timestamp }); this.notify(); return }
    if (result.intent === 'action_item') { this.data.actionItems.unshift({ id: crypto.randomUUID(), timestamp, task: text, status: 'pending' }); this.notify(); return }
    if (this.projectContext?.automaticResearch === false) return
    if (result.intent === 'project_question' && this.projectContext?.enabled) {
      void this.ask(text, 'project', true)
    } else if (result.intent === 'external_tech_question' && this.projectContext?.allowWebResearch !== false) {
      void this.ask(text, 'web', true)
    }
  }
}
