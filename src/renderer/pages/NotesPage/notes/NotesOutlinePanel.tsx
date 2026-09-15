/**
 * NotesOutlinePanel — painel lateral direito com outline + bookmarks da nota.
 * Click no item rola ate o heading correspondente.
 * Upgrade 10d.
 */

import React from 'react'
import type { NoteBookmark } from '@types'
import type { OutlineItem } from './useNotesOutline'

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
    <aside className="notes-outline-panel">
      <header className="notes-outline-header">
        <span>Outline</span>
        {onClose && (
          <button type="button" className="notes-outline-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        )}
      </header>

      {outline.length === 0 && bookmarks.length === 0 ? (
        <p className="notes-outline-empty">Sem cabeçalhos nem bookmarks.</p>
      ) : (
        <div className="notes-outline-body">
          {outline.length > 0 && (
            <section>
              <ul className="notes-outline-list">
                {outline.map((item) => (
                  <li
                    key={item.id}
                    className={`notes-outline-item notes-outline-level-${item.level}`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  >
                    <button type="button" onClick={() => onJumpToHeading(item.id)}>
                      {item.text || '(sem texto)'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bookmarks.length > 0 && (
            <section className="notes-outline-bookmarks">
              <h4>Bookmarks ({bookmarks.length})</h4>
              <ul>
                {bookmarks.map((bm) => (
                  <li key={bm.id} className="notes-outline-bookmark-item">
                    <button type="button" onClick={() => onJumpToBookmark(bm.anchor)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ flexShrink: 0 }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                      {bm.label}
                    </button>
                    <button
                      type="button"
                      className="notes-outline-bookmark-remove"
                      onClick={() => onRemoveBookmark(bm.id)}
                      aria-label="Remover bookmark"
                    >
                      ×
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
