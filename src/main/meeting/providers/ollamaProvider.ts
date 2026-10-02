import { resolveCommand } from './cliRuntime'
import { parseResearchAnswer, RESEARCH_JSON_INSTRUCTION } from './structuredResponse'
import type { MeetingAgentProvider, ProviderCapabilities, ProviderRunOptions, ProviderStatus, ResearchAnswer } from './types'

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>
}

const OLLAMA_URL = 'http://127.0.0.1:11434'

async function listModels(timeoutMs = 2_500): Promise<string[]> {
  const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json() as OllamaTagsResponse
  return (payload.models || []).map(item => item.name || item.model || '').filter(Boolean)
}

export class OllamaMeetingProvider implements MeetingAgentProvider {
  readonly id = 'ollama' as const
  readonly name = 'Ollama local'
  readonly capabilities: ProviderCapabilities = {
    local: true,
    web: false,
    projectContext: true,
    structuredOutput: true,
  }

  async status(): Promise<ProviderStatus> {
    const command = await resolveCommand({
      envKey: 'ORGANON_OLLAMA_PATH',
      commands: ['ollama'],
      knownPaths: process.platform === 'win32' && process.env.LOCALAPPDATA
        ? [`${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`]
        : [],
    })
    try {
      const models = await listModels()
      return {
        id: this.id,
        name: this.name,
        available: models.length > 0,
        installed: Boolean(command),
        authenticated: true,
        version: command?.version,
        detail: models.length ? `${models.length} modelo(s) local(is) disponível(is).` : 'Ollama está ativo, mas não possui modelos.',
        capabilities: this.capabilities,
        models,
      }
    } catch {
      return {
        id: this.id,
        name: this.name,
        available: false,
        installed: Boolean(command),
        authenticated: true,
        version: command?.version,
        detail: command ? 'Ollama instalado, mas o serviço local não está ativo.' : 'Ollama não encontrado.',
        capabilities: this.capabilities,
        models: [],
      }
    }
  }

  async run(prompt: string, options: ProviderRunOptions): Promise<ResearchAnswer> {
    if (options.web) throw new Error('Ollama local não acessa a internet.')
    const models = await listModels()
    const preferredModel = process.env.ORGANON_OLLAMA_MODEL?.trim()
    const model = preferredModel && models.includes(preferredModel) ? preferredModel : models[0]
    if (!model) throw new Error('Instale ao menos um modelo no Ollama.')
    options.progress(`Ollama: analisando com ${model}`)
    const timeout = AbortSignal.timeout(180_000)
    const signal = AbortSignal.any([options.signal, timeout])
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        prompt: `${RESEARCH_JSON_INSTRUCTION}\n\n${prompt}`,
        stream: false,
        format: {
          type: 'object',
          required: ['findings', 'sources'],
          properties: {
            findings: { type: 'string' },
            sources: { type: 'array', items: { type: 'object' } },
          },
        },
        options: { num_predict: 2_048, temperature: 0.2 },
      }),
    })
    if (!response.ok) throw new Error(`Ollama retornou HTTP ${response.status}.`)
    const payload = await response.json() as { response?: string }
    return { ...parseResearchAnswer(payload.response || ''), providerId: this.id }
  }
}
