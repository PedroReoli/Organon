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
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId'>>) => void
  onRemoveFolder: (folderId: string) => void
  reduceModeSignal?: number
}

type FolderRow = {
  id: string
  name: string
  parentId: string | null
  depth: number
}

const NOTE_FONTS = [
  { label: 'Sans', value: 'var(--font-sans)' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: "'Fira Code', Consolas, 'Courier New', monospace" },
  { label: 'Humanist', value: 'Verdana, Geneva, Tahoma, sans-serif' },
  { label: 'Slab', value: '"Trebuchet MS", "Gill Sans", sans-serif' },
]

export const NotesView = ({
  notes,
  folders,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddFolder,
  onUpdateFolder,
  onRemoveFolder,
  reduceModeSignal,
}: NotesViewProps) => {
  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // ── Sidebar visibility ─────────────────────────────────────────────────────
  const [isFoldersSidebarOpen, setIsFoldersSidebarOpen] = useState(true)
  const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(true)

  // ── Folder management ──────────────────────────────────────────────────────
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null)
  const [newSubfolderName, setNewSubfolderName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingFolderValue, setRenamingFolderValue] = useState('')
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | 'all' | null>(null)

  // ── Note management ────────────────────────────────────────────────────────
  const [noteContent, setNoteContent] = useState('')
  const [contentLoaded, setContentLoaded] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')
  const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [renamingNote, setRenamingNote] = useState<{ noteId: string; value: string } | null>(null)

  // ── Editor font ────────────────────────────────────────────────────────────
  const [editorFont, setEditorFont] = useState(NOTE_FONTS[0].value)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteIdRef = useRef<string | null>(null)
  const noteContextMenuRef = useRef<HTMLDivElement>(null)
  const folderContextMenuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const folderRenameInputRef = useRef<HTMLInputElement>(null)
  const addFolderInputRef = useRef<HTMLInputElement>(null)
  const subfolderInputRef = useRef<HTMLInputElement>(null)
  const reduceModeHandledRef = useRef<number | undefined>(reduceModeSignal)
  const sidebarStateRef = useRef({ foldersOpen: true, notesOpen: true })

  // ── Folder tree ────────────────────────────────────────────────────────────
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

  // ── Notes filtering ────────────────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    let list = selectedFolderId
      ? notes.filter(n => n.folderId === selectedFolderId)
      : notes
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q))
    }
    return list.sort((a, b) => b.order - a.order)
  }, [notes, selectedFolderId, noteSearch])

  const selectedNote = notes.find(n => n.id === selectedNoteId)
  const selectedNotePath = selectedNote?.mdPath ?? null

  // ── Folder actions ─────────────────────────────────────────────────────────
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return
    onAddFolder(newFolderName.trim(), selectedFolderId)
    setNewFolderName('')
    setShowAddFolder(false)
  }

  const handleAddSubfolder = () => {
    if (!newSubfolderName.trim() || !addingSubfolderTo) return
    onAddFolder(newSubfolderName.trim(), addingSubfolderTo)
    setNewSubfolderName('')
    setAddingSubfolderTo(null)
  }

  const startFolderRename = (folderId: string, currentName: string) => {
    setRenamingFolderId(folderId)
    setRenamingFolderValue(currentName)
    setFolderContextMenu(null)
  }

  const confirmFolderRename = () => {
    if (!renamingFolderId || !renamingFolderValue.trim()) {
      setRenamingFolderId(null)
      return
    }
    onUpdateFolder(renamingFolderId, { name: renamingFolderValue.trim() })
    setRenamingFolderId(null)
  }

  const cancelFolderRename = () => {
    setRenamingFolderId(null)
    setRenamingFolderValue('')
  }

  // ── Note actions ───────────────────────────────────────────────────────────
  const handleAddNote = () => {
    const note = onAddNote('Nova nota', selectedFolderId)
    const initialContent = '<h1>Nova nota</h1>'
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

  const openRenameNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    setRenamingNote({ noteId, value: note.title })
    setNoteContextMenu(null)
  }

  const confirmRenameNote = () => {
    if (!renamingNote) return
    const nextTitle = renamingNote.value.trim()
    if (nextTitle && nextTitle !== notes.find(n => n.id === renamingNote.noteId)?.title) {
      onUpdateNote(renamingNote.noteId, { title: nextTitle })
    }
    setRenamingNote(null)
  }

  const readNoteContent = async (note: Note): Promise<string> => {
    if (note.id === selectedNoteId) return noteContent
    if (isElectron()) {
      try { return await window.electronAPI.readNote(note.mdPath) } catch { return '' }
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
    setNoteContextMenu(null)
  }

  // ── Load note content ──────────────────────────────────────────────────────
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    currentNoteIdRef.current = selectedNoteId
    if (!selectedNoteId) { setNoteContent(''); setContentLoaded(false); return }
    const note = notes.find(n => n.id === selectedNoteId)
    if (!note?.mdPath) { setNoteContent(''); setContentLoaded(false); return }
    setContentLoaded(false)
    const load = async () => {
      try {
        let content = ''
        if (isElectron()) {
          content = await window.electronAPI.readNote(note.mdPath)
        } else {
          content = localStorage.getItem(`organizador-semanal-note:${note.id}`) ?? ''
        }
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

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contentLoaded || !selectedNote || !selectedNotePath) return
    const noteId = selectedNote.id
    const notePath = selectedNotePath
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (currentNoteIdRef.current !== noteId) return
      try {
        if (isElectron()) {
          await window.electronAPI.writeNote(notePath, noteContent)
        } else {
          localStorage.setItem(`organizador-semanal-note:${noteId}`, noteContent)
        }
        onUpdateNote(noteId, {})
      } catch { /* ignore */ }
    }, 400)
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteContent])

  // ── Sync title from H1 ─────────────────────────────────────────────────────
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

  // ── Focus effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (renamingFolderId) {
      const t = setTimeout(() => {
        folderRenameInputRef.current?.focus()
        folderRenameInputRef.current?.select()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [renamingFolderId])

  useEffect(() => {
    if (renamingNote) {
      const t = setTimeout(() => {
        renameInputRef.current?.focus()
        renameInputRef.current?.select()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [renamingNote?.noteId])

  useEffect(() => {
    if (showAddFolder) {
      const t = setTimeout(() => addFolderInputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [showAddFolder])

  useEffect(() => {
    if (addingSubfolderTo) {
      const t = setTimeout(() => subfolderInputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [addingSubfolderTo])

  // ── Close context menus on outside click ───────────────────────────────────
  useEffect(() => {
    if (!noteContextMenu) return
    const handler = (e: MouseEvent) => {
      if (noteContextMenuRef.current && !noteContextMenuRef.current.contains(e.target as Node)) {
        setNoteContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [noteContextMenu])

  useEffect(() => {
    if (!folderContextMenu) return
    const handler = (e: MouseEvent) => {
      if (folderContextMenuRef.current && !folderContextMenuRef.current.contains(e.target as Node)) {
        setFolderContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [folderContextMenu])

  // ── Reduce mode signal ─────────────────────────────────────────────────────
  useEffect(() => {
    sidebarStateRef.current = { foldersOpen: isFoldersSidebarOpen, notesOpen: isNotesSidebarOpen }
  }, [isFoldersSidebarOpen, isNotesSidebarOpen])

  useEffect(() => {
    if (typeof reduceModeSignal !== 'number') return
    if (reduceModeHandledRef.current === undefined) { reduceModeHandledRef.current = reduceModeSignal; return }
    if (reduceModeSignal <= reduceModeHandledRef.current) return
    reduceModeHandledRef.current = reduceModeSignal
    const { foldersOpen, notesOpen } = sidebarStateRef.current
    if (!foldersOpen && !notesOpen) { setIsFoldersSidebarOpen(true); setIsNotesSidebarOpen(true); return }
    if (foldersOpen) { setIsFoldersSidebarOpen(false); return }
    if (notesOpen) setIsNotesSidebarOpen(false)
  }, [reduceModeSignal])

  // ── Drag helpers ───────────────────────────────────────────────────────────
  const handleNoteDragStart = (e: { dataTransfer: DataTransfer }, noteId: string) => {
    e.dataTransfer.setData('noteId', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFolderDragOver = (e: { preventDefault(): void; dataTransfer: DataTransfer }, folderId: string | 'all') => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolderId(folderId)
  }

  const handleFolderDrop = (e: { preventDefault(): void; dataTransfer: DataTransfer }, folderId: string | null) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData('noteId')
    if (noteId) {
      onUpdateNote(noteId, { folderId })
      if (folderId) setSelectedFolderId(folderId)
    }
    setDragOverFolderId(null)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="notes-layout">

      {/* ── FOLDERS SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`notes-sidebar ${isFoldersSidebarOpen ? '' : 'is-collapsed'}`}>
        <div className="notes-sidebar-header">
          <div className="notes-sidebar-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            {isFoldersSidebarOpen && <h3>Pastas</h3>}
          </div>
          <div className="notes-sidebar-header-actions">
            {isFoldersSidebarOpen && (
              <button
                className="notes-icon-btn"
                onClick={() => setShowAddFolder(v => !v)}
                title="Nova pasta"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="notes-sidebar-toggle"
              onClick={() => setIsFoldersSidebarOpen(p => !p)}
              title={isFoldersSidebarOpen ? 'Ocultar pastas' : 'Mostrar pastas'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                {isFoldersSidebarOpen
                  ? <polyline points="15 18 9 12 15 6" />
                  : <polyline points="9 18 15 12 9 6" />}
              </svg>
            </button>
          </div>
        </div>

        {isFoldersSidebarOpen && (
          <>
            {/* Add folder input */}
            {showAddFolder && (
              <div className="notes-folder-add">
                <input
                  ref={addFolderInputRef}
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFolder()
                    if (e.key === 'Escape') { setShowAddFolder(false); setNewFolderName('') }
                  }}
                  placeholder={selectedFolderId ? 'Subpasta em selecionada...' : 'Nome da pasta...'}
                  className="notes-folder-add-input"
                />
                <button className="notes-folder-add-btn" onClick={handleAddFolder} disabled={!newFolderName.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
              </div>
            )}

            {/* Folder list */}
            <div className="notes-folder-list">
              {/* All notes */}
              <div
                className={`notes-folder-item ${selectedFolderId === null ? 'active' : ''} ${dragOverFolderId === 'all' ? 'drag-over' : ''}`}
                onClick={() => setSelectedFolderId(null)}
                onDragOver={e => handleFolderDragOver(e, 'all')}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={e => handleFolderDrop(e, null)}
              >
                <span className="notes-folder-item-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  Todas as notas
                </span>
                <span className="notes-count">{notes.length}</span>
              </div>

              {/* Folder rows */}
              {folderRows.map(folder => (
                <div key={folder.id}>
                  <div
                    className={`notes-folder-item ${selectedFolderId === folder.id ? 'active' : ''} ${dragOverFolderId === folder.id ? 'drag-over' : ''}`}
                    style={{ paddingLeft: `${10 + folder.depth * 14}px` }}
                    onClick={() => renamingFolderId !== folder.id && setSelectedFolderId(folder.id)}
                    onDragOver={e => handleFolderDragOver(e, folder.id)}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={e => handleFolderDrop(e, folder.id)}
                    onContextMenu={e => {
                      e.preventDefault()
                      setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id })
                    }}
                  >
                    {renamingFolderId === folder.id ? (
                      <input
                        ref={folderRenameInputRef}
                        className="notes-folder-rename-input"
                        value={renamingFolderValue}
                        onChange={e => setRenamingFolderValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmFolderRename()
                          if (e.key === 'Escape') cancelFolderRename()
                        }}
                        onBlur={confirmFolderRename}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="notes-folder-item-label" onDoubleClick={() => startFolderRename(folder.id, folder.name)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                          {folder.name}
                        </span>
                        <div className="notes-folder-item-actions">
                          <span className="notes-count">{notes.filter(n => n.folderId === folder.id).length}</span>
                          <button
                            className="notes-folder-action-btn"
                            onClick={e => {
                              e.stopPropagation()
                              setFolderContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id })
                            }}
                            title="Opções"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add subfolder inline input */}
                  {addingSubfolderTo === folder.id && (
                    <div className="notes-folder-add notes-subfolder-add" style={{ paddingLeft: `${22 + folder.depth * 14}px` }}>
                      <input
                        ref={subfolderInputRef}
                        type="text"
                        value={newSubfolderName}
                        onChange={e => setNewSubfolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddSubfolder()
                          if (e.key === 'Escape') { setAddingSubfolderTo(null); setNewSubfolderName('') }
                        }}
                        placeholder="Nome da subpasta..."
                        className="notes-folder-add-input"
                      />
                      <button className="notes-folder-add-btn" onClick={handleAddSubfolder} disabled={!newSubfolderName.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {folderRows.length === 0 && !showAddFolder && (
                <div className="notes-folder-empty">
                  <span>Nenhuma pasta criada</span>
                  <button className="notes-folder-empty-cta" onClick={() => setShowAddFolder(true)}>+ Criar pasta</button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── NOTES LIST ──────────────────────────────────────────────────── */}
      <div className={`notes-list ${isNotesSidebarOpen ? '' : 'is-collapsed'}`}>
        <div className="notes-list-header">
          <div className="notes-list-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            {isNotesSidebarOpen && (
              <h3>
                {selectedFolderId
                  ? (folderRows.find(f => f.id === selectedFolderId)?.name ?? 'Notas')
                  : 'Todas as notas'}
              </h3>
            )}
          </div>
          <div className="notes-list-header-actions">
            {isNotesSidebarOpen && (
              <button className="notes-icon-btn notes-icon-btn--primary" onClick={handleAddNote} title="Nova nota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="notes-sidebar-toggle"
              onClick={() => setIsNotesSidebarOpen(p => !p)}
              title={isNotesSidebarOpen ? 'Ocultar notas' : 'Mostrar notas'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                {isNotesSidebarOpen
                  ? <polyline points="15 18 9 12 15 6" />
                  : <polyline points="9 18 15 12 9 6" />}
              </svg>
            </button>
          </div>
        </div>

        {isNotesSidebarOpen && (
          <>
            {/* Search */}
            <div className="notes-search-wrap">
              <svg className="notes-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="notes-search-input"
                placeholder="Buscar notas..."
                value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
              />
              {noteSearch && (
                <button className="notes-search-clear" onClick={() => setNoteSearch('')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              )}
            </div>

            <div className="notes-list-items">
              {filteredNotes.length === 0 ? (
                <div className="notes-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  <p>{noteSearch ? 'Nenhuma nota encontrada.' : 'Clique em + para criar uma nota.'}</p>
                </div>
              ) : (
                filteredNotes.map(note => (
                  <button
                    key={note.id}
                    draggable
                    className={`notes-list-item ${selectedNoteId === note.id ? 'active' : ''}`}
                    onClick={() => setSelectedNoteId(note.id)}
                    onDragStart={e => handleNoteDragStart(e, note.id)}
                    onContextMenu={e => {
                      e.preventDefault()
                      setNoteContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id })
                    }}
                    title="Arraste para uma pasta • Botão direito para opções"
                  >
                    <div className="notes-item-info">
                      <span className="notes-item-title">{note.title}</span>
                      <span className="notes-item-date">
                        {new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── EDITOR ──────────────────────────────────────────────────────── */}
      <div className="notes-editor">
        {selectedNote && contentLoaded ? (
          <>
            <div className="notes-editor-header">
              <div className="notes-editor-header-left">
                <span className="notes-title-display">{selectedNote.title}</span>
              </div>
              <div className="notes-editor-header-right">
                {/* Font selector */}
                <div className="notes-font-selector">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
                    <path d="M4 20h4M12 4v16M4 4h16M16 20h4M12 4 4 20M12 4l8 16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <select
                    className="notes-font-select"
                    value={editorFont}
                    onChange={e => setEditorFont(e.target.value)}
                    title="Fonte do editor"
                  >
                    {NOTE_FONTS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="notes-editor-delete-btn"
                  onClick={handleDeleteNote}
                  title="Excluir nota"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14H7L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="notes-editor-content" style={{ fontFamily: editorFont }}>
              <WysiwygEditor
                key={selectedNote.id}
                content={noteContent}
                onChange={handleEditorChange}
                placeholder="Escreva sua nota... digite / para inserir blocos"
                mode="full"
              />
            </div>
          </>
        ) : selectedNote && !contentLoaded ? (
          <div className="notes-editor-loading">
            <div className="notes-editor-loading-spinner" />
          </div>
        ) : (
          <div className="notes-editor-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" width="64" height="64">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            <p>Selecione uma nota ou crie uma nova</p>
            <button className="notes-editor-empty-btn" onClick={handleAddNote}>
              + Nova nota
            </button>
          </div>
        )}
      </div>

      {/* ── FOLDER CONTEXT MENU ─────────────────────────────────────────── */}
      {folderContextMenu && (
        <div
          ref={folderContextMenuRef}
          className="notes-context-menu"
          style={{ position: 'fixed', left: folderContextMenu.x, top: folderContextMenu.y }}
        >
          <button
            className="notes-context-item"
            onClick={() => {
              const f = folderRows.find(r => r.id === folderContextMenu.folderId)
              if (f) startFolderRename(f.id, f.name)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 11.5V13h1.5L12.8 4.7l-1.5-1.5L3 11.5Z" />
              <path d="m10.5 3.5 1.5 1.5" />
            </svg>
            Renomear
          </button>
          <button
            className="notes-context-item"
            onClick={() => {
              setAddingSubfolderTo(folderContextMenu.folderId)
              setFolderContextMenu(null)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4a1 1 0 0 1 1-1h3l1 1h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
              <path d="M8 7v4M6 9h4" strokeLinecap="round" />
            </svg>
            Adicionar subpasta
          </button>
          <div className="notes-context-divider" />
          <button
            className="notes-context-item notes-context-item--danger"
            onClick={() => {
              onRemoveFolder(folderContextMenu.folderId)
              if (selectedFolderId === folderContextMenu.folderId) setSelectedFolderId(null)
              setFolderContextMenu(null)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" />
            </svg>
            Excluir pasta
          </button>
        </div>
      )}

      {/* ── NOTE CONTEXT MENU ────────────────────────────────────────────── */}
      {noteContextMenu && (
        <div
          ref={noteContextMenuRef}
          className="notes-context-menu"
          style={{ position: 'fixed', left: noteContextMenu.x, top: noteContextMenu.y }}
        >
          <button
            className="notes-context-item"
            onClick={() => openRenameNote(noteContextMenu.noteId)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 11.5V13h1.5L12.8 4.7l-1.5-1.5L3 11.5Z" />
              <path d="m10.5 3.5 1.5 1.5" />
            </svg>
            Renomear
          </button>
          <button
            className="notes-context-item"
            onClick={() => handleDuplicateNote(noteContextMenu.noteId)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="5" width="8" height="8" rx="1.5" />
              <path d="M3 10V4.5A1.5 1.5 0 0 1 4.5 3H10" />
            </svg>
            Duplicar
          </button>
          {folderRows.length > 0 && (
            <>
              <div className="notes-context-divider" />
              {folderRows.map(f => (
                <button
                  key={f.id}
                  className="notes-context-item"
                  onClick={() => {
                    onUpdateNote(noteContextMenu.noteId, { folderId: f.id })
                    setNoteContextMenu(null)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1.5 3.5a1 1 0 0 1 1-1H5l1 1.5h6.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
                  </svg>
                  <span style={{ marginLeft: f.depth * 8 }}>Mover para: {f.name}</span>
                </button>
              ))}
            </>
          )}
          <div className="notes-context-divider" />
          <button
            className="notes-context-item notes-context-item--danger"
            onClick={() => {
              const note = notes.find(n => n.id === noteContextMenu.noteId)
              if (note) {
                if (isElectron()) window.electronAPI.deleteNote(note.mdPath).catch(() => {})
                else localStorage.removeItem(`organizador-semanal-note:${note.id}`)
                onRemoveNote(note.id)
                if (selectedNoteId === note.id) { setSelectedNoteId(null); setNoteContent(''); setContentLoaded(false) }
              }
              setNoteContextMenu(null)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" />
            </svg>
            Excluir nota
          </button>
        </div>
      )}

      {/* ── RENAME NOTE MODAL ────────────────────────────────────────────── */}
      {renamingNote && (
        <div className="notes-rename-overlay" onClick={() => setRenamingNote(null)}>
          <div className="notes-rename-modal" onClick={e => e.stopPropagation()}>
            <h4>Renomear nota</h4>
            <input
              ref={renameInputRef}
              type="text"
              className="notes-rename-input"
              value={renamingNote.value}
              onChange={e => setRenamingNote(p => p ? { ...p, value: e.target.value } : p)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmRenameNote()
                if (e.key === 'Escape') setRenamingNote(null)
              }}
              placeholder="Novo título"
            />
            <div className="notes-rename-actions">
              <button className="btn btn-secondary" onClick={() => setRenamingNote(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmRenameNote} disabled={!renamingNote.value.trim()}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
