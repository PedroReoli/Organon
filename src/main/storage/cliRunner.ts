import { app } from 'electron'
import { execFile } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { getDataPath } from './filesystem'
import { loadStore, saveStore } from './store'
import { getRecentCliEvents, notifyInternalSave } from './realtimeSyncWatcher'

export interface CliExecutionResult {
  success: boolean
  output: string
  error?: string
}

const ALLOWED_CLI_COMMANDS = new Set([
  '--help', 'help', 'doctor', 'health', 'check', 'schema', 'ai-spec', 'status', 'info', 'sync',
  'task', 'tasks', 'plan', 'sprint', 'sprints', 'note', 'notes', 'project', 'projects', 'habit', 'habits',
])

function tokenizeCliCommand(command: string): string[] {
  const tokens: string[] = []
  const pattern = /"((?:\\.|[^"\\])*)"|'([^']*)'|([^\s]+)/g
  let match: RegExpExecArray | null
  let consumedUntil = 0
  while ((match = pattern.exec(command))) {
    if (command.slice(consumedUntil, match.index).trim()) throw new Error('Sintaxe de comando invalida.')
    tokens.push((match[1] ?? match[2] ?? match[3]).replace(/\\"/g, '"'))
    consumedUntil = pattern.lastIndex
  }
  if (command.slice(consumedUntil).trim()) throw new Error('Aspas nao balanceadas no comando.')
  return tokens
}

function resolveCliPath(): string {
  const appRoot = app.getAppPath ? app.getAppPath() : process.cwd()
  const candidates = [
    path.join(appRoot, 'bin', 'organon.cjs'),
    path.join(__dirname, '..', '..', '..', 'bin', 'organon.cjs'),
    path.join(process.cwd(), 'bin', 'organon.cjs'),
  ]
  const resolved = candidates.find(candidate => fs.existsSync(candidate))
  if (!resolved) throw new Error('Executavel da CLI Organon nao encontrado.')
  return resolved
}

export const executeCliCommand = async (command: string): Promise<CliExecutionResult> => {
  return new Promise((resolve) => {
    try {
      const sanitized = (command || '').trim()
      if (!sanitized) {
        return resolve({ success: false, output: '', error: 'Comando vazio.' })
      }

      const cliPath = resolveCliPath()
      const rootDir = path.dirname(path.dirname(cliPath))
      const args = tokenizeCliCommand(sanitized)
      if (args[0]?.toLowerCase() === 'organon') args.shift()
      const primary = args[0]?.toLowerCase()
      if (!primary || !ALLOWED_CLI_COMMANDS.has(primary)) {
        return resolve({ success: false, output: '', error: 'Comando nao permitido pela interface desktop.' })
      }

      execFile(process.execPath, [cliPath, ...args], {
        cwd: rootDir,
        windowsHide: true,
        timeout: 120_000,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ORGANON_DATA_DIR: getDataPath() },
      }, (error, stdout, stderr) => {
        if (error) {
          return resolve({
            success: false,
            output: stdout || '',
            error: stderr || error.message,
          })
        }
        resolve({
          success: true,
          output: stdout || 'Comando executado com sucesso.',
        })
      })
    } catch (err: any) {
      resolve({
        success: false,
        output: '',
        error: err?.message || 'Falha ao executar comando CLI.',
      })
    }
  })
}

export const rollbackCliAction = async (actionId: string): Promise<boolean> => {
  try {
    const events = getRecentCliEvents()
    const target = events.find((e) => e.id === actionId)
    if (!target || !target.previousSnapshot) {
      return false
    }

    const store = loadStore()

    if (target.targetType === 'card') {
      const existingIdx = (store.cards || []).findIndex((c: any) => c.id === target.targetId)
      if (target.type === 'created') {
        store.cards = (store.cards || []).filter((c: any) => c.id !== target.targetId)
      } else if (target.previousSnapshot) {
        if (existingIdx >= 0) {
          store.cards[existingIdx] = target.previousSnapshot
        } else {
          store.cards.push(target.previousSnapshot)
        }
      }
    } else if (target.targetType === 'note') {
      const existingIdx = (store.notes || []).findIndex((n: any) => n.id === target.targetId)
      if (target.type === 'created') {
        store.notes = (store.notes || []).filter((n: any) => n.id !== target.targetId)
      } else if (target.previousSnapshot) {
        if (existingIdx >= 0) {
          store.notes[existingIdx] = target.previousSnapshot
        } else {
          store.notes.push(target.previousSnapshot)
        }
      }
    }

    notifyInternalSave()
    saveStore(store)
    return true
  } catch (err) {
    console.error('[CliRunner] Erro no rollback:', err)
    return false
  }
}
