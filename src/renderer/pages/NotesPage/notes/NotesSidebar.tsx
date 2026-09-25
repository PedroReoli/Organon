import React, { useState } from 'react'
import {
  FolderTree,
  Folder,
  Star,
  Pin,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  UploadCloud,
  X,
  PanelLeftClose,
  FolderPlus,
  ChevronsDownUp,
} from 'lucide-react'
import type { Note, NoteFolder, TreeItemKey, TreeItemKind } from '@types'
import {
  SectionHeader,
  SidebarNoteItem,
  SidebarFolderItem,
} from './sidebar'

interface NotesSidebarProps {
  notes: Note[]
  folders: NoteFolder[]
  // Home
  activeView: 'home' | 'note' | 'folder'
  onGoHome: () => void
  showTrash?: boolean
  onOpenTrash?: () => void
  trashCount?: number
  onOpenTreeManager?: () => void
  onRequestDeleteNote?: (id: string) => void
  onDuplicateNote?: (id: string) => void
  // Selection
  selectedNoteId: string | null
  selectedFolderId: string | null
  selectedTreeItems: Set<TreeItemKey>
  // Expand
  expandedFolders: Set<string>
  expandedNotes: Set<string>
  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  // Search
  searchVisible: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  setSearchVisible: (v: boolean) => void
  searchResults: Note[]
  searchInputRef: React.RefObject<HTMLInputElement>
  // Recent notes
  recentNoteIds: string[]
  // New folder
  newFolderParentId: string | null | undefined
  setNewFolderParentId: (v: string | null | undefined) => void
  newFolderName: string
  setNewFolderName: (name: string) => void
  newFolderInputRef: React.RefObject<HTMLInputElement>
  onAddFolder: (name: string, parentId?: string | null) => string
  // Rename
  renamingFolderId: string | null
  setRenamingFolderId: (id: string | null) => void
  renamingFolderName: string
  setRenamingFolderName: (name: string) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  // Drag
  dropTargetId: string | null
  setDropTargetId: (id: string | null) => void
  dragCount: number
  dragPayloadRef: React.MutableRefObject<{ noteIds: string[]; folderIds: string[] }>
  // Computed
  favorites: Note[]
  pinned: Note[]
  rootFolders: NoteFolder[]
  rootNotes: Note[]
  childFolders: (parentId: string) => NoteFolder[]
  notesInFolder: (folderId: string) => Note[]
  subNotes: (parentNoteId: string) => Note[]
  noteMap: Map<string, Note>
  markdownImportRef: React.RefObject<HTMLInputElement>
  // Handlers
  openNote: (id: string) => void
  openFolder: (id: string) => void
  handleAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  toggleFolder: (id: string) => void
  toggleNote: (id: string, e: React.MouseEvent) => void
  startTreeDrag: (e: React.DragEvent, kind: TreeItemKind, id: string) => void
  handleDragEnd: () => void
  handleDropOnFolder: (folderId: string) => void
  handleDropOnNote: (note: Note) => void
  handleDropOnRoot: () => void
  handleTreeRowSelection: (key: TreeItemKey, e: React.MouseEvent) => boolean
  selectSingleTreeItem: (key: TreeItemKey) => void
  toggleTreeItemSelection: (key: TreeItemKey) => void
  clearSelection: () => void
  onCollapseAll: () => void
  openCtxMenu: (e: React.MouseEvent, target: { kind: 'note'; id: string } | { kind: 'folder'; id: string }) => void
  handleMarkdownImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  isFolderDescendant: (candidateId: string, ancestorId: string) => boolean
  isNoteDescendant: (candidateId: string, ancestorId: string) => boolean
}

export const NotesSidebar: React.FC<NotesSidebarProps> = (props) => {
  const {
    notes = [],
    folders = [],
    activeView,
    onGoHome,
    onOpenTrash,
    trashCount = 0,
    onOpenTreeManager,
    onDuplicateNote,
    selectedNoteId,
    selectedFolderId,
    selectedTreeItems,
    expandedFolders,
    expandedNotes,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchInputRef,
    newFolderParentId,
    setNewFolderParentId,
    newFolderName,
    setNewFolderName,
    newFolderInputRef,
    onAddFolder,
    renamingFolderId,
    setRenamingFolderId,
    renamingFolderName,
    setRenamingFolderName,
    onUpdateFolder,
    dropTargetId,
    setDropTargetId,
    dragCount,
    dragPayloadRef,
    favorites,
    pinned,
    rootFolders,
    rootNotes,
    childFolders,
    notesInFolder,
    subNotes,
    noteMap,
    markdownImportRef,
    openNote,
    openFolder,
    handleAddNote,
    toggleFolder,
    toggleNote,
    startTreeDrag,
    handleDragEnd,
    handleDropOnFolder,
    handleDropOnNote,
    handleDropOnRoot,
    handleTreeRowSelection,
    selectSingleTreeItem,
    onCollapseAll,
    openCtxMenu,
    handleMarkdownImport,
    isFolderDescendant,
    isNoteDescendant,
  } = props

  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false)
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false)
  const [privateCollapsed, setPrivateCollapsed] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'pinned'>('all')

  // Resizable sidebar width (default 310px, stored in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('organon_notes_sidebar_width')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 550) return parsed
      }
    } catch {}
    return 310
  })
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    setIsResizing(true)

    const startX = mouseDownEvent.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(550, startWidth + (moveEvent.clientX - startX)))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setSidebarWidth(current => {
        try {
          localStorage.setItem('organon_notes_sidebar_width', current.toString())
        } catch {}
        return current
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    onAddFolder(name, newFolderParentId ?? null)
    setNewFolderName('')
    setNewFolderParentId(undefined)
  }

  const noteItemSharedProps = {
    subNotes,
    expandedNotes,
    selectedNoteId,
    selectedTreeItems,
    dropTargetId,
    dragPayloadRef,
    isNoteDescendant,
    startTreeDrag,
    handleDragEnd,
    setDropTargetId,
    handleDropOnNote,
    handleTreeRowSelection,
    selectSingleTreeItem,
    openNote,
    openCtxMenu,
    toggleNote,
    handleAddNote,
    onDuplicateNote,
  }

  const folderItemSharedProps = {
    childFolders,
    notesInFolder,
    subNotes,
    expandedFolders,
    expandedNotes,
    selectedFolderId,
    selectedNoteId,
    selectedTreeItems,
    dropTargetId,
    renamingFolderId,
    renamingFolderName,
    newFolderParentId,
    newFolderName,
    newFolderInputRef,
    dragPayloadRef,
    noteMap,
    isFolderDescendant,
    isNoteDescendant,
    startTreeDrag,
    handleDragEnd,
    setDropTargetId,
    handleDropOnFolder,
    handleDropOnNote,
    handleTreeRowSelection,
    selectSingleTreeItem,
    toggleFolder,
    openFolder,
    openNote,
    openCtxMenu,
    toggleNote,
    setNewFolderParentId,
    setNewFolderName,
    setRenamingFolderName,
    setRenamingFolderId,
    onUpdateFolder,
    handleAddFolder,
    handleAddNote,
    onDuplicateNote,
  }

  const isSidebarCollapsed = !sidebarOpen

  return (
    <nav
      style={{
        width: sidebarOpen ? `${sidebarWidth}px` : '0px',
        background: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-background))',
        borderColor: 'var(--color-border)',
      }}
      className={`h-full border-r flex flex-col justify-between select-none relative ${
        isResizing ? '' : 'transition-[width] duration-200'
      } overflow-hidden ${
        isSidebarCollapsed ? 'w-0 border-none' : ''
      }`}
    >
      {/* Resizer Handle */}
      {sidebarOpen && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={() => {
            setSidebarWidth(310)
            localStorage.setItem('organon_notes_sidebar_width', '310')
          }}
          title="Arraste para ajustar a largura da barra lateral (clique duplo para redefinir para 310px)"
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--color-primary)]/40 transition-colors z-30 group/resizer flex items-center justify-center"
        >
          <div className="w-[2px] h-8 bg-white/10 group-hover/resizer:bg-[var(--color-primary)] group-hover/resizer:h-16 rounded-full transition-all" />
        </div>
      )}
      {/* Top Header & Search */}
      <div className="p-2.5 border-b border-neutral-800/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-1">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              style={{
                background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              className="w-full pl-8 pr-6 py-1.5 rounded-lg border text-xs outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

            {/* Quick actions top icons */}
          <div className="flex items-center gap-0.5 text-[var(--color-text-muted)] shrink-0">
            <button
              type="button"
              onClick={() => handleAddNote()}
              title="Nova nota rápida (Ctrl+N)"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </button>
            <button
              type="button"
              onClick={() => setNewFolderParentId(null)}
              title="Nova pasta"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              title="Recolher todas as pastas"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Recolher barra lateral"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              background: activeFilter === 'all' ? 'var(--color-primary, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === 'all' ? '#fff' : 'var(--color-text-muted)',
              borderColor: activeFilter === 'all' ? 'transparent' : 'var(--color-border)',
            }}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all cursor-pointer"
          >
            Todas ({notes.filter(n => !n.isDeleted).length})
          </button>
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'favorites' ? 'all' : 'favorites')}
              style={{
                background: activeFilter === 'favorites' ? '#eab308' : 'rgba(255, 255, 255, 0.05)',
                color: activeFilter === 'favorites' ? '#000' : '#eab308',
                borderColor: activeFilter === 'favorites' ? 'transparent' : 'rgba(234, 179, 8, 0.2)',
              }}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1"
            >
              <Star className="w-2.5 h-2.5 fill-current" /> Favoritas ({favorites.length})
            </button>
          )}
          {pinned.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'pinned' ? 'all' : 'pinned')}
              style={{
                background: activeFilter === 'pinned' ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                color: activeFilter === 'pinned' ? '#fff' : '#60a5fa',
                borderColor: activeFilter === 'pinned' ? 'transparent' : 'rgba(59, 130, 246, 0.2)',
              }}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1"
            >
              <Pin className="w-2.5 h-2.5" /> Fixadas ({pinned.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Tree Body */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2 space-y-2 relative"
        onDragOver={e => {
          e.preventDefault()
          if (!dropTargetId) setDropTargetId('root-zone')
        }}
        onDragLeave={e => {
          if (e.target === e.currentTarget && dropTargetId === 'root-zone') {
            setDropTargetId(null)
          }
        }}
        onDrop={e => {
          e.preventDefault()
          handleDropOnRoot()
        }}
      >
        {/* Zona de Drop na Raiz */}
        {(dragCount > 0 || dropTargetId === 'root-zone') && (
          <div
            onDragOver={e => {
              e.preventDefault()
              e.stopPropagation()
              setDropTargetId('root-zone')
            }}
            onDragLeave={e => {
              e.stopPropagation()
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
            }}
            onDrop={e => {
              e.preventDefault()
              e.stopPropagation()
              handleDropOnRoot()
            }}
            style={{
              borderColor:
                dropTargetId === 'root-zone'
                  ? 'var(--color-primary)'
                  : 'color-mix(in srgb, var(--color-primary) 50%, transparent)',
              background:
                dropTargetId === 'root-zone'
                  ? 'color-mix(in srgb, var(--color-primary) 22%, transparent)'
                  : 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
              boxShadow:
                dropTargetId === 'root-zone'
                  ? '0 0 14px color-mix(in srgb, var(--color-primary) 50%, transparent)'
                  : 'none',
            }}
            className="p-2.5 my-1.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer select-none animate-pulse"
          >
            <FolderTree className="w-4 h-4 text-[var(--color-primary)]" />
            <span style={{ color: 'var(--color-text)' }}>
              {dropTargetId === 'root-zone'
                ? '⚡ Soltar para mover para a RAIZ!'
                : '📥 Solte aqui para colocar FORA de pastas (Raiz)'}
            </span>
          </div>
        )}

        {/* Hubs / Visão Geral Button */}
        <button
          type="button"
          onClick={onGoHome}
          style={{
            background:
              activeView === 'home'
                ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                : 'transparent',
            borderColor:
              activeView === 'home'
                ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
                : 'transparent',
            color: activeView === 'home' ? 'var(--color-primary)' : 'var(--color-text)',
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer hover:bg-white/[0.04]"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <span>Visão Geral</span>
        </button>

        {searchQuery.trim() ? (
          <div className="space-y-1 mt-2">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] px-2 uppercase">
              Resultados da Busca
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(n => (
                <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
              ))
            ) : (
              <div className="text-xs text-[var(--color-text-muted)] text-center py-4">
                Nenhuma nota encontrada.
              </div>
            )}
          </div>
        ) : (
          <>
            {/* MODO FILTRO: FAVORITAS */}
            {activeFilter === 'favorites' && (
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-amber-400 px-2 py-1 uppercase flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-amber-400" />
                  Notas Favoritas ({favorites.length})
                </div>
                {favorites.length > 0 ? (
                  favorites.map(n => (
                    <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
                  ))
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] text-center py-6">
                    Nenhuma nota marcada como favorita.
                  </div>
                )}
              </div>
            )}

            {/* MODO FILTRO: FIXADAS */}
            {activeFilter === 'pinned' && (
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-blue-400 px-2 py-1 uppercase flex items-center gap-1.5">
                  <Pin className="w-3 h-3 text-blue-400" />
                  Notas Fixadas ({pinned.length})
                </div>
                {pinned.length > 0 ? (
                  pinned.map(n => (
                    <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
                  ))
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] text-center py-6">
                    Nenhuma nota fixada no topo.
                  </div>
                )}
              </div>
            )}

            {/* MODO COMPLETO (TODAS AS NOTAS E PASTAS) */}
            {activeFilter === 'all' && (
              <>
                {/* FAVORITAS */}
                {favorites.length > 0 && (
                  <div className="space-y-0.5">
                    <SectionHeader
                      label="Favoritas"
                      icon={<Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      count={favorites.length}
                      isCollapsed={favoritesCollapsed}
                      onToggle={() => setFavoritesCollapsed(v => !v)}
                    />
                    {!favoritesCollapsed && (
                      <div className="space-y-0.5">
                        {favorites.map(n => (
                          <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* FIXADAS */}
                {pinned.length > 0 && (
                  <div className="space-y-0.5">
                    <SectionHeader
                      label="Fixadas"
                      icon={<Pin className="w-3 h-3 text-emerald-400" />}
                      count={pinned.length}
                      isCollapsed={pinnedCollapsed}
                      onToggle={() => setPinnedCollapsed(v => !v)}
                    />
                    {!pinnedCollapsed && (
                      <div className="space-y-0.5">
                        {pinned.map(n => (
                          <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MAIN FOLDERS & NOTES */}
                <div className="space-y-0.5 pt-1">
                  <SectionHeader
                    label={dragCount > 0 ? `Mover ${dragCount} para Raiz` : 'Minhas Pastas'}
                    icon={<Folder className="w-3 h-3 text-[var(--color-primary)]" />}
                    count={rootFolders.length + rootNotes.length}
                    isCollapsed={privateCollapsed}
                    isDropTarget={dropTargetId === 'root-zone'}
                    onToggle={() => setPrivateCollapsed(v => !v)}
                    onDragOver={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDropTargetId('root-zone')
                    }}
                    onDragLeave={e => {
                      e.stopPropagation()
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDropOnRoot()
                    }}
                  />

                  {!privateCollapsed && (
                    <div className="space-y-0.5">
                      {rootFolders.map(f => (
                        <SidebarFolderItem key={f.id} folder={f} depth={0} {...folderItemSharedProps} />
                      ))}
                      {rootNotes.map(n => (
                        <SidebarNoteItem key={n.id} note={n} depth={0} {...noteItemSharedProps} />
                      ))}

                      {/* Inline New Root Folder creation */}
                      {newFolderParentId === null && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 my-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-background)]">
                          <FolderPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <input
                            ref={newFolderInputRef}
                            className="bg-transparent text-xs text-[var(--color-text)] flex-1 outline-none font-medium"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddFolder()
                              if (e.key === 'Escape') {
                                setNewFolderParentId(undefined)
                                setNewFolderName('')
                              }
                            }}
                            onBlur={() => {
                              if (newFolderName.trim()) handleAddFolder()
                              else {
                                setNewFolderParentId(undefined)
                                setNewFolderName('')
                              }
                            }}
                            placeholder="Nome da pasta..."
                          />
                        </div>
                      )}

                      {rootFolders.length === 0 && rootNotes.length === 0 && (
                        <div className="text-xs text-[var(--color-text-muted)] text-center py-6">
                          Nenhuma pasta criada.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Quick Controls */}
      <div className="p-2.5 border-t border-neutral-800/60 space-y-1.5 shrink-0 bg-[var(--color-surface)]">
        {/* Nova Nota Primary Pill */}
        <button
          type="button"
          onClick={() => handleAddNote()}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text, #ffffff)',
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nova Nota</span>
        </button>

        {/* Compact Tool Row */}
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={() => {
              setNewFolderParentId(null)
              setTimeout(() => newFolderInputRef.current?.focus(), 50)
            }}
            title="Criar nova pasta raiz"
            className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-[9px]">Pasta</span>
          </button>

          {onOpenTreeManager && (
            <button
              type="button"
              onClick={onOpenTreeManager}
              title="Gerenciar estrutura de pastas"
              className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[9px]">Estrutura</span>
            </button>
          )}

          {onOpenTrash && (
            <button
              type="button"
              onClick={onOpenTrash}
              title="Abrir Lixeira"
              style={{
                color: trashCount > 0 ? '#f43f5e' : undefined,
                borderColor: trashCount > 0 ? 'rgba(244, 63, 94, 0.3)' : undefined,
              }}
              className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-rose-400 hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[9px]">{trashCount > 0 ? `Lixo (${trashCount})` : 'Lixeira'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => markdownImportRef.current?.click()}
            title="Importar arquivos .md"
            className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px]">Importar</span>
          </button>
        </div>

        <input
          ref={markdownImportRef}
          type="file"
          accept=".md,.markdown"
          style={{ display: 'none' }}
          multiple
          onChange={handleMarkdownImport}
        />
      </div>
    </nav>
  )
}
