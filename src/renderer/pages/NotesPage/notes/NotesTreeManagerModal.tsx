import React, { useState, useMemo } from 'react'
import type { Note, NoteFolder } from '@types'
import { FolderIcon, HomeFolderIcon, PageIcon } from './icons'
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
  const [movingSingleItem, setMovingSingleItem] = useState<{ id: string; type: 'note' | 'folder' } | null>(null)

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

  // Checagem de seleção
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
    const id = onAddFolder(newSubfolderName.trim(), parentId)
    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]))
    }
    setCreatingSubfolderParentId(null)
    setNewSubfolderName('')
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
    if (!window.confirm(`Deseja mover os ${selectedNoteIds.size + selectedFolderIds.size} itens selecionados para a lixeira?`)) return

    selectedNoteIds.forEach((nid) => onRemoveNote(nid))
    selectedFolderIds.forEach((fid) => onRemoveFolder(fid))
    clearSelection()
  }

  // Renderização recursiva de Nó da Árvore
  const renderFolderNode = (folder: NoteFolder, depth: number = 0) => {
    const subfolders = folderChildrenMap.get(folder.id) ?? []
    const childNotes = folderNotesMap.get(folder.id) ?? []
    const isExpanded = expandedFolders.has(folder.id)
    const isEditing = editingItemId === folder.id
    const isChecked = selectedFolderIds.has(folder.id)

    // Se estiver buscando, filtra
    if (query) {
      const matchFolder = folder.name.toLowerCase().includes(query)
      const hasMatchingChildNote = childNotes.some((n) => n.title.toLowerCase().includes(query))
      const hasMatchingSubfolder = subfolders.some((sf) => sf.name.toLowerCase().includes(query))
      if (!matchFolder && !hasMatchingChildNote && !hasMatchingSubfolder) {
        return null
      }
    }

    return (
      <div key={folder.id} className="tree-node" style={{ paddingLeft: depth * 18 }}>
        <div className={`tree-node-row ${isChecked ? 'is-checked' : ''}`}>
          <div className="tree-node-left">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleSelectFolder(folder.id)}
              style={{ cursor: 'pointer' }}
            />
            <button className="tree-node-toggle" onClick={() => toggleExpandFolder(folder.id)}>
              {subfolders.length > 0 || childNotes.length > 0 ? (isExpanded ? '▼' : '▶') : '•'}
            </button>
            <span className="tree-node-icon">
              {folder.isHome ? <HomeFolderIcon /> : <FolderIcon open={isExpanded} />}
            </span>

            {isEditing ? (
              <input
                type="text"
                className="tree-node-title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => saveEditingFolder(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveEditingFolder(folder.id)}
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
              {subfolders.length} subs · {childNotes.length} notas
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
                +📂
              </button>
              <button className="tree-action-btn" title="Nova nota nesta pasta" onClick={() => onAddNote(folder.id, null)}>
                +📄
              </button>
              <button
                className="tree-action-btn"
                title={folder.isHome ? 'Remover Hub' : 'Transformar em Hub'}
                onClick={() => onUpdateFolder(folder.id, { isHome: !folder.isHome })}
              >
                🏠
              </button>
              <button
                className="tree-action-btn"
                title="Mover esta pasta"
                onClick={() => setMovingSingleItem({ id: folder.id, type: 'folder' })}
              >
                🚚
              </button>
              <button className="tree-action-btn" title="Renomear" onClick={() => startEditing(folder.id, folder.name)}>
                ✏️
              </button>
              <button
                className="tree-action-btn tree-action-btn-danger"
                title="Excluir pasta"
                onClick={() => {
                  if (window.confirm(`Excluir pasta "${folder.name}" e seus conteúdos?`)) {
                    onRemoveFolder(folder.id)
                  }
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Input Rápido de Subpasta */}
        {creatingSubfolderParentId === folder.id && (
          <div style={{ paddingLeft: (depth + 1) * 18, display: 'flex', gap: '6px', margin: '4px 0' }}>
            <input
              type="text"
              className="tree-node-title-input"
              placeholder="Nome da subpasta..."
              value={newSubfolderName}
              onChange={(e) => setNewSubfolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubfolder(folder.id)}
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
          <>
            {subfolders.map((sub) => renderFolderNode(sub, depth + 1))}
            {childNotes.map((note) => renderNoteNode(note, depth + 1))}
          </>
        )}
      </div>
    )
  }

  // Renderização de Nó de Nota
  const renderNoteNode = (note: Note, depth: number = 0) => {
    const isEditing = editingItemId === note.id
    const isChecked = selectedNoteIds.has(note.id)

    if (query && !note.title.toLowerCase().includes(query)) {
      return null
    }

    return (
      <div key={note.id} className="tree-node" style={{ paddingLeft: depth * 18 + 20 }}>
        <div className={`tree-node-row ${isChecked ? 'is-checked' : ''}`}>
          <div className="tree-node-left">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleSelectNote(note.id)}
              style={{ cursor: 'pointer' }}
            />
            <span className="tree-node-icon">
              <PageIcon />
            </span>

            {isEditing ? (
              <input
                type="text"
                className="tree-node-title-input"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => saveEditingNote(note.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveEditingNote(note.id)}
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
            {note.isFavorite && <span className="tree-badge">⭐</span>}
            {note.isPinned && <span className="tree-badge">📌</span>}

            <div className="tree-node-actions">
              <button
                className="tree-action-btn"
                title="Mover nota"
                onClick={() => setMovingSingleItem({ id: note.id, type: 'note' })}
              >
                🚚
              </button>
              <button className="tree-action-btn" title="Renomear" onClick={() => startEditing(note.id, note.title)}>
                ✏️
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
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Raízes das pastas e notas soltas
  const rootFolders = folderChildrenMap.get(null) ?? []
  const looseNotes = folderNotesMap.get(null) ?? []
  const totalSelected = selectedNoteIds.size + selectedFolderIds.size

  return (
    <div className="tree-manager-overlay" onClick={onClose}>
      <div className="tree-manager-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tree-manager-header">
          <div className="tree-manager-title-wrap">
            <div className="tree-manager-title-icon">🌳</div>
            <div>
              <h2 className="tree-manager-title">Central de Gerenciamento & Estrutura</h2>
              <p className="tree-manager-subtitle">Organize pastas, crie subpastas e mova conteúdos em lote.</p>
            </div>
          </div>
          <button className="tree-manager-close-btn" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="tree-manager-toolbar">
          <div className="tree-manager-search-wrap">
            <span className="tree-manager-search-icon">🔍</span>
            <input
              type="text"
              className="tree-manager-search-input"
              placeholder="Pesquisar notas ou pastas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tree-manager-quick-actions">
            <button className="tree-btn tree-btn-primary" onClick={() => onAddFolder('Nova Pasta')}>
              + Nova Pasta Raiz
            </button>
            <button className="tree-btn" onClick={() => onAddNote(null, null)}>
              + Nova Nota
            </button>
            <button className="tree-btn" onClick={expandAll} title="Expandir todas as pastas">
              Expandir
            </button>
            <button className="tree-btn" onClick={collapseAll} title="Recolher todas as pastas">
              Recolher
            </button>
          </div>
        </div>

        {/* Body Tree Area */}
        <div className="tree-manager-body">
          {/* Seção de Notas Soltas (Sem pasta) */}
          {looseNotes.length > 0 && (
            <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                📄 Notas Soltas (Sem Pasta) — {looseNotes.length}
              </div>
              {looseNotes.map((n) => renderNoteNode(n, 0))}
            </div>
          )}

          {/* Pastas Raiz */}
          {rootFolders.map((f) => renderFolderNode(f, 0))}

          {rootFolders.length === 0 && looseNotes.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Nenhuma pasta ou nota encontrada. Crie sua primeira pasta acima!
            </div>
          )}
        </div>

        {/* Seletor para Mover Item Individual */}
        {movingSingleItem && (
          <div
            style={{
              padding: '12px 20px',
              background: 'var(--color-surface-hover)',
              borderTop: '1px solid var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Mover {movingSingleItem.type === 'note' ? 'nota' : 'pasta'} para:
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="tree-select-folder"
                onChange={(e) => handleSingleMove(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione a pasta destino...
                </option>
                <option value="root">📁 Raiz (Sem Pasta Pai)</option>
                {visibleFolders
                  .filter((f) => f.id !== movingSingleItem.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
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
              <span>{totalSelected} item(s) selecionado(s)</span>
              <button className="tree-btn" onClick={clearSelection} style={{ padding: '2px 8px', fontSize: '11px' }}>
                Limpar
              </button>
            </div>

            <div className="tree-bulk-controls">
              <span>Mover para:</span>
              <select
                className="tree-select-folder"
                value={targetMoveFolderId}
                onChange={(e) => setTargetMoveFolderId(e.target.value)}
              >
                <option value="root">📁 Raiz (Sem Pasta)</option>
                {visibleFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
              <button className="tree-btn tree-btn-primary" onClick={handleBulkMove}>
                Executar Mover
              </button>
              <button className="tree-btn" onClick={handleBulkDelete} style={{ color: '#ef4444' }}>
                🗑️ Excluir Selecionados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
