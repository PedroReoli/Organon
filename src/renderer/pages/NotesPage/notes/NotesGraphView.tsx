/**
 * NotesGraphView — Grafo Semântico Multi-nível com SVG Nativo.
 *
 * Suporta 3 Níveis Hierárquicos de Navegação:
 * - Nível 1: Visão Geral de Clusters por Pastas/Categorias (Reduz carga visual e de CPU)
 * - Nível 2: Notas da Pasta Selecionada e suas conexões imediatas
 * - Nível 3: Grafo Detalhado de Wiki-Links e Subpáginas da Nota em Foco
 *
 * Recursos visuais:
 * - Ícones SVG nativos renderizados nos nós (Pastas, Favoritas, Fixadas, Trancadas, Notas)
 * - Cores e legendas por tipo de nó
 * - Botão proeminente "Voltar para Notas" e navegação Breadcrumb de nível
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteFolder } from '@types'
import type { NotesLinkIndex } from './useNotesLinkIndex'
import { Button } from '@shared/components/primitives'

export type GraphLevel = 1 | 2 | 3

interface NotesGraphViewProps {
  notes: Note[]
  folders?: NoteFolder[]
  index: NotesLinkIndex
  onOpenNote: (id: string) => void
  onClose: () => void
  onOpenProjects?: () => void
  maxNodes?: number
}

interface GraphNode {
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

interface GraphEdge {
  source: string
  target: string
}

const ITERATIONS = 180
const REPULSION = 1800
const ATTRACTION = 0.045
const CENTER_PULL = 0.006

// Helper SVG Icons for nodes
const NodeIcons = {
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

function buildLayout(
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

    // Arestas entre pastas somente quando ha wikilinks reais cruzando seus limites.
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
      // Nota em foco + vizinhos conectados
      const relatedIds = new Set<string>([focusNote.id])
      const outgoing = index.outgoing.get(focusNote.id) || []
      const incoming = index.incoming.get(focusNote.id) || []
      
      outgoing.forEach((r) => r.targetNoteId && relatedIds.add(r.targetNoteId))
      incoming.forEach((r) => r.sourceNoteId && relatedIds.add(r.sourceNoteId))

      const detailedNotes = notes.filter((n) => !n.deletedAt && (relatedIds.has(n.id) || n.parentId === focusNote.id))

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

export const NotesGraphView = ({
  notes,
  folders = [],
  index,
  onOpenNote,
  onClose,
  onOpenProjects,
}: NotesGraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1100, height: 700 })

  // Hierarchical Level State
  const [currentLevel, setCurrentLevel] = useState<GraphLevel>(1)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  const [filterQuery, setFilterQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth || 1100,
          height: containerRef.current.clientHeight || 700,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Gerar nós e arestas dinâmicos para o nível atual
  const { nodes, edges } = useMemo(
    () => buildLayout(notes, folders, index, size.width, size.height, currentLevel, selectedFolderId, selectedNoteId),
    [notes, folders, index, size.width, size.height, currentLevel, selectedFolderId, selectedNoteId],
  )

  const filteredNodes = useMemo(() => {
    if (!filterQuery.trim()) return nodes
    const q = filterQuery.toLowerCase()
    return nodes.filter((n) => n.title.toLowerCase().includes(q))
  }, [nodes, filterQuery])

  const selectedNode = useMemo(() => {
    if (!selectedNoteId) return null
    return nodes.find((n) => n.id === selectedNoteId) ?? null
  }, [nodes, selectedNoteId])

  const selectedFolder = useMemo(() => {
    if (!selectedFolderId) return null
    return folders.find((f) => f.id === selectedFolderId) ?? null
  }, [folders, selectedFolderId])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.3, Math.min(3, z + (e.deltaY < 0 ? 0.1 : -0.1))))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).tagName === 'circle' || (e.target as Element).tagName === 'path') return
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current) return
    setPan({
      x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    panStartRef.current = null
  }

  // Interação ao clicar em nós
  const handleNodeClick = (node: GraphNode) => {
    if (node.kind === 'folder') {
      setSelectedFolderId(node.id)
      setCurrentLevel(2)
    } else {
      setSelectedNoteId(node.id)
    }
  }

  const handleNodeDoubleClick = (node: GraphNode) => {
    if (node.kind === 'folder') {
      setSelectedFolderId(node.id)
      setCurrentLevel(2)
    } else {
      onOpenNote(node.id)
    }
  }

  return (
    <div
      className="notes-graph-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--color-background, #0b0f19)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Toolbar Superior no Padrão do Sistema ─────────────────────────── */}
      <div
        className="notes-graph-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--color-surface, rgba(255, 255, 255, 0.03))',
          borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Botão de Retorno Proeminente para Notas */}
        <button
          onClick={onClose}
          style={{
            background: 'var(--color-primary, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
          title="Voltar para a tela de Notas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar para Notas
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--color-border, rgba(255, 255, 255, 0.1))' }} />

        <div className="project-graph-switcher" aria-label="Tipo de grafo">
          <button className="is-active">Notas</button>
          <button onClick={onOpenProjects}>Projetos</button>
        </div>

        {/* Título & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            Grafo Mega Brain
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: 'var(--color-primary)',
            }}
          >
            Nível {currentLevel}
          </span>
        </div>

        {/* Seletor de Níveis de Grafo (Pills) */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px', gap: '2px' }}>
          <button
            onClick={() => { setCurrentLevel(1); setSelectedFolderId(null); setSelectedNoteId(null) }}
            style={{
              background: currentLevel === 1 ? 'var(--color-primary)' : 'transparent',
              color: currentLevel === 1 ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🏢 Nível 1: Pastas
          </button>
          <button
            onClick={() => setCurrentLevel(2)}
            style={{
              background: currentLevel === 2 ? 'var(--color-primary)' : 'transparent',
              color: currentLevel === 2 ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📝 Nível 2: Notas
          </button>
          <button
            onClick={() => setCurrentLevel(3)}
            style={{
              background: currentLevel === 3 ? 'var(--color-primary)' : 'transparent',
              color: currentLevel === 3 ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🕸️ Nível 3: Links
          </button>
        </div>

        {/* Breadcrumb de Navegação do Grafo */}
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Início</span>
          {selectedFolder && (
            <>
              <span>&gt;</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{selectedFolder.name}</span>
            </>
          )}
          {selectedNode && (
            <>
              <span>&gt;</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>{selectedNode.title}</span>
            </>
          )}
        </div>

        <span style={{ flex: 1 }} />

        {/* Campo de Filtro de Nó */}
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filtrar nó..."
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
            width: '160px',
          }}
        />

        <Button size="sm" variant="ghost" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</Button>
      </div>

      {/* ── Canvas de Renderização SVG ────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="notes-graph-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Linhas de Arestas */}
            {edges.map((e, idx) => {
              const a = nodes.find((n) => n.id === e.source)
              const b = nodes.find((n) => n.id === e.target)
              if (!a || !b) return null
              const isHighlighted = hoveredId === a.id || hoveredId === b.id
              return (
                <line
                  key={`e-${idx}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isHighlighted ? '#818cf8' : 'rgba(99, 102, 241, 0.25)'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={currentLevel === 1 ? '4,4' : undefined}
                />
              )
            })}

            {/* Nós Interativos com Ícones */}
            {filteredNodes.map((n) => {
              const isFolder = n.kind === 'folder'
              const r = isFolder ? 18 : Math.max(8, Math.min(16, 8 + n.degree))
              const isSelected = selectedNoteId === n.id || selectedFolderId === n.id
              const isHighlighted = hoveredId === n.id || isSelected

              let fillColor = 'var(--color-primary, #6366f1)'
              let iconSvg = NodeIcons.page

              if (isFolder) {
                fillColor = '#818cf8'
                iconSvg = NodeIcons.folder
              } else if (n.isFavorite) {
                fillColor = '#f59e0b'
                iconSvg = NodeIcons.star
              } else if (n.isPinned) {
                fillColor = '#10b981'
                iconSvg = NodeIcons.pin
              } else if (n.isLocked) {
                fillColor = '#ef4444'
                iconSvg = NodeIcons.lock
              }

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(n) }}
                  onDoubleClick={(e) => { e.stopPropagation(); handleNodeDoubleClick(n) }}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Halo do Nó Ativo */}
                  {isHighlighted && (
                    <circle r={r + 6} fill="none" stroke={fillColor} strokeWidth="2" opacity="0.6" />
                  )}

                  {/* Círculo Principal do Nó */}
                  <circle
                    r={r}
                    fill={fillColor}
                    stroke="var(--color-background, #0b0f19)"
                    strokeWidth="2"
                  />

                  {/* Ícone NATIVO renderizado dentro do nó */}
                  <g transform={`translate(-${r / 2}, -${r / 2}) scale(${r / 16})`} fill="#fff">
                    {iconSvg}
                  </g>

                  {/* Rótulo de Texto */}
                  <text
                    x={r + 6}
                    y={4}
                    fontSize={isFolder ? '12' : '11'}
                    fontWeight={isFolder || isSelected ? '700' : '500'}
                    fill={isHighlighted ? '#ffffff' : 'var(--color-text-muted, #a1a1aa)'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {n.title.length > 24 ? n.title.slice(0, 24) + '…' : n.title}
                    {n.childCount !== undefined && ` (${n.childCount})`}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* ── Legenda de Tipos de Nós ───────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '16px',
            bottom: '16px',
            background: 'var(--color-surface, rgba(255,255,255,0.03))',
            border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>● Pasta/Cluster</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>★ Favorita</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>📌 Fixada</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>📄 Nota</span>
        </div>

        {/* ── Inspetor Lateral de Nós ──────────────────────────────────────── */}
        {(selectedNode || selectedFolder) && (
          <div
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '20px',
              background: 'var(--color-surface, rgba(15, 23, 42, 0.95))',
              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
              borderRadius: '12px',
              padding: '16px',
              width: '280px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
              Inspetor de Nó — Nível {currentLevel}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
              {selectedFolder ? selectedFolder.name : selectedNode?.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              {selectedFolder
                ? `📁 Pasta contendo ${notes.filter((n) => n.folderId === selectedFolder.id).length} notas`
                : `🔗 ${selectedNode?.degree || 0} conexões semânticas`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedFolder && (
                <Button size="sm" variant="primary" onClick={() => setCurrentLevel(2)}>
                  Explorar Notas desta Pasta &rarr;
                </Button>
              )}
              {selectedNode && (
                <>
                  <Button size="sm" variant="primary" onClick={() => onOpenNote(selectedNode.id)}>
                    Abrir Nota no Editor
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCurrentLevel(3)}>
                    Ver Grafo Wiki-Links (Nível 3)
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => { setSelectedNoteId(null); setSelectedFolderId(null) }}>
                Fechar Inspetor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
