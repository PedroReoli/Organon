import React from 'react'
import type { Note, NoteFolder } from '@types'
import { Button } from '@shared/components/primitives'
import { Folder, Link2 } from 'lucide-react'
import type { GraphLevel, GraphNode } from './graphSimulation'

export interface GraphInspectorProps {
  currentLevel: GraphLevel
  selectedNode: GraphNode | null
  selectedFolder: NoteFolder | null
  notes: Note[]
  onOpenNote: (id: string) => void
  onSetCurrentLevel: (level: GraphLevel) => void
  onClose: () => void
}

export const GraphInspector: React.FC<GraphInspectorProps> = ({
  currentLevel,
  selectedNode,
  selectedFolder,
  notes,
  onOpenNote,
  onSetCurrentLevel,
  onClose,
}) => {
  if (!selectedNode && !selectedFolder) return null

  return (
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
      <div
        style={{
          fontSize: '10px',
          fontWeight: 800,
          color: 'var(--color-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: '6px',
        }}
      >
        Inspetor de Nó — Nível {currentLevel}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
        {selectedFolder ? selectedFolder.name : selectedNode?.title}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {selectedFolder ? (
          <>
            <Folder size={13} />
            <span>Pasta contendo {notes.filter((n) => n.folderId === selectedFolder.id).length} notas</span>
          </>
        ) : (
          <>
            <Link2 size={13} />
            <span>{selectedNode?.degree || 0} conexões semânticas</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedFolder && (
          <Button size="sm" variant="primary" onClick={() => onSetCurrentLevel(2)}>
            Explorar Notas desta Pasta &rarr;
          </Button>
        )}
        {selectedNode && (
          <>
            <Button size="sm" variant="primary" onClick={() => onOpenNote(selectedNode.id)}>
              Abrir Nota no Editor
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onSetCurrentLevel(3)}>
              Ver Grafo Wiki-Links (Nível 3)
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={onClose}>
          Fechar Inspetor
        </Button>
      </div>
    </div>
  )
}
