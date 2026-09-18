import React from 'react'
import type { SystemNode } from '../types/systemDesign.types'
import { SystemComponentIcon } from './SystemComponentIcon'
import { X, Link2 } from 'lucide-react'

export interface SystemDesignNodeItemProps {
  node: SystemNode
  nodeWidth: number
  isSelected: boolean
  isConnecting: boolean
  isDragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onDeleteNode: (nodeId: string) => void
  onStartConnect: (nodeId: string) => void
}

export const SystemDesignNodeItem: React.FC<SystemDesignNodeItemProps> = ({
  node,
  nodeWidth,
  isSelected,
  isConnecting,
  isDragging,
  onPointerDown,
  onDeleteNode,
  onStartConnect,
}) => {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${nodeWidth}px`,
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
        transition: isDragging ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
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
            onDeleteNode(node.id)
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
            onStartConnect(node.id)
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
}
