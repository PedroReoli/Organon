/**
 * NotesOutlinePanel — painel lateral direito com outline + bookmarks da nota.
 * Click no item rola ate o heading correspondente.
 * Upgrade 10d.
 */

import React from 'react'
import type { NoteBookmark } from '@types'
import type { OutlineItem } from './useNotesOutline'
import { ListTree, Bookmark, X, FileText } from 'lucide-react'

interface NotesOutlinePanelProps {
  outline: OutlineItem[]
  bookmarks: NoteBookmark[]
  onJumpToHeading: (id: string) => void
  onJumpToBookmark: (anchor: string) => void
  onRemoveBookmark: (id: string) => void
  onClose?: () => void
}

export const NotesOutlinePanel: React.FC<NotesOutlinePanelProps> = ({
  outline,
  bookmarks,
  onJumpToHeading,
  onJumpToBookmark,
  onRemoveBookmark,
  onClose,
}) => {
  return (
    <aside className="notes-outline-panel" aria-label="Painel de Sumário">
      <header className="notes-outline-header">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <ListTree className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Sumário</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="notes-outline-close"
            onClick={onClose}
            aria-label="Fechar sumário"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {outline.length === 0 && bookmarks.length === 0 ? (
        <div className="notes-outline-empty">
          <FileText className="w-8 h-8 opacity-25 mb-2 mx-auto stroke-1" />
          <p>Sem cabeçalhos ou marcadores</p>
          <span className="text-[11px] opacity-60">Use H1, H2 ou H3 na nota para gerar a estrutura.</span>
        </div>
      ) : (
        <div className="notes-outline-body">
          {outline.length > 0 && (
            <section className="notes-outline-section">
              <ul className="notes-outline-list">
                {outline.map((item) => (
                  <li
                    key={item.id}
                    className={`notes-outline-item notes-outline-level-${item.level}`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  >
                    <button type="button" onClick={() => onJumpToHeading(item.id)} title={item.text}>
                      <span className="notes-outline-dot" />
                      <span className="truncate">{item.text || '(sem texto)'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bookmarks.length > 0 && (
            <section className="notes-outline-bookmarks">
              <div className="notes-outline-section-header">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3 h-3 text-amber-400" />
                  <h4>Marcadores ({bookmarks.length})</h4>
                </div>
              </div>
              <ul className="notes-outline-bookmarks-list">
                {bookmarks.map((bm) => (
                  <li key={bm.id} className="notes-outline-bookmark-item">
                    <button type="button" onClick={() => onJumpToBookmark(bm.anchor)} title={bm.label}>
                      <Bookmark className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{bm.label}</span>
                    </button>
                    <button
                      type="button"
                      className="notes-outline-bookmark-remove"
                      onClick={() => onRemoveBookmark(bm.id)}
                      aria-label="Remover marcador"
                      title="Remover marcador"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </aside>
  )
}
