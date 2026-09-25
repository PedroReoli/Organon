import { exec } from 'child_process'
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

export const executeCliCommand = async (command: string): Promise<CliExecutionResult> => {
  return new Promise((resolve) => {
    try {
      const sanitized = (command || '').trim()
      if (!sanitized) {
        return resolve({ success: false, output: '', error: 'Comando vazio.' })
      }

      const rootDir = process.cwd()
      const cliPath = path.join(rootDir, 'bin', 'organon.cjs')

      // Normalize command arguments
      let finalCmd = sanitized
      if (!finalCmd.startsWith('organon') && !finalCmd.startsWith('node')) {
        finalCmd = `node "${cliPath}" ${finalCmd}`
      } else if (finalCmd.startsWith('organon')) {
        finalCmd = `node "${cliPath}" ${finalCmd.replace(/^organon\s*/, '')}`
      }

      exec(finalCmd, { cwd: rootDir, env: { ...process.env, ORGANON_DATA_DIR: getDataPath() } }, (error, stdout, stderr) => {
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
