import React, { useState, useMemo } from 'react'
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  FileText,
  FilePlus,
  Home,
  Move,
  Edit3,
  Trash2,
  Search,
  X,
  Star,
  Pin,
  Lock,
  ChevronRight,
} from 'lucide-react'
import type { Note, NoteFolder } from '@types'
import '../../../styles/features/notes/tree-manager.css'

interface NotesTreeManagerModalProps {
  notes: Note[]
  folders: NoteFolder[]
  onClose: () => void
  onAddFolder: (name: string, parentId?: string | null) => string
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  onRemoveFolder: (folderId: string) => void
  onAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void
  onRemoveNote: (noteId: string) => void
}

export const NotesTreeManagerModal: React.FC<NotesTreeManagerModalProps> = ({
  notes,
  folders,
  onClose,
  onAddFolder,
  onUpdateFolder,
  onRemoveFolder,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)))
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>('root')
  const [movingSingleItem, setMovingSingleItem] = useState<{ id: string; type: 'note' | 'folder'; title: string } | null>(null)

  // Subpasta rápida
  const [creatingSubfolderParentId, setCreatingSubfolderParentId] = useState<string | null>(null)
  const [newSubfolderName, setNewSubfolderName] = useState('')

  // Expandir / Recolher Tudo
  const toggleExpandFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedFolders(new Set(folders.map((f) => f.id)))
  const collapseAll = () => setExpandedFolders(new Set())

  // Filtragem de busca
  const query = searchQuery.toLowerCase().trim()

  const visibleFolders = useMemo(() => folders.filter((f) => !f.deletedAt), [folders])
  const visibleNotes = useMemo(() => notes.filter((n) => !n.deletedAt), [notes])

  // Estatísticas
  const stats = useMemo(() => {
    const rootCount = visibleFolders.filter((f) => !f.parentId).length
    const subCount = visibleFolders.filter((f) => !!f.parentId).length
    const looseNoteCount = visibleNotes.filter((n) => !n.folderId).length
    const inFolderNoteCount = visibleNotes.filter((n) => !!n.folderId).length
    const hubsCount = visibleFolders.filter((f) => f.isHome).length
    const favCount = visibleNotes.filter((n) => n.isFavorite).length

    return {
      totalFolders: visibleFolders.length,
      rootFolders: rootCount,
      subFolders: subCount,
      totalNotes: visibleNotes.length,
      looseNotes: looseNoteCount,
      inFolderNotes: inFolderNoteCount,
      hubs: hubsCount,
      favorites: favCount,
    }
  }, [visibleFolders, visibleNotes])

  // Mapeamento de pastas filhas
  const folderChildrenMap = useMemo(() => {
    const map = new Map<string | null, NoteFolder[]>()
    for (const f of visibleFolders) {
      const pid = f.parentId ?? null
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid)!.push(f)
    }
    return map
  }, [visibleFolders])

  // Mapeamento de notas por pasta
  const folderNotesMap = useMemo(() => {
    const map = new Map<string | null, Note[]>()
    for (const n of visibleNotes) {
      const fid = n.folderId ?? null
      if (!map.has(fid)) map.set(fid, [])
      map.get(fid)!.push(n)
    }
    return map
  }, [visibleNotes])

  // Seleção múltipla
  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedNoteIds(new Set())
    setSelectedFolderIds(new Set())
  }

  // Renomeação inline
  const startEditing = (id: string, currentTitle: string) => {
    setEditingItemId(id)
    setEditingTitle(currentTitle)
  }

  const saveEditingFolder = (folderId: string) => {
    if (editingTitle.trim()) {
      onUpdateFolder(folderId, { name: editingTitle.trim() })
    }
    setEditingItemId(null)
  }

  const saveEditingNote = (noteId: string) => {
    if (editingTitle.trim()) {
      onUpdateNote(noteId, { title: editingTitle.trim() })
    }
    setEditingItemId(null)
  }

  // Criar subpasta
  const handleCreateSubfolder = (parentId: string | null) => {
    if (!newSubfolderName.trim()) return
    onAddFolder(newSubfolderName.trim(), parentId)
    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]))
    }
    setCreatingSubfolderParentId(null)
    setNewSubfolderName('')
  }

  // Criar nova pasta raiz
  const handleCreateRootFolder = () => {
    const name = window.prompt('Nome da nova pasta raiz:', 'Nova Pasta')
    if (name && name.trim()) {
      onAddFolder(name.trim(), null)
    }
  }

  // Executar movimentação em lote
  const handleBulkMove = () => {
    const targetId = targetMoveFolderId === 'root' ? null : targetMoveFolderId

    selectedNoteIds.forEach((nid) => {
      onUpdateNote(nid, { folderId: targetId })
    })

    selectedFolderIds.forEach((fid) => {
      if (fid !== targetId) {
        onUpdateFolder(fid, { parentId: targetId })
      }
    })

    clearSelection()
  }

  // Executar movimentação individual
  const handleSingleMove = (targetFolderIdStr: string) => {
    if (!movingSingleItem) return
    const targetId = targetFolderIdStr === 'root' ? null : targetFolderIdStr

    if (movingSingleItem.type === 'note') {
      onUpdateNote(movingSingleItem.id, { folderId: targetId })
    } else {
      if (movingSingleItem.id !== targetId) {
        onUpdateFolder(movingSingleItem.id, { parentId: targetId })
      }
    }
    setMovingSingleItem(null)
  }

  // Executar deleção em lote
  const handleBulkDelete = () => {
    const total = selectedNoteIds.size + selectedFolderIds.size
    if (!window.confirm(`Deseja mover os ${total} itens selecionados para a lixeira?`)) return

    selectedNoteIds.forEach((nid) => onRemoveNote(nid))
    selectedFolderIds.forEach((fid) => onRemoveFolder(fid))
    clearSelection()
  }

  // ── Render Folder Node ──────────────────────────────────────────────────────
  const renderFolderNode = (folder: NoteFolder, depth: number = 0) => {
    const subfolders = folderChildrenMap.get(folder.id) ?? []
    const childNotes = folderNotesMap.get(folder.id) ?? []
    const isExpanded = expandedFolders.has(folder.id)
    const isEditing = editingItemId === folder.id
    const isChecked = selectedFolderIds.has(folder.id)

    // Filtragem de busca
    if (query) {
      const matchFolder = folder.name.toLowerCase().includes(query)
      const hasMatchingChildNote = childNotes.some((n) => n.title.toLowerCase().includes(query))
      const hasMatchingSubfolder = subfolders.some((sf) => sf.name.toLowerCase().includes(query))
      if (!matchFolder && !hasMatchingChildNote && !hasMatchingSubfolder) {
        return null
      }
    }

    return (
      <div key={folder.id} className="tree-node" style={{ paddingLeft: depth * 22 }}>
        <div className={`tree-node-row ${isChecked ? 'is-checked' : ''}`}>
          <div className="tree-node-left">
            <input
              type="checkbox"
              className="tree-checkbox"
              checked={isChecked}
              onChange={() => toggleSelectFolder(folder.id)}
            />
            
            <button 
              className="tree-node-toggle" 
              onClick={() => toggleExpandFolder(folder.id)}
              title={isExpanded ? 'Recolher pasta' : 'Expandir pasta'}
            >
              {subfolders.length > 0 || childNotes.length > 0 ? (
                <ChevronRight
                  size={14}
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}
                />
              ) : (
                <span style={{ opacity: 0.3 }}>•</span>
              )}
            </button>

            {/* Ícone da Pasta */}
            <div className="tree-node-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary)' }}>
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </div>

            {isEditing ? (
              <input
                type="text"
                className="tree-node-title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => saveEditingFolder(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditingFolder(folder.id)
                  if (e.key === 'Escape') setEditingItemId(null)
                }}
                autoFocus
              />
            ) : (
              <span
                className="tree-node-title"
                onDoubleClick={() => startEditing(folder.id, folder.name)}
                title="Duplo clique para renomear"
              >
                {folder.name}
              </span>
            )}
          </div>

          <div className="tree-node-meta">
            {folder.isHome && <span className="tree-badge tree-badge-hub">HUB</span>}
            <span className="tree-badge">
              {subfolders.length > 0 ? `${subfolders.length} sub${subfolders.length > 1 ? 's' : ''}` : ''}
              {subfolders.length > 0 && childNotes.length > 0 ? ' · ' : ''}
              {childNotes.length > 0 ? `${childNotes.length} nota${childNotes.length > 1 ? 's' : ''}` : subfolders.length === 0 ? 'vazia' : ''}
            </span>

            <div className="tree-node-actions">
              <button
                className="tree-action-btn"
                title="Nova subpasta aqui"
                onClick={() => {
                  setCreatingSubfolderParentId(folder.id)
                  setNewSubfolderName('')
                }}
              >
                <FolderPlus size={14} />
              </button>
              <button 
                className="tree-action-btn" 
                title="Nova nota nesta pasta" 
                onClick={() => onAddNote(folder.id, null)}
              >
                <FilePlus size={14} />
              </button>
              <button
                className={`tree-action-btn ${folder.isHome ? 'tree-action-btn-active' : ''}`}
                title={folder.isHome ? 'Remover status de Hub' : 'Definir como Hub Central'}
                onClick={() => onUpdateFolder(folder.id, { isHome: !folder.isHome })}
              >
                <Home size={14} />
              </button>
              <button
                className="tree-action-btn"
                title="Mover pasta de lugar"
                onClick={() => setMovingSingleItem({ id: folder.id, type: 'folder', title: folder.name })}
              >
                <Move size={14} />
              </button>
              <button 
                className="tree-action-btn" 
                title="Renomear pasta" 
                onClick={() => startEditing(folder.id, folder.name)}
              >
                <Edit3 size={14} />
              </button>
              <button
                className="tree-action-btn tree-action-btn-danger"
                title="Excluir pasta e itens"
                onClick={() => {
                  if (window.confirm(`Excluir pasta "${folder.name}" e todos os seus conteúdos?`)) {
                    onRemoveFolder(folder.id)
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Input Rápido de Subpasta Inline */}
        {creatingSubfolderParentId === folder.id && (
          <div className="tree-subfolder-creator" style={{ paddingLeft: 34 }}>
            <span className="tree-subfolder-prefix">↳</span>
            <input
              type="text"
              className="tree-node-title-input"
              placeholder="Nome da subpasta..."
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubfolder(folder.id)
                if (e.key === 'Escape') setCreatingSubfolderParentId(null)
              }}
              autoFocus
            />
            <button className="tree-btn tree-btn-primary" onClick={() => handleCreateSubfolder(folder.id)}>
              Criar
            </button>
            <button className="tree-btn" onClick={() => setCreatingSubfolderParentId(null)}>
              Cancelar
            </button>
          </div>
        )}

        {/* Filhos (Subpastas e Notas) */}
        {isExpanded && (
          <div className="tree-children-wrapper">
            {subfolders.map((sub) => renderFolderNode(sub, depth + 1))}
            {childNotes.map((note) => renderNoteNode(note, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // ── Render Note Node ────────────────────────────────────────────────────────
  const renderNoteNode = (note: Note, depth: number = 0) => {
    const isEditing = editingItemId === note.id
    const isChecked = selectedNoteIds.has(note.id)

    if (query && !note.title.toLowerCase().includes(query)) {
      return null
    }

    return (
      <div key={note.id} className="tree-node" style={{ paddingLeft: depth * 22 }}>
        <div className={`tree-node-row tree-node-row-note ${isChecked ? 'is-checked' : ''}`}>
          <div className="tree-node-left">
            <input
              type="checkbox"
              className="tree-checkbox"
              checked={isChecked}
              onChange={() => toggleSelectNote(note.id)}
            />
            
            {/* Ícone da Nota */}
            <div className="tree-node-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
              <FileText size={15} />
            </div>

            {isEditing ? (
              <input
                type="text"
                className="tree-node-title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => saveEditingNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditingNote(note.id)
                  if (e.key === 'Escape') setEditingItemId(null)
                }}
                autoFocus
              />
            ) : (
              <span
                className="tree-node-title"
                onDoubleClick={() => startEditing(note.id, note.title)}
                title="Duplo clique para renomear"
              >
                {note.title || 'Sem título'}
              </span>
            )}
          </div>

          <div className="tree-node-meta">
            {note.isFavorite && <span className="tree-badge" title="Favorita"><Star size={12} fill="currentColor" color="#f59e0b" /></span>}
            {note.isPinned && <span className="tree-badge" title="Fixada"><Pin size={12} color="var(--color-primary)" /></span>}
            {note.isLocked && <span className="tree-badge" title="Bloqueada"><Lock size={12} color="#ef4444" /></span>}

            <div className="tree-node-actions">
              <button
                className="tree-action-btn"
                title="Mover nota de pasta"
                onClick={() => setMovingSingleItem({ id: note.id, type: 'note', title: note.title })}
              >
                <Move size={14} />
              </button>
              <button 
                className="tree-action-btn" 
                title="Renomear nota" 
                onClick={() => startEditing(note.id, note.title)}
              >
                <Edit3 size={14} />
              </button>
              <button
                className="tree-action-btn tree-action-btn-danger"
                title="Excluir nota"
                onClick={() => {
                  if (window.confirm(`Excluir nota "${note.title}"?`)) {
                    onRemoveNote(note.id)
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rootFolders = folderChildrenMap.get(null) ?? []
  const looseNotes = folderNotesMap.get(null) ?? []
  const totalSelected = selectedNoteIds.size + selectedFolderIds.size

  return (
    <div className="tree-manager-overlay" onClick={onClose}>
      <div className="tree-manager-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="tree-manager-header">
          <div className="tree-manager-title-wrap">
            <div className="tree-manager-title-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <FolderTree size={20} color="var(--color-primary)" />
            </div>
            <div>
              <h2 className="tree-manager-title">Estrutura & Hierarquia de Conhecimento</h2>
              <p className="tree-manager-subtitle">Organize pastas, gerencie subníveis e execute ações em lote.</p>
            </div>
          </div>

          <div className="tree-manager-header-stats">
            <div className="tree-stat-pill" title="Total de pastas" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Folder size={13} /> <span>{stats.totalFolders}</span> pastas
            </div>
            <div className="tree-stat-pill" title="Total de notas" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={13} /> <span>{stats.totalNotes}</span> notas
            </div>
            {stats.hubs > 0 && (
              <div className="tree-stat-pill tree-stat-pill-hub" title="Hubs centrais ativos" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Home size={13} /> <span>{stats.hubs}</span> hubs
              </div>
            )}
          </div>

          <button className="tree-manager-close-btn" onClick={onClose} title="Fechar modal (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Ações Rápidas */}
        <div className="tree-manager-toolbar">
          <div className="tree-manager-search-wrap">
            <span className="tree-manager-search-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              className="tree-manager-search-input"
              placeholder="Pesquisar por nome de pasta ou nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="tree-manager-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="tree-manager-quick-actions">
            <button className="tree-btn tree-btn-primary" onClick={handleCreateRootFolder} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderPlus size={14} /> Nova Pasta Raiz
            </button>
            <button className="tree-btn" onClick={() => onAddNote(null, null)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FilePlus size={14} /> Nova Nota
            </button>
            <div className="tree-toolbar-divider" />
            <button className="tree-btn" onClick={expandAll} title="Expandir todas as pastas">
              Expandir Tudo
            </button>
            <button className="tree-btn" onClick={collapseAll} title="Recolher todas as pastas">
              Recolher Tudo
            </button>
          </div>
        </div>

        {/* Body Tree Area */}
        <div className="tree-manager-body">
          {/* Seção de Notas Soltas (Sem Pasta) */}
          {looseNotes.length > 0 && (
            <div className="tree-loose-section">
              <div className="tree-section-header">
                <span className="tree-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Notas Soltas na Raiz ({looseNotes.length})
                </span>
                <span className="tree-section-hint">Sem pasta vinculada</span>
              </div>
              <div className="tree-loose-list">
                {looseNotes.map((n) => renderNoteNode(n, 0))}
              </div>
            </div>
          )}

          {/* Pastas Raiz e Árvore Completa */}
          {rootFolders.map((f) => renderFolderNode(f, 0))}

          {rootFolders.length === 0 && looseNotes.length === 0 && (
            <div className="tree-empty-state">
              <div className="tree-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <FolderOpen size={36} color="var(--color-text-muted)" />
              </div>
              <h3>Nenhuma pasta ou nota encontrada</h3>
              <p>Comece criando sua primeira pasta raiz para estruturar seu conhecimento.</p>
              <button className="tree-btn tree-btn-primary" onClick={handleCreateRootFolder} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FolderPlus size={14} /> Criar Primeira Pasta
              </button>
            </div>
          )}
        </div>

        {/* Modal/Barra de Mover Item Individual */}
        {movingSingleItem && (
          <div className="tree-single-move-bar">
            <div className="tree-single-move-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Move size={14} />
              <span>Mover <strong>{movingSingleItem.title}</strong> para:</span>
            </div>
            <div className="tree-single-move-controls">
              <select
                className="tree-select-folder"
                onChange={(e) => handleSingleMove(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione a pasta destino...
                </option>
                <option value="root">Raiz Principal (Sem Pasta)</option>
                {visibleFolders
                  .filter((f) => f.id !== movingSingleItem.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
              <button className="tree-btn" onClick={() => setMovingSingleItem(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Floating Bulk Actions Bar */}
        {totalSelected > 0 && (
          <div className="tree-bulk-bar">
            <div className="tree-bulk-info">
              <span className="tree-bulk-count">{totalSelected}</span>
              <span>item(s) selecionado(s)</span>
              <button className="tree-btn tree-btn-sm" onClick={clearSelection}>
                Limpar seleção
              </button>
            </div>

            <div className="tree-bulk-controls">
              <span>Mover para:</span>
              <select
                className="tree-select-folder"
                value={targetMoveFolderId}
                onChange={(e) => setTargetMoveFolderId(e.target.value)}
              >
                <option value="root">Raiz (Sem Pasta)</option>
                {visibleFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button className="tree-btn tree-btn-primary" onClick={handleBulkMove}>
                Mover Selecionados
              </button>
              <button className="tree-btn tree-btn-danger" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={14} /> Excluir Selecionados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

