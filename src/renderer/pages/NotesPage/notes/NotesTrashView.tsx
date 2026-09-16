/**
 * NotesTrashView — view de Lixeira de notas (Upgrade 10a).
 *
 * Lista notas e pastas com soft delete (deletedAt != null).
 * Mostra contagem regressiva ate o purge automatico (30 dias),
 * permite restaurar e purgar (com confirmacao tripla pra purge manual).
 */

import React, { useMemo, useState } from 'react'
import type { Note, NoteFolder } from '@types'
import { NOTE_TRASH_RETENTION_DAYS } from '@types'
import { Button } from '@shared/components/primitives'
import { X } from 'lucide-react'

interface NotesTrashViewProps {
  notes: Note[]
  folders: NoteFolder[]
  onRestoreNote: (noteId: string) => void
  onRestoreFolder: (folderId: string) => void
  onPurgeNote: (noteId: string) => void
  onPurgeFolder: (folderId: string) => void
  onEmptyTrash: () => void
  onClose: () => void
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  return Math.floor((Date.now() - then) / 86400000)
}

function daysUntilPurge(deletedAt: string): number {
  return NOTE_TRASH_RETENTION_DAYS - daysSince(deletedAt)
}

export const NotesTrashView: React.FC<NotesTrashViewProps> = ({
  notes,
  folders,
  onRestoreNote,
  onRestoreFolder,
  onPurgeNote,
  onPurgeFolder,
  onEmptyTrash,
  onClose,
}) => {
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null)
  const [purgeText, setPurgeText] = useState('')

  const trashedNotes = useMemo(
    () => notes
      .filter((n) => n.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')),
    [notes],
  )

  const trashedFolders = useMemo(
    () => folders
      .filter((f) => f.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')),
    [folders],
  )

  const totalCount = trashedNotes.length + trashedFolders.length

  const handlePurgeWithConfirmation = (id: string, kind: 'note' | 'folder') => {
    if (purgeText !== 'DELETE') return
    if (kind === 'note') onPurgeNote(id)
    else onPurgeFolder(id)
    setConfirmPurgeId(null)
    setPurgeText('')
  }

  return (
    <div className="notes-trash-view">
      <header className="notes-trash-header">
        <div>
          <h2>Lixeira</h2>
          <p className="notes-trash-subtitle">
            {totalCount} {totalCount === 1 ? 'item' : 'itens'} · Itens são removidos definitivamente após {NOTE_TRASH_RETENTION_DAYS} dias
          </p>
        </div>
        <div className="notes-trash-actions">
          {totalCount > 0 && !confirmEmpty && (
            <Button size="sm" variant="danger" onClick={() => setConfirmEmpty(true)}>
              Esvaziar lixeira
            </Button>
          )}
          {confirmEmpty && (
            <>
              <span className="notes-trash-confirm-text">Confirmar?</span>
              <Button size="sm" variant="danger" onClick={() => { onEmptyTrash(); setConfirmEmpty(false) }}>
                Sim, esvaziar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmEmpty(false)}>
                Cancelar
              </Button>
            </>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-primary, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
            title="Voltar para a Visão Geral de Notas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar para Visão Geral
          </button>
        </div>
      </header>

      {totalCount === 0 ? (
        <div className="notes-trash-empty">
          <p>Lixeira vazia.</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Notas e pastas excluídas aparecem aqui por {NOTE_TRASH_RETENTION_DAYS} dias antes da remoção definitiva.</p>
        </div>
      ) : (
        <div className="notes-trash-list">
          {trashedFolders.length > 0 && (
            <section className="notes-trash-section">
              <h3>Pastas ({trashedFolders.length})</h3>
              <ul>
                {trashedFolders.map((folder) => {
                  const days = folder.deletedAt ? daysUntilPurge(folder.deletedAt) : 0
                  const isConfirming = confirmPurgeId === folder.id
                  return (
                    <li key={folder.id} className="notes-trash-item">
                      <div className="notes-trash-item-info">
                        <span className="notes-trash-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></span>
                        <span className="notes-trash-name">{folder.name || 'Sem nome'}</span>
                        <span className={`notes-trash-days ${days <= 3 ? 'is-warning' : ''}`}>
                          Expira em {days}d
                        </span>
                      </div>
                      {isConfirming ? (
                        <div className="notes-trash-confirm">
                          <input
                            type="text"
                            placeholder="Digite DELETE"
                            value={purgeText}
                            onChange={(e) => setPurgeText(e.target.value)}
                            className="form-input"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={purgeText !== 'DELETE'}
                            onClick={() => handlePurgeWithConfirmation(folder.id, 'folder')}
                          >
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setConfirmPurgeId(null); setPurgeText('') }} aria-label="Cancelar">
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="notes-trash-actions-row">
                          <Button size="sm" variant="secondary" onClick={() => onRestoreFolder(folder.id)}>
                            Restaurar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmPurgeId(folder.id)}>
                            Excluir
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {trashedNotes.length > 0 && (
            <section className="notes-trash-section">
              <h3>Notas ({trashedNotes.length})</h3>
              <ul>
                {trashedNotes.map((note) => {
                  const days = note.deletedAt ? daysUntilPurge(note.deletedAt) : 0
                  const isConfirming = confirmPurgeId === note.id
                  return (
                    <li key={note.id} className="notes-trash-item">
                      <div className="notes-trash-item-info">
                        <span className="notes-trash-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></span>
                        <span className="notes-trash-name">{note.title || 'Sem título'}</span>
                        <span className={`notes-trash-days ${days <= 3 ? 'is-warning' : ''}`}>
                          Expira em {days}d
                        </span>
                      </div>
                      {isConfirming ? (
                        <div className="notes-trash-confirm">
                          <input
                            type="text"
                            placeholder="Digite DELETE"
                            value={purgeText}
                            onChange={(e) => setPurgeText(e.target.value)}
                            className="form-input"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={purgeText !== 'DELETE'}
                            onClick={() => handlePurgeWithConfirmation(note.id, 'note')}
                          >
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setConfirmPurgeId(null); setPurgeText('') }} aria-label="Cancelar">
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="notes-trash-actions-row">
                          <Button size="sm" variant="secondary" onClick={() => onRestoreNote(note.id)}>
                            Restaurar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmPurgeId(note.id)}>
                            Excluir
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
