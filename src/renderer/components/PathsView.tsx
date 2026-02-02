import { useMemo, useState, useCallback } from 'react'
import type { PathItem } from '../types'
import { copyTextToClipboard, isElectron, openLocalPath } from '../utils'
import { FileBrowser } from './FileBrowser'

interface PathsViewProps {
  paths: PathItem[]
  onAddPath: (input: { title: string; path: string }) => void
  onUpdatePath: (id: string, updates: Partial<Pick<PathItem, 'title' | 'path'>>) => void
  onRemovePath: (id: string) => void
}

const getPathTitleFromValue = (value: string): string => {
  const trimmed = value.trim().replace(/[/\\]+$/, '')
  if (!trimmed) return ''
  const normalized = trimmed.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? trimmed
}

const getDriveLabel = (path: string): string => {
  const match = path.match(/^([A-Za-z]:)/)
  if (match) return match[1]
  if (path.startsWith('/')) return '/'
  return ''
}

const PATH_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
const getPathColor = (path: string): string => {
  let hash = 0
  for (let i = 0; i < path.length; i++) hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0
  return PATH_COLORS[Math.abs(hash) % PATH_COLORS.length]
}

export const PathsView = ({ paths, onAddPath, onUpdatePath, onRemovePath }: PathsViewProps) => {
  const [pathValue, setPathValue] = useState('')
  const [filterText, setFilterText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isPickingPath, setIsPickingPath] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sortedPaths = useMemo(
    () => [...paths].sort((a, b) => a.order - b.order),
    [paths]
  )

  const filteredPaths = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return sortedPaths
    return sortedPaths.filter(item => (
      item.title.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
    ))
  }, [filterText, sortedPaths])

  const selectedPath = useMemo(
    () => paths.find(p => p.id === selectedId) ?? null,
    [paths, selectedId]
  )

  const pickFolderPath = async (onSelected: (value: string) => void) => {
    if (!isElectron()) return
    setIsPickingPath(true)
    try {
      const selected = await window.electronAPI.selectPath()
      if (selected) onSelected(selected)
    } finally {
      setIsPickingPath(false)
    }
  }

  const handleAddPath = () => {
    if (!pathValue.trim()) return
    const title = getPathTitleFromValue(pathValue)
    if (!title) return
    onAddPath({ title, path: pathValue })
    setPathValue('')
    setShowAddForm(false)
  }

  const handleStartEdit = (item: PathItem) => {
    setEditingId(item.id)
    setEditingValue(item.path)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  const handleSaveEdit = (item: PathItem) => {
    if (!editingValue.trim()) return
    const title = getPathTitleFromValue(editingValue)
    if (!title) return
    onUpdatePath(item.id, { title, path: editingValue })
    handleCancelEdit()
  }

  const handleCopy = useCallback((id: string, path: string) => {
    void copyTextToClipboard(path)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  return (
    <div className="paths-split">
      {/* Sidebar */}
      <div className="paths-sidebar">
        <div className="paths-sidebar-header">
          <h2>Paths</h2>
          <span className="paths-sidebar-count">{paths.length}</span>
        </div>

        <div className="paths-sidebar-filter">
          <div className="paths-sidebar-filter-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Buscar..."
              className="paths-sidebar-search"
            />
            {filterText && (
              <button className="paths-sidebar-filter-clear" onClick={() => setFilterText('')}>&times;</button>
            )}
          </div>
        </div>

        <div className="paths-sidebar-list">
          {filteredPaths.map(item => (
            <div
              key={item.id}
              className={`paths-sidebar-item ${selectedId === item.id ? 'active' : ''}`}
              onClick={() => { setSelectedId(item.id === selectedId ? null : item.id); setShowAddForm(false) }}
            >
              <span className="paths-sidebar-item-icon" style={{ color: getPathColor(item.path) }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
                </svg>
              </span>
              <div className="paths-sidebar-item-text">
                <span className="paths-sidebar-item-title">{item.title}</span>
                <span className="paths-sidebar-item-path">{item.path}</span>
              </div>
              <button
                className="paths-sidebar-item-open"
                onClick={e => { e.stopPropagation(); openLocalPath(item.path) }}
                title="Abrir no Explorer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>
          ))}
          {filteredPaths.length === 0 && (
            <div className="paths-sidebar-empty">
              {paths.length === 0 ? 'Nenhum path salvo' : 'Sem resultados'}
            </div>
          )}
        </div>

        <button className="paths-sidebar-add-btn" onClick={() => { setShowAddForm(true); setSelectedId(null) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Path
        </button>
      </div>

      {/* Main content */}
      <div className="paths-main">
        {/* Add form */}
        {showAddForm && (
          <div className="paths-detail">
            <div className="paths-detail-header">
              <div className="paths-detail-icon" style={{ background: 'var(--color-primary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <h3>Adicionar Novo Path</h3>
                <p className="paths-detail-subtitle">Salve um caminho de pasta para acesso rapido.</p>
              </div>
            </div>
            <div className="paths-detail-form">
              <label className="paths-detail-label">Caminho da pasta</label>
              <div className="paths-detail-input-row">
                <input
                  type="text"
                  value={pathValue}
                  onChange={e => setPathValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPath()}
                  placeholder="C:\Projetos\MeuApp"
                  className="form-input"
                  autoFocus
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => void pickFolderPath(setPathValue)}
                  disabled={!isElectron() || isPickingPath}
                  title="Selecionar pasta"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  </svg>
                </button>
              </div>
              {pathValue.trim() && (
                <span className="paths-detail-auto-title">
                  Titulo: <strong>{getPathTitleFromValue(pathValue)}</strong>
                </span>
              )}
              <div className="paths-detail-actions">
                <button className="btn btn-primary" onClick={handleAddPath} disabled={!pathValue.trim()}>
                  Salvar Path
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowAddForm(false); setPathValue('') }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected path detail */}
        {selectedPath && !showAddForm && (
          <div className="paths-detail">
            {editingId === selectedPath.id ? (
              <>
                <div className="paths-detail-header">
                  <div className="paths-detail-icon" style={{ background: getPathColor(selectedPath.path) }}>
                    <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                      <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
                    </svg>
                  </div>
                  <div>
                    <h3>Editar Path</h3>
                    <p className="paths-detail-subtitle">Atualize o caminho da pasta.</p>
                  </div>
                </div>
                <div className="paths-detail-form">
                  <label className="paths-detail-label">Novo caminho</label>
                  <div className="paths-detail-input-row">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(selectedPath)}
                      className="form-input"
                      autoFocus
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => void pickFolderPath(setEditingValue)}
                      disabled={!isElectron() || isPickingPath}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                      </svg>
                    </button>
                  </div>
                  {editingValue.trim() && (
                    <span className="paths-detail-auto-title">
                      Titulo: <strong>{getPathTitleFromValue(editingValue)}</strong>
                    </span>
                  )}
                  <div className="paths-detail-actions">
                    <button className="btn btn-primary" onClick={() => handleSaveEdit(selectedPath)}>Atualizar</button>
                    <button className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="paths-detail-header">
                  <div className="paths-detail-icon" style={{ background: getPathColor(selectedPath.path) }}>
                    <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                      <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
                    </svg>
                  </div>
                  <div>
                    <h3>{selectedPath.title}</h3>
                    <p className="paths-detail-subtitle">{getDriveLabel(selectedPath.path) || 'Local'}</p>
                  </div>
                  <button className="paths-detail-close" onClick={() => setSelectedId(null)} title="Fechar">&times;</button>
                </div>

                <div className="paths-detail-toolbar">
                  <button className="paths-detail-btn paths-detail-btn-primary" onClick={() => openLocalPath(selectedPath.path)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Abrir no Explorer
                  </button>
                  <button className="paths-detail-btn" onClick={() => handleCopy(selectedPath.id, selectedPath.path)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      {copiedId === selectedPath.id ? (
                        <path d="M20 6L9 17l-5-5" />
                      ) : (
                        <>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </>
                      )}
                    </svg>
                    {copiedId === selectedPath.id ? 'Copiado!' : 'Copiar Path'}
                  </button>
                  <button className="paths-detail-btn" onClick={() => handleStartEdit(selectedPath)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar
                  </button>
                  <button className="paths-detail-btn paths-detail-btn-danger" onClick={() => { onRemovePath(selectedPath.id); setSelectedId(null) }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Excluir
                  </button>
                </div>

                {/* File browser component */}
                <FileBrowser rootPath={selectedPath.path} />
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!selectedPath && !showAddForm && (
          <div className="paths-main-empty">
            <div className="paths-main-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
              </svg>
            </div>
            <h3>Selecione um path</h3>
            <p>Clique em um path na lista para ver seus detalhes, ou adicione um novo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
