/**
 * NotesBacklinksPanel — painel lateral mostrando "Notas que linkam aqui".
 *
 * Recebe o id da nota atual + o NotesLinkIndex e renderiza a lista de
 * backlinks com snippet e click pra navegar.
 *
 * Upgrade 10b.
 */

import React, { useMemo } from 'react'
import type { Note } from '@types'
import type { NotesLinkIndex } from './useNotesLinkIndex'

interface NotesBacklinksPanelProps {
  noteId: string | null
  notes: Note[]
  index: NotesLinkIndex
  onOpenNote: (id: string) => void
  onClose?: () => void
}

export const NotesBacklinksPanel: React.FC<NotesBacklinksPanelProps> = ({
  noteId,
  notes,
  index,
  onOpenNote,
  onClose,
}) => {
  const incoming = noteId ? index.incoming.get(noteId) ?? [] : []
  const outgoing = noteId ? index.outgoing.get(noteId) ?? [] : []

  const noteMap = useMemo(() => {
    const m = new Map<string, Note>()
    for (const n of notes) m.set(n.id, n)
    return m
  }, [notes])

  if (!noteId) {
    return (
      <aside className="notes-backlinks-panel">
        <header className="notes-backlinks-header">
          <span>Backlinks</span>
        </header>
        <p className="notes-backlinks-empty">Selecione uma nota.</p>
      </aside>
    )
  }

  return (
    <aside className="notes-backlinks-panel">
      <header className="notes-backlinks-header">
        <span>Conexões</span>
        {onClose && (
          <button type="button" className="notes-backlinks-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        )}
      </header>

      <div className="notes-backlinks-body">
        <section>
          <h4>Linkam para esta nota ({incoming.length})</h4>
          {incoming.length === 0 ? (
            <p className="notes-backlinks-empty">Nenhuma nota referencia esta.</p>
          ) : (
            <ul className="notes-backlinks-list">
              {incoming.map((ref, idx) => {
                const source = noteMap.get(ref.sourceNoteId)
                return (
                  <li key={`${ref.sourceNoteId}-${idx}`} className="notes-backlinks-item">
                    <button type="button" onClick={() => onOpenNote(ref.sourceNoteId)}>
                      <span className="notes-backlinks-title">{source?.title ?? '(removida)'}</span>
                      <span className="notes-backlinks-snippet">{ref.contextSnippet}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h4>Esta nota linka para ({outgoing.length})</h4>
          {outgoing.length === 0 ? (
            <p className="notes-backlinks-empty">Nenhum wiki-link nesta nota.</p>
          ) : (
            <ul className="notes-backlinks-list">
              {outgoing.map((ref, idx) => (
                <li key={`out-${idx}`} className="notes-backlinks-item">
                  <button
                    type="button"
                    disabled={!ref.targetNoteId}
                    onClick={() => ref.targetNoteId && onOpenNote(ref.targetNoteId)}
                  >
                    <span className={`notes-backlinks-title ${!ref.targetNoteId ? 'is-broken' : ''}`}>
                      {ref.targetTitle}
                      {!ref.targetNoteId && ' (broken)'}
                    </span>
                    <span className="notes-backlinks-snippet">{ref.contextSnippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}
