export type MeetingAgentProviderId = 'codex' | 'claude' | 'gemini' | 'antigravity' | 'ollama'

export interface ResearchSource {
  type: 'web' | 'project'
  title: string
  pathOrUrl: string
  snippet?: string
  lineRange?: string
}

export interface ResearchAnswer {
  findings: string
  sources: ResearchSource[]
  providerId?: MeetingAgentProviderId
}

export interface ProviderCapabilities {
  local: boolean
  web: boolean
  projectContext: boolean
  structuredOutput: boolean
}

export interface ProviderStatus {
  id: MeetingAgentProviderId
  name: string
  available: boolean
  installed: boolean
  authenticated: boolean | null
  version?: string
  detail: string
  capabilities: ProviderCapabilities
  models?: string[]
}

export interface ProviderRunOptions {
  web: boolean
  signal: AbortSignal
  progress: (label: string) => void
}

export interface MeetingAgentProvider {
  readonly id: MeetingAgentProviderId
  readonly name: string
  readonly capabilities: ProviderCapabilities
  status(): Promise<ProviderStatus>
  run(prompt: string, options: ProviderRunOptions): Promise<ResearchAnswer>
}

export interface ProviderPolicy {
  preferredProviderId?: MeetingAgentProviderId | 'auto'
  allowExternalAI: boolean
  allowLocalAI?: boolean
}
