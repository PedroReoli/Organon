import { createCliProviders } from './cliProviders'
import { CodexMeetingProvider } from './codexProvider'
import { OllamaMeetingProvider } from './ollamaProvider'
import type {
  MeetingAgentProvider,
  MeetingAgentProviderId,
  ProviderPolicy,
  ProviderStatus,
  ResearchAnswer,
} from './types'

export interface ProviderGatewayStatus {
  available: boolean
  detail: string
  recommendedProviderId?: MeetingAgentProviderId
  providers: ProviderStatus[]
}

const DEFAULT_ORDER: MeetingAgentProviderId[] = ['ollama', 'codex', 'claude', 'gemini', 'antigravity']

function normalizedPolicy(policy?: Partial<ProviderPolicy>): ProviderPolicy {
  return {
    preferredProviderId: policy?.preferredProviderId || 'auto',
    allowExternalAI: policy?.allowExternalAI === true,
    allowLocalAI: policy?.allowLocalAI !== false,
  }
}

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'falha não identificada'
  return message.replace(/[\r\n]+/g, ' ').slice(0, 240)
}

export class MeetingProviderGateway {
  constructor(private readonly providers: MeetingAgentProvider[] = [
    new OllamaMeetingProvider(),
    new CodexMeetingProvider(),
    ...createCliProviders(),
  ]) {}

  async status(policy?: Partial<ProviderPolicy>, web = false): Promise<ProviderGatewayStatus> {
    const resolvedPolicy = normalizedPolicy(policy)
    const providers = await Promise.all(this.providers.map(async provider => {
      try {
        return await provider.status()
      } catch (error) {
        return {
          id: provider.id,
          name: provider.name,
          available: false,
          installed: false,
          authenticated: null,
          detail: compactError(error),
          capabilities: provider.capabilities,
        } satisfies ProviderStatus
      }
    }))
    const eligible = this.orderedStatuses(providers, resolvedPolicy, web)
    const recommendedProviderId = eligible[0]?.id
    const detail = recommendedProviderId
      ? `${eligible[0].name} disponível${eligible.length > 1 ? `; ${eligible.length - 1} fallback(s) pronto(s)` : ''}.`
      : web && !resolvedPolicy.allowExternalAI
        ? 'Autorize IA externa e internet nesta reunião para pesquisar na web.'
        : 'Nenhum provedor permitido está disponível. Ative o Ollama local ou autorize uma IA externa.'
    return { available: Boolean(recommendedProviderId), detail, recommendedProviderId, providers }
  }

  async run(
    prompt: string,
    web: boolean,
    signal: AbortSignal,
    progress: (label: string) => void,
    policy?: Partial<ProviderPolicy>,
  ): Promise<ResearchAnswer> {
    if (!prompt.trim()) throw new Error('O pedido ao agente está vazio.')
    const resolvedPolicy = normalizedPolicy(policy)
    if (web && !resolvedPolicy.allowExternalAI) {
      throw new Error('A pesquisa web requer autorização explícita para IA externa nesta reunião.')
    }
    const status = await this.status(resolvedPolicy, web)
    const candidates = this.orderedStatuses(status.providers, resolvedPolicy, web)
    if (!candidates.length) throw new Error(status.detail)

    const failures: string[] = []
    for (const candidate of candidates) {
      signal.throwIfAborted()
      const provider = this.providers.find(item => item.id === candidate.id)
      if (!provider) continue
      try {
        progress(`Provedor ${provider.name}: iniciando`)
        return await provider.run(prompt, { web, signal, progress })
      } catch (error) {
        signal.throwIfAborted()
        failures.push(`${provider.name}: ${compactError(error)}`)
        progress(`${provider.name} falhou; tentando fallback permitido`)
      }
    }
    throw new Error(`Nenhum provedor concluiu. ${failures.join(' | ')}`.slice(0, 900))
  }

  private orderedStatuses(statuses: ProviderStatus[], policy: ProviderPolicy, web: boolean): ProviderStatus[] {
    const allowed = statuses.filter(status => {
      if (!status.available || (web && !status.capabilities.web)) return false
      return status.capabilities.local ? policy.allowLocalAI !== false : policy.allowExternalAI
    })
    const preferred = policy.preferredProviderId && policy.preferredProviderId !== 'auto'
      ? policy.preferredProviderId
      : undefined
    const order = preferred
      ? [preferred, ...DEFAULT_ORDER.filter(id => id !== preferred)]
      : DEFAULT_ORDER
    return [...allowed].sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
  }
}

const gateway = new MeetingProviderGateway()

export function meetingProviderStatus(policy?: Partial<ProviderPolicy>, web = false): Promise<ProviderGatewayStatus> {
  return gateway.status(policy, web)
}

export function runMeetingProvider(
  prompt: string,
  web: boolean,
  signal: AbortSignal,
  progress: (label: string) => void,
  policy?: Partial<ProviderPolicy>,
): Promise<ResearchAnswer> {
  return gateway.run(prompt, web, signal, progress, policy)
}
