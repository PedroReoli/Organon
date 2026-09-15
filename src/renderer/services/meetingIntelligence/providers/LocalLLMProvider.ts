import { IAgentProvider, AgentTaskRequest, AgentTaskResponse } from '../types'
export class LocalLLMProvider implements IAgentProvider {
  readonly id = 'local' as const
  readonly name = 'Codex CLI — agente de reunião'
  async isAvailable(): Promise<boolean> { return !!(await (window.electronAPI as any)?.meetingAgentStatus?.())?.available }
  async analyze(req: AgentTaskRequest): Promise<AgentTaskResponse> {
    const api = window.electronAPI as any
    if (!api?.meetingAgentRun) throw new Error('Agente nativo indisponível.')
    return api.meetingAgentRun({ id: crypto.randomUUID(), question: req.searchQuery || req.transcriptSnippet, scope: req.intent === 'project_question' ? 'project' : 'web', projectPath: req.projectPath })
  }
}
