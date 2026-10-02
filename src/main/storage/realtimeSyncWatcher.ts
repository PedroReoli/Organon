import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { getMainWindow } from '../core'
import { getDataPath, getStoreDir, getNotesDir } from './filesystem'
import { getStorageControlDir, loadCommittedGeneration } from './generationStore'
import { loadStore } from './store'
import type { Store } from '../types'

export interface RealtimeChangeEvent {
  id: string
  timestamp: string
  agent: 'Antigravity' | 'Claude' | 'Gemini' | 'CLI Organon' | 'MCP Organon' | 'Sistema'
  category: 'task' | 'note' | 'project' | 'study' | 'sync'
  type: 'created' | 'updated' | 'deleted' | 'reordered'
  title: string
  description: string
  targetId?: string
  targetType?: 'card' | 'note' | 'project' | 'folder'
  previousSnapshot?: any
  currentSnapshot?: any
}

let lastStoreSnapshot: Store | null = null
let lastObservedRevision = 0
let isWatching = false
let watchCleanups: Array<() => void> = []
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const recentEvents: RealtimeChangeEvent[] = []
export const notifyInternalSave = (): void => {
  const committed = loadCommittedGeneration(getDataPath())
  if (committed && committed.source !== 'cli' && committed.source !== 'mcp') {
    lastStoreSnapshot = committed.store
    lastObservedRevision = committed.revision
  }
}

export const getRecentCliEvents = (): RealtimeChangeEvent[] => {
  return [...recentEvents]
}

const detectChanges = (prev: Store | null, curr: Store, agent: 'CLI Organon' | 'MCP Organon'): RealtimeChangeEvent[] => {
  const events: RealtimeChangeEvent[] = []
  const now = new Date().toISOString()

  if (!prev) return events

  // 1. Detect Cards (Tasks) changes
  const prevCards = prev.cards || []
  const currCards = curr.cards || []

  const prevCardMap = new Map(prevCards.map((c) => [c.id, c]))
  const currCardMap = new Map(currCards.map((c) => [c.id, c]))

  for (const card of currCards) {
    const existing = prevCardMap.get(card.id)
    if (!existing) {
      events.push({
        id: randomUUID(),
        timestamp: now,
        agent,
        category: 'task',
        type: 'created',
        title: `Nova Tarefa: "${card.title}"`,
        description: `Tarefa adicionada no Planejamento (${card.location?.day || 'Sem data'}).`,
        targetId: card.id,
        targetType: 'card',
        currentSnapshot: card,
      })
    } else if (existing.updatedAt !== card.updatedAt || existing.title !== card.title || existing.location?.day !== card.location?.day) {
      events.push({
        id: randomUUID(),
        timestamp: now,
        agent,
        category: 'task',
        type: 'updated',
        title: `Tarefa Atualizada: "${card.title}"`,
        description: `Status ou detalhes da tarefa foram modificados.`,
        targetId: card.id,
        targetType: 'card',
        previousSnapshot: existing,
        currentSnapshot: card,
      })
    }
  }

  for (const prevCard of prevCards) {
    if (!currCardMap.has(prevCard.id)) {
      events.push({
        id: randomUUID(),
        timestamp: now,
        agent,
        category: 'task',
        type: 'deleted',
        title: `Tarefa Removida: "${prevCard.title}"`,
        description: `Tarefa concluída ou removida do Planejamento.`,
        targetId: prevCard.id,
        targetType: 'card',
        previousSnapshot: prevCard,
      })
    }
  }

  // 2. Detect Notes changes
  const prevNotes = prev.notes || []
  const currNotes = curr.notes || []

  const prevNoteMap = new Map(prevNotes.map((n) => [n.id, n]))
  const currNoteMap = new Map(currNotes.map((n) => [n.id, n]))

  for (const note of currNotes) {
    const existing = prevNoteMap.get(note.id)
    if (!existing) {
      events.push({
        id: randomUUID(),
        timestamp: now,
        agent,
        category: 'note',
        type: 'created',
        title: `Nova Nota: "${note.title}"`,
        description: `Nota criada com sucesso no repositório.`,
        targetId: note.id,
        targetType: 'note',
        currentSnapshot: note,
      })
    } else if (existing.updatedAt !== note.updatedAt || existing.title !== note.title || (existing as any).checksum !== (note as any).checksum) {
      events.push({
        id: randomUUID(),
        timestamp: now,
        agent,
        category: 'note',
        type: 'updated',
        title: `Nota Atualizada: "${note.title}"`,
        description: `Conteúdo ou metadados da nota foram sincronizados.`,
        targetId: note.id,
        targetType: 'note',
        previousSnapshot: existing,
        currentSnapshot: note,
      })
    }
  }

  // Apenas detecta exclusões se a lista atual não estiver vazia por leitura parcial
  if (currNotes.length > 0 || prevNotes.length <= 2) {
    for (const prevNote of prevNotes) {
      if (!currNoteMap.has(prevNote.id)) {
        events.push({
          id: randomUUID(),
          timestamp: now,
          agent,
          category: 'note',
          type: 'deleted',
          title: `Nota Removida: "${prevNote.title}"`,
          description: `Nota removida ou realocada.`,
          targetId: prevNote.id,
          targetType: 'note',
          previousSnapshot: prevNote,
        })
      }
    }
  }

  return events
}

export const startRealtimeSyncWatcher = (): void => {
  if (isWatching) return
  isWatching = true

  try {
    const dataDir = getDataPath()
    const initialGeneration = loadCommittedGeneration(dataDir)
    lastStoreSnapshot = initialGeneration?.store ?? loadStore()
    lastObservedRevision = initialGeneration?.revision ?? 0

    const watchCandidates = [
      getStoreDir(dataDir),
      getNotesDir(dataDir),
      path.join(dataDir, '_sistema', 'indices'),
      getStorageControlDir(dataDir),
      path.join(dataDir, 'store'),
      path.join(dataDir, 'notes'),
      dataDir,
    ]

    const uniqueDirs = [...new Set(watchCandidates)].filter((d) => {
      try {
        return fs.existsSync(d) && fs.statSync(d).isDirectory()
      } catch {
        return false
      }
    })

    const onFileOrDirChange = (_eventType: string, _filename: string | null) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        try {
          const committed = loadCommittedGeneration(dataDir)
          if (!committed || committed.revision === lastObservedRevision) return
          const freshStore = committed.store
          const changes = committed.source === 'cli' || committed.source === 'mcp'
            ? detectChanges(lastStoreSnapshot, freshStore, committed.source === 'cli' ? 'CLI Organon' : 'MCP Organon')
            : []
          lastStoreSnapshot = freshStore
          lastObservedRevision = committed.revision

          const win = getMainWindow()
          if (win && !win.isDestroyed()) {
            // Sempre sincroniza o store silenciosamente se houver novidade
            win.webContents.send('store:external-update', {
              store: freshStore,
              changes,
              timestamp: new Date().toISOString(),
              revision: committed.revision,
            })
            win.webContents.send('planning:sync-cli')

            if (changes.length > 0) {
              recentEvents.unshift(...changes)
              if (recentEvents.length > 50) {
                recentEvents.splice(50)
              }
            }
          }
        } catch (err) {
          console.error('[RealtimeSyncWatcher] Erro ao sincronizar store externo:', err)
        }
      }, 350)
    }

    for (const dir of uniqueDirs) {
      try {
        const watcher = fs.watch(dir, { recursive: false }, onFileOrDirChange)
        watchCleanups.push(() => watcher.close())
      } catch (err) {
        console.warn(`[RealtimeSyncWatcher] Não foi possível observar ${dir}:`, err)
      }
    }

    console.log(`[RealtimeSyncWatcher] Monitorando ${uniqueDirs.length} diretórios em tempo real.`)
  } catch (err) {
    console.error('[RealtimeSyncWatcher] Falha ao iniciar watcher:', err)
  }
}

export const stopRealtimeSyncWatcher = (): void => {
  for (const cleanup of watchCleanups) {
    try {
      cleanup()
    } catch {
      // Ignore cleanup error
    }
  }
  watchCleanups = []
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = null
  lastStoreSnapshot = null
  lastObservedRevision = 0
  isWatching = false
}
