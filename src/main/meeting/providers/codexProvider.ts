import { meetingAgentStatus, resolveMeetingCodex, runMeetingCodex } from '../codexRunner'
import type { MeetingAgentProvider, ProviderCapabilities, ProviderRunOptions, ProviderStatus, ResearchAnswer } from './types'

export class CodexMeetingProvider implements MeetingAgentProvider {
  readonly id = 'codex' as const
  readonly name = 'Codex CLI'
  readonly capabilities: ProviderCapabilities = {
    local: false,
    web: true,
    projectContext: true,
    structuredOutput: true,
  }

  async status(): Promise<ProviderStatus> {
    const status = await meetingAgentStatus()
    let installed = false
    try { await resolveMeetingCodex(); installed = true } catch {}
    return {
      id: this.id,
      name: this.name,
      available: status.available,
      installed,
      authenticated: installed ? status.available : null,
      detail: status.detail,
      capabilities: this.capabilities,
    }
  }

  async run(prompt: string, options: ProviderRunOptions): Promise<ResearchAnswer> {
    const answer = await runMeetingCodex(prompt, options.web, options.signal, options.progress)
    return { ...answer, providerId: this.id }
  }
}
