/**
 * useNotesTree — orquestrador da tree de notas (Upgrade 10a refator).
 *
 * Antes: 532 linhas concentrando selection, expansion, drag, ctx menu, CRUD.
 * Agora: ~280 linhas focadas em derivacoes (memos), navegacao, CRUD,
 * import e effects. Slices isolados:
 *  - useNotesExpansion (state de expansao)
 *  - useNotesContextMenu (ctx menu)
 *  - useNotesSelection (selecao multipla + range)
 *  - useNotesDragDrop (drag-drop completo)
 *
 * Contrato externo (return shape) preservado integralmente.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteFolder, KeyboardShortcut } from '@types'
import { isElectron } from '@utils'
import { markdownToHtml, noteTreeKey, folderTreeKey } from '../utils'
import type { BreadcrumbPart, TreeItemKey } from '@types'
import { useNotesExpansion } from './slices/useNotesExpansion'
import { useNotesContextMenu } from './slices/useNotesContextMenu'
import { useNotesSelection } from './slices/useNotesSelection'
import { useNotesDragDrop } from './slices/useNotesDragDrop'

interface UseNotesTreeParams {
  notes:          Note[]
  folders:        NoteFolder[]
  onAddNote:      (title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => Note
  onUpdateNote:   (noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId'>>) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  onRemoveNote:   (noteId: string) => void
  onRemoveFolder: (folderId: string) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned:   (noteId: string) => void
  reduceModeSignal?: number
  initialNoteId?:    string | null
  onInitialNoteConsumed?: () => void
  keyboardShortcuts?: KeyboardShortcut[]
  // Content callbacks (from useNoteContent)
  prepareNewNote:      (noteId: string) => void
  setNoteContentDirect: (html: string) => void
}

export function useNotesTree({
  notes, folders,
  onAddNote, onUpdateNote, onUpdateFolder, onRemoveNote, onRemoveFolder,
  onToggleFavorite: _onToggleFavorite, onTogglePinned: _onTogglePinned,
  reduceModeSignal, initialNoteId, onInitialNoteConsumed,
  keyboardShortcuts = [],
  prepareNewNote, setNoteContentDirect,
}: UseNotesTreeParams) {
  // ── Local state ──────────────────────────────────────────────────────────
  const [selectedNoteId,   setSelectedNoteId]   = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sidebarOpen,      setSidebarOpen]      = useState(true)
  const [reduceLevel,      setReduceLevel]      = useState<0 | 1 | 2>(0)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [searchVisible,    setSearchVisible]    = useState(false)
  const [newFolderParentId, setNewFolderParentId] = useState<string | null | undefined>(undefined)
  const [newFolderName,     setNewFolderName]     = useState('')
  const [renamingFolderId,  setRenamingFolderId]  = useState<string | null>(null)
  const [renamingFolderName, setRenamingFolderName] = useState('')
  const [deleteConfirm,     setDeleteConfirm]     = useState<{ noteId: string; title: string } | null>(null)
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<{ folderId: string; name: string } | null>(null)
  const [activeView,        setActiveView]        = useState<'home' | 'note' | 'folder'>('home')
  const [recentNoteIds,     setRecentNoteIds]     = useState<string[]>([])

  const reduceModeHandledRef = useRef<number | undefined>(reduceModeSignal)
  const searchInputRef       = useRef<HTMLInputElement>(null)
  const newFolderInputRef    = useRef<HTMLInputElement>(null)
  const markdownImportRef    = useRef<HTMLInputElement>(null)
  const titleInputRef        = useRef<HTMLInputElement>(null)

  // ── Slices ───────────────────────────────────────────────────────────────
  const expansion = useNotesExpansion()
  const ctxMenuSlice = useNotesContextMenu(notes, folders)

  // ── Derived (memos) ──────────────────────────────────────────────────────
  const noteMap   = useMemo(() => new Map(notes.map(n => [n.id, n])),     [notes])
  const folderMap = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders])

  const selectedNote   = useMemo(() => noteMap.get(selectedNoteId ?? '')   ?? null, [noteMap, selectedNoteId])
  const selectedFolder = useMemo(() => folderMap.get(selectedFolderId ?? '') ?? null, [folderMap, selectedFolderId])
  const selectedNoteLocked = selectedNote?.isLocked === true

  const favorites  = useMemo(() => notes.filter(n => n.isFavorite), [notes])
  const pinned     = useMemo(() => notes.filter(n => n.isPinned && !n.isFavorite), [notes])
  const rootFolders = useMemo(() => folders.filter(f => !f.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [folders])
  const rootNotes   = useMemo(() => notes.filter(n => !n.folderId && !n.parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [notes])

  const childFolders  = useCallback((parentId: string) => folders.filter(f => f.parentId === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [folders])
  const notesInFolder = useCallback((folderId: string) => notes.filter(n => n.folderId === folderId && !n.parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [notes])
  const subNotes      = useCallback((parentNoteId: string) => notes.filter(n => n.parentNoteId === parentNoteId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [notes])

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    return notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 30)
  }, [searchQuery, notes])

  const visibleTreeItemKeys = useMemo(() => {
    const ordered: TreeItemKey[] = []
    const seen = new Set<TreeItemKey>()
    const push = (key: TreeItemKey) => { if (!seen.has(key)) { seen.add(key); ordered.push(key) } }
    const visitNote = (note: Note) => { push(noteTreeKey(note.id)); if (expansion.expandedNotes.has(note.id)) subNotes(note.id).forEach(visitNote) }
    const visitFolder = (folder: NoteFolder) => {
      push(folderTreeKey(folder.id))
      if (expansion.expandedFolders.has(folder.id)) { childFolders(folder.id).forEach(visitFolder); notesInFolder(folder.id).forEach(visitNote) }
    }
    if (searchQuery.trim()) { searchResults.forEach(note => push(noteTreeKey(note.id))); return ordered }
    favorites.forEach(note => push(noteTreeKey(note.id)))
    pinned.forEach(note => push(noteTreeKey(note.id)))
    rootFolders.forEach(visitFolder)
    rootNotes.forEach(visitNote)
    return ordered
  }, [childFolders, expansion.expandedFolders, expansion.expandedNotes, favorites, notesInFolder, pinned, rootFolders, rootNotes, searchQuery, searchResults, subNotes])

  // Slices que dependem de derivacoes vem depois delas
  const selection = useNotesSelection({ notes, folders, visibleTreeItemKeys })
  const dragDrop = useNotesDragDrop({
    noteMap,
    folderMap,
    selectedTreeItems: selection.selectedTreeItems,
    setSelectedTreeItems: selection.setSelectedTreeItems,
    setSelectionAnchor: selection.setSelectionAnchor,
    setExpandedFolders: expansion.setExpandedFolders,
    setExpandedNotes: expansion.setExpandedNotes,
    onUpdateNote,
    onUpdateFolder,
  })

  const buildFolderTrailParts = useCallback((folderId: string | null): BreadcrumbPart[] => {
    const trail: BreadcrumbPart[] = []; const seen = new Set<string>(); let cur = folderId
    while (cur && !seen.has(cur)) {
      seen.add(cur); const f = folderMap.get(cur); if (!f) break
      trail.unshift({ label: f.name || 'Sem nome', id: f.id, kind: 'folder' }); cur = f.parentId ?? null
    }
    return trail
  }, [folderMap])

  const buildParentNoteTrailParts = useCallback((parentNoteId: string | null): BreadcrumbPart[] => {
    const trail: BreadcrumbPart[] = []; const seen = new Set<string>(); let cur = parentNoteId
    while (cur && !seen.has(cur)) {
      seen.add(cur); const n = noteMap.get(cur); if (!n) break
      trail.unshift({ label: n.title || 'Sem titulo', id: n.id, kind: 'note' }); cur = n.parentNoteId ?? null
    }
    return trail
  }, [noteMap])

  const noteBreadcrumb = useMemo(() => {
    if (!selectedNote) return []
    return [...buildFolderTrailParts(selectedNote.folderId), ...buildParentNoteTrailParts(selectedNote.parentNoteId)]
  }, [buildFolderTrailParts, buildParentNoteTrailParts, selectedNote])

  const folderBreadcrumb = useMemo(() => {
    if (!selectedFolder) return []
    return buildFolderTrailParts(selectedFolder.id)
  }, [buildFolderTrailParts, selectedFolder])

  const folderDescendantIds = useMemo(() => {
    const ids = new Set<string>(); if (!selectedFolder) return ids
    const stack = [selectedFolder.id]
    while (stack.length > 0) {
      const cur = stack.pop(); if (!cur || ids.has(cur)) continue; ids.add(cur)
      folders.forEach(f => { if (f.parentId === cur) stack.push(f.id) })
    }
    return ids
  }, [folders, selectedFolder])

  const folderNotesWithPath = useMemo(() => {
    if (!selectedFolder) return []
    return notes
      .filter(note => note.folderId && folderDescendantIds.has(note.folderId))
      .map(note => {
        const locationTrail = [
          ...buildFolderTrailParts(note.folderId).map(p => p.label),
          ...buildParentNoteTrailParts(note.parentNoteId).map(p => p.label),
        ]
        return { note, location: locationTrail.length > 0 ? locationTrail.join(' > ') : 'Raiz' }
      })
      .sort((a, b) => {
        const cmp = a.location.localeCompare(b.location, 'pt-BR', { sensitivity: 'base' })
        return cmp !== 0 ? cmp : (a.note.title || '').localeCompare(b.note.title || '', 'pt-BR', { sensitivity: 'base' })
      })
  }, [buildFolderTrailParts, buildParentNoteTrailParts, folderDescendantIds, notes, selectedFolder])

  const selectedFolderChildren = useMemo(() => (!selectedFolder ? [] : childFolders(selectedFolder.id)), [childFolders, selectedFolder])

  // ── Cleanup de selecao quando entidade some ─────────────────────────────
  useEffect(() => {
    if (!selectedNoteId) return
    if (!noteMap.has(selectedNoteId)) { setSelectedNoteId(null) }
  }, [noteMap, selectedNoteId])

  useEffect(() => {
    if (!selectedFolderId) return
    if (!folderMap.has(selectedFolderId)) { setSelectedFolderId(null) }
  }, [folderMap, selectedFolderId])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goHome = useCallback(() => {
    setActiveView('home')
    setSelectedNoteId(null); setSelectedFolderId(null)
    selection.setSelectedTreeItems(new Set()); selection.setSelectionAnchor(null)
    setSearchQuery(''); setSearchVisible(false)
  }, [selection])

  const openNote = useCallback((noteId: string) => {
    const key = noteTreeKey(noteId)
    selection.setSelectedTreeItems(new Set([key])); selection.setSelectionAnchor(key)
    setActiveView('note')
    if (selectedNoteId !== noteId) {
      setSelectedNoteId(noteId); setSelectedFolderId(null)
      setRecentNoteIds(prev => {
        const filtered = prev.filter(id => id !== noteId)
        return [noteId, ...filtered].slice(0, 10)
      })
    }
    setSearchQuery(''); setSearchVisible(false)
  }, [selectedNoteId, selection])

  const openFolder = useCallback((folderId: string) => {
    const folder = folderMap.get(folderId); if (!folder) return
    const key = folderTreeKey(folderId)
    selection.setSelectedTreeItems(new Set([key])); selection.setSelectionAnchor(key)
    setActiveView('folder')
    setSelectedNoteId(null); setSelectedFolderId(folderId)
    setSearchQuery(''); setSearchVisible(false)
  }, [folderMap, selection])

  // ── Add / delete ──────────────────────────────────────────────────────────
  const handleAddNote = useCallback((folderId: string | null = (selectedFolderId ?? null), parentNoteId: string | null = null) => {
    if (parentNoteId && noteMap.get(parentNoteId)?.isLocked) return
    const note = onAddNote('Nova nota', folderId, null, parentNoteId)
    if (folderId)     expansion.setExpandedFolders(prev => new Set([...prev, folderId]))
    if (parentNoteId) expansion.setExpandedNotes(prev => new Set([...prev, parentNoteId]))
    prepareNewNote(note.id)
    setActiveView('note')
    setSelectedNoteId(note.id); setSelectedFolderId(null)
    const key = noteTreeKey(note.id)
    selection.setSelectedTreeItems(new Set([key])); selection.setSelectionAnchor(key)
    setTimeout(() => { titleInputRef.current?.focus(); titleInputRef.current?.select() }, 80)
  }, [onAddNote, noteMap, selectedFolderId, prepareNewNote, expansion, selection])

  const handleAddFolder = useCallback(() => {}, [])

  const requestDeleteNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId); if (note?.isLocked) return
    setDeleteConfirm({ noteId, title: note?.title || 'Sem título' })
  }, [notes])

  const confirmDeleteNote = useCallback(() => {
    if (!deleteConfirm) return
    onRemoveNote(deleteConfirm.noteId)
    if (selectedNoteId === deleteConfirm.noteId) setSelectedNoteId(null)
    selection.setSelectedTreeItems(prev => {
      if (!prev.has(noteTreeKey(deleteConfirm.noteId))) return prev
      const next = new Set(prev); next.delete(noteTreeKey(deleteConfirm.noteId)); return next
    })
    setDeleteConfirm(null); ctxMenuSlice.setCtxMenu(null)
  }, [deleteConfirm, onRemoveNote, selectedNoteId, selection, ctxMenuSlice])

  const requestDeleteFolder = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId); if (!folder) return
    setFolderDeleteConfirm({ folderId, name: folder.name || 'Sem nome' })
  }, [folders])

  const confirmDeleteFolder = useCallback(() => {
    if (!folderDeleteConfirm) return
    onRemoveFolder(folderDeleteConfirm.folderId)
    selection.setSelectedTreeItems(prev => {
      const key = folderTreeKey(folderDeleteConfirm.folderId)
      if (!prev.has(key)) return prev; const next = new Set(prev); next.delete(key); return next
    })
    if (selectedFolderId === folderDeleteConfirm.folderId) setSelectedFolderId(null)
    setFolderDeleteConfirm(null)
  }, [folderDeleteConfirm, onRemoveFolder, selectedFolderId, selection])

  const handleDuplicateNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId); if (!note) return
    const newNote = onAddNote(`${note.title} (cópia)`, note.folderId, null, null)
    if (isElectron() && note.mdPath && newNote.mdPath) {
      window.electronAPI.readNote(note.mdPath)
        .then(c => { if (c) window.electronAPI.writeNote(newNote.mdPath!, c).catch(() => {}) })
        .catch(() => {})
    }
  }, [notes, onAddNote])

  // ── Markdown import ───────────────────────────────────────────────────────
  const handleMarkdownImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); e.target.value = ''; if (!files.length) return
    for (const file of files) {
      const title = file.name.replace(/\.(md|markdown)$/i, '')
      const reader = new FileReader()
      reader.onload = () => {
        const html = markdownToHtml(reader.result as string)
        const folderId = selectedNote?.folderId ?? selectedFolderId ?? null
        const note = onAddNote(title, folderId, null, null)
        if (isElectron()) window.electronAPI.writeNote(note.mdPath, html).catch(() => {})
        setSelectedNoteId(note.id); setSelectedFolderId(null)
        const key = noteTreeKey(note.id)
        selection.setSelectedTreeItems(new Set([key])); selection.setSelectionAnchor(key)
        setNoteContentDirect(html)
      }
      reader.readAsText(file)
    }
  }, [selectedNote, selectedFolderId, onAddNote, setNoteContentDirect, selection]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ───────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  const matchesShortcut = useCallback((e: KeyboardEvent, id: string, fallback: { ctrl?: boolean; shift?: boolean; key: string }) => {
    const sc = keyboardShortcuts.find(s => s.id === id)
    const keys = sc?.keys ?? fallback
    return (e.ctrlKey || e.metaKey) === !!keys.ctrl && e.shiftKey === !!keys.shift && e.key.toLowerCase() === keys.key.toLowerCase()
  }, [keyboardShortcuts])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, 'notes-new', { ctrl: true, key: 'n' }) && !e.shiftKey) { e.preventDefault(); handleAddNote() }
      if (matchesShortcut(e, 'notes-search', { ctrl: true, key: 'f' })) { e.preventDefault(); setSearchVisible(true); setTimeout(() => searchInputRef.current?.focus(), 50) }
      if (e.key === 'Escape') { setSearchVisible(false); setSearchQuery(''); ctxMenuSlice.setCtxMenu(null); setDeleteConfirm(null); setFolderDeleteConfirm(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleAddNote, matchesShortcut, ctxMenuSlice])

  // Reduce mode
  useEffect(() => {
    if (typeof reduceModeSignal !== 'number') return
    if (reduceModeHandledRef.current === undefined) { reduceModeHandledRef.current = reduceModeSignal; return }
    if (reduceModeSignal <= reduceModeHandledRef.current) return
    reduceModeHandledRef.current = reduceModeSignal
    setReduceLevel(prev => (prev === 2 ? 0 : ((prev + 1) as 0 | 1 | 2)))
  }, [reduceModeSignal])

  useEffect(() => { if (reduceLevel === 0) setSidebarOpen(true) }, [reduceLevel])

  useEffect(() => {
    if (!initialNoteId) return; openNote(initialNoteId); onInitialNoteConsumed?.()
  }, [initialNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subpage creation from editor
  useEffect(() => {
    const handler = (e: Event) => {
      const { parentNoteId } = (e as CustomEvent<{ parentNoteId: string }>).detail
      if (noteMap.get(parentNoteId)?.isLocked) return
      const newNote = onAddNote('Nova nota', selectedNote?.folderId ?? null, null, parentNoteId)
      if (parentNoteId) expansion.setExpandedNotes(prev => new Set([...prev, parentNoteId]))
      document.dispatchEvent(new CustomEvent('notes-subpage-ready', { detail: { noteId: newNote.id, noteTitle: newNote.title || 'Nova nota' } }))
    }
    const openHandler = (e: Event) => { const { noteId } = (e as CustomEvent<{ noteId: string }>).detail; openNote(noteId) }
    document.addEventListener('notes-create-subpage', handler)
    document.addEventListener('notes-open-note', openHandler)
    return () => { document.removeEventListener('notes-create-subpage', handler); document.removeEventListener('notes-open-note', openHandler) }
  }, [onAddNote, openNote, selectedNote, notes, expansion]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    selectedNoteId, setSelectedNoteId,
    selectedFolderId, setSelectedFolderId,
    selectedNote, selectedFolder, selectedNoteLocked,
    expandedFolders: expansion.expandedFolders, setExpandedFolders: expansion.setExpandedFolders,
    expandedNotes: expansion.expandedNotes, setExpandedNotes: expansion.setExpandedNotes,
    sidebarOpen, setSidebarOpen,
    reduceLevel,
    searchQuery, setSearchQuery,
    searchVisible, setSearchVisible,
    searchResults,
    newFolderParentId, setNewFolderParentId,
    newFolderName, setNewFolderName,
    ctxMenu: ctxMenuSlice.ctxMenu, setCtxMenu: ctxMenuSlice.setCtxMenu,
    ctxNote: ctxMenuSlice.ctxNote, ctxFolder: ctxMenuSlice.ctxFolder,
    renamingFolderId, setRenamingFolderId,
    renamingFolderName, setRenamingFolderName,
    deleteConfirm, setDeleteConfirm,
    folderDeleteConfirm, setFolderDeleteConfirm,
    selectedTreeItems: selection.selectedTreeItems,
    dropTargetId: dragDrop.dropTargetId, setDropTargetId: dragDrop.setDropTargetId,
    dragCount: dragDrop.dragCount, dragPayloadRef: dragDrop.dragPayloadRef,
    noteMap, folderMap,
    favorites, pinned, rootFolders, rootNotes,
    childFolders, notesInFolder, subNotes,
    visibleTreeItemKeys,
    noteBreadcrumb, folderBreadcrumb,
    folderDescendantIds, folderNotesWithPath, selectedFolderChildren,
    buildFolderTrailParts,
    searchInputRef, newFolderInputRef, contextMenuRef: ctxMenuSlice.contextMenuRef, markdownImportRef, titleInputRef,
    activeView, goHome, recentNoteIds,
    openNote, openFolder,
    handleAddNote, handleAddFolder,
    toggleFolder: expansion.toggleFolder, toggleNote: expansion.toggleNote,
    openCtxMenu: ctxMenuSlice.openCtxMenu, handleDuplicateNote,
    requestDeleteNote, confirmDeleteNote,
    requestDeleteFolder, confirmDeleteFolder,
    selectSingleTreeItem: selection.selectSingleTreeItem,
    handleTreeRowSelection: selection.handleTreeRowSelection,
    clearSelection: selection.clearSelection,
    toggleTreeItemSelection: selection.toggleTreeItemSelection,
    collapseAll: expansion.collapseAll,
    startTreeDrag: dragDrop.startTreeDrag, handleDragEnd: dragDrop.handleDragEnd,
    handleDropOnFolder: dragDrop.handleDropOnFolder,
    handleDropOnNote: dragDrop.handleDropOnNote,
    handleDropOnRoot: dragDrop.handleDropOnRoot,
    handleMarkdownImport,
    isFolderDescendant: dragDrop.isFolderDescendant,
    isNoteDescendant: dragDrop.isNoteDescendant,
  }
}
