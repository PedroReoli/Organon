import React, { useState } from 'react'
import {
  SystemNode,
  SystemEdge,
  SystemComponentDefinition,
  ArchitectureTemplate,
  BUILTIN_TEMPLATES,
} from './types/systemDesign.types'
import { PaletteSidebar } from './components/PaletteSidebar'
import { TemplateSelectorModal } from './components/TemplateSelectorModal'
import { SystemDesignReviewModal } from './components/SystemDesignReviewModal'
import { exportToMermaid } from './utils/mermaidExporter'

export const SystemDesignPage: React.FC = () => {
  const [nodes, setNodes] = useState<SystemNode[]>(BUILTIN_TEMPLATES[0].nodes)
  const [edges, setEdges] = useState<SystemEdge[]>(BUILTIN_TEMPLATES[0].edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  const handleAddComponent = (comp: SystemComponentDefinition) => {
    const newNode: SystemNode = {
      id: `node-${Date.now()}`,
      type: comp.type,
      label: comp.label,
      category: comp.category,
      icon: comp.icon,
      x: 150 + (nodes.length * 30) % 400,
      y: 150 + (nodes.length * 40) % 300,
      port: comp.defaultPort,
    }
    setNodes(prev => [...prev, newNode])
  }

  const handleSelectTemplate = (tpl: ArchitectureTemplate) => {
    setNodes(tpl.nodes)
    setEdges(tpl.edges)
    setSelectedNodeId(null)
    setConnectSourceId(null)
  }

  const handleNodeClick = (id: string) => {
    if (connectSourceId && connectSourceId !== id) {
      // Cria nova conexão entre connectSourceId e id
      const newEdge: SystemEdge = {
        id: `edge-${Date.now()}`,
        source: connectSourceId,
        target: id,
        protocol: 'HTTP/REST',
      }
      setEdges(prev => [...prev, newEdge])
      setConnectSourceId(null)
    } else {
      setSelectedNodeId(id)
    }
  }

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const exportMermaidCode = () => {
    const code = exportToMermaid(nodes, edges)
    navigator.clipboard.writeText(code)
    alert('Código Mermaid exportado e copiado para a área de transferência! Cole no módulo de Notas.')
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--color-background)',
        color: 'var(--color-text)',
        fontFamily: 'system-ui, sans-serif',
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

      {/* Sidebar de Paleta */}
      <PaletteSidebar onAddComponent={handleAddComponent} />

      {/* Área Central do Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Toolbar do Canvas */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>🏛️ System Design Canvas</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Modelador de Arquitetura 100% Offline & Client-Side
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🏛️ Templates Prontos
            </button>

            <button
              onClick={() => setIsReviewModalOpen(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🤖 AI Reviewer
            </button>

            <button
              onClick={exportMermaidCode}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📋 Exportar Mermaid
            </button>

            <button
              onClick={() => { setNodes([]); setEdges([]); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'none',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑️ Limpar
            </button>
          </div>
        </div>

        {/* Grade do Canvas */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            overflow: 'auto',
          }}
        >
          {/* Renderização de Nós */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id
            const isConnecting = connectSourceId === node.id

            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: '160px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--color-surface)',
                  border: '2px solid',
                  borderColor: isConnecting ? '#f97316' : isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{node.icon}</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.label}
                  </div>
                </div>

                {node.port && (
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Porta: {node.port}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConnectSourceId(node.id); }}
                    style={{
                      flex: 1,
                      padding: '2px 4px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Conectar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
