import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardShortcut, Note, NoteFolder } from '../types'
import { isElectron } from '../utils'
import { WysiwygEditor } from './WysiwygEditor'

interface NotesViewProps {
  notes: Note[]
  folders: NoteFolder[]
  onAddNote: (title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => Note
  onUpdateNote: (noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId'>>) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId'>>) => void
  onRemoveNote: (noteId: string) => void
  onAddFolder: (name: string, parentId?: string | null) => string
  onRemoveFolder: (folderId: string) => void
  onReorderNotes: (orderedIds: string[]) => void
  onReorderFolders: (orderedIds: string[]) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned: (noteId: string) => void
  onToggleLock: (noteId: string) => void
  reduceModeSignal?: number
  initialNoteId?: string | null
  onInitialNoteConsumed?: () => void
  keyboardShortcuts?: KeyboardShortcut[]
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

const HomeFolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0, opacity: 0.85, color: 'var(--color-primary)' }}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
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

type TreeItemKind = 'note' | 'folder'
type TreeItemKey = string
type BreadcrumbPart = { label: string; id: string; kind: 'folder' | 'note' }

const noteTreeKey = (id: string): TreeItemKey => `note:${id}`
const folderTreeKey = (id: string): TreeItemKey => `folder:${id}`
const folderContentPath = (folderId: string): string => `folders/${folderId}.md`

const parseTreeKey = (key: TreeItemKey): { kind: TreeItemKind; id: string } | null => {
  if (key.startsWith('note:')) return { kind: 'note', id: key.slice(5) }
  if (key.startsWith('folder:')) return { kind: 'folder', id: key.slice(7) }
  return null
}

// ---- Main component ----

export const NotesView = ({
  notes,
  folders,
  onAddNote,
  onUpdateNote,
  onUpdateFolder,
  onRemoveNote,
  onAddFolder,
  onRemoveFolder,
  onToggleFavorite,
  onTogglePinned,
  onToggleLock,
  reduceModeSignal,
  initialNoteId,
  onInitialNoteConsumed,
  keyboardShortcuts = [],
}: NotesViewProps) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [reduceLevel, setReduceLevel] = useState<0 | 1 | 2>(0)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [folderContent, setFolderContent] = useState('')
  const [folderTitle, setFolderTitle] = useState('')
  const [, setIsTitleEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [newFolderParentId, setNewFolderParentId] = useState<string | null | undefined>(undefined) // undefined = hidden
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ noteId: string; title: string } | null>(null)
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<{ folderId: string; name: string } | null>(null)
  const [isNoteLoading, setIsNoteLoading] = useState(false)
  const [isFolderLoading, setIsFolderLoading] = useState(false)
  const [selectedTreeItems, setSelectedTreeItems] = useState<Set<TreeItemKey>>(new Set())
  const [selectionAnchor, setSelectionAnchor] = useState<TreeItemKey | null>(null)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const folderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteIdRef = useRef<string | null>(null)
  const currentFolderIdRef = useRef<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const folderTitleInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const reduceModeHandledRef = useRef<number | undefined>(reduceModeSignal)
  const markdownImportRef = useRef<HTMLInputElement>(null)

  // Drag-and-drop state
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dragCount, setDragCount] = useState(0)
  const dragPayloadRef = useRef<{ noteIds: string[]; folderIds: string[] }>({ noteIds: [], folderIds: [] })

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])
  const selectedFolder = useMemo(() => folders.find(f => f.id === selectedFolderId) ?? null, [folders, selectedFolderId])
  const selectedNoteLocked = selectedNote?.isLocked === true
  const noteMap = useMemo(() => new Map(notes.map(note => [note.id, note])), [notes])
  const folderMap = useMemo(() => new Map(folders.map(folder => [folder.id, folder])), [folders])

  const buildFolderTrailParts = useCallback((folderId: string | null): BreadcrumbPart[] => {
    const trail: BreadcrumbPart[] = []
    const seen = new Set<string>()
    let currentId = folderId
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId)
      const folder = folderMap.get(currentId)
      if (!folder) break
      trail.unshift({ label: folder.name || 'Sem nome', id: folder.id, kind: 'folder' })
      currentId = folder.parentId ?? null
    }
    return trail
  }, [folderMap])

  const buildParentNoteTrailParts = useCallback((parentNoteId: string | null): BreadcrumbPart[] => {
    const trail: BreadcrumbPart[] = []
    const seen = new Set<string>()
    let currentId = parentNoteId
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId)
      const note = noteMap.get(currentId)
      if (!note) break
      trail.unshift({ label: note.title || 'Sem titulo', id: note.id, kind: 'note' })
      currentId = note.parentNoteId
    }
    return trail
  }, [noteMap])

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

  const visibleTreeItemKeys = useMemo(() => {
    const orderedKeys: TreeItemKey[] = []
    const seen = new Set<TreeItemKey>()
    const pushKey = (key: TreeItemKey) => {
      if (seen.has(key)) return
      seen.add(key)
      orderedKeys.push(key)
    }

    const visitNote = (note: Note) => {
      pushKey(noteTreeKey(note.id))
      if (!expandedNotes.has(note.id)) return
      subNotes(note.id).forEach(visitNote)
    }

    const visitFolder = (folder: NoteFolder) => {
      pushKey(folderTreeKey(folder.id))
      if (!expandedFolders.has(folder.id)) return
      childFolders(folder.id).forEach(visitFolder)
      notesInFolder(folder.id).forEach(visitNote)
    }

    if (searchQuery.trim()) {
      searchResults.forEach(note => pushKey(noteTreeKey(note.id)))
      return orderedKeys
    }

    favorites.forEach(note => pushKey(noteTreeKey(note.id)))
    pinned.forEach(note => pushKey(noteTreeKey(note.id)))
    rootFolders.forEach(visitFolder)
    rootNotes.forEach(visitNote)
    return orderedKeys
  }, [
    childFolders,
    expandedFolders,
    expandedNotes,
    favorites,
    notesInFolder,
    pinned,
    rootFolders,
    rootNotes,
    searchQuery,
    searchResults,
    subNotes,
  ])

  // ---- Breadcrumb ----

  const noteBreadcrumb = useMemo(() => {
    if (!selectedNote) return []
    return [
      ...buildFolderTrailParts(selectedNote.folderId),
      ...buildParentNoteTrailParts(selectedNote.parentNoteId),
    ]
  }, [buildFolderTrailParts, buildParentNoteTrailParts, selectedNote])

  const folderBreadcrumb = useMemo(() => {
    if (!selectedFolder) return []
    return buildFolderTrailParts(selectedFolder.id)
  }, [buildFolderTrailParts, selectedFolder])

  const folderDescendantIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selectedFolder) return ids
    const stack = [selectedFolder.id]
    while (stack.length > 0) {
      const currentId = stack.pop()
      if (!currentId || ids.has(currentId)) continue
      ids.add(currentId)
      folders.forEach(folder => {
        if (folder.parentId === currentId) stack.push(folder.id)
      })
    }
    return ids
  }, [folders, selectedFolder])

  const folderNotesWithPath = useMemo(() => {
    if (!selectedFolder) return []
    return notes
      .filter(note => note.folderId && folderDescendantIds.has(note.folderId))
      .map(note => {
        const folderTrail = buildFolderTrailParts(note.folderId)
        const parentTrail = buildParentNoteTrailParts(note.parentNoteId)
        const locationTrail = [...folderTrail.map(part => part.label), ...parentTrail.map(part => part.label)]
        return {
          note,
          location: locationTrail.length > 0 ? locationTrail.join(' > ') : 'Raiz',
        }
      })
      .sort((a, b) => {
        const locationCmp = a.location.localeCompare(b.location, 'pt-BR', { sensitivity: 'base' })
        if (locationCmp !== 0) return locationCmp
        return (a.note.title || '').localeCompare(b.note.title || '', 'pt-BR', { sensitivity: 'base' })
      })
  }, [buildFolderTrailParts, buildParentNoteTrailParts, folderDescendantIds, notes, selectedFolder])

  const selectedFolderChildren = useMemo(() => {
    if (!selectedFolder) return []
    return childFolders(selectedFolder.id)
  }, [childFolders, selectedFolder])

  // ---- Note content (IPC) ----

  useEffect(() => {
    if (!selectedNote) {
      setIsNoteLoading(false)
      setNoteContent('')
      setNoteTitle('')
      return
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    // Clear immediately so the editor remounts with empty content,
    // not the previous note's content (which would trigger onUpdate -> write wrong file)
    setIsNoteLoading(true)
    setNoteContent('')
    setNoteTitle(selectedNote.title || '')
    setIsTitleEditing(false)
    currentNoteIdRef.current = selectedNote.id

    if (isElectron()) {
      window.electronAPI.readNote(selectedNote.mdPath).then(content => {
        if (currentNoteIdRef.current === selectedNote.id) {
          setNoteContent(content)
          setIsNoteLoading(false)
        }
      }).catch(() => {
        if (currentNoteIdRef.current === selectedNote.id) {
          setNoteContent('')
          setIsNoteLoading(false)
        }
      })
    } else {
      setNoteContent('')
      setIsNoteLoading(false)
    }
  }, [selectedNote?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedFolder) {
      setIsFolderLoading(false)
      setFolderContent('')
      setFolderTitle('')
      currentFolderIdRef.current = null
      return
    }
    if (folderSaveTimeoutRef.current) {
      clearTimeout(folderSaveTimeoutRef.current)
      folderSaveTimeoutRef.current = null
    }
    setIsFolderLoading(true)
    setFolderContent('')
    setFolderTitle(selectedFolder.name || '')
    currentFolderIdRef.current = selectedFolder.id

    if (isElectron()) {
      window.electronAPI.readNote(folderContentPath(selectedFolder.id)).then(content => {
        if (currentFolderIdRef.current === selectedFolder.id) {
          setFolderContent(content)
          setIsFolderLoading(false)
        }
      }).catch(() => {
        if (currentFolderIdRef.current === selectedFolder.id) {
          setFolderContent('')
          setIsFolderLoading(false)
        }
      })
    } else {
      setFolderContent('')
      setIsFolderLoading(false)
    }
  }, [selectedFolder?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedFolder) return
    setFolderTitle(selectedFolder.name || '')
  }, [selectedFolder?.id, selectedFolder?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = useCallback((noteId: string, html: string) => {
    if (isNoteLoading) return
    if (currentNoteIdRef.current !== noteId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (currentNoteIdRef.current !== noteId) return
      const note = notes.find(n => n.id === noteId)
      if (!note) return
      if (note.isLocked) return
      if (isElectron()) {
        window.electronAPI.writeNote(note.mdPath, html).catch(() => {})
      }
      onUpdateNote(note.id, { title: note.title })
    }, 600)
  }, [isNoteLoading, notes, onUpdateNote])

  const handleTitleBlur = useCallback(() => {
    setIsTitleEditing(false)
    if (!selectedNote || !noteTitle.trim()) return
    if (selectedNote.isLocked) return
    if (noteTitle.trim() === selectedNote.title) return
    onUpdateNote(selectedNote.id, { title: noteTitle.trim() })
  }, [selectedNote, noteTitle, onUpdateNote])

  const handleFolderContentChange = useCallback((folderId: string, html: string) => {
    if (isFolderLoading) return
    if (currentFolderIdRef.current !== folderId) return
    if (folderSaveTimeoutRef.current) clearTimeout(folderSaveTimeoutRef.current)
    folderSaveTimeoutRef.current = setTimeout(() => {
      if (currentFolderIdRef.current !== folderId) return
      if (isElectron()) {
        window.electronAPI.writeNote(folderContentPath(folderId), html).catch(() => {})
      }
    }, 600)
  }, [isFolderLoading])

  const handleFolderTitleBlur = useCallback(() => {
    if (!selectedFolder) return
    const nextName = folderTitle.trim()
    if (!nextName) {
      setFolderTitle(selectedFolder.name || '')
      return
    }
    if (nextName === selectedFolder.name) return
    onUpdateFolder(selectedFolder.id, { name: nextName })
  }, [folderTitle, onUpdateFolder, selectedFolder])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (folderSaveTimeoutRef.current) {
        clearTimeout(folderSaveTimeoutRef.current)
        folderSaveTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const validKeys = new Set<TreeItemKey>([
      ...notes.map(note => noteTreeKey(note.id)),
      ...folders.map(folder => folderTreeKey(folder.id)),
    ])

    setSelectedTreeItems(prev => {
      const next = new Set<TreeItemKey>()
      let changed = false
      prev.forEach(key => {
        if (validKeys.has(key)) {
          next.add(key)
        } else {
          changed = true
        }
      })
      return changed ? next : prev
    })

    setSelectionAnchor(prev => (prev && validKeys.has(prev)) ? prev : null)
  }, [folders, notes])

  useEffect(() => {
    if (!selectedNoteId) return
    if (!noteMap.has(selectedNoteId)) {
      setSelectedNoteId(null)
      currentNoteIdRef.current = null
    }
  }, [noteMap, selectedNoteId])

  useEffect(() => {
    if (!selectedFolderId) return
    if (!folderMap.has(selectedFolderId)) {
      setSelectedFolderId(null)
      setIsFolderLoading(false)
      setFolderTitle('')
      setFolderContent('')
      currentFolderIdRef.current = null
    }
  }, [folderMap, selectedFolderId])

  // ---- Open note ----

  const openFolder = useCallback((folderId: string) => {
    const folder = folderMap.get(folderId)
    if (!folder) return
    const key = folderTreeKey(folderId)
    setSelectedTreeItems(new Set([key]))
    setSelectionAnchor(key)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    currentNoteIdRef.current = null
    setSelectedNoteId(null)
    setIsNoteLoading(false)
    setNoteContent('')
    setNoteTitle('')
    currentFolderIdRef.current = folderId
    setSelectedFolderId(folderId)
    setFolderTitle(folder.name || '')
    setSearchQuery('')
    setSearchVisible(false)
  }, [folderMap])

  const openNote = useCallback((noteId: string) => {
    const key = noteTreeKey(noteId)
    setSelectedTreeItems(new Set([key]))
    setSelectionAnchor(key)
    if (selectedNoteId === noteId) {
      setSearchQuery('')
      setSearchVisible(false)
      return
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    currentNoteIdRef.current = noteId
    setIsNoteLoading(true)
    setNoteContent('')
    setSelectedNoteId(noteId)
    setSelectedFolderId(null)
    currentFolderIdRef.current = null
    setSearchQuery('')
    setSearchVisible(false)
  }, [selectedNoteId])

  // ---- Delete note (with confirmation) ----

  const requestDeleteNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note?.isLocked) return
    setDeleteConfirm({ noteId, title: note?.title || 'Sem título' })
  }, [notes])

  const confirmDeleteNote = useCallback(() => {
    if (!deleteConfirm) return
    onRemoveNote(deleteConfirm.noteId)
    if (selectedNoteId === deleteConfirm.noteId) setSelectedNoteId(null)
    setSelectedTreeItems(prev => {
      if (!prev.has(noteTreeKey(deleteConfirm.noteId))) return prev
      const next = new Set(prev)
      next.delete(noteTreeKey(deleteConfirm.noteId))
      return next
    })
    setDeleteConfirm(null)
    setContextMenu(null)
  }, [deleteConfirm, onRemoveNote, selectedNoteId])

  const requestDeleteFolder = useCallback((folderId: string) => {
    const folder = folders.find(item => item.id === folderId)
    if (!folder) return
    setFolderDeleteConfirm({ folderId, name: folder.name || 'Sem nome' })
  }, [folders])

  const confirmDeleteFolder = useCallback(() => {
    if (!folderDeleteConfirm) return
    onRemoveFolder(folderDeleteConfirm.folderId)
    const removedFolderKey = folderTreeKey(folderDeleteConfirm.folderId)
    setSelectedTreeItems(prev => {
      if (!prev.has(removedFolderKey)) return prev
      const next = new Set(prev)
      next.delete(removedFolderKey)
      return next
    })
    if (selectedFolderId === folderDeleteConfirm.folderId) {
      setSelectedFolderId(null)
      setIsFolderLoading(false)
      setFolderTitle('')
      setFolderContent('')
      currentFolderIdRef.current = null
    }
    setFolderDeleteConfirm(null)
  }, [folderDeleteConfirm, onRemoveFolder, selectedFolderId])

  const selectTreeItemRange = useCallback((targetKey: TreeItemKey) => {
    const anchor = selectionAnchor ?? targetKey
    const anchorIndex = visibleTreeItemKeys.indexOf(anchor)
    const targetIndex = visibleTreeItemKeys.indexOf(targetKey)
    if (anchorIndex < 0 || targetIndex < 0) {
      setSelectedTreeItems(new Set([targetKey]))
      setSelectionAnchor(targetKey)
      return
    }
    const start = Math.min(anchorIndex, targetIndex)
    const end = Math.max(anchorIndex, targetIndex)
    setSelectedTreeItems(new Set(visibleTreeItemKeys.slice(start, end + 1)))
    setSelectionAnchor(anchor)
  }, [selectionAnchor, visibleTreeItemKeys])

  const selectSingleTreeItem = useCallback((itemKey: TreeItemKey) => {
    setSelectedTreeItems(new Set([itemKey]))
    setSelectionAnchor(itemKey)
  }, [])

  const handleTreeRowSelection = useCallback((itemKey: TreeItemKey, e: React.MouseEvent): boolean => {
    const isToggleSelection = e.ctrlKey || e.metaKey
    if (e.shiftKey) {
      selectTreeItemRange(itemKey)
      return true
    }
    if (isToggleSelection) {
      setSelectedTreeItems(prev => {
        const next = new Set(prev)
        if (next.has(itemKey)) next.delete(itemKey)
        else next.add(itemKey)
        return next
      })
      setSelectionAnchor(itemKey)
      return true
    }
    return false
  }, [selectTreeItemRange])

  // ---- Add note ----

  const handleAddNote = useCallback((folderId: string | null = (selectedFolderId ?? null), parentNoteId: string | null = null) => {
    if (parentNoteId) {
      const parentNote = notes.find(note => note.id === parentNoteId)
      if (parentNote?.isLocked) return
    }
    const note = onAddNote('Nova nota', folderId, null, parentNoteId)
    if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]))
    if (parentNoteId) setExpandedNotes(prev => new Set([...prev, parentNoteId]))
    currentNoteIdRef.current = note.id
    setIsNoteLoading(true)
    setNoteContent('')
    setSelectedNoteId(note.id)
    setSelectedFolderId(null)
    currentFolderIdRef.current = null
    const key = noteTreeKey(note.id)
    setSelectedTreeItems(new Set([key]))
    setSelectionAnchor(key)
    setTimeout(() => {
      setIsTitleEditing(true)
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 80)
  }, [onAddNote, notes, selectedFolderId])

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

  const matchesShortcut = useCallback((e: KeyboardEvent, id: string, fallback: { ctrl?: boolean; shift?: boolean; key: string }) => {
    const sc = keyboardShortcuts.find(s => s.id === id)
    const keys = sc?.keys ?? fallback
    const ctrl = e.ctrlKey || e.metaKey
    return ctrl === !!keys.ctrl && e.shiftKey === !!keys.shift && e.key.toLowerCase() === keys.key.toLowerCase()
  }, [keyboardShortcuts])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, 'notes-new', { ctrl: true, key: 'n' }) && !e.shiftKey) {
        e.preventDefault()
        handleAddNote()
      }
      if (matchesShortcut(e, 'notes-search', { ctrl: true, key: 'f' })) {
        e.preventDefault()
        setSearchVisible(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchVisible(false)
        setSearchQuery('')
        setContextMenu(null)
        setDeleteConfirm(null)
        setFolderDeleteConfirm(null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleAddNote, matchesShortcut])

  // ---- Reduce mode ----

  useEffect(() => {
    if (typeof reduceModeSignal !== 'number') return
    if (reduceModeHandledRef.current === undefined) {
      reduceModeHandledRef.current = reduceModeSignal
      return
    }
    if (reduceModeSignal <= reduceModeHandledRef.current) return
    reduceModeHandledRef.current = reduceModeSignal
    setReduceLevel(prev => (prev === 2 ? 0 : ((prev + 1) as 0 | 1 | 2)))
  }, [reduceModeSignal])

  useEffect(() => {
    if (reduceLevel === 0) {
      setSidebarOpen(true)
    }
  }, [reduceLevel])

  // ---- Open note via external navigation (e.g. from search modal) ----

  useEffect(() => {
    if (!initialNoteId) return
    openNote(initialNoteId)
    onInitialNoteConsumed?.()
  }, [initialNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Subpage creation from editor ----

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ parentNoteId: string }>).detail
      const parentNote = notes.find(note => note.id === detail.parentNoteId)
      if (parentNote?.isLocked) return
      const newNote = onAddNote('Nova nota', selectedNote?.folderId ?? null, null, detail.parentNoteId)
      if (detail.parentNoteId) setExpandedNotes(prev => new Set([...prev, detail.parentNoteId]))
      // Notify the editor so it can insert the inline subpage block
      document.dispatchEvent(new CustomEvent('notes-subpage-ready', {
        detail: { noteId: newNote.id, noteTitle: newNote.title || 'Nova nota' },
      }))
    }
    const openHandler = (e: Event) => {
      const { noteId } = (e as CustomEvent<{ noteId: string }>).detail
      openNote(noteId)
    }
    document.addEventListener('notes-create-subpage', handler)
    document.addEventListener('notes-open-note', openHandler)
    return () => {
      document.removeEventListener('notes-create-subpage', handler)
      document.removeEventListener('notes-open-note', openHandler)
    }
  }, [onAddNote, openNote, selectedNote, notes])

  // ---- Drag-and-drop ----

  const isFolderDescendant = useCallback((candidateId: string, ancestorId: string) => {
    let current = folderMap.get(candidateId)?.parentId ?? null
    while (current) {
      if (current === ancestorId) return true
      current = folderMap.get(current)?.parentId ?? null
    }
    return false
  }, [folderMap])

  const isNoteDescendant = useCallback((candidateId: string, ancestorId: string) => {
    let current = noteMap.get(candidateId)?.parentNoteId ?? null
    while (current) {
      if (current === ancestorId) return true
      current = noteMap.get(current)?.parentNoteId ?? null
    }
    return false
  }, [noteMap])

  const isNoteInsideAnyFolder = useCallback((noteId: string, folderIds: Set<string>) => {
    let current = noteMap.get(noteId)?.folderId ?? null
    while (current) {
      if (folderIds.has(current)) return true
      current = folderMap.get(current)?.parentId ?? null
    }
    return false
  }, [folderMap, noteMap])

  const buildDragPayload = useCallback((dragKind: TreeItemKind, dragId: string) => {
    const draggedKey = dragKind === 'note' ? noteTreeKey(dragId) : folderTreeKey(dragId)
    let baseSelection = selectedTreeItems
    if (!baseSelection.has(draggedKey)) {
      baseSelection = new Set([draggedKey])
      setSelectedTreeItems(new Set([draggedKey]))
      setSelectionAnchor(draggedKey)
    }

    const folderIds: string[] = []
    const noteIds: string[] = []
    baseSelection.forEach(key => {
      const parsed = parseTreeKey(key)
      if (!parsed) return
      if (parsed.kind === 'folder') {
        if (folderMap.has(parsed.id)) folderIds.push(parsed.id)
      } else {
        if (noteMap.has(parsed.id)) noteIds.push(parsed.id)
      }
    })

    const selectedFolderSet = new Set(folderIds)
    const uniqueFolderIds = folderIds.filter(folderId => {
      let parentId = folderMap.get(folderId)?.parentId ?? null
      while (parentId) {
        if (selectedFolderSet.has(parentId)) return false
        parentId = folderMap.get(parentId)?.parentId ?? null
      }
      return true
    })
    const uniqueFolderSet = new Set(uniqueFolderIds)
    const selectedNoteSet = new Set(noteIds)
    const uniqueNoteIds = noteIds.filter(noteId => {
      const note = noteMap.get(noteId)
      if (!note || note.isLocked) return false
      let parentNoteId = note.parentNoteId
      while (parentNoteId) {
        if (selectedNoteSet.has(parentNoteId)) return false
        parentNoteId = noteMap.get(parentNoteId)?.parentNoteId ?? null
      }
      if (isNoteInsideAnyFolder(noteId, uniqueFolderSet)) return false
      return true
    })
    return { noteIds: uniqueNoteIds, folderIds: uniqueFolderIds }
  }, [folderMap, isNoteInsideAnyFolder, noteMap, selectedTreeItems])

  const handleDragEnd = useCallback(() => {
    dragPayloadRef.current = { noteIds: [], folderIds: [] }
    setDragCount(0)
    setDropTargetId(null)
  }, [])

  const startTreeDrag = useCallback((e: React.DragEvent, kind: TreeItemKind, id: string) => {
    e.stopPropagation()
    const payload = buildDragPayload(kind, id)
    const count = payload.noteIds.length + payload.folderIds.length
    if (count === 0) {
      e.preventDefault()
      return
    }
    dragPayloadRef.current = payload
    setDragCount(count)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${kind}:${id}`)
  }, [buildDragPayload])

  const handleDropOnFolder = useCallback((folderId: string) => {
    const { noteIds, folderIds } = dragPayloadRef.current
    const movedFolderIds = folderIds.filter(id => id !== folderId && !isFolderDescendant(folderId, id))
    const movedNoteIds = noteIds.filter(id => !noteMap.get(id)?.isLocked)

    movedFolderIds.forEach(id => onUpdateFolder(id, { parentId: folderId }))
    movedNoteIds.forEach(id => onUpdateNote(id, { folderId, parentNoteId: null }))

    if (movedFolderIds.length > 0 || movedNoteIds.length > 0) {
      setExpandedFolders(prev => new Set([...prev, folderId]))
    }
    handleDragEnd()
  }, [handleDragEnd, isFolderDescendant, noteMap, onUpdateFolder, onUpdateNote])

  const handleDropOnNote = useCallback((targetNote: Note) => {
    if (targetNote.isLocked) { handleDragEnd(); return }
    const { noteIds } = dragPayloadRef.current
    const movedNoteIds = noteIds.filter(id => {
      if (id === targetNote.id) return false
      const note = noteMap.get(id)
      if (!note || note.isLocked) return false
      if (isNoteDescendant(targetNote.id, id)) return false
      return true
    })
    movedNoteIds.forEach(id => onUpdateNote(id, { folderId: targetNote.folderId, parentNoteId: targetNote.id }))
    if (movedNoteIds.length > 0) setExpandedNotes(prev => new Set([...prev, targetNote.id]))
    handleDragEnd()
  }, [handleDragEnd, isNoteDescendant, noteMap, onUpdateNote])

  const handleDropOnRoot = useCallback(() => {
    const { noteIds, folderIds } = dragPayloadRef.current
    folderIds.forEach(id => onUpdateFolder(id, { parentId: null }))
    noteIds.forEach(id => {
      if (noteMap.get(id)?.isLocked) return
      onUpdateNote(id, { folderId: null, parentNoteId: null })
    })
    handleDragEnd()
  }, [handleDragEnd, noteMap, onUpdateFolder, onUpdateNote])

  // ---- Markdown import ----

  const markdownToHtml = (md: string): string => {
    const lines = md.replace(/\r\n/g, '\n').split('\n')
    const out: string[] = []
    let inCode = false, codeBuf: string[] = [], listMode: 'ul' | 'ol' | null = null
    const flushList = () => { if (!listMode) return; out.push(listMode === 'ul' ? '</ul>' : '</ol>'); listMode = null }
    const flushCode = () => {
      out.push(`<pre><code>${codeBuf.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
      inCode = false; codeBuf = []
    }
    const inline = (s: string) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    for (const line of lines) {
      if (line.trim().startsWith('```')) { flushList(); if (inCode) flushCode(); else { inCode = true; codeBuf = [] }; continue }
      if (inCode) { codeBuf.push(line); continue }
      if (!line.trim()) { flushList(); out.push('<p><br></p>'); continue }
      if (/^###\s+/.test(line)) { flushList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue }
      if (/^##\s+/.test(line)) { flushList(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue }
      if (/^#\s+/.test(line)) { flushList(); out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`); continue }
      if (/^>\s+/.test(line)) { flushList(); out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue }
      const ol = line.match(/^(\d+)\.\s+(.*)$/)
      if (ol) { if (listMode !== 'ol') { flushList(); out.push('<ol>'); listMode = 'ol' }; out.push(`<li>${inline(ol[2] ?? '')}</li>`); continue }
      if (/^[-*]\s+/.test(line)) { if (listMode !== 'ul') { flushList(); out.push('<ul>'); listMode = 'ul' }; out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue }
      if (/^---+$/.test(line.trim())) { flushList(); out.push('<hr/>'); continue }
      flushList(); out.push(`<p>${inline(line)}</p>`)
    }
    if (inCode) flushCode(); flushList()
    return out.join('') || '<p><br></p>'
  }

  const handleMarkdownImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    for (const file of files) {
      const title = file.name.replace(/\.(md|markdown)$/i, '')
      const reader = new FileReader()
      reader.onload = () => {
        const html = markdownToHtml(reader.result as string)
        const folderId = selectedNote?.folderId ?? selectedFolderId ?? null
        const note = onAddNote(title, folderId, null, null)
        if (isElectron()) {
          window.electronAPI.writeNote(note.mdPath, html).catch(() => {})
        }
        setSelectedNoteId(note.id)
        setSelectedFolderId(null)
        currentFolderIdRef.current = null
        const key = noteTreeKey(note.id)
        setSelectedTreeItems(new Set([key]))
        setSelectionAnchor(key)
        setNoteContent(html)
      }
      reader.readAsText(file)
    }
  }, [selectedNote, selectedFolderId, onAddNote]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Tree rendering ----

  const renderNote = (note: Note, depth: number) => {
    const children = subNotes(note.id)
    const isExpanded = expandedNotes.has(note.id)
    const isOpenNote = selectedNoteId === note.id
    const hasChildren = children.length > 0
    const treeKey = noteTreeKey(note.id)
    const isTreeSelected = selectedTreeItems.has(treeKey)

    const isDropTarget = dropTargetId === note.id
    return (
      <div key={note.id} className="notes-tree-group">
        <div
          className={`notes-tree-row notes-tree-note${isOpenNote ? ' is-active' : ''}${isTreeSelected ? ' is-selected' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable={!note.isLocked}
          onDragStart={e => startTreeDrag(e, 'note', note.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            if (note.isLocked) return
            const canDrop = dragPayloadRef.current.noteIds.some(noteId => {
              if (noteId === note.id) return false
              if (noteMap.get(noteId)?.isLocked) return false
              return !isNoteDescendant(note.id, noteId)
            })
            if (canDrop) setDropTargetId(note.id)
          }}
          onDragLeave={e => {
            e.stopPropagation()
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTargetId(null)
            }
          }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnNote(note) }}
          onClick={e => {
            if (handleTreeRowSelection(treeKey, e)) return
            selectSingleTreeItem(treeKey)
            openNote(note.id)
          }}
          onContextMenu={e => {
            e.preventDefault()
            if (!selectedTreeItems.has(treeKey)) selectSingleTreeItem(treeKey)
            setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id })
          }}
        >
          <button
            className={`notes-tree-chevron${hasChildren ? ' visible' : ''}${isExpanded ? ' open' : ''}`}
            onClick={e => hasChildren ? toggleNote(note.id, e) : undefined}
            tabIndex={-1}
          >
            <ChevronIcon open={isExpanded} />
          </button>
          <PageIcon />
          <span className="notes-tree-label">{note.title || 'Sem titulo'}</span>
          <span className="notes-tree-row-actions">
            <button
              className="notes-tree-action-btn"
              title="Nova subpagina"
              disabled={note.isLocked}
              onClick={e => { e.stopPropagation(); handleAddNote(note.folderId, note.id) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button
              className="notes-tree-action-btn"
              title="Excluir"
              disabled={note.isLocked}
              onClick={e => { e.stopPropagation(); requestDeleteNote(note.id) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
            </button>
          </span>
          {note.isFavorite && <span className="notes-tree-star">*</span>}
          {note.isPinned && <span className="notes-tree-pin">PIN</span>}
          {note.isLocked && (
            <span className="notes-tree-lock" title="Nota trancada" aria-label="Nota trancada">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
          )}
        </div>
        {isExpanded && children.map(child => renderNote(child, depth + 1))}
      </div>
    )
  }

  const renderFolder = (folder: NoteFolder, depth: number): JSX.Element => {
    const isExpanded = expandedFolders.has(folder.id)
    const childFlds = childFolders(folder.id)
    const childNts = notesInFolder(folder.id)
    const treeKey = folderTreeKey(folder.id)
    const isTreeSelected = selectedTreeItems.has(treeKey)
    const isOpenFolder = selectedFolderId === folder.id

    const isFolderDropTarget = dropTargetId === folder.id
    return (
      <div key={folder.id} className="notes-tree-group">
        <div
          className={`notes-tree-row notes-tree-folder${isOpenFolder ? ' is-active' : ''}${isTreeSelected ? ' is-selected' : ''}${isFolderDropTarget ? ' is-drop-target' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable
          onDragStart={e => startTreeDrag(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            const canDropFolders = dragPayloadRef.current.folderIds.some(folderId => (
              folderId !== folder.id && !isFolderDescendant(folder.id, folderId)
            ))
            const canDropNotes = dragPayloadRef.current.noteIds.some(noteId => !noteMap.get(noteId)?.isLocked)
            if (canDropFolders || canDropNotes) setDropTargetId(folder.id)
          }}
          onDragLeave={e => {
            e.stopPropagation()
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTargetId(null)
            }
          }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnFolder(folder.id) }}
          onClick={e => {
            if (handleTreeRowSelection(treeKey, e)) return
            selectSingleTreeItem(treeKey)
            toggleFolder(folder.id)
          }}
          onDoubleClick={e => {
            e.stopPropagation()
            openFolder(folder.id)
          }}
        >
          <button
            className="notes-tree-chevron visible"
            onClick={e => { e.stopPropagation(); toggleFolder(folder.id) }}
            tabIndex={-1}
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <ChevronIcon open={isExpanded} />
          </button>
          {folder.isHome ? <HomeFolderIcon /> : <FolderIcon open={isExpanded} />}
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
              className={`notes-tree-action-btn${folder.isHome ? ' is-active-home' : ''}`}
              title={folder.isHome ? 'Remover pasta home' : 'Tornar pasta home'}
              onClick={e => { e.stopPropagation(); onUpdateFolder(folder.id, { isHome: !folder.isHome }) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
            </button>
            <button
              className="notes-tree-action-btn"
              title="Excluir pasta"
              onClick={e => { e.stopPropagation(); requestDeleteFolder(folder.id) }}
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
  const isSidebarCollapsed = !sidebarOpen || reduceLevel >= 1

  return (
    <div className={`notes-layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}${reduceLevel >= 2 ? ' reduce-level-2' : ''}`}>

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
              title="Importar markdown"
              onClick={() => markdownImportRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
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

              {/* Drop zone para mover para a raiz (visível durante drag) */}
              {dragCount > 0 && (
                <div
                  className={`notes-tree-root-drop-zone${dropTargetId === 'root-zone' ? ' is-drop-target' : ''}`}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTargetId('root-zone') }}
                  onDragLeave={e => {
                    e.stopPropagation()
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
                  }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnRoot() }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                    <polyline points="17 11 12 6 7 11" /><line x1="12" y1="18" x2="12" y2="6" />
                  </svg>
                  {dragCount > 1 ? `Mover ${dragCount} itens para raiz` : 'Mover para raiz'}
                </div>
              )}

              {/* Main tree */}
              <div
                className="notes-tree-section notes-tree-main"
                onDragOver={e => { e.preventDefault() }}
                onDrop={e => { e.preventDefault(); handleDropOnRoot() }}
              >
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
          <input
            ref={markdownImportRef}
            type="file"
            accept=".md,.markdown"
            style={{ display: 'none' }}
            multiple
            onChange={handleMarkdownImport}
          />
        </div>
      </aside>

      {/* Sidebar open button (when collapsed) */}
      {isSidebarCollapsed && (
        <button className="notes-sidebar-open-btn" onClick={() => { setReduceLevel(0); setSidebarOpen(true) }} title="Abrir barra lateral">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}

      {/* ---- EDITOR PANE ---- */}
      <div className="notes-editor-pane">
        {selectedNote ? (
          <div className="notes-editor-inner">
            {/* Breadcrumb */}
            {noteBreadcrumb.length > 0 && (
              <div className="notes-editor-breadcrumb">
                {noteBreadcrumb.map((part, i) => (
                  <span key={part.id} className="notes-bc-item-wrap">
                    {i > 0 && <span className="notes-bc-sep">&gt;</span>}
                    <button className="notes-bc-item" onClick={() => part.kind === 'note' ? openNote(part.id) : openFolder(part.id)}>
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
                <span className="notes-bc-sep">&gt;</span>
                <span className="notes-bc-current">{selectedNote.title || 'Sem titulo'}</span>
              </div>
            )}

            {/* Title + actions */}
            <div className="notes-editor-top-bar">
              <div className="notes-editor-title-wrap">
                <input
                  ref={titleInputRef}
                  className={`notes-editor-title-input${selectedNoteLocked ? ' is-locked' : ''}`}
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onFocus={() => setIsTitleEditing(true)}
                  placeholder="Sem titulo"
                  readOnly={selectedNoteLocked}
                />
                {selectedNoteLocked && (
                  <span className="notes-editor-locked-icon" title="Nota trancada" aria-label="Nota trancada">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v1" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="notes-editor-toolbar-actions">
                <button
                  className={`notes-editor-action${selectedNoteLocked ? ' active' : ''}`}
                  onClick={() => onToggleLock(selectedNote.id)}
                  title={selectedNoteLocked ? 'Destrancar nota' : 'Trancar nota'}
                >
                  {selectedNoteLocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </button>
                <button
                  className={`notes-editor-action${selectedNote.isFavorite ? ' active' : ''}`}
                  onClick={() => onToggleFavorite(selectedNote.id)}
                  title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  disabled={selectedNoteLocked}
                >
                  <svg viewBox="0 0 24 24" fill={selectedNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <button
                  className={`notes-editor-action${selectedNote.isPinned ? ' active' : ''}`}
                  onClick={() => onTogglePinned(selectedNote.id)}
                  title={selectedNote.isPinned ? 'Desafixar' : 'Fixar'}
                  disabled={selectedNoteLocked}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
                  </svg>
                </button>
                <button
                  className="notes-editor-action"
                  onClick={() => handleAddNote(selectedNote.folderId, selectedNote.id)}
                  title="Nova subpagina"
                  disabled={selectedNoteLocked}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </button>
                <button
                  className="notes-editor-action danger"
                  onClick={() => requestDeleteNote(selectedNote.id)}
                  title="Excluir nota"
                  disabled={selectedNoteLocked}
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
                    {sub.title || 'Sem titulo'}
                  </button>
                ))}
              </div>
            )}

            {/* Editor */}
            <div className="notes-editor-content">
              <WysiwygEditor
                key={selectedNote.id}
                content={noteContent}
                onChange={(html) => handleContentChange(selectedNote.id, html)}
                mode="full"
                currentNoteId={selectedNote.id}
                readOnly={selectedNoteLocked}
              />
            </div>
          </div>
        ) : selectedFolder ? (
          <div className="notes-editor-inner">
            {folderBreadcrumb.length > 0 && (
              <div className="notes-editor-breadcrumb">
                {folderBreadcrumb.slice(0, -1).map((part, i) => (
                  <span key={part.id} className="notes-bc-item-wrap">
                    {i > 0 && <span className="notes-bc-sep">&gt;</span>}
                    <button className="notes-bc-item" onClick={() => openFolder(part.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {part.label}
                    </button>
                  </span>
                ))}
                {folderBreadcrumb.length > 1 && <span className="notes-bc-sep">&gt;</span>}
                <span className="notes-bc-current">{folderBreadcrumb[folderBreadcrumb.length - 1]?.label || selectedFolder.name}</span>
              </div>
            )}

            <div className="notes-editor-top-bar">
              <div className="notes-editor-title-wrap">
                <input
                  ref={folderTitleInputRef}
                  className="notes-editor-title-input notes-folder-title-input"
                  value={folderTitle}
                  onChange={e => setFolderTitle(e.target.value)}
                  onBlur={handleFolderTitleBlur}
                  placeholder="Sem nome"
                />
              </div>
              <div className="notes-editor-toolbar-actions">
                <button
                  className="notes-editor-action"
                  onClick={() => handleAddNote(selectedFolder.id, null)}
                  title="Nova nota nesta pasta"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </button>
                <button
                  className="notes-editor-action"
                  onClick={() => {
                    setNewFolderParentId(selectedFolder.id)
                    setExpandedFolders(prev => new Set([...prev, selectedFolder.id]))
                    setTimeout(() => newFolderInputRef.current?.focus(), 50)
                  }}
                  title="Nova subpasta"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="notes-folder-overview">
              <section className="notes-folder-section">
                <div className="notes-folder-section-head">
                  <span>Subpastas internas</span>
                  <span className="notes-folder-section-count">{selectedFolderChildren.length}</span>
                </div>
                <div className="notes-folder-section-body">
                  {selectedFolderChildren.length > 0 ? (
                    selectedFolderChildren.map(folder => (
                      <button key={folder.id} className="notes-folder-item" onClick={() => openFolder(folder.id)}>
                        <span className="notes-folder-item-main">
                          {folder.isHome ? <HomeFolderIcon /> : <FolderIcon open={expandedFolders.has(folder.id)} />}
                          <span>{folder.name || 'Sem nome'}</span>
                        </span>
                        <span className="notes-folder-item-path">
                          {[...buildFolderTrailParts(folder.parentId).map(item => item.label), folder.name || 'Sem nome'].join(' > ')}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="notes-folder-empty">Nenhuma subpasta nesta pasta.</p>
                  )}
                </div>
              </section>

              <section className="notes-folder-section">
                <div className="notes-folder-section-head">
                  <span>Notas e caminhos</span>
                  <span className="notes-folder-section-count">{folderNotesWithPath.length}</span>
                </div>
                <div className="notes-folder-section-body">
                  {folderNotesWithPath.length > 0 ? (
                    folderNotesWithPath.map(item => (
                      <button key={item.note.id} className="notes-folder-item" onClick={() => openNote(item.note.id)}>
                        <span className="notes-folder-item-main">
                          <PageIcon />
                          <span>{item.note.title || 'Sem titulo'}</span>
                        </span>
                        <span className="notes-folder-item-path">{item.location}</span>
                      </button>
                    ))
                  ) : (
                    <p className="notes-folder-empty">Nenhuma nota encontrada dentro desta pasta.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="notes-editor-content notes-folder-editor-content">
              {isFolderLoading ? (
                <div className="notes-folder-loading">Carregando conteudo da pasta...</div>
              ) : (
                <WysiwygEditor
                  key={`folder-${selectedFolder.id}`}
                  content={folderContent}
                  onChange={(html) => handleFolderContentChange(selectedFolder.id, html)}
                  mode="full"
                  placeholder="Escreva aqui o conteudo desta pasta"
                />
              )}
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
      {/* ---- DELETE CONFIRMATION MODAL ---- */}
      {deleteConfirm && (
        <div className="notes-delete-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="notes-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="notes-delete-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </div>
            <h3 className="notes-delete-modal-title">Excluir nota</h3>
            <p className="notes-delete-modal-desc">
              Tem certeza que deseja excluir <strong>"{deleteConfirm.title}"</strong>?<br />
              Esta ação não pode ser desfeita.
            </p>
            <div className="notes-delete-modal-actions">
              <button className="notes-delete-modal-btn cancel" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="notes-delete-modal-btn confirm" onClick={confirmDeleteNote}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {folderDeleteConfirm && (
        <div className="notes-delete-modal-overlay" onClick={() => setFolderDeleteConfirm(null)}>
          <div className="notes-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="notes-delete-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <path d="M9 13h6" />
              </svg>
            </div>
            <h3 className="notes-delete-modal-title">Excluir pasta</h3>
            <p className="notes-delete-modal-desc">
              Tem certeza que deseja excluir <strong>"{folderDeleteConfirm.name}"</strong>?<br />
              Esta acao nao pode ser desfeita.
            </p>
            <div className="notes-delete-modal-actions">
              <button className="notes-delete-modal-btn cancel" onClick={() => setFolderDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="notes-delete-modal-btn confirm" onClick={confirmDeleteFolder}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && contextNote && (
        <div
          ref={contextMenuRef}
          className="notes-context-menu"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="notes-context-item" onClick={() => { onToggleLock(contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="10" rx="2" /><path d={contextNote.isLocked ? 'M8 11V7a4 4 0 0 1 8 0v1' : 'M7 11V7a5 5 0 0 1 10 0v4'} /></svg>
            {contextNote.isLocked ? 'Destrancar nota' : 'Trancar nota'}
          </button>
          <button className="notes-context-item" disabled={contextNote.isLocked} onClick={() => { onToggleFavorite(contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill={contextNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            {contextNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          </button>
          <button className="notes-context-item" disabled={contextNote.isLocked} onClick={() => { onTogglePinned(contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>
            {contextNote.isPinned ? 'Desafixar' : 'Fixar'}
          </button>
          <button className="notes-context-item" disabled={contextNote.isLocked} onClick={() => { handleAddNote(contextNote.folderId, contextNote.id); setContextMenu(null) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nova subpagina
          </button>
          <div className="notes-context-divider" />
          <button className="notes-context-item danger" disabled={contextNote.isLocked} onClick={() => requestDeleteNote(contextNote.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
            Excluir nota
          </button>
        </div>
      )}
    </div>
  )
}

