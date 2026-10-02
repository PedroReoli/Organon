export type MeetingProviderId = 'codex' | 'claude' | 'gemini' | 'antigravity' | 'ollama'
export type CopilotMode = 'automatic' | 'assist' | 'manual'
export type InsightOrigin = 'deterministic' | 'ai' | 'manual'

export interface ProjectContextConfig {
  enabled: boolean
  name: string
  path: string
  allowWebResearch: boolean
  automaticResearch?: boolean
  watchChanges?: boolean
  systemAudio?: boolean
  readOnly: true
  agentProviderId?: MeetingProviderId | 'auto'
  allowExternalAI?: boolean
  allowLocalAI?: boolean
  copilotMode?: CopilotMode
  redactExternalAI?: boolean
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
  providerId?: MeetingProviderId
  privacy?: PrivacyRedactionReport
}

export interface PrivacyRedactionReport {
  applied: boolean
  total: number
  categories: Record<string, number>
}

export interface ActionItem {
  id: string
  timestamp: string
  task: string
  assignee?: string
  dueDate?: string
  status: 'pending' | 'done'
  sourceSegmentIds?: string[]
  confirmed?: boolean
  confidence?: number
  origin?: InsightOrigin
}

export interface DecisionItem {
  id: string
  text: string
  timestamp: string
  sourceSegmentIds?: string[]
  confirmed?: boolean
  confidence?: number
  origin?: InsightOrigin
}

export interface TopicInsight {
  id: string
  label: string
  mentions: number
  lastTimestamp: string
  confidence: number
}

export interface OpenQuestion {
  id: string
  text: string
  timestamp: string
  status: 'open' | 'answered' | 'dismissed'
  answer?: string
  confidence: number
  sourceSegmentIds?: string[]
}

export interface MeetingRisk {
  id: string
  text: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'mitigated' | 'dismissed'
  confidence: number
  sourceSegmentIds?: string[]
}

export interface MeetingContradiction {
  id: string
  previousStatement: string
  currentStatement: string
  timestamp: string
  status: 'review' | 'resolved' | 'dismissed'
  confidence: number
}

export interface CopilotSuggestion {
  id: string
  type: 'research_project' | 'research_web' | 'clarify' | 'confirm_decision' | 'assign_owner' | 'set_due_date' | 'risk_mitigation'
  title: string
  detail: string
  timestamp: string
  status: 'pending' | 'accepted' | 'dismissed'
  confidence: number
  suggestedScope?: Exclude<ResearchScope, 'report'>
  sourceText: string
}

export interface MeetingMemoryDigest {
  preparedAt: string
  sourceMeetingIds: string[]
  contextLabel: string
  decisions: string[]
  pendingActions: string[]
  openQuestions: string[]
  risks: string[]
}

export type ResearchScope = 'web' | 'project' | 'both' | 'report'
export interface MeetingResearchTask {
  id: string; question: string; scope: ResearchScope; status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; stage: string; error?: string
}
export interface MeetingIntelligenceData {
  schemaVersion?: 2
  tasks?: MeetingResearchTask[]
  currentTopic?: string
  questions: Array<{ id: string; text: string; timestamp: string }>
  findings: ProjectFinding[]
  executiveSummary?: string
  decisions: DecisionItem[]
  actionItems: ActionItem[]
  topics?: TopicInsight[]
  openQuestions?: OpenQuestion[]
  risks?: MeetingRisk[]
  contradictions?: MeetingContradiction[]
  suggestions?: CopilotSuggestion[]
  memory?: MeetingMemoryDigest
  auditLog: Array<{ id: string; timestamp: string; action: string; details: string }>
}

export interface AgentTaskResponse {
  findings: string
  sources: SourceAttribution[]
  providerId?: MeetingProviderId
  privacy?: PrivacyRedactionReport
}
