import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteFolder } from '../types'
import { isElectron } from '../utils'
import { WysiwygEditor } from './WysiwygEditor'

interface NotesViewProps {
  notes: Note[]
  folders: NoteFolder[]
  onAddNote: (title: string, folderId?: string | null) => Note
  onUpdateNote: (noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId'>>) => void
  onRemoveNote: (noteId: string) => void
  onAddFolder: (name: string, parentId?: string | null) => string
  onRemoveFolder: (folderId: string) => void
  reduceModeSignal?: number
}

type FolderRow = {
  id: string
  name: string
  parentId: string | null
  depth: number
}

export const NotesView = ({
  notes,
  folders,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddFolder,
  onRemoveFolder,
  reduceModeSignal,
}: NotesViewProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isFoldersSidebarOpen, setIsFoldersSidebarOpen] = useState(true)
  const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(true)
  const [newFolderName, setNewFolderName] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [contentLoaded, setContentLoaded] = useState(false)
  const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [renamingNote, setRenamingNote] = useState<{ noteId: string; value: string } | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteIdRef = useRef<string | null>(null)
  const noteContextMenuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const reduceModeHandledRef = useRef<number | undefined>(reduceModeSignal)
  const sidebarStateRef = useRef({ foldersOpen: true, notesOpen: true })

  const folderRows = useMemo<FolderRow[]>(() => {
    const byParent = new Map<string | null, NoteFolder[]>()
    for (const folder of folders) {
      const parentId = folder.parentId ?? null
      const existing = byParent.get(parentId) ?? []
      existing.push(folder)
      byParent.set(parentId, existing)
    }

    for (const [, list] of byParent) {
      list.sort((a, b) => a.order - b.order)
    }

    const rows: FolderRow[] = []
    const walk = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) ?? []
      for (const folder of children) {
        rows.push({ id: folder.id, name: folder.name, parentId: folder.parentId ?? null, depth })
        walk(folder.id, depth + 1)
      }
    }
    walk(null, 0)
    return rows
  }, [folders])

  const filteredNotes = selectedFolderId
    ? notes.filter(n => n.folderId === selectedFolderId)
    : notes

  const selectedNote = notes.find(n => n.id === selectedNoteId)
  const selectedNotePath = selectedNote?.mdPath ?? null

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return
    onAddFolder(newFolderName.trim(), selectedFolderId)
    setNewFolderName('')
  }

  // Criacao simplificada: clique no + cria nota com titulo padrao
  const handleAddNote = () => {
    const note = onAddNote('Nova nota', selectedFolderId)
    const initialContent = '<h1>Nova nota</h1>'

    // Cancelar qualquer save pendente da nota anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    currentNoteIdRef.current = note.id
    setSelectedNoteId(note.id)
    setNoteContent(initialContent)
    setContentLoaded(true)

    if (isElectron()) {
      window.electronAPI.writeNote(note.mdPath, initialContent).catch(() => {})
    } else {
      localStorage.setItem(`organizador-semanal-note:${note.id}`, initialContent)
    }
  }

  // Carregar conteudo ao trocar a nota selecionada
  useEffect(() => {
    // Cancelar save pendente da nota anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    currentNoteIdRef.current = selectedNoteId

    if (!selectedNoteId) {
      setNoteContent('')
      setContentLoaded(false)
      return
    }

    const note = notes.find(n => n.id === selectedNoteId)
    const notePath = note?.mdPath
    if (!note || !notePath) {
      setNoteContent('')
      setContentLoaded(false)
      return
    }

    setContentLoaded(false)

    const load = async () => {
      try {
        let content = ''
        if (isElectron()) {
          content = await window.electronAPI.readNote(notePath)
        } else {
          content = localStorage.getItem(`organizador-semanal-note:${note.id}`) ?? ''
        }
        // So seta se ainda for a mesma nota
        if (currentNoteIdRef.current === selectedNoteId) {
          setNoteContent(content)
          setContentLoaded(true)
        }
      } catch {
        if (currentNoteIdRef.current === selectedNoteId) {
          setNoteContent('')
          setContentLoaded(true)
        }
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId])

  // Salvar conteudo (debounce) - captura noteId/notePath no momento do agendamento
  useEffect(() => {
    if (!contentLoaded || !selectedNote || !selectedNotePath) return

    const noteId = selectedNote.id
    const notePath = selectedNotePath

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      // Guarda: so salva se ainda for a mesma nota
      if (currentNoteIdRef.current !== noteId) return

      try {
        if (isElectron()) {
          await window.electronAPI.writeNote(notePath, noteContent)
        } else {
          localStorage.setItem(`organizador-semanal-note:${noteId}`, noteContent)
        }
        onUpdateNote(noteId, {})
      } catch {
        // Ignora falha de escrita
      }
    }, 400)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteContent])

  // Sincronizar titulo da nota com o primeiro H1 do conteudo
  const handleEditorChange = useCallback((html: string) => {
    setNoteContent(html)

    if (selectedNote) {
      const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
      if (match) {
        const plainTitle = match[1].replace(/<[^>]+>/g, '').trim()
        if (plainTitle && plainTitle !== selectedNote.title) {
          onUpdateNote(selectedNote.id, { title: plainTitle })
        }
      }
    }
  }, [selectedNote, onUpdateNote])

  const handleDeleteNote = () => {
    if (!selectedNote) return
    if (isElectron()) {
      window.electronAPI.deleteNote(selectedNote.mdPath).catch(() => {})
    } else {
      localStorage.removeItem(`organizador-semanal-note:${selectedNote.id}`)
    }
    onRemoveNote(selectedNote.id)
    setSelectedNoteId(null)
    setNoteContent('')
    setContentLoaded(false)
  }

  useEffect(() => {
    if (!noteContextMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        noteContextMenuRef.current &&
        !noteContextMenuRef.current.contains(event.target as Node)
      ) {
        setNoteContextMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [noteContextMenu])

  useEffect(() => {
    if (!renamingNote) return
    const timer = setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 0)
    return () => clearTimeout(timer)
  }, [renamingNote?.noteId])

  const openRenameNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    setRenamingNote({ noteId, value: note.title })
  }

  const closeRenameNote = () => {
    setRenamingNote(null)
  }

  const confirmRenameNote = () => {
    if (!renamingNote) return
    const note = notes.find(n => n.id === renamingNote.noteId)
    if (!note) {
      setRenamingNote(null)
      return
    }
    const nextTitle = renamingNote.value.trim()
    if (!nextTitle || nextTitle === note.title) {
      setRenamingNote(null)
      return
    }
    onUpdateNote(note.id, { title: nextTitle })
    setRenamingNote(null)
  }

  const handleRenameNote = (noteId: string) => {
    openRenameNote(noteId)
  }

  const readNoteContent = async (note: Note): Promise<string> => {
    if (note.id === selectedNoteId) {
      return noteContent
    }
    if (isElectron()) {
      try {
        return await window.electronAPI.readNote(note.mdPath)
      } catch {
        return ''
      }
    }
    return localStorage.getItem(`organizador-semanal-note:${note.id}`) ?? ''
  }

  const handleDuplicateNote = async (noteId: string) => {
    const sourceNote = notes.find(n => n.id === noteId)
    if (!sourceNote) return

    const clonedNote = onAddNote(`${sourceNote.title} (copia)`, sourceNote.folderId)
    const sourceContent = await readNoteContent(sourceNote)

    if (isElectron()) {
      await window.electronAPI.writeNote(clonedNote.mdPath, sourceContent).catch(() => {})
    } else {
      localStorage.setItem(`organizador-semanal-note:${clonedNote.id}`, sourceContent)
    }

    setSelectedNoteId(clonedNote.id)
  }

  useEffect(() => {
    sidebarStateRef.current = {
      foldersOpen: isFoldersSidebarOpen,
      notesOpen: isNotesSidebarOpen,
    }
  }, [isFoldersSidebarOpen, isNotesSidebarOpen])

  useEffect(() => {
    if (typeof reduceModeSignal !== 'number') return
    if (reduceModeHandledRef.current === undefined) {
      reduceModeHandledRef.current = reduceModeSignal
      return
    }
    if (reduceModeSignal <= reduceModeHandledRef.current) return
    reduceModeHandledRef.current = reduceModeSignal

    const { foldersOpen, notesOpen } = sidebarStateRef.current
    if (!foldersOpen && !notesOpen) {
      setIsFoldersSidebarOpen(true)
      setIsNotesSidebarOpen(true)
      return
    }

    if (foldersOpen) {
      setIsFoldersSidebarOpen(false)
      return
    }

    if (notesOpen) {
      setIsNotesSidebarOpen(false)
    }
  }, [reduceModeSignal])

  return (
    <div className="notes-layout">
      <aside className={`notes-sidebar ${isFoldersSidebarOpen ? '' : 'is-collapsed'}`}>
        <div className="notes-sidebar-header">
          <div className="notes-sidebar-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
            </svg>
            {isFoldersSidebarOpen ? <h3>Pastas</h3> : null}
          </div>
          <button
            type="button"
            className="notes-sidebar-toggle"
            onClick={() => setIsFoldersSidebarOpen(prev => !prev)}
            title={isFoldersSidebarOpen ? 'Ocultar sidebar de pastas' : 'Mostrar sidebar de pastas'}
            aria-label={isFoldersSidebarOpen ? 'Ocultar sidebar de pastas' : 'Mostrar sidebar de pastas'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              {isFoldersSidebarOpen ? (
                <polyline points="15 18 9 12 15 6" />
              ) : (
                <polyline points="9 18 15 12 9 6" />
              )}
            </svg>
          </button>
        </div>

        {isFoldersSidebarOpen ? (
          <>
            <div className="notes-folder-add">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                placeholder="Nova pasta..."
                className="form-input"
              />
              <button className="btn btn-primary" onClick={handleAddFolder} disabled={!newFolderName.trim()}>
                +
              </button>
            </div>
            <div className="notes-folder-list">
              <button
                className={`notes-folder-item ${selectedFolderId === null ? 'active' : ''}`}
                onClick={() => setSelectedFolderId(null)}
              >
                <span className="notes-folder-item-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  Todas as notas
                </span>
                <span className="notes-count">{notes.length}</span>
              </button>
              {folderRows.map(folder => (
                <div key={folder.id} className="notes-folder-row">
                  <button
                    className={`notes-folder-item ${selectedFolderId === folder.id ? 'active' : ''}`}
                    onClick={() => setSelectedFolderId(folder.id)}
                    style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
                  >
                    <span className="notes-folder-item-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
                      </svg>
                      {folder.name}
                    </span>
                    <span className="notes-count">
                      {notes.filter(n => n.folderId === folder.id).length}
                    </span>
                  </button>
                  <button
                    className="notes-folder-delete"
                    onClick={() => onRemoveFolder(folder.id)}
                    title="Excluir pasta"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </aside>

      <div className={`notes-list ${isNotesSidebarOpen ? '' : 'is-collapsed'}`}>
        <div className="notes-list-header">
          <div className="notes-list-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            {isNotesSidebarOpen ? <h3>Notas</h3> : null}
          </div>
          <div className="notes-list-header-actions">
            {isNotesSidebarOpen ? (
              <button className="btn btn-primary notes-add-btn" onClick={handleAddNote} title="Nova nota">
                +
              </button>
            ) : null}
            <button
              type="button"
              className="notes-sidebar-toggle"
              onClick={() => setIsNotesSidebarOpen(prev => !prev)}
              title={isNotesSidebarOpen ? 'Ocultar sidebar de notas' : 'Mostrar sidebar de notas'}
              aria-label={isNotesSidebarOpen ? 'Ocultar sidebar de notas' : 'Mostrar sidebar de notas'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                {isNotesSidebarOpen ? (
                  <polyline points="15 18 9 12 15 6" />
                ) : (
                  <polyline points="9 18 15 12 9 6" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isNotesSidebarOpen ? (
          <div className="notes-list-items">
            {filteredNotes.length === 0 ? (
              <div className="notes-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.3 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Nenhuma nota encontrada.
              </div>
            ) : (
              filteredNotes.map(note => (
                <button
                  key={note.id}
                  className={`notes-list-item ${selectedNoteId === note.id ? 'active' : ''}`}
                  onClick={() => setSelectedNoteId(note.id)}
                  onContextMenu={e => {
                    e.preventDefault()
                    setNoteContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id })
                  }}
                  title="Botao direito para opcoes"
                >
                  <div className="notes-item-info">
                    <span className="notes-item-title">{note.title}</span>
                    <span className="notes-item-date">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="notes-editor">
        {selectedNote && contentLoaded ? (
          <>
            <div className="notes-editor-header">
              <span className="notes-title-display">{selectedNote.title}</span>
              <button
                className="notes-editor-delete-btn"
                onClick={handleDeleteNote}
                title="Excluir nota"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14H7L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
            <div className="notes-editor-content">
              <WysiwygEditor
                key={selectedNote.id}
                content={noteContent}
                onChange={handleEditorChange}
                placeholder="Escreva sua nota aqui..."
                mode="full"
              />
            </div>
          </>
        ) : (
          <div className="notes-editor-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.15 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8M16 17H8M10 9H8" />
            </svg>
            <p>Selecione ou crie uma nota para editar.</p>
          </div>
        )}
      </div>

      {noteContextMenu && (
        <div
          ref={noteContextMenuRef}
          className="quick-access-context-menu"
          style={{
            position: 'fixed',
            left: noteContextMenu.x,
            top: noteContextMenu.y,
          }}
        >
          <button
            className="quick-access-context-item"
            onClick={() => {
              handleRenameNote(noteContextMenu.noteId)
              setNoteContextMenu(null)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 11.5V13h1.5L12.8 4.7l-1.5-1.5L3 11.5Z" />
              <path d="m10.5 3.5 1.5 1.5" />
            </svg>
            Renomear titulo
          </button>
          <button
            className="quick-access-context-item"
            onClick={() => {
              handleDuplicateNote(noteContextMenu.noteId)
              setNoteContextMenu(null)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="5" width="8" height="8" rx="1.5" />
              <path d="M3 10V4.5A1.5 1.5 0 0 1 4.5 3H10" />
            </svg>
            Duplicar nota
          </button>
        </div>
      )}

      {renamingNote && (
        <div className="notes-rename-overlay" onClick={closeRenameNote}>
          <div className="notes-rename-modal" onClick={e => e.stopPropagation()}>
            <h4>Renomear nota</h4>
            <input
              ref={renameInputRef}
              type="text"
              className="notes-rename-input"
              value={renamingNote.value}
              onChange={e => setRenamingNote(prev => (prev ? { ...prev, value: e.target.value } : prev))}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmRenameNote()
                if (e.key === 'Escape') closeRenameNote()
              }}
              placeholder="Digite o novo titulo"
            />
            <div className="notes-rename-actions">
              <button className="btn btn-secondary" onClick={closeRenameNote}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmRenameNote}
                disabled={!renamingNote.value.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
