import React from 'react'
import type { SystemNode, SystemEdge } from '../types/systemDesign.types'
import { X } from 'lucide-react'

export interface SystemEdgeLayerProps {
  nodes: SystemNode[]
  edges: SystemEdge[]
  selectedEdgeId: string | null
  connectSourceId: string | null
  connectingMousePos: { x: number; y: number } | null
  nodeWidth: number
  nodeHeight: number
  onSelectEdge: (edgeId: string) => void
  onCycleProtocol: (edgeId: string, e: React.MouseEvent) => void
  onDeleteEdge: (edgeId: string) => void
}

export const SystemEdgeLayer: React.FC<SystemEdgeLayerProps> = ({
  nodes,
  edges,
  selectedEdgeId,
  connectSourceId,
  connectingMousePos,
  nodeWidth,
  nodeHeight,
  onSelectEdge,
  onCycleProtocol,
  onDeleteEdge,
}) => {
  return (
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

        const x1 = sourceNode.x + nodeWidth / 2
        const y1 = sourceNode.y + nodeHeight / 2
        const x2 = targetNode.x + nodeWidth / 2
        const y2 = targetNode.y + nodeHeight / 2

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
              onClick={() => onSelectEdge(edge.id)}
              style={{ cursor: 'pointer' }}
            />
            {/* Linha visível */}
            <path
              d={path}
              fill="none"
              stroke={isEdgeSelected ? '#38bdf8' : '#6366f1'}
              strokeWidth={isEdgeSelected ? 2.5 : 1.8}
              strokeDasharray={
                protocolText.includes('Topic') ||
                protocolText.includes('Pub') ||
                protocolText.includes('Event')
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
                onClick={(e) => onCycleProtocol(edge.id, e)}
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
                    onDeleteEdge(edge.id)
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
          const x1 = sourceNode.x + nodeWidth / 2
          const y1 = sourceNode.y + nodeHeight / 2
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
  )
}
