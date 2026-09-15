import React from 'react'
import type { Playbook, PlaybookFolder } from '@types'
import type { ContextMenuState } from '@types'
import type { FolderSelection } from './PlaybookFolderSidebar'

interface PlaybookCatalogProps {
  search:            string
  setSearch:         (v: string) => void
  sectorFilter:      string
  setSectorFilter:   (v: string) => void
  categoryFilter:    string
  setCategoryFilter: (v: string) => void
  sectors:           string[]
  categories:        string[]
  filteredPlaybooks: Playbook[]
  allPlaybooks:      Playbook[]
  folders:           PlaybookFolder[]
  folderSelection:   FolderSelection
  setFolderSelection:(s: FolderSelection) => void
  selectedPlaybookId:string | null
  contextMenu:       ContextMenuState | null
  contextMenuRef:    React.RefObject<HTMLDivElement>
  setContextMenu:    (v: ContextMenuState | null) => void
  openPlaybook:      (id: string) => void
  openPlaybookEditModal: (id: string) => void
  removePlaybookById:    (id: string) => void
  togglePlaybookFavorite:(id: string) => void
  togglePlaybookArchived:(id: string) => void
  movePlaybookToFolder:  (id: string, folderId: string | null) => void
  createFolder:  (name: string) => void
  renameFolder:  (folderId: string, name: string) => void
  removeFolder:  (folderId: string) => void
  openCreateModal: () => void
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    width="14"
    height="14"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

function folderSelectionToValue(s: FolderSelection): string {
  if (s.kind === 'folder') return `folder:${s.folderId}`
  return s.kind
}

function valueToFolderSelection(v: string): FolderSelection {
  if (v.startsWith('folder:')) return { kind: 'folder', folderId: v.slice(7) }
  return { kind: v as 'all' | 'favorites' | 'archived' | 'none' }
}

function countActive(playbooks: Playbook[]): number {
  return playbooks.filter(p => !p.isArchived).length
}

function countInFolder(playbooks: Playbook[], folderId: string | null): number {
  return playbooks.filter(p => !p.isArchived && (p.folderId ?? null) === folderId).length
}

export const PlaybookCatalog = ({
  search,
  setSearch,
  sectorFilter,
  setSectorFilter,
  categoryFilter,
  setCategoryFilter,
  sectors,
  categories,
  filteredPlaybooks,
  allPlaybooks,
  folders,
  folderSelection,
  setFolderSelection,
  selectedPlaybookId,
  contextMenu,
  contextMenuRef,
  setContextMenu,
  openPlaybook,
  openPlaybookEditModal,
  removePlaybookById,
  togglePlaybookFavorite,
  togglePlaybookArchived,
  movePlaybookToFolder,
  openCreateModal,
}: PlaybookCatalogProps) => {
  const ctxPlaybook =
    contextMenu != null ? allPlaybooks.find((p) => p.id === contextMenu.playbookId) : null

  const favCount = allPlaybooks.filter(p => p.isFavorite && !p.isArchived).length
  const archCount = allPlaybooks.filter(p => p.isArchived).length

  return (
    <div className="projects-content-scroll">
      
      <div className="projects-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="projects-title">Catálogo de Playbooks</h2>
          <p className="projects-subtitle">{allPlaybooks.length} playbook{allPlaybooks.length !== 1 ? 's' : ''} organizados</p>
        </div>
        <button className="projects-btn" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Novo Playbook
        </button>
      </div>

      <section className="projects-board-column" style={{ width: '100%', marginBottom: '24px' }}>
        <div className="projects-column-header">
          <span className="projects-column-title">Filtros</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Buscar</span>
            <input
              type="text"
              className="f-input"
              style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
              placeholder="Titulo, setor ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Visualizar</span>
            <select
              className="f-input"
              style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
              value={folderSelectionToValue(folderSelection)}
              onChange={(e) => setFolderSelection(valueToFolderSelection(e.target.value))}
            >
              <option value="all">Todos ({countActive(allPlaybooks)})</option>
              <option value="favorites">Favoritos ({favCount})</option>
              <option value="none">Sem pasta ({countInFolder(allPlaybooks, null)})</option>
              {folders.map(f => (
                <option key={f.id} value={`folder:${f.id}`}>
                  {f.name} ({countInFolder(allPlaybooks, f.id)})
                </option>
              ))}
              <option value="archived">Arquivados ({archCount})</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Setor</span>
            <select
              className="f-input"
              style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value)
                setCategoryFilter('todas')
              }}
            >
              <option value="todos">Todos</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Categoria</span>
            <select
              className="f-input"
              style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="todas">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="projects-board-column" style={{ width: '100%' }}>
        <div className="projects-column-header">
          <span className="projects-column-title">Playbooks</span>
          <span className="projects-column-count">{filteredPlaybooks.length}</span>
        </div>

        {filteredPlaybooks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Nenhum playbook encontrado para o filtro atual.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '16px' }}>
            {filteredPlaybooks.map((playbook) => (
              <div
                key={playbook.id}
                className={`projects-task-card ${selectedPlaybookId === playbook.id ? 'is-active' : ''}`}
                style={{
                  opacity: playbook.isArchived ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  border: selectedPlaybookId === playbook.id ? '1px solid var(--color-primary)' : undefined
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    playbookId: playbook.id,
                  })
                }}
                onClick={() => openPlaybook(playbook.id)}
                title="Clique para abrir | botão direito para opções"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--color-primary)15', color: 'var(--color-primary)', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <strong style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{playbook.title}</strong>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: playbook.isFavorite ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePlaybookFavorite(playbook.id)
                    }}
                    title={playbook.isFavorite ? 'Desfavoritar' : 'Favoritar'}
                  >
                    <StarIcon filled={playbook.isFavorite === true} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>{playbook.sector}</span>
                  <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>{playbook.category}</span>
                  {(playbook.viewCount ?? 0) > 0 && (
                    <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginLeft: 'auto' }} title="Aberturas">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      {playbook.viewCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {contextMenu && ctxPlaybook && (
        <div
          ref={contextMenuRef}
          className="quick-access-context-menu playbook-context-menu"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="quick-access-context-item"
            onClick={() => openPlaybookEditModal(contextMenu.playbookId)}
          >
            Editar
          </button>
          <button
            type="button"
            className="quick-access-context-item"
            onClick={() => {
              togglePlaybookFavorite(contextMenu.playbookId)
              setContextMenu(null)
            }}
          >
            {ctxPlaybook.isFavorite ? 'Desfavoritar' : 'Favoritar'}
          </button>
          <button
            type="button"
            className="quick-access-context-item"
            onClick={() => togglePlaybookArchived(contextMenu.playbookId)}
          >
            {ctxPlaybook.isArchived ? 'Desarquivar' : 'Arquivar'}
          </button>

          {folders.length > 0 && (
            <div className="playbook-context-menu-section">
              <div className="playbook-context-menu-section-label">
                Mover para pasta
              </div>
              <button
                type="button"
                className="quick-access-context-item"
                onClick={() => movePlaybookToFolder(contextMenu.playbookId, null)}
              >
                (Raiz)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="quick-access-context-item"
                  onClick={() =>
                    movePlaybookToFolder(contextMenu.playbookId, f.id)
                  }
                >
                  <span
                    className="playbook-folder-sidebar-folder-dot"
                    style={{ background: f.color, marginRight: 6 }}
                  />
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="quick-access-context-item"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => {
              removePlaybookById(contextMenu.playbookId)
              setContextMenu(null)
            }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}
