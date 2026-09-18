import React from 'react'
import {
  LayoutTemplate,
  FileCode,
  Trash2,
  Boxes,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

export interface SystemDesignHeaderProps {
  nodesCount: number
  edgesCount: number
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onOpenTemplates: () => void
  onOpenReview: () => void
  onExportMermaid: () => void
  onClearCanvas: () => void
}

export const SystemDesignHeader: React.FC<SystemDesignHeaderProps> = ({
  nodesCount,
  edgesCount,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenTemplates,
  onOpenReview,
  onExportMermaid,
  onClearCanvas,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0a0f1d',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#ffffff',
          }}
        >
          <Boxes size={18} />
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>System Design & Architecture</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              Enterprise Studio
            </span>
          </h2>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
            {nodesCount} componentes · {edgesCount} conexões de rede
          </p>
        </div>
      </div>

      {/* Ações e Modos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Controles de Zoom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '7px',
            padding: '2px',
            marginRight: '6px',
          }}
        >
          <button
            onClick={onZoomOut}
            title="Reduzir Zoom"
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <ZoomOut size={14} />
          </button>
          <span
            onClick={onResetZoom}
            title="Resetar Zoom (100%)"
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '0 6px',
              color: '#94a3b8',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            title="Aumentar Zoom"
            style={{
              background: 'none',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={onResetZoom}
            title="Resetar Posição e Zoom"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              borderRadius: '4px',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <button
          onClick={onOpenTemplates}
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
          <LayoutTemplate size={14} />
          <span>Modelos</span>
        </button>

        <button
          onClick={onOpenReview}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '7px',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))',
            color: '#d8b4fe',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={14} />
          <span>AI Reviewer</span>
        </button>

        <button
          onClick={onExportMermaid}
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
          onClick={onClearCanvas}
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
  )
}
