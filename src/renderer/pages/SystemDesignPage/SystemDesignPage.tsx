import React, { useState, useRef, useCallback } from 'react'
import {
  SystemNode,
  SystemEdge,
  SystemComponentDefinition,
  ArchitectureTemplate,
  BUILTIN_TEMPLATES,
  ConnectionProtocol,
} from './types/systemDesign.types'
import { PaletteSidebar } from './components/PaletteSidebar'
import { TemplateSelectorModal } from './components/TemplateSelectorModal'
import { SystemDesignReviewModal } from './components/SystemDesignReviewModal'
import { NodePropertiesDrawer } from './components/NodePropertiesDrawer'
import { exportToMermaid } from './utils/mermaidExporter'
import { SystemComponentIcon } from './components/SystemComponentIcon'
import {
  LayoutTemplate,
  FileCode,
  Trash2,
  Link2,
  X,
  Boxes,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

const NODE_WIDTH = 180
const NODE_HEIGHT = 80

const PROTOCOLS: ConnectionProtocol[] = [
  'HTTP/REST',
  'gRPC',
  'WebSocket',
  'GraphQL',
  'SQL',
  'Kafka Protocol',
  'AMQP',
  'TCP/UDP',
  'Vector Query',
  'Async Event',
  'mTLS',
]

export const SystemDesignPage: React.FC = () => {
  const [nodes, setNodes] = useState<SystemNode[]>(BUILTIN_TEMPLATES[0].nodes)
  const [edges, setEdges] = useState<SystemEdge[]>(BUILTIN_TEMPLATES[0].edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null)

  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  // Converter coordenadas da tela para coordenadas do Canvas
  const screenToCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 }
      const rect = canvasRef.current.getBoundingClientRect()
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      }
    },
    [pan, zoom]
  )

  // Adicionar novo nó a partir da Sidebar ou Drop
  const handleAddComponentAt = (
    comp: SystemComponentDefinition,
    canvasX: number,
    canvasY: number
  ) => {
    const newNode: SystemNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: comp.type,
      label: comp.label,
      category: comp.category,
      icon: comp.icon,
      x: Math.round(canvasX - NODE_WIDTH / 2),
      y: Math.round(canvasY - NODE_HEIGHT / 2),
      port: comp.defaultPort,
      techStack: comp.techStack || comp.label,
      notes: comp.description,
      description: comp.description,
    }
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newNode.id)
  }

  const handleAddComponentFromClick = (comp: SystemComponentDefinition) => {
    // Posiciona próximo ao centro visível
    const centerX = (-pan.x + 350) / zoom
    const centerY = (-pan.y + 250) / zoom
    const offset = (nodes.length * 25) % 150
    handleAddComponentAt(comp, centerX + offset, centerY + offset)
  }

  // Drop do drag-and-drop da sidebar
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return

    try {
      const comp: SystemComponentDefinition = JSON.parse(raw)
      const coords = screenToCanvasCoords(e.clientX, e.clientY)
      handleAddComponentAt(comp, coords.x, coords.y)
    } catch (err) {
      console.error('Falha ao processar drop no canvas:', err)
    }
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // Início de drag de nó no canvas
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.button !== 0) return // Apenas botão esquerdo

    if (connectSourceId) {
      // Se estava no modo de conexão, conecta
      if (connectSourceId !== nodeId) {
        const newEdge: SystemEdge = {
          id: `edge-${Date.now()}`,
          source: connectSourceId,
          target: nodeId,
          protocol: 'HTTP/REST',
        }
        setEdges((prev) => [...prev, newEdge])
      }
      setConnectSourceId(null)
      setConnectingMousePos(null)
      return
    }

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const coords = screenToCanvasCoords(e.clientX, e.clientY)
    setDraggingNodeId(nodeId)
    setDragOffset({
      x: coords.x - node.x,
      y: coords.y - node.y,
    })
    setSelectedNodeId(nodeId)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  // Início do Pan no canvas
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      if (connectSourceId) {
        setConnectSourceId(null)
        setConnectingMousePos(null)
      }
    }
  }

  // Movimento global no canvas
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (connectSourceId) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY)
      setConnectingMousePos(coords)
    }

    if (draggingNodeId) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY)
      const newX = Math.round(coords.x - dragOffset.x)
      const newY = Math.round(coords.y - dragOffset.y)

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      )
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleCanvasPointerUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null)
    }
    if (isPanning) {
      setIsPanning(false)
    }
  }

  // Wheel para Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.35), 2.2)
    setZoom(Number(newZoom.toFixed(2)))
  }

  // Atualização de nó via Drawer
  const handleUpdateNode = (id: string, updates: Partial<SystemNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
  }

  // Exclusão de nó
  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  // Exclusão de conexão
  const handleDeleteEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null)
  }

  // Ciclar protocolo da conexão
  const handleCycleProtocol = (edgeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== edgeId) return edge
        const currentProtocol = edge.protocol || 'HTTP/REST'
        const currentIdx = PROTOCOLS.indexOf(currentProtocol)
        const nextProtocol = PROTOCOLS[(currentIdx + 1) % PROTOCOLS.length]
        return { ...edge, protocol: nextProtocol }
      })
    )
  }

  const handleSelectTemplate = (tpl: ArchitectureTemplate) => {
    setNodes(tpl.nodes)
    setEdges(tpl.edges)
    setSelectedNodeId(null)
    setConnectSourceId(null)
    setPan({ x: 50, y: 50 })
    setZoom(1)
  }

  const exportMermaidCode = () => {
    const code = exportToMermaid(nodes, edges)
    navigator.clipboard.writeText(code)
    alert(
      'Código Mermaid exportado e copiado para a área de transferência! Cole no módulo de Notas ou Markdown.'
    )
  }

  const resetView = () => {
    setPan({ x: 50, y: 50 })
    setZoom(1)
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: '#0a0f1d',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Modais */}
      <TemplateSelectorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <SystemDesignReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* Sidebar de Paleta com Busca e Categorias */}
      <PaletteSidebar onAddComponent={handleAddComponentFromClick} />

      {/* Área Central do Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Toolbar Superior */}
        <div
          style={{
            height: '56px',
            padding: '0 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(12, 18, 32, 0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#818cf8',
              }}
            >
              <Boxes size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.01em',
                  }}
                >
                  System Design Canvas
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Estudo & Arquitetura
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {nodes.length} nós · {edges.length} conexões · Arraste componentes da paleta para o
                canvas
              </span>
            </div>
          </div>

          {/* Controles de Zoom e Ferramentas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '2px',
                marginRight: '6px',
              }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.35))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Diminuir Zoom"
              >
                <ZoomOut size={14} />
              </button>
              <span
                onClick={resetView}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  padding: '0 8px',
                  cursor: 'pointer',
                  minWidth: '42px',
                  textAlign: 'center',
                }}
                title="Clique para redefinir zoom"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.2))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Aumentar Zoom"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={resetView}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Centralizar Visualização"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <button
              onClick={() => setIsTemplateModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutTemplate size={14} style={{ color: '#818cf8' }} />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setIsReviewModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Sparkles size={14} />
              <span>AI Reviewer</span>
            </button>

            <button
              onClick={exportMermaidCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <FileCode size={14} />
              <span>Mermaid</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Deseja limpar todo o canvas de arquitetura?')) {
                  setNodes([])
                  setEdges([])
                  setSelectedNodeId(null)
                  setConnectSourceId(null)
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '7px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Indicador de Conexão em Andamento */}
        {connectSourceId && (
          <div
            style={{
              position: 'absolute',
              top: '68px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(249, 115, 22, 0.95)',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Link2 size={14} />
            <span>Clique no componente de destino para conectar</span>
            <button
              onClick={() => {
                setConnectSourceId(null)
                setConnectingMousePos(null)
              }}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Grade do Canvas com Drag & Drop e Pan */}
        <div
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
          style={{
            flex: 1,
            position: 'relative',
            background: '#070b14',
            backgroundImage: `
              radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: isPanning ? 'grabbing' : connectSourceId ? 'crosshair' : 'default',
            overflow: 'hidden',
          }}
        >
          {/* Camada Transformada (Zoom + Pan) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              pointerEvents: 'none',
            }}
          >
            {/* SVG para Conexões e Curvas Bezier */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '8000px',
                height: '8000px',
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                </marker>
                <marker
                  id="arrow-selected"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Renderização de Conexões Existentes */}
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source)
                const targetNode = nodes.find((n) => n.id === edge.target)
                if (!sourceNode || !targetNode) return null

                const x1 = sourceNode.x + NODE_WIDTH / 2
                const y1 = sourceNode.y + NODE_HEIGHT / 2
                const x2 = targetNode.x + NODE_WIDTH / 2
                const y2 = targetNode.y + NODE_HEIGHT / 2

                const dx = Math.abs(x2 - x1) * 0.5
                const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const isEdgeSelected = selectedEdgeId === edge.id
                const protocolText = edge.protocol || 'HTTP/REST'

                return (
                  <g key={edge.id} style={{ pointerEvents: 'auto' }}>
                    {/* Linha invisível mais grossa para facilitar o clique */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      onClick={() => setSelectedEdgeId(edge.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    {/* Linha visível */}
                    <path
                      d={path}
                      fill="none"
                      stroke={isEdgeSelected ? '#38bdf8' : '#6366f1'}
                      strokeWidth={isEdgeSelected ? 2.5 : 1.8}
                      strokeDasharray={
                        protocolText.includes('Topic') || protocolText.includes('Pub') || protocolText.includes('Event')
                          ? '5,5'
                          : 'none'
                      }
                      markerEnd={isEdgeSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
                      style={{ transition: 'stroke 0.15s ease' }}
                    />

                    {/* Badge Interativo de Protocolo */}
                    <foreignObject
                      x={midX - 55}
                      y={midY - 14}
                      width={110}
                      height={28}
                      style={{ overflow: 'visible' }}
                    >
                      <div
                        onClick={(e) => handleCycleProtocol(edge.id, e)}
                        title="Clique para alternar protocolo ou clique no 'X' para remover"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: isEdgeSelected ? '#0369a1' : 'rgba(15, 23, 42, 0.9)',
                          border: `1px solid ${
                            isEdgeSelected ? '#38bdf8' : 'rgba(99, 102, 241, 0.4)'
                          }`,
                          color: '#e0e7ff',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{protocolText}</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteEdge(edge.id)
                          }}
                          style={{
                            color: '#f87171',
                            marginLeft: '2px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Remover conexão"
                        >
                          <X size={10} />
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                )
              })}

              {/* Linha Dinâmica enquanto está conectando */}
              {connectSourceId && connectingMousePos && (
                (() => {
                  const sourceNode = nodes.find((n) => n.id === connectSourceId)
                  if (!sourceNode) return null
                  const x1 = sourceNode.x + NODE_WIDTH / 2
                  const y1 = sourceNode.y + NODE_HEIGHT / 2
                  const x2 = connectingMousePos.x
                  const y2 = connectingMousePos.y
                  const dx = Math.abs(x2 - x1) * 0.5
                  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

                  return (
                    <path
                      d={path}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow)"
                    />
                  )
                })()
              )}
            </svg>

            {/* Renderização de Nós */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id
              const isConnecting = connectSourceId === node.id

              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${NODE_WIDTH}px`,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: isSelected
                      ? 'linear-gradient(180deg, #1e293b, #0f172a)'
                      : 'linear-gradient(180deg, #131b2e, #0c1220)',
                    border: '1.5px solid',
                    borderColor: isConnecting
                      ? '#f97316'
                      : isSelected
                      ? '#818cf8'
                      : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isSelected
                      ? '0 8px 24px -4px rgba(99, 102, 241, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.4)'
                      : '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
                    cursor: 'grab',
                    pointerEvents: 'auto',
                    transition:
                      draggingNodeId === node.id
                        ? 'none'
                        : 'border-color 0.15s, box-shadow 0.15s',
                    zIndex: isSelected ? 5 : 2,
                  }}
                >
                  {/* Cabeçalho do Nó */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          flexShrink: 0,
                        }}
                      >
                        <SystemComponentIcon type={node.type} size={14} />
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '12px',
                          color: '#f1f5f9',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.label}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNode(node.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                      title="Excluir componente"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Sub-informações / Tags */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: '#94a3b8',
                    }}
                  >
                    <span style={{ color: '#64748b', textTransform: 'capitalize' }}>
                      {node.category}
                    </span>
                    {node.port && <span style={{ color: '#38bdf8' }}>:{node.port}</span>}
                    {node.scale && <span style={{ color: '#34d399' }}>{node.scale}</span>}
                  </div>

                  {/* Botão de Conectar Rápido */}
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConnectSourceId(node.id)
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                      }}
                    >
                      <Link2 size={10} />
                      <span>Conectar</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dica Flutuante no Rodapé do Canvas */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#94a3b8',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            💡 <strong style={{ color: '#cbd5e1' }}>Dica:</strong> Arraste itens da paleta para o
            canvas · Clique em um nó para editar propriedades e notas de estudo
          </div>
        </div>
      </div>

      {/* Gaveta Lateral de Propriedades e Notas de Estudo */}
      <NodePropertiesDrawer
        node={selectedNode}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onStartConnect={(id) => setConnectSourceId(id)}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  )
}
