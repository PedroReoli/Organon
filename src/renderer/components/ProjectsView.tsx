import { useEffect, useMemo, useState } from 'react'
import type { Project, ProjectLink, RegisteredIDE, Card, Note } from '../types'
import { isElectron, openLocalPath, openExternalLink, generateId } from '../utils'
import { FileBrowser } from './FileBrowser'

interface ProjectsViewProps {
  projects: Project[]
  registeredIDEs: RegisteredIDE[]
  cards: Card[]
  notes: Note[]
  onAddProject: (input: { name: string; path?: string; description?: string; color?: string; links?: ProjectLink[]; preferredIdeId?: string | null }) => string | undefined
  onUpdateProject: (projectId: string, updates: Partial<Pick<Project, 'name' | 'path' | 'description' | 'color' | 'links' | 'preferredIdeId'>>) => void
  onRemoveProject: (projectId: string) => void
  onAddNote: (title: string, folderId?: string | null, projectId?: string | null) => Note
  onEditCard: (cardId: string, updates: Partial<Pick<Card, 'projectId'>>) => void
  onCardClick?: (card: Card) => void
}

type ProjectTab = 'links' | 'files' | 'notes' | 'cards'

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

const getProjectTitle = (path: string): string => {
  const trimmed = path.trim().replace(/[/\\]+$/, '')
  if (!trimmed) return ''
  const normalized = trimmed.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? trimmed
}

export const ProjectsView = ({
  projects,
  registeredIDEs,
  cards,
  notes,
  onAddProject,
  onUpdateProject,
  onRemoveProject,
  onAddNote,
  onEditCard,
  onCardClick,
}: ProjectsViewProps) => {
  const [filterText, setFilterText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProjectTab>('links')
  const [showIdeDropdown, setShowIdeDropdown] = useState(false)

  // Add project form
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPath, setFormPath] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState(PROJECT_COLORS[0])
  const [formIdeId, setFormIdeId] = useState<string | null>(null)
  const [isPickingPath, setIsPickingPath] = useState(false)

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPath, setEditPath] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIdeId, setEditIdeId] = useState<string | null>(null)

  // Links
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  // Note creation
  const [newNoteTitle, setNewNoteTitle] = useState('')

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.order - b.order),
    [projects]
  )

  const filteredProjects = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return sortedProjects
    return sortedProjects.filter(p =>
      p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
  }, [filterText, sortedProjects])

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedId) ?? null,
    [projects, selectedId]
  )

  const projectCards = useMemo(
    () => selectedProject ? cards.filter(c => c.projectId === selectedProject.id) : [],
    [cards, selectedProject]
  )

  const projectNotes = useMemo(
    () => selectedProject ? notes.filter(n => n.projectId === selectedProject.id) : [],
    [notes, selectedProject]
  )

  // Close IDE dropdown when clicking outside
  useEffect(() => {
    if (!showIdeDropdown) return
    const handler = () => setShowIdeDropdown(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showIdeDropdown])

  const pickFolderPath = async (setter: (v: string) => void, nameSetter?: (v: string) => void) => {
    if (!isElectron()) return
    setIsPickingPath(true)
    try {
      const selected = await window.electronAPI.selectPath()
      if (selected) {
        setter(selected)
        if (nameSetter && !formName.trim()) nameSetter(getProjectTitle(selected))
      }
    } finally {
      setIsPickingPath(false)
    }
  }

  const handleAddProject = () => {
    const name = formName.trim()
    if (!name) return
    onAddProject({
      name,
      path: formPath.trim() || undefined,
      description: formDescription.trim(),
      color: formColor,
      preferredIdeId: formIdeId,
    })
    setFormName('')
    setFormPath('')
    setFormDescription('')
    setFormColor(PROJECT_COLORS[0])
    setFormIdeId(null)
    setShowAddForm(false)
  }

  const handleStartEdit = (p: Project) => {
    setEditingId(p.id)
    setEditName(p.name)
    setEditPath(p.path)
    setEditDescription(p.description)
    setEditColor(p.color)
    setEditIdeId(p.preferredIdeId)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return
    onUpdateProject(editingId, {
      name: editName.trim(),
      path: editPath.trim(),
      description: editDescription.trim(),
      color: editColor,
      preferredIdeId: editIdeId,
    })
    setEditingId(null)
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleOpenWithIDE = async (ide: RegisteredIDE, projectPath: string) => {
    if (!isElectron() || !projectPath) return
    const args = ide.args.replace(/\{folder\}/g, projectPath)
    await window.electronAPI.launchExeWithArgs(ide.exePath, [args])
    setShowIdeDropdown(false)
  }

  const handleOpenWithPreferred = async (project: Project) => {
    if (!project.preferredIdeId || !project.path) return
    const ide = registeredIDEs.find(i => i.id === project.preferredIdeId)
    if (ide) await handleOpenWithIDE(ide, project.path)
  }

  const handleAddProjectNote = () => {
    if (!newNoteTitle.trim() || !selectedProject) return
    onAddNote(newNoteTitle.trim(), null, selectedProject.id)
    setNewNoteTitle('')
  }

  // Links management
  const handleAddLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim() || !selectedProject) return
    const newLink: ProjectLink = {
      id: generateId(),
      label: newLinkLabel.trim(),
      url: newLinkUrl.trim(),
    }
    onUpdateProject(selectedProject.id, {
      links: [...(selectedProject.links ?? []), newLink],
    })
    setNewLinkLabel('')
    setNewLinkUrl('')
  }

  const handleRemoveLink = (linkId: string) => {
    if (!selectedProject) return
    onUpdateProject(selectedProject.id, {
      links: (selectedProject.links ?? []).filter(l => l.id !== linkId),
    })
  }

  const PRIORITY_LABELS: Record<string, string> = { P1: 'Critico', P2: 'Alto', P3: 'Medio', P4: 'Baixo' }
  const STATUS_LABELS: Record<string, string> = { todo: 'A fazer', in_progress: 'Em andamento', blocked: 'Bloqueado', done: 'Concluido' }

  return (
    <div className="projects-split">
      {/* Sidebar */}
      <div className="projects-sidebar">
        <div className="projects-sidebar-header">
          <h2>Projetos</h2>
          <span className="projects-sidebar-count">{projects.length}</span>
        </div>

        <div className="projects-sidebar-filter">
          <div className="projects-sidebar-filter-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Buscar projetos..."
              className="projects-sidebar-search"
            />
            {filterText && (
              <button className="projects-sidebar-filter-clear" onClick={() => setFilterText('')}>&times;</button>
            )}
          </div>
        </div>

        <div className="projects-sidebar-list">
          {filteredProjects.map(p => (
            <div
              key={p.id}
              className={`projects-sidebar-item ${selectedId === p.id ? 'active' : ''}`}
              onClick={() => { setSelectedId(p.id === selectedId ? null : p.id); setShowAddForm(false); setActiveTab('links') }}
            >
              <span className="projects-sidebar-item-dot" style={{ background: p.color }} />
              <div className="projects-sidebar-item-text">
                <span className="projects-sidebar-item-title">{p.name}</span>
                {p.path && <span className="projects-sidebar-item-path">{p.path}</span>}
                {!p.path && p.description && <span className="projects-sidebar-item-path">{p.description}</span>}
              </div>
              {p.path && (
                <button
                  className="projects-sidebar-item-open"
                  onClick={e => { e.stopPropagation(); openLocalPath(p.path) }}
                  title="Abrir no Explorer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="projects-sidebar-empty">
              {projects.length === 0 ? 'Nenhum projeto' : 'Sem resultados'}
            </div>
          )}
        </div>

        <button className="projects-sidebar-add-btn" onClick={() => { setShowAddForm(true); setSelectedId(null) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Projeto
        </button>
      </div>

      {/* Main content */}
      <div className="projects-main">
        {/* Add form */}
        {showAddForm && (
          <div className="projects-detail">
            <div className="projects-detail-header">
              <div className="projects-detail-icon" style={{ background: formColor }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div>
                <h3>Novo Projeto</h3>
                <p className="projects-detail-subtitle">Crie uma central para seu projeto.</p>
              </div>
            </div>
            <div className="projects-detail-form">
              <label className="projects-detail-label">Nome do projeto *</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                placeholder="Nome do projeto"
                className="form-input"
                autoFocus
              />
              <label className="projects-detail-label">Descricao (opcional)</label>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Descricao curta do projeto"
                className="form-input"
              />
              <label className="projects-detail-label">Pasta do projeto (opcional)</label>
              <div className="projects-detail-input-row">
                <input
                  type="text"
                  value={formPath}
                  onChange={e => setFormPath(e.target.value)}
                  placeholder="C:\Projetos\MeuApp"
                  className="form-input"
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => void pickFolderPath(setFormPath, setFormName)}
                  disabled={!isElectron() || isPickingPath}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  </svg>
                </button>
              </div>
              <div className="projects-detail-input-row" style={{ gap: 12 }}>
                <div>
                  <label className="projects-detail-label">Cor</label>
                  <div className="projects-color-picker">
                    {PROJECT_COLORS.map(c => (
                      <button
                        key={c}
                        className={`projects-color-dot ${formColor === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setFormColor(c)}
                      />
                    ))}
                  </div>
                </div>
                {registeredIDEs.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <label className="projects-detail-label">IDE preferida</label>
                    <select
                      className="form-input"
                      value={formIdeId ?? ''}
                      onChange={e => setFormIdeId(e.target.value || null)}
                    >
                      <option value="">Nenhuma</option>
                      {registeredIDEs.map(ide => (
                        <option key={ide.id} value={ide.id}>{ide.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="projects-detail-actions">
                <button className="btn btn-primary" onClick={handleAddProject} disabled={!formName.trim()}>
                  Salvar Projeto
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Selected project detail */}
        {selectedProject && !showAddForm && (
          <div className="projects-detail">
            {/* Header */}
            {editingId === selectedProject.id ? (
              <div className="projects-detail-edit">
                <div className="projects-detail-header">
                  <div className="projects-detail-icon" style={{ background: editColor }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="form-input" placeholder="Nome" autoFocus />
                    <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="form-input" placeholder="Descricao" style={{ marginTop: 6 }} />
                    <div className="projects-detail-input-row" style={{ marginTop: 6 }}>
                      <input
                        type="text"
                        value={editPath}
                        onChange={e => setEditPath(e.target.value)}
                        className="form-input"
                        placeholder="Pasta do projeto (opcional)"
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => void pickFolderPath(setEditPath)}
                        disabled={!isElectron() || isPickingPath}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="projects-detail-input-row" style={{ gap: 12, marginTop: 10 }}>
                  <div>
                    <label className="projects-detail-label">Cor</label>
                    <div className="projects-color-picker">
                      {PROJECT_COLORS.map(c => (
                        <button key={c} className={`projects-color-dot ${editColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setEditColor(c)} />
                      ))}
                    </div>
                  </div>
                  {registeredIDEs.length > 0 && (
                    <div style={{ flex: 1 }}>
                      <label className="projects-detail-label">IDE preferida</label>
                      <select className="form-input" value={editIdeId ?? ''} onChange={e => setEditIdeId(e.target.value || null)}>
                        <option value="">Nenhuma</option>
                        {registeredIDEs.map(ide => (
                          <option key={ide.id} value={ide.id}>{ide.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="projects-detail-actions" style={{ marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit}>Salvar</button>
                  <button className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="projects-detail-header">
                  <div className="projects-detail-icon" style={{ background: selectedProject.color }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="28" height="28">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <div>
                    <h3>{selectedProject.name}</h3>
                    {selectedProject.description && <p className="projects-detail-subtitle">{selectedProject.description}</p>}
                    {selectedProject.path && <p className="projects-detail-path">{selectedProject.path}</p>}
                  </div>
                  <button className="projects-detail-close" onClick={() => setSelectedId(null)} title="Fechar">&times;</button>
                </div>

                {/* Toolbar */}
                <div className="projects-detail-toolbar">
                  {selectedProject.path && (
                    <button className="projects-detail-btn projects-detail-btn-primary" onClick={() => openLocalPath(selectedProject.path)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Explorer
                    </button>
                  )}

                  {/* Open with IDE — only if project has a path */}
                  {selectedProject.path && registeredIDEs.length > 0 && (
                    <div className="projects-ide-dropdown-wrap" onClick={e => e.stopPropagation()}>
                      {selectedProject.preferredIdeId ? (
                        <button className="projects-detail-btn projects-detail-btn-primary" onClick={() => void handleOpenWithPreferred(selectedProject)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                          </svg>
                          {registeredIDEs.find(i => i.id === selectedProject.preferredIdeId)?.name ?? 'IDE'}
                        </button>
                      ) : (
                        <button className="projects-detail-btn" onClick={() => setShowIdeDropdown(!showIdeDropdown)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                          </svg>
                          Abrir com IDE
                        </button>
                      )}
                      {showIdeDropdown && (
                        <div className="projects-ide-dropdown">
                          {registeredIDEs.map(ide => (
                            <button key={ide.id} className="projects-ide-dropdown-item" onClick={() => void handleOpenWithIDE(ide, selectedProject.path)}>
                              {ide.iconDataUrl ? <img src={ide.iconDataUrl} alt="" width={16} height={16} /> : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                                </svg>
                              )}
                              {ide.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button className="projects-detail-btn" onClick={() => handleStartEdit(selectedProject)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar
                  </button>
                  <button className="projects-detail-btn projects-detail-btn-danger" onClick={() => { onRemoveProject(selectedProject.id); setSelectedId(null) }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Excluir
                  </button>
                </div>

                {/* Tabs */}
                <div className="projects-tabs">
                  <button className={`projects-tab-btn ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Links ({(selectedProject.links ?? []).length})
                  </button>
                  {selectedProject.path && (
                    <button className={`projects-tab-btn ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
                      </svg>
                      Arquivos
                    </button>
                  )}
                  <button className={`projects-tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Notas ({projectNotes.length})
                  </button>
                  <button className={`projects-tab-btn ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                    </svg>
                    Cards ({projectCards.length})
                  </button>
                </div>

                {/* Tab content */}
                <div className="projects-tab-content">
                  {activeTab === 'links' && (
                    <div className="projects-links">
                      <div className="projects-links-add">
                        <input
                          type="text"
                          value={newLinkLabel}
                          onChange={e => setNewLinkLabel(e.target.value)}
                          placeholder="Label (ex: Repositorio)"
                          className="form-input"
                        />
                        <input
                          type="text"
                          value={newLinkUrl}
                          onChange={e => setNewLinkUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                          placeholder="URL (ex: https://github.com/...)"
                          className="form-input"
                          style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleAddLink} disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}>
                          +
                        </button>
                      </div>
                      {(selectedProject.links ?? []).length === 0 && (
                        <div className="projects-links-empty">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ opacity: 0.3 }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <p>Nenhum link. Adicione links importantes como repositorio, docs, staging, producao.</p>
                        </div>
                      )}
                      <div className="projects-links-list">
                        {(selectedProject.links ?? []).map(link => (
                          <div key={link.id} className="projects-links-item">
                            <div className="projects-links-item-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            </div>
                            <div className="projects-links-item-text">
                              <span className="projects-links-item-label">{link.label}</span>
                              <span className="projects-links-item-url">{link.url}</span>
                            </div>
                            <button
                              className="projects-links-item-open"
                              onClick={() => void openExternalLink(link.url)}
                              title="Abrir link"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </button>
                            <button
                              className="projects-links-item-remove"
                              onClick={() => handleRemoveLink(link.id)}
                              title="Remover link"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'files' && selectedProject.path && (
                    <FileBrowser rootPath={selectedProject.path} />
                  )}

                  {activeTab === 'notes' && (
                    <div className="projects-notes">
                      <div className="projects-notes-add">
                        <input
                          type="text"
                          value={newNoteTitle}
                          onChange={e => setNewNoteTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddProjectNote()}
                          placeholder="Nova nota..."
                          className="form-input"
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleAddProjectNote} disabled={!newNoteTitle.trim()}>
                          +
                        </button>
                      </div>
                      {projectNotes.length === 0 && (
                        <div className="projects-notes-empty">
                          <p>Nenhuma nota neste projeto.</p>
                        </div>
                      )}
                      {projectNotes.map(note => (
                        <div key={note.id} className="projects-notes-item">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="projects-notes-item-title">{note.title}</span>
                          <span className="projects-notes-item-date">{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'cards' && (
                    <div className="projects-cards">
                      {projectCards.length === 0 && (
                        <div className="projects-cards-empty">
                          <p>Nenhum card vinculado a este projeto.</p>
                          <p style={{ fontSize: 11, opacity: 0.6 }}>Vincule cards no Planejamento pelo CardModal.</p>
                        </div>
                      )}
                      {projectCards.map(card => (
                        <div key={card.id} className="projects-card-row" onClick={() => onCardClick?.(card)}>
                          <div className="projects-card-row-main">
                            <span className="projects-card-row-title">{card.title}</span>
                            {card.date && <span className="projects-card-row-date">{card.date}</span>}
                          </div>
                          <div className="projects-card-row-meta">
                            {card.priority && <span className="projects-card-row-badge">{card.priority} - {PRIORITY_LABELS[card.priority] ?? ''}</span>}
                            <span className="projects-card-row-badge">{STATUS_LABELS[card.status] ?? card.status}</span>
                          </div>
                          <button
                            className="projects-card-row-unlink"
                            onClick={e => { e.stopPropagation(); onEditCard(card.id, { projectId: null }) }}
                            title="Desvincular do projeto"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {!selectedProject && !showAddForm && (
          <div className="projects-main-empty">
            <div className="projects-main-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3>Selecione um projeto</h3>
            <p>Clique em um projeto na lista ou adicione um novo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
