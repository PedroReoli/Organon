import { useState } from 'react'
import type { ClipboardCategory, ClipboardContentType, ClipboardItem } from '@types'
import { copyTextToClipboard } from '@utils'
import { ClipboardSidebar, type ClipboardFolderSelection } from './ClipboardSidebar'
import { ClipboardToolbar, type ClipboardSortMode } from './ClipboardToolbar'
import { ClipboardItemCard } from './ClipboardItemCard'
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_ORDER } from './clipboardClassifier'

interface ClipboardViewProps {
  categories:          ClipboardCategory[]
  items:               ClipboardItem[]
  onAddCategory:       (name: string) => void
  onRenameCategory:    (categoryId: string, name: string) => void
  onRemoveCategory:    (categoryId: string) => void
  onAddItem:           (content: string, title?: string, categoryId?: string | null) => void
  onUpdateItem:        (itemId: string, updates: Partial<Pick<ClipboardItem, 'title' | 'isPinned' | 'categoryId' | 'isSnippet'>>) => void
  onRemoveItem:        (itemId: string) => void
  onMoveItemToCategory:(itemId: string, categoryId: string | null) => void
  onIncrementCopyCount:(itemId: string) => void
  /** Upgrade 18: toggle snippet flag (curado, nao expira). */
  onToggleSnippet?:    (itemId: string) => void
}

export const ClipboardView = ({
  categories,
  items,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItemToCategory,
  onIncrementCopyCount,
  onToggleSnippet,
}: ClipboardViewProps) => {
  const [selectedFolder, setSelectedFolder] = useState<ClipboardFolderSelection>({ kind: 'all' })
  const [copiedId,    setCopiedId]    = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ClipboardItem | null>(null)
  const [editTitle,   setEditTitle]   = useState('')
  const [newContent,  setNewContent]  = useState('')
  const [search,      setSearch]      = useState('')
  const [sortMode,    setSortMode]    = useState<ClipboardSortMode>('pinned-first')
  // Upgrade: bulk selection + delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  // ── Derived ────────────────────────────────────────────────────────────────

  const itemCountByCategory = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.id] = items.filter(i => i.categoryId === cat.id).length
    return acc
  }, {})

  const itemCountByType = CONTENT_TYPE_ORDER.reduce<Record<ClipboardContentType, number>>((acc, contentType) => {
    acc[contentType] = items.filter(item => item.contentType === contentType).length
    return acc
  }, {
    color: 0,
    url: 0,
    email: 0,
    password: 0,
    code: 0,
    json: 0,
    sql: 0,
    markdown: 0,
    phone: 0,
    document: 0,
    text: 0,
  })

  const selectedFolderLabel = selectedFolder.kind === 'all'
    ? 'Todos'
    : selectedFolder.kind === 'auto'
      ? CONTENT_TYPE_LABELS[selectedFolder.contentType]
      : (categories.find(category => category.id === selectedFolder.categoryId)?.name ?? 'Pasta')

  const filteredItems = items
    .filter(item => {
      if (selectedFolder.kind === 'manual' && item.categoryId !== selectedFolder.categoryId) return false
      if (selectedFolder.kind === 'auto' && item.contentType !== selectedFolder.contentType) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!item.content.toLowerCase().includes(q) && !item.title.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortMode) {
        case 'pinned-first':
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return b.order - a.order
        case 'most-used':
          return b.copyCount - a.copyCount
        case 'type':
          if (a.contentType !== b.contentType) return a.contentType.localeCompare(b.contentType)
          return b.order - a.order
        case 'recent':
        default:
          return b.order - a.order
      }
    })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!newContent.trim()) return
    onAddItem(
      newContent.trim(),
      undefined,
      selectedFolder.kind === 'manual' ? selectedFolder.categoryId : null,
    )
    setNewContent('')
  }

  const handleCopy = async (item: ClipboardItem) => {
    const ok = await copyTextToClipboard(item.content)
    if (ok) {
      onIncrementCopyCount(item.id)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handlePin = (item: ClipboardItem) => {
    onUpdateItem(item.id, { isPinned: !item.isPinned })
  }

  const handleEditTitle = (item: ClipboardItem) => {
    setEditingItem(item)
    setEditTitle(item.title)
  }

  const handleSaveTitle = () => {
    if (!editingItem) return
    onUpdateItem(editingItem.id, { title: editTitle.trim() || editingItem.content.slice(0, 60) })
    setEditingItem(null)
  }

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onRemoveItem(id))
    setSelectedIds(new Set())
    setBulkMode(false)
  }

  const handleClearAll = () => {
    const unpinned = items.filter(i => !i.isPinned)
    if (unpinned.length === 0) return
    unpinned.forEach(item => onRemoveItem(item.id))
  }

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)))
  }

  return (
    <div className="cb-layout">
      <ClipboardSidebar
        categories={categories}
        selectedFolder={selectedFolder}
        onSelect={setSelectedFolder}
        onAddCategory={onAddCategory}
        onRenameCategory={onRenameCategory}
        onRemoveCategory={onRemoveCategory}
        itemCountByCategory={itemCountByCategory}
        itemCountByType={itemCountByType}
        totalCount={items.length}
      />

      <div className="cb-main">
        <ClipboardToolbar
          search={search}
          setSearch={setSearch}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onAdd={handleAdd}
          newContent={newContent}
          setNewContent={setNewContent}
        />

        {/* Bulk operations bar */}
        <div className="cb-bulk-bar">
          <button type="button" className={`cb-bulk-btn ${bulkMode ? 'is-active' : ''}`} onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            {bulkMode ? 'Cancelar' : 'Selecionar'}
          </button>
          {bulkMode && (
            <>
              <button type="button" className="cb-bulk-btn" onClick={selectAllVisible}>
                Selecionar todos ({filteredItems.length})
              </button>
              {selectedIds.size > 0 && (
                <button type="button" className="cb-bulk-btn cb-bulk-danger" onClick={handleBulkDelete}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  Excluir {selectedIds.size}
                </button>
              )}
            </>
          )}
          {!bulkMode && items.length > 0 && (
            <button type="button" className="cb-bulk-btn cb-bulk-danger" onClick={handleClearAll} title="Apaga todos os itens nao fixados">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              Apagar tudo
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="cb-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <rect x="7" y="4" width="10" height="4" rx="1" />
              <rect x="5" y="8" width="14" height="13" rx="2" />
            </svg>
            <p>{search ? 'Nenhum item encontrado.' : `Nenhum item em "${selectedFolderLabel}".`}</p>
          </div>
        ) : (
          <div className="cb-grid">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`cb-card-wrapper ${bulkMode && selectedIds.has(item.id) ? 'is-selected' : ''}`}
                onClick={bulkMode ? () => toggleSelect(item.id) : undefined}
              >
                {bulkMode && (
                  <div className={`cb-card-checkbox ${selectedIds.has(item.id) ? 'checked' : ''}`}>
                    {selectedIds.has(item.id) && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </div>
                )}
                <ClipboardItemCard
                  item={item}
                  categories={categories}
                  isCopied={copiedId === item.id}
                  onCopy={handleCopy}
                  onPin={handlePin}
                  onRemove={onRemoveItem}
                  onMove={onMoveItemToCategory}
                  onEditTitle={handleEditTitle}
                  onToggleSnippet={onToggleSnippet}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {editingItem && (
        <div className="cb-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="cb-modal" onClick={e => e.stopPropagation()}>
            <h3 className="cb-modal-title">Renomear item</h3>
            <input
              autoFocus
              className="cb-input"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingItem(null) }}
            />
            <div className="cb-modal-actions">
              <button type="button" className="cb-btn-ghost" onClick={() => setEditingItem(null)}>Cancelar</button>
              <button type="button" className="cb-btn-primary" onClick={handleSaveTitle}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
