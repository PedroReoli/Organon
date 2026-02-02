import { useState } from 'react'
import type { ClipboardItem, ClipboardCategory } from '../types'
import { copyTextToClipboard } from '../utils'

interface ClipboardViewProps {
  categories: ClipboardCategory[]
  items: ClipboardItem[]
  onAddCategory: (name: string) => void
  onRenameCategory: (categoryId: string, name: string) => void
  onRemoveCategory: (categoryId: string) => void
  onAddItem: (content: string, title?: string, categoryId?: string | null) => void
  onUpdateItem: (itemId: string, updates: Partial<Pick<ClipboardItem, 'title' | 'isPinned' | 'categoryId'>>) => void
  onRemoveItem: (itemId: string) => void
  onMoveItemToCategory: (itemId: string, categoryId: string | null) => void
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
}: ClipboardViewProps) => {
  const [newContent, setNewContent] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)

  const getItemsForCategory = (categoryId: string | null) => {
    return items
      .filter(item => item.categoryId === categoryId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.order - a.order
      })
  }

  const handleAdd = () => {
    if (!newContent.trim()) return
    onAddItem(newContent.trim(), undefined, selectedCategoryId)
    setNewContent('')
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    onAddCategory(newCategoryName.trim())
    setNewCategoryName('')
    setShowCategoryForm(false)
  }

  const handleStartEditCategory = (category: ClipboardCategory) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const handleSaveCategory = (categoryId: string) => {
    if (editingCategoryName.trim()) {
      onRenameCategory(categoryId, editingCategoryName.trim())
    }
    setEditingCategoryId(null)
  }

  const handleCopy = async (item: ClipboardItem) => {
    const success = await copyTextToClipboard(item.content)
    if (success) {
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleStartEdit = (item: ClipboardItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  const handleSaveEdit = (itemId: string) => {
    if (editTitle.trim()) {
      onUpdateItem(itemId, { title: editTitle.trim() })
    }
    setEditingId(null)
  }

  const totalItems = items.length
  const itemsWithoutCategory = getItemsForCategory(null)
  const filteredItems = selectedCategoryId === null
    ? itemsWithoutCategory
    : getItemsForCategory(selectedCategoryId)

  return (
    <div className="clipboard-layout">
      <header className="clipboard-header">
        <div>
          <h2>Clipboard</h2>
          <p>Cole e copie textos rapidamente. {totalItems > 0 && <span>{totalItems} item(s)</span>}</p>
        </div>
      </header>

      {/* Categorias */}
      <div className="clipboard-categories">
        <div className="clipboard-categories-header">
          <h3>Categorias</h3>
          {!showCategoryForm ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCategoryForm(true)}>
              + Nova Categoria
            </button>
          ) : (
            <div className="clipboard-category-form">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  } else if (e.key === 'Escape') {
                    setShowCategoryForm(false)
                    setNewCategoryName('')
                  }
                }}
                placeholder="Nome da categoria"
                className="form-input"
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Criar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowCategoryForm(false); setNewCategoryName('') }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
        <div className="clipboard-categories-list">
          <button
            className={`clipboard-category-btn ${selectedCategoryId === null ? 'active' : ''}`}
            onClick={() => setSelectedCategoryId(null)}
          >
            <span>Todos</span>
            <span className="clipboard-category-count">{totalItems}</span>
          </button>
          {sortedCategories.map(category => {
            const categoryItems = getItemsForCategory(category.id)
            return (
              <div key={category.id} className="clipboard-category-item">
                {editingCategoryId === category.id ? (
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={e => setEditingCategoryName(e.target.value)}
                    onBlur={() => handleSaveCategory(category.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleSaveCategory(category.id)
                      } else if (e.key === 'Escape') {
                        setEditingCategoryId(null)
                      }
                    }}
                    className="clipboard-category-input"
                    autoFocus
                  />
                ) : (
                  <>
                    <button
                      className={`clipboard-category-btn ${selectedCategoryId === category.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <span>{category.name}</span>
                      <span className="clipboard-category-count">{categoryItems.length}</span>
                    </button>
                    <div className="clipboard-category-actions">
                      <button
                        className="clipboard-category-action"
                        onClick={() => handleStartEditCategory(category)}
                        title="Renomear"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="clipboard-category-action"
                        onClick={() => {
                          if (confirm(`Remover categoria "${category.name}"? Os itens serão movidos para "Sem categoria".`)) {
                            onRemoveCategory(category.id)
                            if (selectedCategoryId === category.id) {
                              setSelectedCategoryId(null)
                            }
                          }
                        }}
                        title="Remover"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="clipboard-add">
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="Cole ou digite o conteudo aqui..."
          className="clipboard-textarea"
          rows={3}
        />
        <div className="clipboard-add-actions">
          {categories.length > 0 && (
            <select
              value={selectedCategoryId || ''}
              onChange={e => setSelectedCategoryId(e.target.value || null)}
              className="form-select"
            >
              <option value="">Sem categoria</option>
              {sortedCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" onClick={handleAdd} disabled={!newContent.trim()}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="clipboard-list">
        {filteredItems.length === 0 ? (
          <div className="clipboard-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <p>
              {selectedCategoryId === null
                ? 'Nenhum item no clipboard.'
                : `Nenhum item na categoria "${sortedCategories.find(c => c.id === selectedCategoryId)?.name}".`}
            </p>
            <p>Adicione textos para copiar rapidamente depois.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const itemCategory = item.categoryId ? categories.find(c => c.id === item.categoryId) : null
            return (
              <div key={item.id} className={`clipboard-item ${item.isPinned ? 'pinned' : ''}`}>
                <div className="clipboard-item-header">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(item.id)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                      className="clipboard-title-input"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="clipboard-item-title"
                      onClick={() => handleStartEdit(item)}
                      title="Clique para editar titulo"
                    >
                      {item.isPinned && (
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12" style={{ marginRight: 4, opacity: 0.6 }}>
                          <path d="M12 2L9 9H2l6 4.5L6 22l6-4.5L18 22l-2-8.5L22 9h-7L12 2z" />
                        </svg>
                      )}
                      {item.title}
                    </span>
                  )}
                  <div className="clipboard-item-actions">
                    {categories.length > 0 && (
                      <select
                        value={item.categoryId || ''}
                        onChange={e => onMoveItemToCategory(item.id, e.target.value || null)}
                        className="clipboard-category-select"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">Sem categoria</option>
                        {sortedCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      className={`clipboard-btn ${item.isPinned ? 'active' : ''}`}
                      onClick={() => onUpdateItem(item.id, { isPinned: !item.isPinned })}
                      title={item.isPinned ? 'Desafixar' : 'Fixar'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M12 2L9 9H2l6 4.5L6 22l6-4.5L18 22l-2-8.5L22 9h-7L12 2z" />
                      </svg>
                    </button>
                    <button
                      className={`clipboard-btn ${copiedId === item.id ? 'active' : ''}`}
                      onClick={() => handleCopy(item)}
                      title="Copiar"
                    >
                      {copiedId === item.id ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                    <button
                      className="clipboard-btn clipboard-btn-delete"
                      onClick={() => onRemoveItem(item.id)}
                      title="Excluir"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  className="clipboard-item-content"
                  onClick={() => handleCopy(item)}
                  title="Clique para copiar"
                >
                  {item.content.length > 300 ? item.content.slice(0, 300) + '...' : item.content}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
