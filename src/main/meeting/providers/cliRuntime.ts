import { execFile, spawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'

const exec = promisify(execFile)

export interface ResolvedCommand {
  path: string
  version?: string
}

function extensionCandidates(prefix: string, relativePath: string): string[] {
  const roots = [
    path.join(os.homedir(), '.antigravity-ide', 'extensions'),
    path.join(os.homedir(), '.vscode', 'extensions'),
  ]
  const candidates: string[] = []
  for (const root of roots) {
    try {
      const directories = fs.readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.startsWith(prefix))
        .map(entry => entry.name)
        .sort().reverse()
      for (const directory of directories) candidates.push(path.join(root, directory, relativePath))
    } catch {}
  }
  return candidates
}

async function whereCandidates(commands: string[]): Promise<string[]> {
  if (process.platform !== 'win32') return commands
  const results: string[] = []
  for (const command of commands) {
    try {
      const { stdout } = await exec('where.exe', [command], { windowsHide: true, timeout: 4_000 })
      results.push(...stdout.split(/\r?\n/).map(value => value.trim()).filter(Boolean))
    } catch {}
  }
  return results
}

function invocation(commandPath: string, args: string[]) {
  if (process.platform === 'win32' && commandPath.toLowerCase().endsWith('.ps1')) {
    return {
      executable: 'powershell.exe',
      args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', commandPath, ...args],
    }
  }
  if (process.platform === 'win32' && commandPath.toLowerCase().endsWith('.cmd')) {
    const powershellShim = commandPath.slice(0, -4) + '.ps1'
    if (fs.existsSync(powershellShim)) return invocation(powershellShim, args)
  }
  return { executable: commandPath, args }
}

export async function resolveCommand(options: {
  envKey: string
  commands: string[]
  knownPaths?: string[]
  extensionPaths?: Array<{ prefix: string; relativePath: string }>
}): Promise<ResolvedCommand | undefined> {
  const candidates = [
    process.env[options.envKey],
    ...(options.knownPaths || []),
    ...(options.extensionPaths || []).flatMap(item => extensionCandidates(item.prefix, item.relativePath)),
    ...await whereCandidates(options.commands),
    ...(process.platform === 'win32' ? [] : options.commands),
  ].filter((value): value is string => Boolean(value))

  for (const candidate of Array.from(new Set(candidates))) {
    try {
      if (path.isAbsolute(candidate) && (!fs.existsSync(candidate) || fs.statSync(candidate).size === 0)) continue
      const command = invocation(candidate, ['--version'])
      const { stdout, stderr } = await exec(command.executable, command.args, {
        windowsHide: true,
        timeout: 7_000,
        maxBuffer: 256 * 1024,
      })
      const version = `${stdout}\n${stderr}`.trim().split(/\r?\n/)[0]?.slice(0, 160)
      return { path: candidate, version }
    } catch {}
  }
  return undefined
}

export async function runCli(
  commandPath: string,
  args: string[],
  input: string,
  signal: AbortSignal,
  timeoutMs = 180_000,
): Promise<string> {
  signal.throwIfAborted()
  const command = invocation(commandPath, args)
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: os.tmpdir(),
      env: { ...process.env, NO_COLOR: '1', CI: '1' },
    })
    let stdout = ''
    let outputBytes = 0
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      callback()
    }
    const stop = (message: string) => {
      child.kill()
      finish(() => reject(new Error(message)))
    }
    const abort = () => stop('Pesquisa cancelada.')
    const timeout = setTimeout(() => stop('O provedor excedeu 3 minutos.'), timeoutMs)
    signal.addEventListener('abort', abort, { once: true })
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length
      if (outputBytes > 4 * 1024 * 1024) return stop('O provedor excedeu o limite de resposta.')
      stdout += chunk.toString('utf8')
    })
    child.stderr.resume()
    child.stdin.on('error', () => undefined)
    child.on('error', () => finish(() => reject(new Error('Não foi possível iniciar o provedor.'))))
    child.on('close', code => finish(() => (
      code === 0 ? resolve(stdout) : reject(new Error('O provedor encerrou com erro. Verifique login e limite da conta.'))
    )))
    child.stdin.end(input, 'utf8')
    if (signal.aborted) abort()
  })
}

export async function runProbe(commandPath: string, args: string[]): Promise<string> {
  const command = invocation(commandPath, args)
  const { stdout, stderr } = await exec(command.executable, command.args, {
    windowsHide: true,
    timeout: 8_000,
    maxBuffer: 256 * 1024,
  })
  return `${stdout}\n${stderr}`.trim()
}
