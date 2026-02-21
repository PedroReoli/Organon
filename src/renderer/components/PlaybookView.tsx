import { useEffect, useMemo, useRef, useState } from 'react'
import type { Playbook, PlaybookDialog } from '../types'
import { copyTextToClipboard } from '../utils'
import { WysiwygEditor } from './WysiwygEditor'

interface PlaybookViewProps {
  playbooks: Playbook[]
  onAddPlaybook: (input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
  }) => string | undefined
  onUpdatePlaybook: (playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content'>>) => void
  onRemovePlaybook: (playbookId: string) => void
  onAddDialog: (playbookId: string, input: { title: string; text: string }) => string
  onUpdateDialog: (playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text'>>) => void
  onRemoveDialog: (playbookId: string, dialogId: string) => void
}

interface PlaybookForm {
  title: string
  sector: string
  category: string
  summary: string
  content: string
}

interface DialogForm {
  title: string
  text: string
}

interface ContextMenuState {
  x: number
  y: number
  playbookId: string
}

const EMPTY_FORM: PlaybookForm = {
  title: '',
  sector: '',
  category: '',
  summary: '',
  content: '',
}

const EMPTY_DIALOG_FORM: DialogForm = {
  title: '',
  text: '',
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const processDialogText = (text: string): string =>
  text
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/br>/gi, '\n')

const extractDialogVariables = (text: string): string[] => {
  const found = new Set<string>()
  const matches = text.matchAll(/{([^{}]+)}/g)

  for (const match of matches) {
    const name = (match[1] ?? '').trim()
    if (name) found.add(name)
  }

  return Array.from(found)
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const applyDialogVariables = (
  text: string,
  values: Record<string, string>,
  boldMap: Record<string, boolean>,
): string =>
  text.replace(/{([^{}]+)}/g, (_, variable) => {
    const name = String(variable ?? '').trim()
    if (!name) return '{}'

    const rawValue = values[name]?.trim() ?? ''
    if (!rawValue) return `{${name}}`

    const safeValue = escapeHtml(rawValue)
    return boldMap[name] ? `<strong>${safeValue}</strong>` : safeValue
  })

const toForm = (playbook: Playbook): PlaybookForm => ({
  title: playbook.title,
  sector: playbook.sector,
  category: playbook.category,
  summary: playbook.summary,
  content: playbook.content,
})

export const PlaybookView = ({
  playbooks,
  onAddPlaybook,
  onUpdatePlaybook,
  onRemovePlaybook,
  onAddDialog,
  onUpdateDialog,
  onRemoveDialog,
}: PlaybookViewProps) => {
  const [screen, setScreen] = useState<'catalog' | 'detail'>('catalog')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null)
  const [selectedDialogId, setSelectedDialogId] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<PlaybookForm>(EMPTY_FORM)

  const [showPlaybookEditModal, setShowPlaybookEditModal] = useState(false)
  const [editingPlaybookId, setEditingPlaybookId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PlaybookForm>(EMPTY_FORM)

  const [showDialogModal, setShowDialogModal] = useState(false)
  const [editingDialogId, setEditingDialogId] = useState<string | null>(null)
  const [dialogForm, setDialogForm] = useState<DialogForm>(EMPTY_DIALOG_FORM)
  const [dialogVariableValues, setDialogVariableValues] = useState<Record<string, string>>({})
  const [dialogVariableBold, setDialogVariableBold] = useState<Record<string, boolean>>({})
  const [dialogCopyStatus, setDialogCopyStatus] = useState('')

  const [isDetailEditing, setIsDetailEditing] = useState(false)
  const [detailContentDraft, setDetailContentDraft] = useState('')

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const sortedPlaybooks = useMemo(
    () => [...playbooks].sort((a, b) => a.order - b.order),
    [playbooks],
  )

  const sectors = useMemo(
    () => Array.from(new Set(sortedPlaybooks.map(playbook => playbook.sector))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sortedPlaybooks],
  )

  const categories = useMemo(() => {
    const source = sectorFilter === 'todos'
      ? sortedPlaybooks
      : sortedPlaybooks.filter(playbook => playbook.sector === sectorFilter)

    return Array.from(new Set(source.map(playbook => playbook.category))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [sectorFilter, sortedPlaybooks])

  const filteredPlaybooks = useMemo(() => {
    const normalizedSearch = normalize(search)

    return sortedPlaybooks.filter(playbook => {
      if (sectorFilter !== 'todos' && playbook.sector !== sectorFilter) return false
      if (categoryFilter !== 'todas' && playbook.category !== categoryFilter) return false
      if (!normalizedSearch) return true

      const haystack = normalize([
        playbook.title,
        playbook.sector,
        playbook.category,
        playbook.summary,
        stripHtml(playbook.content),
      ].join(' '))

      return haystack.includes(normalizedSearch)
    })
  }, [categoryFilter, search, sectorFilter, sortedPlaybooks])

  const selectedPlaybook = useMemo(
    () => sortedPlaybooks.find(playbook => playbook.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId, sortedPlaybooks],
  )

  const sortedDialogs = useMemo(
    () => selectedPlaybook ? [...selectedPlaybook.dialogs].sort((a, b) => a.order - b.order) : [],
    [selectedPlaybook],
  )

  const selectedDialog = useMemo(
    () => sortedDialogs.find(dialog => dialog.id === selectedDialogId) ?? null,
    [selectedDialogId, sortedDialogs],
  )

  const editingPlaybook = useMemo(
    () => sortedPlaybooks.find(playbook => playbook.id === editingPlaybookId) ?? null,
    [editingPlaybookId, sortedPlaybooks],
  )

  const selectedDialogBaseText = useMemo(
    () => selectedDialog ? processDialogText(selectedDialog.text) : '',
    [selectedDialog],
  )

  const selectedDialogVariables = useMemo(
    () => extractDialogVariables(selectedDialogBaseText),
    [selectedDialogBaseText],
  )

  const selectedDialogPreviewHtml = useMemo(
    () => applyDialogVariables(selectedDialogBaseText, dialogVariableValues, dialogVariableBold),
    [dialogVariableBold, dialogVariableValues, selectedDialogBaseText],
  )

  useEffect(() => {
    if (categoryFilter !== 'todas' && !categories.includes(categoryFilter)) {
      setCategoryFilter('todas')
    }
  }, [categories, categoryFilter])

  useEffect(() => {
    if (!selectedPlaybookId) return
    if (sortedPlaybooks.some(playbook => playbook.id === selectedPlaybookId)) return

    setSelectedPlaybookId(null)
    setSelectedDialogId(null)
    setScreen('catalog')
  }, [selectedPlaybookId, sortedPlaybooks])

  useEffect(() => {
    if (!selectedPlaybook) {
      setSelectedDialogId(null)
      return
    }

    if (!selectedPlaybook.dialogs.some(dialog => dialog.id === selectedDialogId)) {
      setSelectedDialogId(selectedPlaybook.dialogs[0]?.id ?? null)
    }
  }, [selectedDialogId, selectedPlaybook])

  useEffect(() => {
    if (!contextMenu) return

    const onMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [contextMenu])

  useEffect(() => {
    setIsDetailEditing(false)
  }, [selectedPlaybookId])

  useEffect(() => {
    if (!selectedPlaybook) {
      setDetailContentDraft('')
      return
    }
    if (isDetailEditing) return
    setDetailContentDraft(selectedPlaybook.content)
  }, [isDetailEditing, selectedPlaybook])

  useEffect(() => {
    if (!selectedDialog) {
      setDialogVariableValues({})
      setDialogVariableBold({})
      setDialogCopyStatus('')
      return
    }

    const nextValues: Record<string, string> = {}
    const nextBold: Record<string, boolean> = {}
    selectedDialogVariables.forEach(name => {
      nextValues[name] = ''
      nextBold[name] = false
    })

    setDialogVariableValues(nextValues)
    setDialogVariableBold(nextBold)
    setDialogCopyStatus('')
  }, [selectedDialog, selectedDialogVariables])

  const openCreateModal = () => {
    setCreateForm(EMPTY_FORM)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateForm(EMPTY_FORM)
  }

  const createPlaybook = () => {
    const title = createForm.title.trim()
    if (!title) return

    const newId = onAddPlaybook({
      title,
      sector: createForm.sector.trim() || 'Geral',
      category: createForm.category.trim() || 'Geral',
      summary: createForm.summary.trim(),
      content: '',
    })

    if (!newId) return

    setShowCreateModal(false)
    setCreateForm(EMPTY_FORM)
    setSelectedPlaybookId(newId)
    setScreen('detail')
  }

  const openPlaybook = (playbookId: string) => {
    setSelectedPlaybookId(playbookId)
    setScreen('detail')
    setContextMenu(null)
  }

  const goBackToCatalog = () => {
    setScreen('catalog')
    setIsDetailEditing(false)
  }

  const removePlaybookById = (playbookId: string) => {
    onRemovePlaybook(playbookId)
    if (selectedPlaybookId === playbookId) {
      setSelectedPlaybookId(null)
      setSelectedDialogId(null)
      setScreen('catalog')
    }
  }

  const openPlaybookEditModal = (playbookId: string) => {
    const playbook = sortedPlaybooks.find(item => item.id === playbookId)
    if (!playbook) return

    setEditingPlaybookId(playbookId)
    setEditForm(toForm(playbook))
    setShowPlaybookEditModal(true)
    setContextMenu(null)
  }

  const closePlaybookEditModal = () => {
    setShowPlaybookEditModal(false)
    setEditingPlaybookId(null)
    setEditForm(EMPTY_FORM)
  }

  const savePlaybookEdit = () => {
    if (!editingPlaybookId) return
    const title = editForm.title.trim()
    if (!title) return

    onUpdatePlaybook(editingPlaybookId, {
      title,
      sector: editForm.sector.trim() || 'Geral',
      category: editForm.category.trim() || 'Geral',
      summary: editForm.summary.trim(),
    })

    closePlaybookEditModal()
  }

  const startDetailEdit = () => {
    if (!selectedPlaybook) return
    setDetailContentDraft(selectedPlaybook.content)
    setIsDetailEditing(true)
  }

  const cancelDetailEdit = () => {
    setDetailContentDraft(selectedPlaybook?.content ?? '')
    setIsDetailEditing(false)
  }

  const saveDetailContent = () => {
    if (!selectedPlaybook) return
    onUpdatePlaybook(selectedPlaybook.id, { content: detailContentDraft })
    setIsDetailEditing(false)
  }

  const openCreateDialogModal = () => {
    if (!selectedPlaybook) return
    setEditingDialogId(null)
    setDialogForm({
      title: `Dialogo ${selectedPlaybook.dialogs.length + 1}`,
      text: '',
    })
    setShowDialogModal(true)
  }

  const openDialogEditModal = (dialog: PlaybookDialog) => {
    setEditingDialogId(dialog.id)
    setDialogForm({
      title: dialog.title,
      text: dialog.text,
    })
    setShowDialogModal(true)
  }

  const closeDialogModal = () => {
    setShowDialogModal(false)
    setEditingDialogId(null)
    setDialogForm(EMPTY_DIALOG_FORM)
  }

  const saveDialogModal = () => {
    if (!selectedPlaybook) return

    const baseTitle = dialogForm.title.trim()
    const resolvedTitle = baseTitle || `Dialogo ${selectedPlaybook.dialogs.length + 1}`

    if (editingDialogId) {
      onUpdateDialog(selectedPlaybook.id, editingDialogId, {
        title: resolvedTitle,
        text: dialogForm.text,
      })
      setSelectedDialogId(editingDialogId)
      closeDialogModal()
      return
    }

    const dialogId = onAddDialog(selectedPlaybook.id, {
      title: resolvedTitle,
      text: dialogForm.text,
    })
    setSelectedDialogId(dialogId)
    closeDialogModal()
  }

  const removeDialogInModal = () => {
    if (!selectedPlaybook || !editingDialogId) return
    onRemoveDialog(selectedPlaybook.id, editingDialogId)
    if (selectedDialogId === editingDialogId) {
      setSelectedDialogId(null)
    }
    closeDialogModal()
  }

  const openSelectedDialogForEdit = () => {
    if (!selectedDialog) return
    openDialogEditModal(selectedDialog)
  }

  const copyDialogMessage = () => {
    const textToCopy = stripHtml(selectedDialogPreviewHtml)
    if (!textToCopy) {
      setDialogCopyStatus('Mensagem vazia para copiar.')
      return
    }

    void copyTextToClipboard(textToCopy).then(success => {
      setDialogCopyStatus(success ? 'Mensagem copiada.' : 'Nao foi possivel copiar automaticamente.')
    })
  }

  return (
    <div className="playbook-view">
      <header className="playbook-header">
        <div>
          <h2>Playbook</h2>
          <p className="playbook-subtitle">
            Organize playbooks por setor e abra uma pagina de detalhe com dialogos.
          </p>
        </div>
        <div className="playbook-header-actions">
          <button
            type="button"
            className="playbook-icon-btn playbook-icon-btn-primary"
            onClick={openCreateModal}
            title="Novo playbook"
            aria-label="Novo playbook"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="playbook-body">
        {screen === 'catalog' && (
          <>
            <section className="today-section playbook-filters-section">
              <div className="today-section-title">
                <h2>Filtros</h2>
              </div>
              <div className="playbook-filters-grid">
                <label className="playbook-field">
                  <span>Buscar</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Titulo, resumo ou conteudo..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </label>
                <label className="playbook-field">
                  <span>Setor</span>
                  <select
                    className="form-input"
                    value={sectorFilter}
                    onChange={event => {
                      setSectorFilter(event.target.value)
                      setCategoryFilter('todas')
                    }}
                  >
                    <option value="todos">Todos</option>
                    {sectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </label>
                <label className="playbook-field">
                  <span>Categoria</span>
                  <select
                    className="form-input"
                    value={categoryFilter}
                    onChange={event => setCategoryFilter(event.target.value)}
                  >
                    <option value="todas">Todas</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="today-section">
              <div className="today-section-title">
                <h2>Playbooks</h2>
                <span className="today-section-count">{filteredPlaybooks.length}</span>
              </div>

              {filteredPlaybooks.length === 0 ? (
                <div className="today-empty">Nenhum playbook encontrado para o filtro atual.</div>
              ) : (
                <div className="playbook-card-grid">
                  {filteredPlaybooks.map(playbook => (
                    <button
                      key={playbook.id}
                      type="button"
                      className={`playbook-card ${selectedPlaybookId === playbook.id ? 'is-active' : ''}`}
                      onClick={() => openPlaybook(playbook.id)}
                      onContextMenu={event => {
                        event.preventDefault()
                        setContextMenu({
                          x: event.clientX,
                          y: event.clientY,
                          playbookId: playbook.id,
                        })
                      }}
                      title="Clique para abrir | botao direito para editar"
                    >
                      <div className="playbook-card-top">
                        <strong>{playbook.title}</strong>
                        <span>{playbook.dialogs.length}</span>
                      </div>
                      <div className="playbook-card-tags">
                        <span>{playbook.sector}</span>
                        <span>{playbook.category}</span>
                      </div>
                      {playbook.summary ? (
                        <p>{playbook.summary}</p>
                      ) : (
                        <p>{stripHtml(playbook.content) || 'Sem resumo.'}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {screen === 'detail' && selectedPlaybook && (
          <div className="playbook-layout playbook-detail-layout">
            <section className="today-section playbook-detail-content">
              <div className="playbook-detail-navbar">
                <div className="playbook-detail-navbar-left">
                  <button
                    type="button"
                    className="playbook-icon-btn"
                    onClick={goBackToCatalog}
                    title="Voltar"
                    aria-label="Voltar"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <strong className="playbook-detail-title">{selectedPlaybook.title}</strong>
                </div>
                <div className="playbook-header-actions">
                  <button
                    type="button"
                    className="playbook-icon-btn"
                    onClick={() => {
                      if (isDetailEditing) {
                        cancelDetailEdit()
                      } else {
                        startDetailEdit()
                      }
                    }}
                    title={isDetailEditing ? 'Preview' : 'Editar'}
                    aria-label={isDetailEditing ? 'Preview' : 'Editar'}
                  >
                    {isDetailEditing ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25z" />
                        <path d="M14.06 4.94l3.75 3.75" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="playbook-icon-btn playbook-icon-btn-danger"
                    onClick={() => removePlaybookById(selectedPlaybook.id)}
                    title="Excluir playbook"
                    aria-label="Excluir playbook"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14H7L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="playbook-detail-meta">
                <span>{selectedPlaybook.sector}</span>
                <span>{selectedPlaybook.category}</span>
              </div>

              {isDetailEditing ? (
                <>
                  <div className="playbook-editor-body">
                    <div className="playbook-wysiwyg-shell playbook-wysiwyg-shell-edit">
                      <WysiwygEditor
                        content={detailContentDraft}
                        onChange={next => setDetailContentDraft(next)}
                        placeholder="Descreva o playbook..."
                        mode="full"
                      />
                    </div>
                  </div>
                  <div className="playbook-detail-edit-actions">
                    <button type="button" className="btn btn-secondary" onClick={cancelDetailEdit}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" onClick={saveDetailContent}>
                      Salvar conteudo
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="playbook-content-html"
                  dangerouslySetInnerHTML={{
                    __html: selectedPlaybook.content || '<p>Sem conteudo.</p>',
                  }}
                />
              )}
            </section>

            <aside className="today-section playbook-dialogs-section">
              <div className="today-section-title">
                <h2>Dialogos</h2>
                <span className="today-section-count">{sortedDialogs.length}</span>
                <button
                  type="button"
                  className="playbook-icon-btn playbook-icon-btn-primary"
                  onClick={openCreateDialogModal}
                  title="Novo dialogo"
                  aria-label="Novo dialogo"
                  style={{ marginLeft: 8 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              <div className="playbook-dialogs-body">
                {sortedDialogs.length === 0 ? (
                  <div className="today-empty">Nenhum dialogo criado.</div>
                ) : (
                  <div className="playbook-dialog-list">
                    {sortedDialogs.map((dialog, index) => (
                      <button
                        key={dialog.id}
                        type="button"
                        className={`playbook-dialog-item ${selectedDialogId === dialog.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedDialogId(dialog.id)}
                      >
                        <span className="playbook-dialog-order">{index + 1}</span>
                        <span className="playbook-dialog-title">{dialog.title || `Dialogo ${index + 1}`}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="playbook-dialog-detail">
                  {selectedDialog ? (
                    <>
                      <div className="playbook-dialog-detail-head">
                        <strong>{selectedDialog.title || 'Dialogo'}</strong>
                        <button
                          type="button"
                          className="playbook-icon-btn"
                          onClick={openSelectedDialogForEdit}
                          title="Editar dialogo"
                          aria-label="Editar dialogo"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25z" />
                            <path d="M14.06 4.94l3.75 3.75" />
                          </svg>
                        </button>
                      </div>

                      <div className="playbook-dialog-preview-wrap">
                        {selectedDialogVariables.length > 0 && (
                          <div className="playbook-variables">
                            <h4>Variaveis da mensagem</h4>
                            <div className="playbook-variables-grid">
                              {selectedDialogVariables.map(variableName => (
                                <label key={variableName} className="playbook-variable-field">
                                  <span>{`{${variableName}}`}</span>
                                  <div className="playbook-variable-row">
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={dialogVariableValues[variableName] ?? ''}
                                      onChange={event => {
                                        const nextValue = event.target.value
                                        setDialogVariableValues(prev => ({ ...prev, [variableName]: nextValue }))
                                        setDialogCopyStatus('')
                                      }}
                                      placeholder={`Digite ${variableName}`}
                                    />
                                    <button
                                      type="button"
                                      className={`playbook-bold-toggle ${dialogVariableBold[variableName] ? 'is-active' : ''}`}
                                      onClick={() => {
                                        setDialogVariableBold(prev => ({ ...prev, [variableName]: !prev[variableName] }))
                                        setDialogCopyStatus('')
                                      }}
                                      title="Aplicar negrito nesta variavel"
                                      aria-label={`Negrito para ${variableName}`}
                                    >
                                      B
                                    </button>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="playbook-preview">
                          <div className="playbook-preview-header">
                            <h4>Preview</h4>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={copyDialogMessage}>
                              Copiar mensagem
                            </button>
                          </div>

                          <div
                            className="playbook-dialog-detail-content playbook-content-html"
                            dangerouslySetInnerHTML={{
                              __html: selectedDialogPreviewHtml || '<p>Sem conteudo.</p>',
                            }}
                          />

                          {dialogCopyStatus ? (
                            <span className="playbook-copy-status">{dialogCopyStatus}</span>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="quick-access-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            type="button"
            className="quick-access-context-item"
            onClick={() => openPlaybookEditModal(contextMenu.playbookId)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 11.5V13h1.5L12.8 4.7l-1.5-1.5L3 11.5Z" />
              <path d="m10.5 3.5 1.5 1.5" />
            </svg>
            Editar
          </button>
          <button
            type="button"
            className="quick-access-context-item"
            onClick={() => {
              removePlaybookById(contextMenu.playbookId)
              setContextMenu(null)
            }}
            style={{ color: 'var(--color-danger)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
              <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
            </svg>
            Excluir
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal playbook-create-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo playbook</h2>
              <button type="button" className="modal-close-btn" onClick={closeCreateModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body playbook-create-modal-body">
              <div className="playbook-editor-inline-grid">
                <label className="playbook-field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.title}
                    onChange={event => setCreateForm(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="Ex: Qualificacao de lead"
                  />
                </label>
                <label className="playbook-field">
                  <span>Setor</span>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.sector}
                    onChange={event => setCreateForm(prev => ({ ...prev, sector: event.target.value }))}
                    placeholder="Ex: Comercial"
                  />
                </label>
                <label className="playbook-field">
                  <span>Categoria</span>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.category}
                    onChange={event => setCreateForm(prev => ({ ...prev, category: event.target.value }))}
                    placeholder="Ex: Atendimento"
                  />
                </label>
                <label className="playbook-field">
                  <span>Resumo</span>
                  <input
                    type="text"
                    className="form-input"
                    value={createForm.summary}
                    onChange={event => setCreateForm(prev => ({ ...prev, summary: event.target.value }))}
                    placeholder="Resumo rapido"
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer playbook-create-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={createPlaybook} disabled={!createForm.title.trim()}>
                Criar playbook
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlaybookEditModal && editingPlaybook && (
        <div className="modal-backdrop" onClick={closePlaybookEditModal}>
          <div className="modal playbook-create-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar playbook</h2>
              <button type="button" className="modal-close-btn" onClick={closePlaybookEditModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body playbook-edit-modal-body">
              <div className="playbook-editor-inline-grid">
                <label className="playbook-field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.title}
                    onChange={event => setEditForm(prev => ({ ...prev, title: event.target.value }))}
                  />
                </label>
                <label className="playbook-field">
                  <span>Setor</span>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.sector}
                    onChange={event => setEditForm(prev => ({ ...prev, sector: event.target.value }))}
                  />
                </label>
                <label className="playbook-field">
                  <span>Categoria</span>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.category}
                    onChange={event => setEditForm(prev => ({ ...prev, category: event.target.value }))}
                  />
                </label>
                <label className="playbook-field">
                  <span>Resumo</span>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.summary}
                    onChange={event => setEditForm(prev => ({ ...prev, summary: event.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer playbook-create-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closePlaybookEditModal}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={savePlaybookEdit} disabled={!editForm.title.trim()}>
                Salvar alteracoes
              </button>
            </div>
          </div>
        </div>
      )}

      {showDialogModal && selectedPlaybook && (
        <div className="modal-backdrop" onClick={closeDialogModal}>
          <div className="modal playbook-create-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDialogId ? 'Editar dialogo' : 'Novo dialogo'}</h2>
              <button type="button" className="modal-close-btn" onClick={closeDialogModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body playbook-modal-body">
              <label className="playbook-field">
                <span>Titulo</span>
                <input
                  type="text"
                  className="form-input"
                  value={dialogForm.title}
                  onChange={event => setDialogForm(prev => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Abertura da conversa"
                />
              </label>

              <div className="playbook-field">
                <span>Conteudo</span>
                <div className="playbook-wysiwyg-shell playbook-wysiwyg-shell-edit">
                  <WysiwygEditor
                    key={editingDialogId ?? 'new-dialog'}
                    content={dialogForm.text}
                    onChange={next => setDialogForm(prev => ({ ...prev, text: next }))}
                    placeholder="Escreva o conteudo do dialogo..."
                    mode="full"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {editingDialogId ? (
                <button type="button" className="btn btn-danger" onClick={removeDialogInModal}>
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={closeDialogModal}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={saveDialogModal}>
                  {editingDialogId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
