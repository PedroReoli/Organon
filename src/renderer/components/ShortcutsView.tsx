import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ShortcutFolder, ShortcutItem } from '../types'
import { detectUrlEmbed, getFaviconUrl, getShortcutTitleFromUrl, openExternalLink } from '../utils'
import { getBuiltinShortcutIcon } from './shortcutIconLibrary'
import { ShortcutEditModal } from './ShortcutEditModal'

interface ShortcutsViewProps {
  folders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  onAddFolder: (name: string, parentId?: string | null) => void
  onRenameFolder: (id: string, name: string) => void
  onRemoveFolder: (id: string) => void
  onAddShortcut: (input: { title: string; value: string; folderId: string | null }) => void
  onUpdateShortcut: (id: string, updates: Partial<Pick<ShortcutItem, 'title' | 'value' | 'icon'>>) => void
  onMoveShortcut: (shortcutId: string, folderId: string | null) => void
  onReorderShortcuts: (folderId: string | null, orderedIds: string[]) => void
  onRemoveShortcut: (id: string) => void
  onReorderFolders: (orderedIds: string[]) => void
  onMoveFolderToParent: (folderId: string, newParentId: string | null) => void
  onRemoveShortcuts: (ids: string[]) => void
  onMoveShortcuts: (ids: string[], folderId: string | null) => void
}

/* ========== Sub-components ========== */

const DroppableFolderButton = ({
  droppableId, className, onClick, onDoubleClick, children, title,
}: {
  droppableId: string; className: string; onClick: () => void
  onDoubleClick?: () => void; children: ReactNode; title?: string
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  return (
    <button
      ref={setNodeRef}
      className={`${className} ${isOver ? 'drag-over' : ''}`}
      onClick={onClick}
      onDoubleClick={(e) => { e.preventDefault(); onDoubleClick?.() }}
      title={title}
    >
      {children}
    </button>
  )
}

const SortableFolderRow = ({ id, children }: { id: string; children: ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

const ShortcutCard = ({
  shortcut, onRemove, viewMode,
}: {
  shortcut: ShortcutItem; onRemove: () => void; viewMode: 'grid' | 'list'
}) => {
  const faviconUrl = getFaviconUrl(shortcut.value)
  const customIcon = shortcut.icon
  const builtinNode = customIcon?.kind === 'builtin' ? getBuiltinShortcutIcon(customIcon.value) : null
  const [showFallback, setShowFallback] = useState(true)
  const embed = useMemo(() => detectUrlEmbed(shortcut.value), [shortcut.value])

  return (
    <div className="shortcut-card">
      <div className="shortcut-card-row">
        <div className="shortcut-favicon" aria-hidden="true">
          {customIcon?.kind === 'emoji' ? (
            <span className="shortcut-emoji">{customIcon.value}</span>
          ) : builtinNode ? (
            <span className="shortcut-builtin" aria-hidden="true">{builtinNode}</span>
          ) : faviconUrl && (
            <img
              src={faviconUrl} alt="" loading="lazy"
              onLoad={() => setShowFallback(false)}
              onError={(e) => { e.currentTarget.style.display = 'none'; setShowFallback(true) }}
            />
          )}
          {(!customIcon && (!faviconUrl || showFallback)) && (
            <span className="shortcut-favicon-fallback" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
                <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
              </svg>
            </span>
          )}
        </div>
        <div className="shortcut-card-info">
          <div className="shortcut-card-title">{shortcut.title}</div>
          <div className="shortcut-card-url" title={shortcut.value}>{shortcut.value}</div>
        </div>
        <div className="shortcut-card-actions">
          <button
            className="shortcut-icon-btn shortcut-icon-btn-sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); openExternalLink(shortcut.value) }}
            title="Abrir"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          <button
            className="shortcut-icon-btn shortcut-icon-btn-sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="Remover"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4h10" />
              <path d="M6 4v8M10 4v8" />
              <path d="M5 4l1-2h4l1 2" />
              <path d="M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4" />
            </svg>
          </button>
        </div>
      </div>
      {embed && embed.type === 'youtube' && viewMode === 'grid' && (
        <div
          className="shortcut-embed-preview"
          onClick={(e) => { e.stopPropagation(); openExternalLink(shortcut.value) }}
        >
          <img src={embed.thumbnailUrl} alt="" loading="lazy" className="shortcut-embed-thumb" />
          <div className="shortcut-embed-play" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
    </div>
  )
}

const SortableShortcutCard = ({
  shortcut, onRemove, viewMode,
}: {
  shortcut: ShortcutItem; onRemove: () => void; viewMode: 'grid' | 'list'
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shortcut.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ShortcutCard shortcut={shortcut} onRemove={onRemove} viewMode={viewMode} />
    </div>
  )
}

/* ========== Main Component ========== */

export const ShortcutsView = ({
  folders, shortcuts,
  onAddFolder, onRenameFolder, onRemoveFolder,
  onAddShortcut, onUpdateShortcut, onMoveShortcut, onReorderShortcuts, onRemoveShortcut,
  onReorderFolders, onMoveFolderToParent, onRemoveShortcuts, onMoveShortcuts,
}: ShortcutsViewProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all')
  const [folderName, setFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Record<string, boolean>>({})

  const [shortcutValue, setShortcutValue] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [shortcutFolderId, setShortcutFolderId] = useState<string | null>(null)
  const [selectedShortcutIds, setSelectedShortcutIds] = useState<string[]>([])
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [editModalIds, setEditModalIds] = useState<string[] | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.order - b.order),
    [folders]
  )

  const folderRows = useMemo(() => {
    const byParent = new Map<string | null, ShortcutFolder[]>()
    for (const folder of sortedFolders) {
      const parentId = folder.parentId ?? null
      const existing = byParent.get(parentId) ?? []
      existing.push(folder)
      byParent.set(parentId, existing)
    }
    for (const [, list] of byParent) {
      list.sort((a, b) => a.order - b.order)
    }
    const rows: Array<{ folder: ShortcutFolder; depth: number }> = []
    const walk = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) ?? []
      for (const folder of children) {
        rows.push({ folder, depth })
        if (!collapsedFolderIds[folder.id]) walk(folder.id, depth + 1)
      }
    }
    walk(null, 0)
    return rows
  }, [sortedFolders, collapsedFolderIds])

  // Contagem recursiva de shortcuts por pasta
  const getRecursiveCount = useMemo(() => {
    const childrenMap = new Map<string | null, string[]>()
    for (const f of sortedFolders) {
      const parent = f.parentId ?? null
      const existing = childrenMap.get(parent) ?? []
      existing.push(f.id)
      childrenMap.set(parent, existing)
    }
    const cache = new Map<string, number>()
    const count = (folderId: string): number => {
      if (cache.has(folderId)) return cache.get(folderId)!
      let total = shortcuts.filter(s => s.folderId === folderId).length
      for (const subId of (childrenMap.get(folderId) ?? [])) total += count(subId)
      cache.set(folderId, total)
      return total
    }
    return count
  }, [sortedFolders, shortcuts])

  const sortedShortcuts = useMemo(
    () => [...shortcuts].sort((a, b) => a.order - b.order),
    [shortcuts]
  )

  const visibleShortcuts = useMemo(() => {
    if (selectedFolderId === 'all') return sortedShortcuts
    if (selectedFolderId === 'none') return sortedShortcuts.filter(s => !s.folderId)
    return sortedShortcuts.filter(s => s.folderId === selectedFolderId)
  }, [selectedFolderId, sortedShortcuts])

  const [activeShortcut, setActiveShortcut] = useState<ShortcutItem | null>(null)
  const [activeDragFolder, setActiveDragFolder] = useState<ShortcutFolder | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    if (id.startsWith('dragfolder:')) {
      const folderId = id.slice('dragfolder:'.length)
      setActiveDragFolder(folders.find(f => f.id === folderId) ?? null)
      return
    }
    const shortcut = shortcuts.find(s => s.id === id)
    setActiveShortcut(shortcut ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveShortcut(null)
    setActiveDragFolder(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Folder drag
    if (activeId.startsWith('dragfolder:')) {
      const folderId = activeId.slice('dragfolder:'.length)
      if (overId.startsWith('folder:')) {
        const raw = overId.slice('folder:'.length)
        const parentId = raw === 'none' ? null : raw
        if (parentId !== folderId) onMoveFolderToParent(folderId, parentId)
      } else if (overId.startsWith('dragfolder:')) {
        const overFolderId = overId.slice('dragfolder:'.length)
        if (folderId === overFolderId) return
        const draggedFolder = folders.find(f => f.id === folderId)
        const overFolder = folders.find(f => f.id === overFolderId)
        if (draggedFolder && overFolder && draggedFolder.parentId === overFolder.parentId) {
          const siblingIds = folderRows
            .filter(r => r.folder.parentId === draggedFolder.parentId)
            .map(r => r.folder.id)
          const oldIdx = siblingIds.indexOf(folderId)
          const newIdx = siblingIds.indexOf(overFolderId)
          if (oldIdx !== -1 && newIdx !== -1) {
            onReorderFolders(arrayMove(siblingIds, oldIdx, newIdx))
          }
        } else if (overFolder) {
          onMoveFolderToParent(folderId, overFolder.parentId)
        }
      }
      return
    }

    // Shortcut drag → folder
    if (overId.startsWith('folder:')) {
      const raw = overId.slice('folder:'.length)
      const folderId = raw === 'none' ? null : raw
      onMoveShortcut(activeId, folderId)
      return
    }

    // Shortcut reorder
    if (selectedFolderId === 'all') return
    if (activeId === overId) return
    const oldIndex = visibleShortcuts.findIndex(s => s.id === activeId)
    const newIndex = visibleShortcuts.findIndex(s => s.id === overId)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(visibleShortcuts, oldIndex, newIndex)
    const folderId = selectedFolderId === 'none' ? null : selectedFolderId
    onReorderShortcuts(folderId, reordered.map(s => s.id))
  }

  // Selection
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey

    if (shift && lastClickedId) {
      const ids = visibleShortcuts.map(s => s.id)
      const startIdx = ids.indexOf(lastClickedId)
      const endIdx = ids.indexOf(id)
      if (startIdx !== -1 && endIdx !== -1) {
        const low = Math.min(startIdx, endIdx)
        const high = Math.max(startIdx, endIdx)
        const rangeIds = ids.slice(low, high + 1)
        setSelectedShortcutIds(ctrl ? Array.from(new Set([...selectedShortcutIds, ...rangeIds])) : rangeIds)
        return
      }
    }

    setLastClickedId(id)
    setSelectedShortcutIds(prev => {
      if (ctrl) {
        if (prev.includes(id)) return prev.filter(x => x !== id)
        return [...prev, id]
      }
      return [id]
    })
  }

  const openEditModalFor = (ids: string[]) => { if (ids.length > 0) setEditModalIds(ids) }

  useEffect(() => {
    if (selectedFolderId === 'all' || selectedFolderId === 'none') { setShortcutFolderId(null); return }
    setShortcutFolderId(selectedFolderId)
  }, [selectedFolderId])

  useEffect(() => {
    if (!sortedFolders.find(f => f.id === selectedFolderId) && selectedFolderId !== 'all' && selectedFolderId !== 'none') {
      setSelectedFolderId('all')
    }
  }, [sortedFolders, selectedFolderId])

  const handleAddFolder = () => {
    if (!folderName.trim()) return
    const parentId = selectedFolderId !== 'all' && selectedFolderId !== 'none' ? selectedFolderId : null
    onAddFolder(folderName, parentId)
    setFolderName('')
  }

  const startEditFolder = (folder: ShortcutFolder) => { setEditingFolderId(folder.id); setEditingFolderName(folder.name) }
  const cancelEditFolder = () => { setEditingFolderId(null); setEditingFolderName('') }
  const handleEditFolderSave = () => {
    if (!editingFolderId || !editingFolderName.trim()) return
    onRenameFolder(editingFolderId, editingFolderName)
    cancelEditFolder()
  }

  const handleRemoveFolder = (folderId: string) => {
    onRemoveFolder(folderId)
    if (selectedFolderId === folderId) setSelectedFolderId('all')
  }

  const handleAddShortcut = () => {
    if (!shortcutValue.trim()) return
    const autoTitle = getShortcutTitleFromUrl(shortcutValue)
    if (!autoTitle) return
    onAddShortcut({ title: autoTitle, value: shortcutValue, folderId: shortcutFolderId })
    setShortcutValue('')
  }

  const bulkUrls = useMemo(() => {
    const raw = bulkValue.trim()
    if (!raw) return []
    const matches = raw.match(/https?:\/\/\S+/g) ?? []
    return Array.from(new Set(matches.map(m => m.trim().replace(/[),.;\]]+$/g, '')).filter(Boolean)))
  }, [bulkValue])

  const handleAddShortcutsBulk = () => {
    if (bulkUrls.length === 0) return
    for (const url of bulkUrls) {
      const autoTitle = getShortcutTitleFromUrl(url)
      if (!autoTitle) continue
      onAddShortcut({ title: autoTitle, value: url, folderId: shortcutFolderId })
    }
    setBulkValue('')
  }

  const folderIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    </svg>
  )
  const chevronRight = (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4l4 4-4 4" /></svg>
  )
  const chevronDown = (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4" /></svg>
  )

  const folderDragIds = folderRows.map(r => `dragfolder:${r.folder.id}`)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="shortcuts-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className="shortcut-folders">
          <header className="shortcut-folders-header">
            <h2>Pastas</h2>
            <span className="shortcut-count">{sortedFolders.length}</span>
          </header>

          <div className="shortcut-folders-add">
            <div className="shortcut-input-wrapper">
              <input
                type="text" value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                placeholder="Nova pasta..." className="shortcut-input"
              />
              <button onClick={handleAddFolder} disabled={!folderName.trim()} className="shortcut-add-btn" title="Criar pasta">+</button>
            </div>
          </div>

          <div className="shortcut-folder-list">
            {/* Fixed items: Todos + Sem pasta */}
            <div className={`shortcut-tree-row ${selectedFolderId === 'all' ? 'is-active' : ''}`}>
              <button className="shortcut-tree-item" onClick={() => setSelectedFolderId('all')}>
                <span className="shortcut-tree-item-label">
                  <span style={{ width: 14 }} />
                  <span className="shortcut-folder-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="12" height="12" rx="2" />
                      <path d="M5 8h6M8 5v6" />
                    </svg>
                  </span>
                  <span>Todos</span>
                </span>
                <span className="shortcut-folder-count">{shortcuts.length}</span>
              </button>
            </div>
            <div className={`shortcut-tree-row ${selectedFolderId === 'none' ? 'is-active' : ''}`}>
              <DroppableFolderButton
                droppableId="folder:none"
                className="shortcut-tree-item"
                onClick={() => setSelectedFolderId('none')}
                title="Atalhos sem pasta (arraste para remover da pasta)"
              >
                <span className="shortcut-tree-item-label">
                  <span style={{ width: 14 }} />
                  <span className="shortcut-folder-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4l8 8" />
                      <rect x="2" y="2" width="12" height="12" rx="2" />
                    </svg>
                  </span>
                  <span>Sem pasta</span>
                </span>
                <span className="shortcut-folder-count">{shortcuts.filter(s => !s.folderId).length}</span>
              </DroppableFolderButton>
            </div>
            <div className="shortcut-tree-separator" />

            {/* Draggable folder tree */}
            <SortableContext items={folderDragIds} strategy={verticalListSortingStrategy}>
              {folderRows.map(({ folder, depth }) => {
                const isEditing = editingFolderId === folder.id
                const isCollapsed = collapsedFolderIds[folder.id]
                const hasChildren = sortedFolders.some(f => f.parentId === folder.id)

                if (isEditing) {
                  return (
                    <div key={folder.id} className="shortcut-tree-edit" style={{ paddingLeft: `${8 + depth * 18}px` }}>
                      <input
                        type="text" value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditFolderSave(); if (e.key === 'Escape') cancelEditFolder() }}
                        className="shortcut-input" autoFocus
                      />
                      <div className="shortcut-tree-edit-actions">
                        <button className="shortcut-icon-btn" onClick={handleEditFolderSave} title="Salvar">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 8 6 12 14 4" /></svg>
                        </button>
                        <button className="shortcut-icon-btn" onClick={cancelEditFolder} title="Cancelar">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <SortableFolderRow key={folder.id} id={`dragfolder:${folder.id}`}>
                    <div
                      className={`shortcut-tree-row ${selectedFolderId === folder.id ? 'is-active' : ''}`}
                      style={{ paddingLeft: `${8 + depth * 18}px` }}
                    >
                      <DroppableFolderButton
                        droppableId={`folder:${folder.id}`}
                        className="shortcut-tree-item"
                        onClick={() => setSelectedFolderId(folder.id)}
                        onDoubleClick={() => setCollapsedFolderIds(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                      >
                        <span className="shortcut-tree-item-label">
                          <span
                            className="shortcut-tree-chevron" aria-hidden="true"
                            onClick={(e) => { e.stopPropagation(); setCollapsedFolderIds(prev => ({ ...prev, [folder.id]: !prev[folder.id] })) }}
                          >
                            {hasChildren ? (isCollapsed ? chevronRight : chevronDown) : <span style={{ width: 10 }} />}
                          </span>
                          <span className="shortcut-folder-icon" aria-hidden="true">{folderIcon}</span>
                          <span>{folder.name}</span>
                        </span>
                        <span className="shortcut-folder-count">{getRecursiveCount(folder.id)}</span>
                      </DroppableFolderButton>
                      <div className="shortcut-tree-row-actions">
                        <button className="shortcut-icon-btn shortcut-icon-btn-sm" onClick={() => startEditFolder(folder)} title="Renomear">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 12.5V14h1.5l8.4-8.4-1.5-1.5L2 12.5Z" /><path d="M9.8 3.7l1.5 1.5" />
                          </svg>
                        </button>
                        <button className="shortcut-icon-btn shortcut-icon-btn-sm" onClick={() => handleRemoveFolder(folder.id)} title="Excluir">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        </button>
                      </div>
                    </div>
                  </SortableFolderRow>
                )
              })}
            </SortableContext>
          </div>
        </aside>

        {/* ===== CONTENT ===== */}
        <section className="shortcuts-content">
          <header className="shortcuts-header">
            <div className="shortcuts-header-row">
              <div>
                <h2>Atalhos</h2>
                <p>Salve links de navegador. O titulo e reconhecido automaticamente.</p>
              </div>
              <div className="shortcut-view-toggle">
                <button
                  className={`shortcut-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')} title="Grade"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                </button>
                <button
                  className={`shortcut-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')} title="Lista"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 4h10M3 8h10M3 12h10" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <div className="shortcut-form">
            <div className="shortcut-form-mode">
              <button type="button" className={`shortcut-mode-btn ${addMode === 'single' ? 'is-active' : ''}`} onClick={() => setAddMode('single')}>1 link</button>
              <button type="button" className={`shortcut-mode-btn ${addMode === 'bulk' ? 'is-active' : ''}`} onClick={() => setAddMode('bulk')}>Em lote</button>
            </div>

            <div className="shortcut-form-row">
              {addMode === 'single' ? (
                <div className="shortcut-form-field stretch">
                  <label className="form-label">Link</label>
                  <input
                    type="text" value={shortcutValue}
                    onChange={(e) => setShortcutValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddShortcut()}
                    placeholder="https://exemplo.com" className="form-input"
                  />
                  <span className="shortcut-auto-title">
                    {shortcutValue.trim() ? `Titulo: ${getShortcutTitleFromUrl(shortcutValue)}` : 'Titulo: (automatico)'}
                  </span>
                </div>
              ) : (
                <div className="shortcut-form-field stretch">
                  <label className="form-label">Links (um por linha)</label>
                  <textarea
                    value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}
                    placeholder={'Cole varios links aqui, um por linha...\nhttps://exemplo.com\nhttps://outro.com'}
                    className="form-input shortcut-bulk-textarea" rows={5}
                  />
                  <span className="shortcut-auto-title">
                    {bulkUrls.length > 0 ? `${bulkUrls.length} link(s) detectado(s).` : 'Cole links em linhas separadas.'}
                  </span>
                </div>
              )}
              <div className="shortcut-form-field">
                <label className="form-label">Pasta</label>
                <select value={shortcutFolderId ?? ''} onChange={(e) => setShortcutFolderId(e.target.value || null)} className="form-input">
                  <option value="">Sem pasta</option>
                  {sortedFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="shortcut-form-actions">
                <button
                  className="btn btn-primary"
                  onClick={addMode === 'single' ? handleAddShortcut : handleAddShortcutsBulk}
                  disabled={addMode === 'single' ? !shortcutValue.trim() : bulkUrls.length === 0}
                >
                  {addMode === 'single' ? 'Adicionar' : `Adicionar ${bulkUrls.length}`}
                </button>
              </div>
            </div>
          </div>

          {/* Selection toolbar */}
          {selectedShortcutIds.length > 0 && (
            <div className="shortcut-selection-toolbar">
              <span className="shortcut-selection-count">{selectedShortcutIds.length} selecionado(s)</span>
              <button className="shortcut-sel-btn" onClick={() => setSelectedShortcutIds(visibleShortcuts.map(s => s.id))}>
                Selecionar todos ({visibleShortcuts.length})
              </button>
              <button className="shortcut-sel-btn" onClick={() => setSelectedShortcutIds([])}>Limpar</button>
              <div className="shortcut-sel-separator" />
              <select
                className="form-input shortcut-sel-select"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return
                  onMoveShortcuts(selectedShortcutIds, e.target.value === '__none__' ? null : e.target.value)
                  setSelectedShortcutIds([])
                }}
              >
                <option value="">Mover para...</option>
                <option value="__none__">Sem pasta</option>
                {sortedFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button className="shortcut-sel-btn" onClick={() => openEditModalFor(selectedShortcutIds)}>Editar icone</button>
              <button
                className="shortcut-sel-btn shortcut-sel-btn-danger"
                onClick={() => { onRemoveShortcuts(selectedShortcutIds); setSelectedShortcutIds([]) }}
              >
                Excluir ({selectedShortcutIds.length})
              </button>
            </div>
          )}

          {/* Shortcuts grid / list */}
          <div className={viewMode === 'list' ? 'shortcut-list' : 'shortcut-grid'}>
            {visibleShortcuts.length === 0 ? (
              <div className="shortcut-empty">
                <div className="shortcut-empty-title">Nenhum atalho aqui</div>
                <div className="shortcut-empty-subtitle">Crie seu primeiro atalho no formulario acima.</div>
              </div>
            ) : (
              <SortableContext items={visibleShortcuts.map(s => s.id)} strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}>
                <div
                  onClick={() => setSelectedShortcutIds([])}
                  onContextMenu={(e) => { if (selectedShortcutIds.length === 0) return; e.preventDefault(); openEditModalFor(selectedShortcutIds) }}
                  style={{ display: 'contents' }}
                >
                  {visibleShortcuts.map(shortcut => (
                    <div
                      key={shortcut.id}
                      className={`shortcut-card-wrapper ${selectedShortcutIds.includes(shortcut.id) ? 'is-selected' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleSelection(shortcut.id, e) }}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation()
                        const ctrl = e.ctrlKey || e.metaKey
                        const nextIds = selectedShortcutIds.includes(shortcut.id)
                          ? selectedShortcutIds
                          : ctrl ? Array.from(new Set([...selectedShortcutIds, shortcut.id])) : [shortcut.id]
                        setSelectedShortcutIds(nextIds)
                        openEditModalFor(nextIds)
                      }}
                    >
                      <SortableShortcutCard shortcut={shortcut} onRemove={() => onRemoveShortcut(shortcut.id)} viewMode={viewMode} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </section>
      </div>

      <DragOverlay>
        {activeShortcut ? (
          <div style={{ width: 260 }}>
            <ShortcutCard shortcut={activeShortcut} onRemove={() => {}} viewMode="grid" />
          </div>
        ) : activeDragFolder ? (
          <div className="shortcut-drag-folder-overlay">
            <span className="shortcut-folder-icon" aria-hidden="true">{folderIcon}</span>
            <span>{activeDragFolder.name}</span>
          </div>
        ) : null}
      </DragOverlay>

      {editModalIds && (
        <ShortcutEditModal
          selectedIds={editModalIds}
          shortcuts={shortcuts}
          onClose={() => setEditModalIds(null)}
          onUpdateOne={(id, updates) => onUpdateShortcut(id, updates)}
          onUpdateManyIcon={(ids, icon) => { for (const id of ids) onUpdateShortcut(id, { icon }) }}
        />
      )}
    </DndContext>
  )
}
