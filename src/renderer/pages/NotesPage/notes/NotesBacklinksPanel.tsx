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
import { Network, ArrowDownLeft, ArrowUpRight, FileText, Link2Off, X } from 'lucide-react'

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
      <aside className="notes-backlinks-panel" aria-label="Painel de Conexões">
        <header className="notes-backlinks-header">
          <div className="flex items-center gap-2 font-semibold tracking-wide">
            <Network className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Conexões</span>
          </div>
          {onClose && (
            <button type="button" className="notes-backlinks-close" onClick={onClose} aria-label="Fechar">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </header>
        <div className="notes-backlinks-empty">
          <FileText className="w-8 h-8 opacity-25 mb-2 mx-auto stroke-1" />
          <span>Selecione uma nota para visualizar conexões.</span>
        </div>
      </aside>
    )
  }

  return (
    <aside className="notes-backlinks-panel" aria-label="Painel de Conexões">
      <header className="notes-backlinks-header">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <Network className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Conexões</span>
        </div>
        {onClose && (
          <button type="button" className="notes-backlinks-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      <div className="notes-backlinks-body">
        {/* Notas que referenciam esta */}
        <section className="notes-backlinks-section">
          <div className="notes-backlinks-section-title">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Linkam para esta nota</span>
            </div>
            <span className="notes-backlinks-badge">{incoming.length}</span>
          </div>

          {incoming.length === 0 ? (
            <div className="notes-backlinks-empty-box">
              <Link2Off className="w-4 h-4 opacity-40 mb-1" />
              <span>Nenhuma nota referencia esta.</span>
            </div>
          ) : (
            <ul className="notes-backlinks-list">
              {incoming.map((ref, idx) => {
                const source = noteMap.get(ref.sourceNoteId)
                return (
                  <li key={`${ref.sourceNoteId}-${idx}`} className="notes-backlinks-item">
                    <button type="button" onClick={() => onOpenNote(ref.sourceNoteId)}>
                      <div className="notes-backlinks-item-header">
                        <FileText className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                        <span className="notes-backlinks-title truncate">{source?.title || 'Nota sem título'}</span>
                      </div>
                      {ref.contextSnippet && (
                        <span className="notes-backlinks-snippet">{ref.contextSnippet}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Links de saída desta nota */}
        <section className="notes-backlinks-section">
          <div className="notes-backlinks-section-title">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Esta nota linka para</span>
            </div>
            <span className="notes-backlinks-badge">{outgoing.length}</span>
          </div>

          {outgoing.length === 0 ? (
            <div className="notes-backlinks-empty-box">
              <Link2Off className="w-4 h-4 opacity-40 mb-1" />
              <span>Nenhum wiki-link nesta nota.</span>
            </div>
          ) : (
            <ul className="notes-backlinks-list">
              {outgoing.map((ref, idx) => (
                <li key={`out-${idx}`} className="notes-backlinks-item">
                  <button
                    type="button"
                    disabled={!ref.targetNoteId}
                    onClick={() => ref.targetNoteId && onOpenNote(ref.targetNoteId)}
                    title={!ref.targetNoteId ? 'Nota referenciada não existe' : ref.targetTitle}
                  >
                    <div className="notes-backlinks-item-header">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          ref.targetNoteId ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      />
                      <span className={`notes-backlinks-title truncate ${!ref.targetNoteId ? 'is-broken' : ''}`}>
                        {ref.targetTitle}
                        {!ref.targetNoteId && ' (não encontrada)'}
                      </span>
                    </div>
                    {ref.contextSnippet && (
                      <span className="notes-backlinks-snippet">{ref.contextSnippet}</span>
                    )}
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
