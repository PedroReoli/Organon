import { spawn, execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const exec = promisify(execFile)
export interface ResearchSource { type: 'web' | 'project'; title: string; pathOrUrl: string; snippet?: string; lineRange?: string }
export interface ResearchAnswer { findings: string; sources: ResearchSource[] }

export async function resolveMeetingCodex(): Promise<string> {
  const candidates = [process.env.ORGANON_CODEX_PATH, process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'Programs/OpenAI/Codex/bin/codex.exe') : 'codex'].filter(Boolean) as string[]
  for (const candidate of candidates) {
    try { await exec(candidate, ['--version'], { windowsHide: true, timeout: 5000 }); return candidate } catch {}
  }
  throw new Error('Codex CLI não encontrado. Instale e entre na sua conta com codex login, ou configure ORGANON_CODEX_PATH.')
}

export async function meetingAgentStatus(): Promise<{ available: boolean; detail: string }> {
  try {
    const executable = await resolveMeetingCodex()
    await exec(executable, ['login', 'status'], { windowsHide: true, timeout: 8000 })
    return { available: true, detail: 'Codex CLI conectado. Agentes web, código e relator disponíveis.' }
  } catch (error) { return { available: false, detail: error instanceof Error ? error.message : 'Agente indisponível.' } }
}

export async function runMeetingCodex(prompt: string, web: boolean, signal: AbortSignal, progress: (label: string) => void): Promise<ResearchAnswer> {
  signal.throwIfAborted()
  if (prompt.length > 60000) throw new Error('O contexto excedeu o limite de análise. Divida a pergunta em etapas.')
  const executable = await resolveMeetingCodex()
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'organon-meeting-agent-'))
  try {
    const output = path.join(dir, 'answer.json')
    const schema = path.join(dir, 'schema.json')
    await fs.writeFile(schema, JSON.stringify({ type: 'object', additionalProperties: false, required: ['findings', 'sources'], properties: {
      findings: { type: 'string' }, sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 'title', 'pathOrUrl', 'snippet', 'lineRange'], properties: {
        type: { type: 'string', enum: ['web', 'project'] }, title: { type: 'string' }, pathOrUrl: { type: 'string' }, snippet: { type: 'string' }, lineRange: { type: 'string' },
      } } },
    } }), 'utf8')
    const args = ['exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only',
      '--disable', 'shell_tool', '--disable', 'unified_exec', '--disable', 'apps', '--disable', 'multi_agent',
      '-c', 'model_reasoning_effort="low"', '-c', `web_search="${web ? 'live' : 'disabled'}"`, '--cd', dir, '--json', '--output-schema', schema, '--output-last-message', output, '-']
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, args, { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
      let pending = ''; let outputBytes = 0; let failure = ''; let stopped = false
      const stop = (message: string) => { stopped = true; failure = message; child.kill(); clearTimeout(timeout); signal.removeEventListener('abort', abort); reject(new Error(message)) }
      const abort = () => stop('Pesquisa cancelada.')
      signal.addEventListener('abort', abort, { once: true })
      const timeout = setTimeout(() => stop('O agente excedeu 3 minutos. Tente uma pergunta mais específica.'), 180000)
      child.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length
        if (outputBytes > 4 * 1024 * 1024) { stop('O agente excedeu o limite de resposta.'); return }
        pending += chunk.toString('utf8')
        const lines = pending.split('\n'); pending = lines.pop() || ''
        for (const line of lines) { try {
          const event = JSON.parse(line)
          if (event.item?.type === 'web_search') progress('Consultando fontes na internet')
          if (event.type === 'turn.failed') failure = 'Falha no agente. Verifique login, conexão e limite da conta Codex.'
        } catch {} }
      })
      // Drain diagnostics without logging private prompts or account data.
      child.stderr.resume()
      child.stdin.on('error', () => {})
      child.on('error', () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); reject(new Error('Não foi possível iniciar o Codex CLI.')) })
      child.on('close', code => { clearTimeout(timeout); signal.removeEventListener('abort', abort); if (code !== 0 || stopped) reject(new Error(failure || 'O agente não concluiu. Verifique codex login status.')); else resolve() })
      child.stdin.end(prompt, 'utf8')
      if (signal.aborted) abort()
    })
    signal.throwIfAborted()
    const result = JSON.parse(await fs.readFile(output, 'utf8')) as ResearchAnswer
    if (!result.findings?.trim() || !Array.isArray(result.sources)) throw new Error('O agente retornou resposta inválida.')
    return { findings: result.findings.slice(0, 24000), sources: result.sources.slice(0, 20) }
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
}
