import React from 'react'
import { useNoteContent } from './hooks/useNoteContent'
import { useNotesTree }   from './hooks/useNotesTree'
import { NotesSidebar }   from './NotesSidebar'
import { NoteEditorPane }  from './NoteEditorPane'
import { FolderEditorPane } from './FolderEditorPane'
import { NotesHomePage }  from './NotesHomePage'
import { ContextMenu }    from './ContextMenu'
import { DeleteModals }   from './DeleteModals'
import { NotesTrashView } from './NotesTrashView'
import { NotesOutlinePanel } from './NotesOutlinePanel'
import { useNotesOutline } from './useNotesOutline'
import { NoteAutoSaveIndicator, type AutoSaveStatus } from './NoteAutoSaveIndicator'
import { useNotesLinkIndex } from './useNotesLinkIndex'
import { NotesBacklinksPanel } from './NotesBacklinksPanel'
import { NotesGraphView } from './NotesGraphView'
import { ProjectGraphWorkspace } from './ProjectGraphWorkspace'
import { NotesTreeManagerModal } from './NotesTreeManagerModal'
import type { NotesViewProps } from '@types'
import type { NoteBookmark } from '@types'
import { Button } from '@shared/components/primitives'

export const NotesView = ({
  notes, folders,
  onAddNote, onUpdateNote, onUpdateFolder, onRemoveNote, onAddFolder, onRemoveFolder,
  onReorderNotes: _rn, onReorderFolders: _rf,
  onToggleFavorite, onTogglePinned, onToggleLock,
  reduceModeSignal, initialNoteId, onInitialNoteConsumed, keyboardShortcuts,
  onSoftDeleteNote: _onSoftDeleteNote, onSoftDeleteFolder: _onSoftDeleteFolder, onRestoreNote, onRestoreFolder,
  onPurgeNote, onPurgeFolder, onEmptyTrash,
  onSetNoteBookmarks,
}: NotesViewProps) => {
  const [showTrash, setShowTrash] = React.useState(false)
  const [showOutline, setShowOutline] = React.useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null)
  const autoSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showBacklinks, setShowBacklinks] = React.useState(false)
  const [showGraph, setShowGraph] = React.useState(false)
  const [graphMode, setGraphMode] = React.useState<'notes' | 'projects'>('notes')
  const [isTreeManagerOpen, setIsTreeManagerOpen] = React.useState(false)

  // Notas e pastas excluindo lixeira (visivel na sidebar normal)
  const visibleNotes = React.useMemo(() => notes.filter((n) => !n.deletedAt), [notes])
  const visibleFolders = React.useMemo(() => folders.filter((f) => !f.deletedAt), [folders])
  const trashCount = React.useMemo(
    () => notes.filter((n) => n.deletedAt).length + folders.filter((f) => f.deletedAt).length,
    [notes, folders],
  )

  // Outline keyboard shortcut Ctrl+Shift+O
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setShowOutline(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // 1. Tree hook manages navigation state, drag-drop, context menus, etc.
  //    Content callbacks are injected after content hook is declared below.
  //    We use refs to break the initialization cycle.
  const prepareNewNoteRef      = React.useRef<(id: string) => void>(() => {})
  const setNoteContentDirectRef = React.useRef<(html: string) => void>(() => {})

  const tree = useNotesTree({
    notes: visibleNotes, folders: visibleFolders,
    onAddNote, onUpdateNote, onUpdateFolder, onRemoveNote, onRemoveFolder,
    onToggleFavorite, onTogglePinned,
    reduceModeSignal, initialNoteId, onInitialNoteConsumed, keyboardShortcuts,
    prepareNewNote:       (id)   => prepareNewNoteRef.current(id),
    setNoteContentDirect: (html) => setNoteContentDirectRef.current(html),
  })

  // 2. Content hook receives the selected IDs from the tree hook.
  const content = useNoteContent({
    selectedNoteId:   tree.selectedNoteId,
    selectedFolderId: tree.selectedFolderId,
    notes: visibleNotes, folders: visibleFolders, onUpdateNote, onUpdateFolder,
  })

  // Listener para aplicar texto do assistente diretamente na nota ativa
  React.useEffect(() => {
    const handleApplyNote = (e: Event) => {
      const detail = (e as CustomEvent<{ content: string }>).detail
      if (detail?.content && tree.selectedNoteId) {
        content.setNoteContentDirect(detail.content)
        onUpdateNote(tree.selectedNoteId, { content: detail.content })
      }
    }
    window.addEventListener('organon:apply-note', handleApplyNote)
    return () => window.removeEventListener('organon:apply-note', handleApplyNote)
  }, [tree.selectedNoteId, content, onUpdateNote])

  // Outline da nota atual (parser de headings)
  const outline = useNotesOutline(content.noteContent ?? '')

  // Indice de wiki-links — usa apenas o conteudo da nota corrente carregado
  // (otimizacao: indexar TODAS as notas exigiria carregar todas, custoso).
  // Para o backlinks panel da nota atual + graph view com nomes de titulos.
  const contentByNoteId = React.useMemo<Record<string, string>>(() => {
    const obj: Record<string, string> = {}
    if (tree.selectedNoteId && content.noteContent) {
      obj[tree.selectedNoteId] = content.noteContent
    }
    return obj
  }, [tree.selectedNoteId, content.noteContent])

  const linkIndex = useNotesLinkIndex({ notes: visibleNotes, contentByNoteId })

  // Bookmarks da nota atual
  const currentBookmarks = React.useMemo(
    () => tree.selectedNote?.bookmarks ?? [],
    [tree.selectedNote],
  )

  // Auto-save indicator: marca 'saving' ao mudar conteudo, 'saved' apos 1.5s sem nova mudanca
  React.useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setAutoSaveStatus('saving')
    autoSaveTimerRef.current = setTimeout(() => {
      setLastSavedAt(new Date().toISOString())
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    }, 1500)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [content.noteContent])

  // Bookmark management
  const addBookmark = React.useCallback(() => {
    if (!tree.selectedNote || !onSetNoteBookmarks) return
    const label = window.prompt('Label do bookmark:', 'Ponto importante')
    if (!label) return
    const bm: NoteBookmark = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      anchor: `bm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    onSetNoteBookmarks(tree.selectedNote.id, [...currentBookmarks, bm])
  }, [tree.selectedNote, currentBookmarks, onSetNoteBookmarks])

  const removeBookmark = React.useCallback((bmId: string) => {
    if (!tree.selectedNote || !onSetNoteBookmarks) return
    onSetNoteBookmarks(tree.selectedNote.id, currentBookmarks.filter((b) => b.id !== bmId))
  }, [tree.selectedNote, currentBookmarks, onSetNoteBookmarks])

  const jumpToHeading = React.useCallback((headingId: string) => {
    const editorEl = document.querySelector(`[data-id="${headingId}"], #${headingId}`) as HTMLElement | null
    editorEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // 3. Sync content callbacks into refs so the tree hook can call them.
  prepareNewNoteRef.current       = content.prepareNewNote

  setNoteContentDirectRef.current = content.setNoteContentDirect

  const isSidebarCollapsed = !tree.sidebarOpen || tree.reduceLevel >= 1

  const handleGoHome = React.useCallback(() => {
    setShowTrash(false)
    setShowGraph(false)
    tree.goHome()
  }, [tree])

  return (
    <div className={`projects-shell projects-theme ${isSidebarCollapsed ? ' sidebar-collapsed' : ''}${tree.reduceLevel >= 2 ? ' reduce-level-2' : ''}`} data-debug-name="notes/NotesView">

      <NotesSidebar
        notes={notes}
        folders={folders}
        activeView={tree.activeView}
        onGoHome={handleGoHome}
        selectedNoteId={tree.selectedNoteId}
        selectedFolderId={tree.selectedFolderId}
        selectedTreeItems={tree.selectedTreeItems}
        expandedFolders={tree.expandedFolders}
        expandedNotes={tree.expandedNotes}
        sidebarOpen={tree.sidebarOpen}
        setSidebarOpen={tree.setSidebarOpen}
        searchVisible={tree.searchVisible}
        searchQuery={tree.searchQuery}
        setSearchQuery={tree.setSearchQuery}
        setSearchVisible={tree.setSearchVisible}
        searchResults={tree.searchResults}
        searchInputRef={tree.searchInputRef}
        newFolderParentId={tree.newFolderParentId}
        setNewFolderParentId={tree.setNewFolderParentId}
        newFolderName={tree.newFolderName}
        setNewFolderName={tree.setNewFolderName}
        newFolderInputRef={tree.newFolderInputRef}
        onAddFolder={onAddFolder}
        renamingFolderId={tree.renamingFolderId}
        setRenamingFolderId={tree.setRenamingFolderId}
        renamingFolderName={tree.renamingFolderName}
        setRenamingFolderName={tree.setRenamingFolderName}
        onUpdateFolder={onUpdateFolder}
        dropTargetId={tree.dropTargetId}
        setDropTargetId={tree.setDropTargetId}
        dragCount={tree.dragCount}
        dragPayloadRef={tree.dragPayloadRef}
        favorites={tree.favorites}
        pinned={tree.pinned}
        rootFolders={tree.rootFolders}
        rootNotes={tree.rootNotes}
        childFolders={tree.childFolders}
        notesInFolder={tree.notesInFolder}
        subNotes={tree.subNotes}
        noteMap={tree.noteMap}
        recentNoteIds={tree.recentNoteIds}
        markdownImportRef={tree.markdownImportRef}
        openNote={tree.openNote}
        openFolder={tree.openFolder}
        showTrash={showTrash}
        onOpenTrash={() => setShowTrash(true)}
        trashCount={trashCount}
        onRequestDeleteNote={tree.requestDeleteNote}
        onDuplicateNote={tree.handleDuplicateNote}
        handleAddNote={tree.handleAddNote}
        toggleFolder={tree.toggleFolder}
        toggleNote={tree.toggleNote}
        startTreeDrag={tree.startTreeDrag}
        handleDragEnd={tree.handleDragEnd}
        handleDropOnFolder={tree.handleDropOnFolder}
        handleDropOnNote={tree.handleDropOnNote}
        handleDropOnRoot={tree.handleDropOnRoot}
        handleTreeRowSelection={tree.handleTreeRowSelection}
        selectSingleTreeItem={tree.selectSingleTreeItem}
        toggleTreeItemSelection={tree.toggleTreeItemSelection}
        clearSelection={tree.clearSelection}
        onCollapseAll={tree.collapseAll}
        openCtxMenu={tree.openCtxMenu}
        handleMarkdownImport={tree.handleMarkdownImport}
        isFolderDescendant={tree.isFolderDescendant}
        isNoteDescendant={tree.isNoteDescendant}
      />

      {!isSidebarCollapsed && (
        <div className="notes-sidebar-backdrop" onClick={() => tree.setSidebarOpen(false)} />
      )}

      <div className="projects-content-wrapper" style={{ position: 'relative' }}>
        {/* Quick toolbar integrada no topo do editor pane */}
        {tree.activeView === 'note' && tree.selectedNote && !showTrash && (
          <div className="notes-quick-toolbar" data-debug-name="notes/NotesView.QuickToolbar">
            <button type="button" className={`notes-quick-btn ${showOutline ? 'is-active' : ''}`} onClick={() => setShowOutline((v) => !v)} title="Outline (Ctrl+Shift+O)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
            <button type="button" className={`notes-quick-btn ${showBacklinks ? 'is-active' : ''}`} onClick={() => setShowBacklinks((v) => !v)} title="Backlinks">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </button>
            {onSetNoteBookmarks && (
              <button type="button" className="notes-quick-btn" onClick={addBookmark} title="Bookmark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              </button>
            )}
            <button type="button" className="notes-quick-btn" onClick={() => setShowGraph(true)} title="Graph view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><line x1="8.5" y1="7.5" x2="15.5" y2="16.5" /><line x1="15.5" y1="7.5" x2="8.5" y2="7.5" /></svg>
            </button>
            <NoteAutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} />
          </div>
        )}

        {/* Botoes globais (visiveis mesmo fora de nota) */}
        {(tree.activeView === 'home' || !tree.selectedNote) && (
          <div className="notes-quick-toolbar" data-debug-name="notes/NotesView.QuickToolbar">
            <button type="button" className={`notes-quick-btn ${showTrash ? 'is-active' : ''}`} onClick={() => setShowTrash((v) => !v)} title="Lixeira" data-debug-name="btn" data-debug-id="Lixeira">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              {trashCount > 0 ? `Lixeira (${trashCount})` : 'Lixeira'}
            </button>
          </div>
        )}
        {showTrash ? (
          <NotesTrashView
            notes={notes}
            folders={folders}
            onRestoreNote={(id) => onRestoreNote?.(id)}
            onRestoreFolder={(id) => onRestoreFolder?.(id)}
            onPurgeNote={(id) => onPurgeNote?.(id)}
            onPurgeFolder={(id) => onPurgeFolder?.(id)}
            onEmptyTrash={() => onEmptyTrash?.()}
            onClose={() => setShowTrash(false)}
          />
        ) : tree.activeView === 'home' ? (
          <NotesHomePage
            notes={visibleNotes}
            folders={visibleFolders}
            recentNoteIds={tree.recentNoteIds}
            onOpenNote={tree.openNote}
            onOpenFolder={tree.openFolder}
            onAddNote={() => tree.handleAddNote()}
            onShowSearch={() => { tree.setSearchVisible(true); setTimeout(() => tree.searchInputRef.current?.focus(), 50) }}
            onOpenTrash={() => setShowTrash(true)}
            trashCount={trashCount}
            onOpenTreeManager={() => setIsTreeManagerOpen(true)}
          />
        ) : tree.activeView === 'note' && tree.selectedNote ? (
          <NoteEditorPane
            selectedNote={tree.selectedNote}
            notes={notes}
            noteContent={content.noteContent}
            noteTitle={content.noteTitle}
            setNoteTitle={content.setNoteTitle}
            noteBreadcrumb={tree.noteBreadcrumb}
            subNotes={tree.subNotes}
            titleInputRef={tree.titleInputRef}
            selectedNoteLocked={tree.selectedNoteLocked}
            onContentChange={content.handleContentChange}
            onTitleBlur={content.handleTitleBlur}
            onToggleLock={onToggleLock}
            onToggleFavorite={onToggleFavorite}
            onTogglePinned={onTogglePinned}
            onAddNote={tree.handleAddNote}
            onRequestDelete={tree.requestDeleteNote}
            onOpenNote={tree.openNote}
            onOpenFolder={tree.openFolder}
            onUpdateNote={onUpdateNote}
          />
        ) : tree.activeView === 'folder' && tree.selectedFolder ? (
          <FolderEditorPane
            selectedFolder={tree.selectedFolder}
            folderContent={content.folderContent}
            folderTitle={content.folderTitle}
            setFolderTitle={content.setFolderTitle}
            isFolderLoading={content.isFolderLoading}
            folderBreadcrumb={tree.folderBreadcrumb}
            selectedFolderChildren={tree.selectedFolderChildren}
            folderNotesWithPath={tree.folderNotesWithPath}
            expandedFolders={tree.expandedFolders}
            folderTitleInputRef={content.folderTitleInputRef}
            newFolderInputRef={tree.newFolderInputRef}
            onFolderContentChange={content.handleFolderContentChange}
            onFolderTitleBlur={content.handleFolderTitleBlur}
            onAddNote={tree.handleAddNote}
            onSetNewFolderParentId={tree.setNewFolderParentId}
            onSetExpandedFolders={tree.setExpandedFolders}
            onOpenNote={tree.openNote}
            onOpenFolder={tree.openFolder}
            onUpdateFolder={onUpdateFolder}
            buildFolderTrailParts={tree.buildFolderTrailParts}
            onOpenTreeManager={() => setIsTreeManagerOpen(true)}
          />
        ) : (
          <div className="notes-editor-empty">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.2 }}>
              <path d="M40 8H16a4 4 0 0 0-4 4v40a4 4 0 0 0 4 4h32a4 4 0 0 0 4-4V20L40 8z" />
              <polyline points="40 8 40 20 52 20" />
              <line x1="24" y1="32" x2="40" y2="32" /><line x1="24" y1="40" x2="34" y2="40" />
            </svg>
            <p className="notes-editor-empty-text">Selecione uma nota ou crie uma nova</p>
            <Button variant="primary" onClick={() => tree.handleAddNote()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Nova nota
            </Button>
          </div>
        )}
      </div>

      
      {showOutline && tree.activeView === 'note' && tree.selectedNote && !showTrash && (
        <NotesOutlinePanel
          outline={outline}
          bookmarks={currentBookmarks}
          onJumpToHeading={jumpToHeading}
          onJumpToBookmark={jumpToHeading}
          onRemoveBookmark={removeBookmark}
          onClose={() => setShowOutline(false)}
        />
      )}

      {showBacklinks && tree.activeView === 'note' && !showTrash && (
        <NotesBacklinksPanel
          noteId={tree.selectedNoteId}
          notes={visibleNotes}
          index={linkIndex}
          onOpenNote={(id) => { tree.openNote(id); setShowBacklinks(false) }}
          onClose={() => setShowBacklinks(false)}
        />
      )}

      {showGraph && graphMode === 'notes' && (
        <NotesGraphView
          notes={visibleNotes}
          folders={tree.folders}
          index={linkIndex}
          onOpenNote={(id) => { tree.openNote(id); setShowGraph(false) }}
          onClose={() => setShowGraph(false)}
          onOpenProjects={() => setGraphMode('projects')}
        />
      )}

      {showGraph && graphMode === 'projects' && (
        <ProjectGraphWorkspace
          onClose={() => setShowGraph(false)}
          onOpenNotesGraph={() => setGraphMode('notes')}
        />
      )}

      {isTreeManagerOpen && (
        <NotesTreeManagerModal
          notes={visibleNotes}
          folders={visibleFolders}
          onClose={() => setIsTreeManagerOpen(false)}
          onAddFolder={onAddFolder}
          onUpdateFolder={onUpdateFolder}
          onRemoveFolder={onRemoveFolder}
          onAddNote={onAddNote}
          onUpdateNote={onUpdateNote}
          onRemoveNote={onRemoveNote}
        />
      )}

      <DeleteModals
        deleteConfirm={tree.deleteConfirm}
        folderDeleteConfirm={tree.folderDeleteConfirm}
        onCancelNote={() => tree.setDeleteConfirm(null)}
        onConfirmNote={tree.confirmDeleteNote}
        onCancelFolder={() => tree.setFolderDeleteConfirm(null)}
        onConfirmFolder={tree.confirmDeleteFolder}
      />

      <ContextMenu
        ctxMenu={tree.ctxMenu}
        ctxNote={tree.ctxNote}
        ctxFolder={tree.ctxFolder}
        contextMenuRef={tree.contextMenuRef}
        titleInputRef={tree.titleInputRef}
        setCtxMenu={tree.setCtxMenu}
        setRenamingFolderId={tree.setRenamingFolderId}
        setRenamingFolderName={tree.setRenamingFolderName}
        setNewFolderParentId={tree.setNewFolderParentId}
        setExpandedFolders={tree.setExpandedFolders}
        newFolderInputRef={tree.newFolderInputRef}
        onOpenNote={tree.openNote}
        onOpenFolder={tree.openFolder}
        onToggleLock={onToggleLock}
        onToggleFavorite={onToggleFavorite}
        onTogglePinned={onTogglePinned}
        onUpdateFolder={onUpdateFolder}
        onAddNote={tree.handleAddNote}
        onDuplicateNote={tree.handleDuplicateNote}
        onRequestDeleteNote={tree.requestDeleteNote}
        onRequestDeleteFolder={tree.requestDeleteFolder}
      />
    </div>
  )
}
