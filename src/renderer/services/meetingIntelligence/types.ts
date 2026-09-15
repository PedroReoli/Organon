export interface ProjectContextConfig {
  enabled: boolean
  name: string
  path: string
  allowWebResearch: boolean
  automaticResearch?: boolean
  watchChanges?: boolean
  systemAudio?: boolean
  readOnly: true
  agentProviderId?: 'codex' | 'antigravity' | 'local' | 'auto'
}

export type IntentType =
  | 'casual_chat'
  | 'project_question'
  | 'external_tech_question'
  | 'decision'
  | 'action_item'

export interface IntentDetectionResult {
  intent: IntentType
  confidence: number
  extractedTopic?: string
  searchQuery?: string
  assignee?: string
}

export interface SourceAttribution {
  type: 'project' | 'web'
  title: string
  pathOrUrl: string
  lineRange?: string
  snippet?: string
}

export interface ProjectFinding {
  id: string
  timestamp: string
  question: string
  summary: string
  sources: SourceAttribution[]
  confidence: number
}

export interface ActionItem {
  id: string
  timestamp: string
  task: string
  assignee?: string
  status: 'pending' | 'done'
}

export type ResearchScope = 'web' | 'project' | 'both' | 'report'
export interface MeetingResearchTask {
  id: string; question: string; scope: ResearchScope; status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; stage: string; error?: string
}
export interface MeetingIntelligenceData {
  tasks?: MeetingResearchTask[]
  currentTopic?: string
  questions: Array<{ id: string; text: string; timestamp: string }>
  findings: ProjectFinding[]
  decisions: Array<{ id: string; text: string; timestamp: string }>
  actionItems: ActionItem[]
  auditLog: Array<{ id: string; timestamp: string; action: string; details: string }>
}

export interface AgentTaskRequest {
  meetingTitle: string
  transcriptSnippet: string
  intent: IntentType
  projectPath?: string
  searchQuery?: string
}

export interface AgentTaskResponse {
  findings: string
  sources: SourceAttribution[]
}

export interface IAgentProvider {
  id: 'codex' | 'antigravity' | 'local' | 'auto'
  name: string
  isAvailable(): Promise<boolean>
  analyze(req: AgentTaskRequest): Promise<AgentTaskResponse>
}
