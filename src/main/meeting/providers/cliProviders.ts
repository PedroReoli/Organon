import * as path from 'path'

import { resolveCommand, runCli, runProbe, type ResolvedCommand } from './cliRuntime'
import { parseResearchAnswer, RESEARCH_JSON_INSTRUCTION } from './structuredResponse'
import type {
  MeetingAgentProvider,
  MeetingAgentProviderId,
  ProviderCapabilities,
  ProviderRunOptions,
  ProviderStatus,
  ResearchAnswer,
} from './types'

interface CliProviderOptions {
  id: Exclude<MeetingAgentProviderId, 'codex' | 'ollama'>
  name: string
  envKey: string
  commands: string[]
  web: boolean
  extensionPaths?: Array<{ prefix: string; relativePath: string }>
}

function unwrapProviderOutput(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const key of ['result', 'response', 'content', 'text']) {
      if (typeof parsed[key] === 'string') return parsed[key] as string
    }
  } catch {}
  return raw
}

export class CliMeetingProvider implements MeetingAgentProvider {
  readonly id: CliProviderOptions['id']
  readonly name: string
  readonly capabilities: ProviderCapabilities

  constructor(private readonly options: CliProviderOptions) {
    this.id = options.id
    this.name = options.name
    this.capabilities = { local: false, web: options.web, projectContext: true, structuredOutput: true }
  }

  async status(): Promise<ProviderStatus> {
    const command = await this.resolve()
    if (!command) return this.makeStatus(false, false, null, 'CLI não encontrada.')
    let authenticated: boolean | null = null
    let detail = 'CLI instalada; autenticação será confirmada na primeira execução.'
    if (this.id === 'claude') {
      try {
        const output = JSON.parse(await runProbe(command.path, ['auth', 'status', '--json'])) as { loggedIn?: boolean }
        authenticated = output.loggedIn === true
        detail = authenticated ? 'Claude Code conectado.' : 'Claude Code sem autenticação.'
      } catch {
        authenticated = false
        detail = 'Não foi possível confirmar a autenticação do Claude Code.'
      }
    }
    return this.makeStatus(authenticated !== false, true, authenticated, detail, command.version)
  }

  async run(prompt: string, options: ProviderRunOptions): Promise<ResearchAnswer> {
    if (options.web && !this.capabilities.web) throw new Error(`${this.name} não oferece pesquisa web neste adaptador.`)
    const command = await this.resolve()
    if (!command) throw new Error(`${this.name} não está instalado.`)
    options.progress(`${this.name}: analisando contexto`)
    const fullPrompt = `${RESEARCH_JSON_INSTRUCTION}\n\n${prompt}`
    if (this.id === 'antigravity' && fullPrompt.length > 24_000) {
      throw new Error('O contexto excede o limite seguro do Antigravity CLI; tentando outro provedor.')
    }
    const raw = await runCli(
      command.path,
      this.buildArgs(options.web, fullPrompt),
      this.id === 'antigravity' ? '' : fullPrompt,
      options.signal,
    )
    return { ...parseResearchAnswer(unwrapProviderOutput(raw)), providerId: this.id }
  }

  private resolve(): Promise<ResolvedCommand | undefined> {
    return resolveCommand({
      envKey: this.options.envKey,
      commands: this.options.commands,
      extensionPaths: this.options.extensionPaths,
    })
  }

  private buildArgs(web: boolean, prompt: string): string[] {
    if (this.id === 'claude') {
      return [
        '-p', '--output-format', 'json', '--no-session-persistence', '--permission-mode', 'plan',
        web ? '--tools=WebSearch,WebFetch' : '--tools=',
      ]
    }
    if (this.id === 'antigravity') {
      return ['--output-format', 'json', '--mode', 'plan', '--sandbox', '--disable-slash-commands', `--print=${prompt}`]
    }
    return ['--output-format', 'json', '--approval-mode', 'plan']
  }

  private makeStatus(
    available: boolean,
    installed: boolean,
    authenticated: boolean | null,
    detail: string,
    version?: string,
  ): ProviderStatus {
    return { id: this.id, name: this.name, available, installed, authenticated, detail, version, capabilities: this.capabilities }
  }
}

export function createCliProviders(): CliMeetingProvider[] {
  return [
    new CliMeetingProvider({
      id: 'claude',
      name: 'Claude Code',
      envKey: 'ORGANON_CLAUDE_PATH',
      commands: ['claude'],
      web: true,
      extensionPaths: [{
        prefix: 'anthropic.claude-code-',
        relativePath: path.join('resources', 'native-binary', 'claude.exe'),
      }],
    }),
    new CliMeetingProvider({
      id: 'gemini',
      name: 'Gemini CLI',
      envKey: 'ORGANON_GEMINI_PATH',
      commands: ['gemini'],
      web: false,
    }),
    new CliMeetingProvider({
      id: 'antigravity',
      name: 'Antigravity CLI',
      envKey: 'ORGANON_ANTIGRAVITY_PATH',
      commands: ['agy', 'antigravity'],
      web: true,
    }),
  ]
}
