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
import { Folder, FileText, Network, Star, Pin } from 'lucide-react'
import {
  type GraphLevel,
  type GraphNode,
  NodeIcons,
  buildLayout,
} from './graphSimulation'
import { GraphInspector } from './GraphInspector'

export type { GraphLevel } from './graphSimulation'

interface NotesGraphViewProps {
  notes: Note[]
  folders?: NoteFolder[]
  index: NotesLinkIndex
  onOpenNote: (id: string) => void
  onClose: () => void
  onOpenProjects?: () => void
  maxNodes?: number
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
            Grafo de Conexões
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Folder size={12} />
            <span>Nível 1: Pastas</span>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={12} />
            <span>Nível 2: Notas</span>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Network size={12} />
            <span>Nível 3: Links</span>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}><Star size={12} fill="#f59e0b" /> Favorita</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}><Pin size={12} /> Fixada</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}><FileText size={12} /> Nota</span>
        </div>

        {/* ── Inspetor Lateral de Nós ──────────────────────────────────────── */}
        <GraphInspector
          currentLevel={currentLevel}
          selectedNode={selectedNode}
          selectedFolder={selectedFolder}
          notes={notes}
          onOpenNote={onOpenNote}
          onSetCurrentLevel={setCurrentLevel}
          onClose={() => { setSelectedNoteId(null); setSelectedFolderId(null) }}
        />
      </div>
    </div>
  )
}
