import type { Note, NoteFolder } from '@types'
import type { NotesLinkIndex } from './useNotesLinkIndex'

export type GraphLevel = 1 | 2 | 3

export interface GraphNode {
  id: string
  title: string
  kind: 'folder' | 'note'
  level: GraphLevel
  x: number
  y: number
  vx: number
  vy: number
  degree: number
  isFavorite?: boolean
  isPinned?: boolean
  isLocked?: boolean
  childCount?: number
  folderId?: string | null
}

export interface GraphEdge {
  source: string
  target: string
}

export const ITERATIONS = 180
export const REPULSION = 1800
export const ATTRACTION = 0.045
export const CENTER_PULL = 0.006

// Helper SVG Icons for nodes
export const NodeIcons = {
  folder: (
    <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  ),
  star: (
    <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  ),
  pin: (
    <path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  ),
  lock: (
    <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  ),
  page: (
    <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  ),
}

export function buildLayout(
  notes: Note[],
  folders: NoteFolder[],
  index: NotesLinkIndex,
  width: number,
  height: number,
  level: GraphLevel,
  selectedFolderId: string | null,
  selectedNoteId: string | null
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  // ── NÍVEL 1: Visão Geral por Clusters/Pastas ─────────────────────────────
  if (level === 1) {
    const rootFolderList = folders.length > 0 ? folders : [{ id: 'default-folder', name: 'Geral', parentId: null }]

    // Nós para Pastas
    for (const folder of rootFolderList) {
      const folderNotes = notes.filter((n) => !n.deletedAt && (n.folderId === folder.id || (!n.folderId && folder.id === 'default-folder')))
      nodeMap.set(`folder-${folder.id}`, {
        id: folder.id,
        title: folder.name,
        kind: 'folder',
        level: 1,
        childCount: folderNotes.length,
        x: width / 2 + (Math.random() - 0.5) * width * 0.5,
        y: height / 2 + (Math.random() - 0.5) * height * 0.5,
        vx: 0,
        vy: 0,
        degree: folderNotes.length,
      })
    }

    // Arestas entre pastas somente quando há wikilinks reais cruzando seus limites.
    const noteFolders = new Map(notes.map(note => [note.id, note.folderId ?? 'default-folder']))
    const folderConnections = new Set<string>()
    for (const [sourceNoteId, refs] of index.outgoing.entries()) {
      const sourceFolderId = noteFolders.get(sourceNoteId)
      if (!sourceFolderId || !nodeMap.has(`folder-${sourceFolderId}`)) continue
      for (const ref of refs) {
        if (!ref.targetNoteId) continue
        const targetFolderId = noteFolders.get(ref.targetNoteId)
        if (!targetFolderId || sourceFolderId === targetFolderId || !nodeMap.has(`folder-${targetFolderId}`)) continue
        const connectionKey = [sourceFolderId, targetFolderId].sort().join('::')
        if (folderConnections.has(connectionKey)) continue
        folderConnections.add(connectionKey)
        edges.push({ source: sourceFolderId, target: targetFolderId })
      }
    }
  }

  // ── NÍVEL 2: Notas de uma Pasta Específica / Visão Intermediária ───────────
  else if (level === 2) {
    let scopeNotes = notes.filter((n) => !n.deletedAt)
    if (selectedFolderId) {
      scopeNotes = scopeNotes.filter((n) => n.folderId === selectedFolderId)
    }
    if (scopeNotes.length === 0) scopeNotes = notes.filter((n) => !n.deletedAt).slice(0, 40)

    for (const note of scopeNotes) {
      nodeMap.set(note.id, {
        id: note.id,
        title: note.title || 'Sem título',
        kind: 'note',
        level: 2,
        isFavorite: note.isFavorite,
        isPinned: note.isPinned,
        isLocked: note.isLocked,
        folderId: note.folderId,
        x: width / 2 + (Math.random() - 0.5) * width * 0.6,
        y: height / 2 + (Math.random() - 0.5) * height * 0.6,
        vx: 0,
        vy: 0,
        degree: 0,
      })
    }

    // Arestas Wiki-links no Nível 2
    for (const [sourceId, refs] of index.outgoing.entries()) {
      if (!nodeMap.has(sourceId)) continue
      for (const ref of refs) {
        if (!ref.targetNoteId || !nodeMap.has(ref.targetNoteId)) continue
        edges.push({ source: sourceId, target: ref.targetNoteId })
        nodeMap.get(sourceId)!.degree++
        nodeMap.get(ref.targetNoteId)!.degree++
      }
    }
  }

  // ── NÍVEL 3: Grafo Detalhado de Wiki-Links de uma Nota em Foco ────────────
  else {
    const focusNote = notes.find((n) => n.id === selectedNoteId) || notes[0]
    if (focusNote) {
      const relatedIds = new Set<string>([focusNote.id])
      const outgoing = index.outgoing.get(focusNote.id) || []
      const incoming = index.incoming.get(focusNote.id) || []

      outgoing.forEach((r) => r.targetNoteId && relatedIds.add(r.targetNoteId))
      incoming.forEach((r) => r.sourceNoteId && relatedIds.add(r.sourceNoteId))

      const detailedNotes = notes.filter((n) => !n.deletedAt && (relatedIds.has(n.id) || n.parentNoteId === focusNote.id))

      for (const note of detailedNotes) {
        nodeMap.set(note.id, {
          id: note.id,
          title: note.title || 'Sem título',
          kind: 'note',
          level: 3,
          isFavorite: note.isFavorite,
          isPinned: note.isPinned,
          isLocked: note.isLocked,
          folderId: note.folderId,
          x: width / 2 + (Math.random() - 0.5) * width * 0.4,
          y: height / 2 + (Math.random() - 0.5) * height * 0.4,
          vx: 0,
          vy: 0,
          degree: 0,
        })
      }

      for (const [sourceId, refs] of index.outgoing.entries()) {
        if (!nodeMap.has(sourceId)) continue
        for (const ref of refs) {
          if (!ref.targetNoteId || !nodeMap.has(ref.targetNoteId)) continue
          edges.push({ source: sourceId, target: ref.targetNoteId })
          nodeMap.get(sourceId)!.degree++
          nodeMap.get(ref.targetNoteId)!.degree++
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values())
  if (nodes.length === 0) return { nodes, edges }

  // Simulação física Force-Directed
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy + 1
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    for (const e of edges) {
      const a = nodeMap.get(e.source)
      const b = nodeMap.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const fx = dx * ATTRACTION
      const fy = dy * ATTRACTION
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * CENTER_PULL
      n.vy += (height / 2 - n.y) * CENTER_PULL
      n.x += Math.max(-15, Math.min(15, n.vx))
      n.y += Math.max(-15, Math.min(15, n.vy))
      n.vx *= 0.8
      n.vy *= 0.8
    }
  }

  return { nodes, edges }
}
