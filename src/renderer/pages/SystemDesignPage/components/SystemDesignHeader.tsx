import React from 'react'
import {
  ArrowLeft,
  Save,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  BookmarkPlus,
  LayoutTemplate,
} from 'lucide-react'

export interface SystemDesignHeaderProps {
  designName?: string
  designColor?: string
  nodesCount: number
  edgesCount: number
  zoom: number
  hasUnsavedChanges?: boolean
  onBackToHub?: () => void
  onSaveDesign?: () => void
  onSaveAsTemplate?: () => void
  onOpenExportModal?: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onOpenTemplates: () => void
  onOpenReview: () => void
  onExportMermaid: () => void
  onClearCanvas: () => void
}

export const SystemDesignHeader: React.FC<SystemDesignHeaderProps> = ({
  designName = 'System Design Sem Título',
  designColor = '#6366f1',
  nodesCount,
  edgesCount,
  zoom,
  hasUnsavedChanges = false,
  onBackToHub,
  onSaveDesign,
  onSaveAsTemplate,
  onOpenExportModal,
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
        padding: '10px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0a0f1d',
        zIndex: 10,
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onBackToHub && (
          <button
            type="button"
            onClick={onBackToHub}
            title="Voltar à tela inicial de System Design"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>Hub</span>
          </button>
        )}

        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: designColor,
              boxShadow: `0 0 10px ${designColor}`,
              flexShrink: 0,
            }}
          />
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                color: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '-0.01em',
              }}
            >
              <span>{designName}</span>
              {hasUnsavedChanges ? (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}
                >
                  Alterado
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  Salvo localmente
                </span>
              )}
            </h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              {nodesCount} componentes · {edgesCount} conexões de rede
            </p>
          </div>
        </div>
      </div>

      {/* Ações e Modos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Controles de Zoom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '7px',
            padding: '2px',
            marginRight: '4px',
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
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <ZoomOut size={13} />
          </button>
          <span
            onClick={onResetZoom}
            title="Resetar Zoom (100%)"
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '0 5px',
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
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={onResetZoom}
            title="Resetar Posição e Zoom"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* Salvar */}
        {onSaveDesign && (
          <button
            type="button"
            onClick={onSaveDesign}
            title="Salvar alterações no armazenamento local"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '7px',
              border: hasUnsavedChanges
                ? '1px solid var(--color-primary, #6366f1)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: hasUnsavedChanges
                ? 'var(--color-primary, #6366f1)'
                : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={13} />
            <span>Salvar</span>
          </button>
        )}

        {/* Salvar como Template */}
        {onSaveAsTemplate && (
          <button
            type="button"
            onClick={onSaveAsTemplate}
            title="Salvar arquitetura atual como Template customizado"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookmarkPlus size={13} />
            <span>Como Template</span>
          </button>
        )}

        {/* Exportar Multiformato */}
        {onOpenExportModal ? (
          <button
            type="button"
            onClick={onOpenExportModal}
            title="Exportar como JSON, Markdown (IA) ou Mermaid"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Share2 size={13} />
            <span>Exportar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onExportMermaid}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Share2 size={13} />
            <span>Mermaid</span>
          </button>
        )}

        {/* Modelos */}
        <button
          type="button"
          onClick={onOpenTemplates}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 11px',
            borderRadius: '7px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#e2e8f0',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LayoutTemplate size={13} />
          <span>Modelos</span>
        </button>

        {/* AI Reviewer */}
        <button
          type="button"
          onClick={onOpenReview}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '7px',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))',
            color: '#d8b4fe',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={13} />
          <span>AI Reviewer</span>
        </button>

        {/* Limpar */}
        <button
          type="button"
          onClick={onClearCanvas}
          title="Limpar todos os componentes do canvas"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            borderRadius: '7px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  )
}
