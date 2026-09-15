import { useEffect, useState } from 'react'
import type { ClipboardItem, ClipboardCategory } from '@types'
import { copyTextToClipboard } from '@utils'
import { Button } from '@shared/components/primitives'

interface ClipboardViewProps {
  categories: ClipboardCategory[]
  items: ClipboardItem[]
  onAddCategory: (name: string) => void
  onRenameCategory: (categoryId: string, name: string) => void
  onRemoveCategory: (categoryId: string) => void
  onAddItem: (content: string, title?: string, categoryId?: string | null) => void
  onUpdateItem: (itemId: string, updates: Partial<Pick<ClipboardItem, 'title' | 'isPinned' | 'categoryId' | 'isSnippet'>>) => void
  onRemoveItem: (itemId: string) => void
  onMoveItemToCategory: (itemId: string, categoryId: string | null) => void
  /** Upgrade 18: toggle snippet flag (curado, nao expira). */
  onToggleSnippet?: (itemId: string) => void
}

// '__all__' = all items, '__none__' = uncategorized, string = specific category
type ActiveCat = '__all__' | '__none__' | string

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
  onToggleSnippet,
}: ClipboardViewProps) => {
  const [activeCat, setActiveCat] = useState<ActiveCat>('__all__')
  const [newContent, setNewContent] = useState('')
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)

  // Sync add-form category with active sidebar category
  useEffect(() => {
    if (activeCat === '__all__' || activeCat === '__none__') setAddCategoryId(null)
    else setAddCategoryId(activeCat)
  }, [activeCat])

  const sortedItems = [...items].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.order - a.order
  })

  const getItemsForCategory = (categoryId: string | null) =>
    sortedItems.filter(item => item.categoryId === categoryId)

  const filteredItems =
    activeCat === '__all__' ? sortedItems
    : activeCat === '__none__' ? sortedItems.filter(i => !i.categoryId)
    : sortedItems.filter(i => i.categoryId === activeCat)

  const uncategorizedCount = sortedItems.filter(i => !i.categoryId).length

  const activeCatName =
    activeCat === '__all__' ? 'Todos'
    : activeCat === '__none__' ? 'Sem categoria'
    : (sortedCategories.find(c => c.id === activeCat)?.name ?? 'Categoria')

  const handleAdd = () => {
    if (!newContent.trim()) return
    onAddItem(newContent.trim(), undefined, addCategoryId)
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

  return (
    <div className="projects-shell projects-theme">
      {/* ===== SIDEBAR ===== */}
      <aside className="projects-sidebar">
        <div className="projects-sidebar-header">
          <h2>Área de Transferência</h2>
          {items.length > 0 && <span style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px' }}>{items.length}</span>}
        </div>

        <nav className="projects-sidebar-scroll">
          {/* Todos */}
          <button
            className={`projects-sidebar-item ${activeCat === '__all__' ? 'is-active' : ''}`}
            onClick={() => setActiveCat('__all__')}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>Todos</span>
            <span style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '8px' }}>{items.length}</span>
          </button>

          {/* Sem categoria */}
          {uncategorizedCount > 0 && (
            <button
              className={`projects-sidebar-item ${activeCat === '__none__' ? 'is-active' : ''}`}
              onClick={() => setActiveCat('__none__')}
            >
              <span style={{ flex: 1, textAlign: 'left' }}>Sem categoria</span>
              <span style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '8px' }}>{uncategorizedCount}</span>
            </button>
          )}

          {sortedCategories.length > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '12px 16px' }} />}

          {/* User categories */}
          {sortedCategories.map(category => {
            const count = getItemsForCategory(category.id).length
            const isActive = activeCat === category.id
            return (
              <div key={category.id} style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px' }}>
                {editingCategoryId === category.id ? (
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={e => setEditingCategoryName(e.target.value)}
                    onBlur={() => handleSaveCategory(category.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveCategory(category.id)
                      else if (e.key === 'Escape') setEditingCategoryId(null)
                    }}
                    style={{ flex: 1, padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    autoFocus
                  />
                ) : (
                  <>
                    <button
                      className={`projects-sidebar-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActiveCat(category.id)}
                      style={{ flex: 1, display: 'flex', margin: 0, width: 'auto' }}
                    >
                      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{category.name}</span>
                      <span style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '8px' }}>{count}</span>
                    </button>
                    <div style={{ display: 'flex', gap: '2px', opacity: isActive ? 1 : 0.6 }}>
                      <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        onClick={() => handleStartEditCategory(category)}
                        title="Renomear"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                          <path d="M2 12.5V14h1.5l8.4-8.4-1.5-1.5L2 12.5Z" /><path d="M9.8 3.7l1.5 1.5" />
                        </svg>
                      </button>
                      <button
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        onClick={() => {
                          if (confirm(`Remover "${category.name}"? Itens vão para "Sem categoria".`)) {
                            onRemoveCategory(category.id)
                            if (activeCat === category.id) setActiveCat('__all__')
                          }
                        }}
                        title="Remover"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                          <path d="M3 4h10" /><path d="M6 4v8M10 4v8" />
                          <path d="M5 4l1-2h4l1 2" /><path d="M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: '16px' }}>
          {!showCategoryForm ? (
            <button 
              className="projects-btn" 
              style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-primary)' }} 
              onClick={() => setShowCategoryForm(true)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginRight: '8px' }}>
                <path d="M8 3v10M3 8h10" />
              </svg>
              Nova categoria
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() }
                  else if (e.key === 'Escape') { setShowCategoryForm(false); setNewCategoryName('') }
                }}
                placeholder="Nome da categoria"
                style={{ width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()} style={{ flex: 1 }}>Criar</Button>
                <Button variant="secondary" size="sm" onClick={() => { setShowCategoryForm(false); setNewCategoryName('') }}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="projects-content-wrapper">
        <div className="projects-content-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="projects-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <div>
              <h1 className="projects-title">{activeCatName}</h1>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{filteredItems.length} item(s)</span>
            </div>
          </div>
          
          {/* Add area */}
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd() }}
              placeholder="Cole ou digite o conteúdo aqui... (Ctrl+Enter para adicionar)"
              style={{ width: '100%', minHeight: '80px', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {categories.length > 0 ? (
                <select
                  value={addCategoryId || ''}
                  onChange={e => setAddCategoryId(e.target.value || null)}
                  style={{ padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Sem categoria</option>
                  {sortedCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : <div />}
              <Button variant="primary" onClick={handleAdd} disabled={!newContent.trim()}>
                Salvar Recorte
              </Button>
            </div>
          </div>

          {/* Items list */}
          {filteredItems.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>{activeCat === '__all__' ? 'Nenhum item salvo.' : `Nenhum item em "${activeCatName}".`}</p>
              <p style={{ fontSize: '14px' }}>Adicione textos acima para copiar rapidamente depois.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
              {filteredItems.map(item => (
                <div key={item.id} className="projects-task-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: item.isPinned ? '1px solid #10b981' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveEdit(item.id)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                        style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 600 }}
                        autoFocus
                      />
                    ) : (
                      <div 
                        style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word', cursor: 'text' }}
                        onClick={() => handleStartEdit(item)}
                        title="Clique para editar título"
                      >
                        {item.isPinned && (
                          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12" style={{ marginRight: 6, color: '#10b981' }}>
                            <path d="M12 2L9 9H2l6 4.5L6 22l6-4.5L18 22l-2-8.5L22 9h-7L12 2z" />
                          </svg>
                        )}
                        {item.title || 'Sem título'}
                      </div>
                    )}
                    
                    <button
                      className="projects-btn"
                      style={{ padding: '6px', background: copiedId === item.id ? '#10b981' : 'var(--bg-primary)', color: copiedId === item.id ? '#fff' : 'var(--text-primary)' }}
                      onClick={() => handleCopy(item)}
                      title="Copiar"
                    >
                      {copiedId === item.id ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      )}
                    </button>
                  </div>

                  <div 
                    style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap', cursor: 'pointer' }}
                    onClick={() => handleCopy(item)}
                    title="Clique para copiar"
                  >
                    {item.content.length > 500 ? item.content.slice(0, 500) + '...' : item.content}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
                    {categories.length > 0 && (
                      <select
                        value={item.categoryId || ''}
                        onChange={e => onMoveItemToCategory(item.id, e.target.value || null)}
                        style={{ flex: 1, padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">Sem categoria</option>
                        {sortedCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    )}
                    
                    <button
                      style={{ background: 'transparent', border: 'none', color: item.isPinned ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      onClick={() => onUpdateItem(item.id, { isPinned: !item.isPinned })}
                      title={item.isPinned ? 'Desafixar' : 'Fixar'}
                    >
                      <svg viewBox="0 0 24 24" fill={item.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M12 2L9 9H2l6 4.5L6 22l6-4.5L18 22l-2-8.5L22 9h-7L12 2z" />
                      </svg>
                    </button>
                    
                    {onToggleSnippet && (
                      <button
                        style={{ background: 'transparent', border: 'none', color: item.isSnippet ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        onClick={() => onToggleSnippet(item.id)}
                        title={item.isSnippet ? 'Remover dos snippets' : 'Marcar como snippet (não expira)'}
                      >
                        <svg viewBox="0 0 24 24" fill={item.isSnippet ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </button>
                    )}
                    
                    <button
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      onClick={() => onRemoveItem(item.id)}
                      title="Excluir"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
