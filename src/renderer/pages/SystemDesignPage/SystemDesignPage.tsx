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
import { SystemDesignHeader } from './components/SystemDesignHeader'
import { SystemEdgeLayer } from './components/SystemEdgeLayer'
import { SystemDesignNodeItem } from './components/SystemDesignNodeItem'
import { exportToMermaid } from './utils/mermaidExporter'
import { Link2, X } from 'lucide-react'

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
  }

  // Pan do Canvas com botão direito ou arrastar fundo com botão esquerdo
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Desmarcar seleções se clicar no fundo
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      if (connectSourceId) {
        setConnectSourceId(null)
        setConnectingMousePos(null)
      }
    }

    if (e.button === 0 || e.button === 1 || e.button === 2) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      })
    }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    // Se estiver arrastando nó
    if (draggingNodeId) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY)
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== draggingNodeId) return n
          return {
            ...n,
            x: Math.round(coords.x - dragOffset.x),
            y: Math.round(coords.y - dragOffset.y),
          }
        })
      )
      return
    }

    // Se estiver conectando e movendo o mouse
    if (connectSourceId) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY)
      setConnectingMousePos(coords)
      return
    }

    // Se estiver fazendo pan do canvas
    if (isPanning) {
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

  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.2))
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.35))

  const handleClearCanvas = () => {
    if (confirm('Deseja limpar todo o canvas de arquitetura?')) {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
      setConnectSourceId(null)
    }
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
        {/* Toolbar Superior Modularizada */}
        <SystemDesignHeader
          nodesCount={nodes.length}
          edgesCount={edges.length}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={resetView}
          onOpenTemplates={() => setIsTemplateModalOpen(true)}
          onOpenReview={() => setIsReviewModalOpen(true)}
          onExportMermaid={exportMermaidCode}
          onClearCanvas={handleClearCanvas}
        />

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
            <SystemEdgeLayer
              nodes={nodes}
              edges={edges}
              selectedEdgeId={selectedEdgeId}
              connectSourceId={connectSourceId}
              connectingMousePos={connectingMousePos}
              nodeWidth={NODE_WIDTH}
              nodeHeight={NODE_HEIGHT}
              onSelectEdge={(id) => setSelectedEdgeId(id)}
              onCycleProtocol={handleCycleProtocol}
              onDeleteEdge={handleDeleteEdge}
            />

            {/* Renderização de Nós */}
            {nodes.map((node) => (
              <SystemDesignNodeItem
                key={node.id}
                node={node}
                nodeWidth={NODE_WIDTH}
                isSelected={selectedNodeId === node.id}
                isConnecting={connectSourceId === node.id}
                isDragging={draggingNodeId === node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onDeleteNode={handleDeleteNode}
                onStartConnect={(id) => setConnectSourceId(id)}
              />
            ))}
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
