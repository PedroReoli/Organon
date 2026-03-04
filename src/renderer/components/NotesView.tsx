import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteFolder } from '../types'
import { isElectron } from '../utils'
import { WysiwygEditor } from './WysiwygEditor'

interface NotesViewProps {
  notes: Note[]
  folders: NoteFolder[]
  onAddNote: (title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => Note
  onUpdateNote: (noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId'>>) => void
  onRemoveNote: (noteId: string) => void
  onAddFolder: (name: string, parentId?: string | null) => string
  onRemoveFolder: (folderId: string) => void
  onReorderNotes: (orderedIds: string[]) => void
  onReorderFolders: (orderedIds: string[]) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned: (noteId: string) => void
  reduceModeSignal?: number
}

// ---- Tree rendering helpers ----

const PageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0, opacity: 0.7 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0, opacity: 0.7 }}>
    {open
      ? <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="2" y1="10" x2="22" y2="10" /></>
      : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />}
  </svg>
)

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"
    style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ---- Main component ----

export const NotesView = ({
  notes,
  folders,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddFolder,
  onRemoveFolder,
  onToggleFavorite,
  onTogglePinned,
  reduceModeSignal,
}: NotesViewProps) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [, setIsTitleEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [newFolderParentId, setNewFolderParentId] = useState<string | null | undefined>(undefined) // undefined = hidden
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteIdRef = useRef<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const reduceModeHandledRef = useRef<number | undefined>(reduceModeSignal)

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])

  // ---- Tree computed ----

  const favorites = useMemo(() => notes.filter(n => n.isFavorite), [notes])
  const pinned = useMemo(() => notes.filter(n => n.isPinned && !n.isFavorite), [notes])

  const rootFolders = useMemo(
    () => folders.filter(f => !f.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [folders],
  )

  const childFolders = useCallback(
    (parentId: string) => folders.filter(f => f.parentId === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [folders],
  )

  const notesInFolder = useCallback(
    (folderId: string) => notes.filter(n => n.folderId === folderId && !n.parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [notes],
  )

  const rootNotes = useMemo(
    () => notes.filter(n => !n.folderId && !n.parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [notes],
  )

  const subNotes = useCallback(
    (parentNoteId: string) => notes.filter(n => n.parentNoteId === parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [notes],
  )

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    return notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 30)
  }, [searchQuery, notes])

  // ---- Breadcrumb ----

  const breadcrumb = useMemo(() => {
    if (!selectedNote) return []
    const parts: { label: string; id: string; kind: 'folder' | 'note' }[] = []

    let folderId: string | null = selectedNote.folderId
    const folderParts: typeof parts = []
    while (folderId) {
      const folder = folders.find(f => f.id === folderId)
      if (!folder) break
      folderParts.unshift({ label: folder.name, id: folder.id, kind: 'folder' })
      folderId = folder.parentId ?? null
    }
    parts.push(...folderParts)

    let parentId: string | null = selectedNote.parentNoteId
    const noteParts: typeof parts = []
    while (parentId) {
      const parent = notes.find(n => n.id === parentId)
      if (!parent) break
      noteParts.unshift({ label: parent.title || 'Sem título', id: parent.id, kind: 'note' })
      parentId = parent.parentNoteId
    }
    parts.push(...noteParts)

    return parts
  }, [selectedNote, folders, notes])

  // ---- Note content (IPC) ----

  useEffect(() => {
    if (!selectedNote) {
      setNoteContent('')
      setNoteTitle('')
      return
    }
    setNoteTitle(selectedNote.title || '')
    setIsTitleEditing(false)
    currentNoteIdRef.current = selectedNote.id

    if (isElectron()) {
      window.electronAPI.readNote(selectedNote.mdPath).then(content => {
        if (currentNoteIdRef.current === selectedNote.id) {
          setNoteContent(content)
        }
      }).catch(() => {
        if (currentNoteIdRef.current === selectedNote.id) setNoteContent('')
      })
    } else {
      setNoteContent('')
    }
  }, [selectedNote?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = useCallback((html: string) => {
    setNoteContent(html)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const note = notes.find(n => n.id === currentNoteIdRef.current)
      if (!note) return
      if (isElectron()) {
        window.electronAPI.writeNote(note.mdPath, html).catch(() => {})
      }
      onUpdateNote(note.id, { title: note.title })
    }, 600)
  }, [notes, onUpdateNote])

  const handleTitleBlur = useCallback(() => {
    setIsTitleEditing(false)
    if (!selectedNote || !noteTitle.trim()) return
    if (noteTitle.trim() === selectedNote.title) return
    onUpdateNote(selectedNote.id, { title: noteTitle.trim() })
  }, [selectedNote, noteTitle, onUpdateNote])

  // ---- Open note ----

  const openNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId)
    setSearchQuery('')
    setSearchVisible(false)
  }, [])

  // ---- Add note ----

  const handleAddNote = useCallback((folderId: string | null = null, parentNoteId: string | null = null) => {
    const note = onAddNote('Nova nota', folderId, null, parentNoteId)
    if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]))
    if (parentNoteId) setExpandedNotes(prev => new Set([...prev, parentNoteId]))
    setSelectedNoteId(note.id)
    setTimeout(() => {
      setIsTitleEditing(true)
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 80)
  }, [onAddNote])

  // ---- Add folder ----

  const handleAddFolder = useCallback(() => {
    const name = newFolderName.trim()
    if (!name) return
    onAddFolder(name, newFolderParentId ?? null)
    setNewFolderName('')
    setNewFolderParentId(undefined)
  }, [newFolderName, newFolderParentId, onAddFolder])

  // ---- Toggle expand ----

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const toggleNote = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }, [])

  // ---- Context menu ----

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        handleAddNote()
      }
      if (ctrl && e.key === 'f') {
        e.preventDefault()
        setSearchVisible(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchVisible(false)
        setSearchQuery('')
        setContextMenu(null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleAddNote])

  // ---- Reduce mode ----

  useEffect(() => {
    if (reduceModeSignal === reduceModeHandledRef.current) return
    reduceModeHandledRef.current = reduceModeSignal
    setSidebarOpen(false)
  }, [reduceModeSignal])

  // ---- Subpage creation from editor ----

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ parentNoteId: string }>).detail
      handleAddNote(selectedNote?.folderId ?? null, detail.parentNoteId)
    }
    document.addEventListener('notes-create-subpage', handler)
    return () => document.removeEventListener('notes-create-subpage', handler)
  }, [handleAddNote, selectedNote])

  // ---- Tree rendering ----

  const renderNote = (note: Note, depth: number) => {
    const children = subNotes(note.id)
    const isExpanded = expandedNotes.has(note.id)
    const isSelected = selectedNoteId === note.id
    const hasChildren = children.length > 0

    return (
      <div key={note.id} className="notes-tree-group">
        <div
          className={`notes-tree-row notes-tree-note${isSelected ? ' is-active' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => openNote(note.id)}
          onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id }) }}
        >
          <button
            className={`notes-tree-chevron${hasChildren ? ' visible' : ''}${isExpanded ? ' open' : ''}`}
            onClick={e => hasChildren ? toggleNote(note.id, e) : undefined}
            tabIndex={-1}
          >
            <ChevronIcon open={isExpanded} />
          </button>
          <PageIcon />
          <span className="notes-tree-label">{note.title || 'Sem título'}</span>
          <span className="notes-tree-row-actions">
            <button
              className="notes-tree-action-btn"
              title="Nova subpágina"
              onClick={e => { e.stopPropagation(); handleAddNote(note.folderId, note.id) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button
              className="notes-tree-action-btn"
              title="Excluir"
              onClick={e => { e.stopPropagation(); onRemoveNote(note.id) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
            </button>
          </span>
          {note.isFavorite && <span className="notes-tree-star">★</span>}
          {note.isPinned && <span className="notes-tree-pin">📌</span>}
        </div>
        {isExpanded && children.map(child => renderNote(child, depth + 1))}
      </div>
    )
  }

  const renderFolder = (folder: NoteFolder, depth: number): React.ReactElement => {
    const isExpanded = expandedFolders.has(folder.id)
    const childFlds = childFolders(folder.id)
    const childNts = notesInFolder(folder.id)

    return (
      <div key={folder.id} className="notes-tree-group">
        <div
          className="notes-tree-row notes-tree-folder"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <button
            className="notes-tree-chevron visible"
            onClick={e => { e.stopPropagation(); toggleFolder(folder.id) }}
            tabIndex={-1}
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <ChevronIcon open={isExpanded} />
          </button>
          <FolderIcon open={isExpanded} />
          <span className="notes-tree-label">{folder.name}</span>
          <span className="notes-tree-row-actions">
            <button
              className="notes-tree-action-btn"
              title="Nova nota"
              onClick={e => { e.stopPropagation(); handleAddNote(folder.id, null); setExpandedFolders(prev => new Set([...prev, folder.id])) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button
              className="notes-tree-action-btn"
              title="Nova subpasta"
              onClick={e => { e.stopPropagation(); setNewFolderParentId(folder.id); setExpandedFolders(prev => new Set([...prev, folder.id])); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            </button>
            <button
              className="notes-tree-action-btn"
              title="Excluir pasta"
              onClick={e => { e.stopPropagation(); onRemoveFolder(folder.id) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
            </button>
          </span>
        </div>

        {isExpanded && (
          <div className="notes-tree-folder-children">
            {childFlds.map(f => renderFolder(f, depth + 1))}
            {childNts.map(n => renderNote(n, depth + 1))}
            {/* Inline new folder input */}
            {newFolderParentId === folder.id && (
              <div className="notes-tree-new-folder-input" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <input
                  ref={newFolderInputRef}
                  className="notes-tree-new-folder-field"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFolder()
                    if (e.key === 'Escape') { setNewFolderParentId(undefined); setNewFolderName('') }
                  }}
                  onBlur={() => { if (newFolderName.trim()) handleAddFolder(); else { setNewFolderParentId(undefined); setNewFolderName('') } }}
                  placeholder="Nome da pasta..."
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const contextNote = contextMenu ? notes.find(n => n.id === contextMenu.noteId) ?? null : null

  return (
    <div className={`notes-layout${sidebarOpen ? '' : ' sidebar-collapsed'}`}>

      {/* ---- TREE SIDEBAR ---- */}
      <aside className="notes-tree-sidebar">
        <div className="notes-tree-header">
          <span className="notes-tree-title">Notas</span>
          <div className="notes-tree-header-actions">
            <button
              className="notes-tree-header-btn"
              title="Nova nota (Ctrl+N)"
              onClick={() => handleAddNote()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button
              className="notes-tree-header-btn"
              title="Buscar (Ctrl+F)"
              onClick={() => { setSearchVisible(v => !v); setTimeout(() => searchInputRef.current?.focus(), 50) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </button>
            <button
              className="notes-tree-header-btn"
              title="Recolher barra lateral"
              onClick={() => setSidebarOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          </div>
        </div>

        {searchVisible && (
          <div className="notes-tree-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              className="notes-tree-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar notas..."
              onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchVisible(false) } }}
            />
            {searchQuery && (
              <button className="notes-tree-search-clear" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M12 4L4 12M4 4l8 8" /></svg>
              </button>
            )}
          </div>
        )}

        <div className="notes-tree-body">
          {searchQuery.trim() ? (
            searchResults.length > 0
              ? searchResults.map(n => renderNote(n, 0))
              : <div className="notes-tree-empty">Nenhum resultado</div>
          ) : (
            <>
              {/* Favorites */}
              {favorites.length > 0 && (
                <div className="notes-tree-section">
                  <div className="notes-tree-section-label">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    Favoritos
                  </div>
                  {favorites.map(n => renderNote(n, 0))}
                </div>
              )}

              {/* Pinned */}
              {pinned.length > 0 && (
                <div className="notes-tree-section">
                  <div className="notes-tree-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    Fixadas
                  </div>
                  {pinned.map(n => renderNote(n, 0))}
                </div>
              )}

              {/* Main tree */}
              <div className="notes-tree-section notes-tree-main">
                {rootFolders.map(f => renderFolder(f, 0))}
                {rootNotes.map(n => renderNote(n, 0))}
              </div>

              {/* Root new folder input */}
              {newFolderParentId === null && (
                <div className="notes-tree-new-folder-input" style={{ paddingLeft: '12px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <input
                    ref={newFolderInputRef}
                    className="notes-tree-new-folder-field"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddFolder()
                      if (e.key === 'Escape') { setNewFolderParentId(undefined); setNewFolderName('') }
                    }}
                    onBlur={() => { if (newFolderName.trim()) handleAddFolder(); else { setNewFolderParentId(undefined); setNewFolderName('') } }}
                    placeholder="Nome da pasta..."
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="notes-tree-footer">
          <button
            className="notes-tree-footer-btn"
            onClick={() => handleAddNote()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nova nota
          </button>
          <button
            className="notes-tree-footer-btn"
            onClick={() => { setNewFolderParentId(null); setTimeout(() => newFolderInputRef.current?.focus(), 50) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            Nova pasta
          </button>
        </div>
      </aside>

      {/* Sidebar open button (when collapsed) */}
      {!sidebarOpen && (
        <button className="notes-sidebar-open-btn" onClick={() => setSidebarOpen(true)} title="Abrir barra lateral">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}

      {/* ---- EDITOR PANE ---- */}
      <div className="notes-editor-pane">
        {selectedNote ? (
          <div className="notes-editor-inner">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <div className="notes-editor-breadcrumb">
                {breadcrumb.map((part, i) => (
                  <span key={part.id} className="notes-bc-item-wrap">
                    {i > 0 && <span className="notes-bc-sep">›</span>}
                    <button className="notes-bc-item" onClick={() => part.kind === 'note' ? openNote(part.id) : undefined}>
                      {part.kind === 'folder' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}>
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                      {part.label}
                    </button>
                  </span>
                ))}
                <span className="notes-bc-sep">›</span>
                <span className="notes-bc-current">{selectedNote.title || 'Sem título'}</span>
              </div>
            )}

            {/* Title + actions */}
            <div className="notes-editor-top-bar">
              <input
                ref={titleInputRef}
                className="notes-editor-title-input"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onFocus={() => setIsTitleEditing(true)}
                placeholder="Sem título"
              />
              <div className="notes-editor-toolbar-actions">
                <button
                  className={`notes-editor-action${selectedNote.isFavorite ? ' active' : ''}`}
                  onClick={() => onToggleFavorite(selectedNote.id)}
                  title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <svg viewBox="0 0 24 24" fill={selectedNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <button
                  className={`notes-editor-action${selectedNote.isPinned ? ' active' : ''}`}
                  onClick={() => onTogglePinned(selectedNote.id)}
                  title={selectedNote.isPinned ? 'Desafixar' : 'Fixar'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
                  </svg>
                </button>
                <button
                  className="notes-editor-action"
                  onClick={() => handleAddNote(selectedNote.folderId, selectedNote.id)}
                  title="Nova subpágina"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </button>
                <button
                  className="notes-editor-action danger"
                  onClick={() => { onRemoveNote(selectedNote.id); setSelectedNoteId(null) }}
                  title="Excluir nota"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Subpages chips */}
            {subNotes(selectedNote.id).length > 0 && (
              <div className="notes-subpages-row">
                {subNotes(selectedNote.id).map(sub => (
                  <button key={sub.id} className="notes-subpage-chip" onClick={() => openNote(sub.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    {sub.title || 'Sem título'}
                  </button>
                ))}
              </div>
            )}

            {/* Editor */}
            <div className="notes-editor-content">
              <WysiwygEditor
                content={noteContent}
                onChange={handleContentChange}
                mode="full"
                currentNoteId={selectedNote.id}
              />
            </div>
          </div>
        ) : (
          <div className="notes-editor-empty">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.2 }}>
              <path d="M40 8H16a4 4 0 0 0-4 4v40a4 4 0 0 0 4 4h32a4 4 0 0 0 4-4V20L40 8z" />
              <polyline points="40 8 40 20 52 20" />
              <line x1="24" y1="32" x2="40" y2="32" />
              <line x1="24" y1="40" x2="34" y2="40" />
            </svg>
            <p className="notes-editor-empty-text">Selecione uma nota ou crie uma nova</p>
            <button className="btn btn-primary" onClick={() => handleAddNote()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Nova nota
            </button>
          </div>
        )}
      </div>

      {/* ---- CONTEXT MENU ---- */}
      {contextMenu && contextNote && (
        <div
          ref={contextMenuRef}
          className="notes-context-menu"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="notes-context-item" onClick={() => { onToggleFavorite(contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill={contextNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            {contextNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          </button>
          <button className="notes-context-item" onClick={() => { onTogglePinned(contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>
            {contextNote.isPinned ? 'Desafixar' : 'Fixar'}
          </button>
          <button className="notes-context-item" onClick={() => { handleAddNote(contextNote.folderId, contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nova subpágina
          </button>
          <div className="notes-context-divider" />
          <button className="notes-context-item danger" onClick={() => { onRemoveNote(contextNote.id); if (selectedNoteId === contextNote.id) setSelectedNoteId(null); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
            Excluir nota
          </button>
        </div>
      )}
    </div>
  )
}
