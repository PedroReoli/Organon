import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  SavedSystemDesign,
  SYSTEM_DESIGN_COLORS,
  BUILTIN_TEMPLATES,
  ArchitectureTemplate,
} from '../types/systemDesign.types'
import {
  listSystemDesigns,
  saveSystemDesign,
  deleteSystemDesign,
  duplicateSystemDesign,
  createFromTemplate,
  exportSystemDesignToJson,
  exportSystemDesignToMarkdown,
  importSystemDesignFromJson,
} from '../services/systemDesignStorage'
import { exportToMermaid } from '../utils/mermaidExporter'
import {
  Network,
  Plus,
  Search,
  Copy,
  Trash2,
  Share2,
  Sparkles,
  Download,
  Upload,
  Layers,
  ArrowRight,
  X,
  Check,
  Edit2,
  FileCode,
  FileText,
  Clock,
} from 'lucide-react'
import '../../../styles/features/system-design/system-design-hub.css'

interface SystemDesignHubProps {
  onOpenDesign: (id: string) => void
}

export const SystemDesignHub: React.FC<SystemDesignHubProps> = ({ onOpenDesign }) => {
  const [designs, setDesigns] = useState<SavedSystemDesign[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'designs' | 'templates'>('designs')

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingDesign, setEditingDesign] = useState<SavedSystemDesign | null>(null)
  const [exportModalDesign, setExportModalDesign] = useState<SavedSystemDesign | null>(null)
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown' | 'mermaid'>('json')
  const [copySuccess, setCopySuccess] = useState(false)

  // Formulário de Criação / Edição
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState(SYSTEM_DESIGN_COLORS[0].color)
  const [formTags, setFormTags] = useState('')
  const [formStarterTemplate, setFormStarterTemplate] = useState<string>('blank')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const reloadDesigns = () => {
    setDesigns(listSystemDesigns())
  }

  useEffect(() => {
    reloadDesigns()
  }, [])

  // Tags únicas de todos os designs salvos
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const d of designs) {
      for (const t of d.tags) {
        if (t.trim()) set.add(t.trim())
      }
    }
    return Array.from(set)
  }, [designs])

  // Filtragem de designs
  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => {
      if (activeTab === 'templates' && !d.isTemplate) return false

      const matchSearch =
        searchQuery.trim() === '' ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.nodes.some((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchTag = !selectedTag || d.tags.includes(selectedTag)

      return matchSearch && matchTag
    })
  }, [designs, searchQuery, selectedTag, activeTab])

  // Handlers de Ações
  const handleOpenCreateModal = () => {
    setFormName('')
    setFormDesc('')
    setFormColor(SYSTEM_DESIGN_COLORS[0].color)
    setFormTags('')
    setFormStarterTemplate('blank')
    setIsCreateModalOpen(true)
  }

  const handleOpenEditModal = (design: SavedSystemDesign, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingDesign(design)
    setFormName(design.name)
    setFormDesc(design.description || '')
    setFormColor(design.color || SYSTEM_DESIGN_COLORS[0].color)
    setFormTags(design.tags.join(', '))
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^[#\s]+/, ''))
      .filter(Boolean)

    if (editingDesign) {
      // Atualizando design existente
      saveSystemDesign({
        ...editingDesign,
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
        tags: parsedTags,
      })
      setEditingDesign(null)
      reloadDesigns()
    } else {
      // Criando novo design
      let initialNodes = []
      let initialEdges = []

      if (formStarterTemplate !== 'blank') {
        const foundTemplate = BUILTIN_TEMPLATES.find((t) => t.id === formStarterTemplate)
        if (foundTemplate) {
          initialNodes = JSON.parse(JSON.stringify(foundTemplate.nodes))
          initialEdges = JSON.parse(JSON.stringify(foundTemplate.edges))
        }
      }

      const created = saveSystemDesign({
        name: formName.trim(),
        description: formDesc.trim(),
        color: formColor,
        tags: parsedTags.length > 0 ? parsedTags : ['arquitetura'],
        nodes: initialNodes,
        edges: initialEdges,
        isTemplate: false,
      })

      setIsCreateModalOpen(false)
      reloadDesigns()
      onOpenDesign(created.id)
    }
  }

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Tem certeza que deseja excluir o design "${name}"?`)) {
      deleteSystemDesign(id)
      reloadDesigns()
    }
  }

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateSystemDesign(id)
    reloadDesigns()
  }

  const handleOpenExportModal = (design: SavedSystemDesign, e: React.MouseEvent) => {
    e.stopPropagation()
    setExportModalDesign(design)
    setExportFormat('json')
    setCopySuccess(false)
  }

  const handleUseBuiltinTemplate = (tpl: ArchitectureTemplate) => {
    const created = createFromTemplate(tpl)
    reloadDesigns()
    onOpenDesign(created.id)
  }

  // Importação JSON
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const res = importSystemDesignFromJson(content)
        if (res.success && res.design) {
          reloadDesigns()
          onOpenDesign(res.design.id)
        } else {
          alert(res.error || 'Falha ao importar arquivo JSON.')
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Conteúdo para Exportação
  const exportContent = useMemo(() => {
    if (!exportModalDesign) return ''
    if (exportFormat === 'json') {
      return exportSystemDesignToJson(exportModalDesign)
    }
    if (exportFormat === 'markdown') {
      return exportSystemDesignToMarkdown(exportModalDesign)
    }
    if (exportFormat === 'mermaid') {
      return exportToMermaid(exportModalDesign.nodes, exportModalDesign.edges)
    }
    return ''
  }, [exportModalDesign, exportFormat])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportContent)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleDownloadFile = () => {
    if (!exportModalDesign) return
    const filename = `${exportModalDesign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${
      exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'md' : 'mmd'
    }`
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sdh-container">
      {/* Input invisível para upload de arquivo JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Cabeçalho Principal do Hub */}
      <div className="sdh-header">
        <div className="sdh-header-left">
          <div className="sdh-header-icon">
            <Network size={22} />
          </div>
          <div>
            <h1 className="sdh-title">
              <span>System Design Hub</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                100% Local & Seguro
              </span>
            </h1>
            <div className="sdh-subtitle">
              Crie, personalize, versione e exporte diagramas de arquitetura para CLI, IA e documentação técnica.
            </div>
          </div>
        </div>

        <div className="sdh-header-actions">
          <button type="button" onClick={handleImportClick} className="sdh-btn-secondary">
            <Upload size={14} />
            <span>Importar JSON</span>
          </button>

          <button type="button" onClick={handleOpenCreateModal} className="sdh-btn-primary">
            <Plus size={15} />
            <span>Novo Design</span>
          </button>
        </div>
      </div>

      {/* Toolbar com Busca, Abas e Filtros */}
      <div className="sdh-toolbar">
        <div className="sdh-search-box">
          <Search size={15} className="sdh-search-icon" />
          <input
            type="text"
            placeholder="Buscar por título, tag ou componente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sdh-search-input"
          />
        </div>

        <div className="sdh-tabs-bar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('designs')
              setSelectedTag(null)
            }}
            className={`sdh-tab-btn ${activeTab === 'designs' ? 'active' : ''}`}
          >
            <Layers size={13} />
            <span>Meus Projetos ({designs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('templates')
              setSelectedTag(null)
            }}
            className={`sdh-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          >
            <Sparkles size={13} />
            <span>Templates Nativos ({BUILTIN_TEMPLATES.length})</span>
          </button>
        </div>
      </div>

      {/* Filtro por Tags Rápidas */}
      {activeTab === 'designs' && allTags.length > 0 && (
        <div className="sdh-tag-pills">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`sdh-tag-pill ${selectedTag === null ? 'active' : ''}`}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`sdh-tag-pill ${selectedTag === tag ? 'active' : ''}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid de Conteúdo */}
      {activeTab === 'designs' ? (
        <div className="sdh-grid">
          {filteredDesigns.map((design) => {
            const cardAccent = design.color || '#6366f1'
            return (
              <div
                key={design.id}
                className="sdh-card"
                style={{ ['--card-accent' as any]: cardAccent }}
                onClick={() => onOpenDesign(design.id)}
              >
                <div className="sdh-card-stripe" />
                <div className="sdh-card-body">
                  <div className="sdh-card-top">
                    <h3
                      className="sdh-card-title"
                      title={design.name}
                      onClick={() => onOpenDesign(design.id)}
                    >
                      {design.name}
                    </h3>
                  </div>

                  <p className="sdh-card-desc">
                    {design.description || 'Diagrama de arquitetura de software distribuída.'}
                  </p>

                  <div className="sdh-card-tags">
                    {design.tags.map((t) => (
                      <span key={t} className="sdh-card-tag">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="sdh-card-meta">
                    <div className="sdh-card-stats">
                      <span className="sdh-card-stat-item" title="Componentes (Nós)">
                        <Layers size={12} />
                        {design.nodes.length} nós
                      </span>
                      <span className="sdh-card-stat-item" title="Conexões">
                        <Network size={12} />
                        {design.edges.length} conexões
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      <span>
                        {new Date(design.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sdh-card-actions">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDesign(design.id)
                    }}
                    className="sdh-card-btn-open"
                  >
                    <span>Editar no Canvas</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    title="Exportar para JSON, Markdown ou Mermaid"
                    onClick={(e) => handleOpenExportModal(design, e)}
                    className="sdh-card-btn-icon"
                  >
                    <Share2 size={13} />
                  </button>

                  <button
                    type="button"
                    title="Duplicar projeto"
                    onClick={(e) => handleDuplicate(design.id, e)}
                    className="sdh-card-btn-icon"
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    type="button"
                    title="Editar propriedades (nome, cor, tags)"
                    onClick={(e) => handleOpenEditModal(design, e)}
                    className="sdh-card-btn-icon"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    type="button"
                    title="Excluir design"
                    onClick={(e) => handleDelete(design.id, design.name, e)}
                    className="sdh-card-btn-icon"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {filteredDesigns.length === 0 && (
            <div className="sdh-empty-state">
              <div className="sdh-empty-icon">
                <Network size={24} />
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                  Nenhum projeto encontrado
                </strong>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {searchQuery || selectedTag
                    ? 'Tente limpar a busca ou os filtros de tags.'
                    : 'Crie seu primeiro diagrama de arquitetura clicando em "Novo Design".'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="sdh-btn-primary"
                style={{ marginTop: '6px' }}
              >
                <Plus size={14} />
                <span>Criar Novo Design</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Aba de Templates Nativos Integrados */
        <div className="sdh-grid">
          {BUILTIN_TEMPLATES.map((tpl, idx) => {
            const templateColor =
              SYSTEM_DESIGN_COLORS[idx % SYSTEM_DESIGN_COLORS.length]?.color || '#6366f1'
            return (
              <div
                key={tpl.id}
                className="sdh-card"
                style={{ ['--card-accent' as any]: templateColor }}
              >
                <div className="sdh-card-stripe" />
                <div className="sdh-card-body">
                  <div className="sdh-card-top">
                    <h3 className="sdh-card-title">{tpl.name}</h3>
                  </div>

                  <p className="sdh-card-desc">{tpl.description}</p>

                  <div className="sdh-card-tags">
                    <span className="sdh-card-tag">#{tpl.category.toLowerCase()}</span>
                    <span className="sdh-card-tag">#template</span>
                  </div>

                  <div className="sdh-card-meta">
                    <div className="sdh-card-stats">
                      <span className="sdh-card-stat-item">
                        <Layers size={12} />
                        {tpl.nodes.length} nós
                      </span>
                      <span className="sdh-card-stat-item">
                        <Network size={12} />
                        {tpl.edges.length} conexões
                      </span>
                    </div>

                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: templateColor }}>
                      Modelo Pronto
                    </span>
                  </div>
                </div>

                <div className="sdh-card-actions">
                  <button
                    type="button"
                    onClick={() => handleUseBuiltinTemplate(tpl)}
                    className="sdh-card-btn-open"
                  >
                    <Sparkles size={13} />
                    <span>Usar Este Template</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: CRIAR / EDITAR DESIGN */}
      {(isCreateModalOpen || editingDesign) && (
        <div
          className="sdh-modal-backdrop"
          onClick={() => {
            setIsCreateModalOpen(false)
            setEditingDesign(null)
          }}
        >
          <div className="sdh-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sdh-modal-header">
              <h2 className="sdh-modal-title">
                <Network size={18} style={{ color: formColor }} />
                <span>{editingDesign ? 'Editar Propriedades do Design' : 'Novo System Design'}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setEditingDesign(null)
                }}
                className="sdh-card-btn-icon"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="sdh-modal-body">
                <div className="sdh-form-group">
                  <label className="sdh-form-label">Nome do Projeto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: E-Commerce Event-Driven, Pipeline RAG, Auth Gateway"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="sdh-form-input"
                    autoFocus
                  />
                </div>

                <div className="sdh-form-group">
                  <label className="sdh-form-label">Descrição Resumida</label>
                  <textarea
                    rows={2}
                    placeholder="Explique o objetivo arquitetural ou escopo do sistema..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="sdh-form-textarea"
                  />
                </div>

                {/* Seletor de Cor de Destaque */}
                <div className="sdh-form-group">
                  <label className="sdh-form-label">Cor de Identificação</label>
                  <div className="sdh-color-selector">
                    {SYSTEM_DESIGN_COLORS.map((col) => {
                      const isActive = formColor === col.color
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setFormColor(col.color)}
                          className={`sdh-color-circle ${isActive ? 'active' : ''}`}
                          style={{ background: col.color }}
                          title={col.name}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div className="sdh-form-group">
                  <label className="sdh-form-label">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="microservices, kafka, cloud, ia, postgres"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="sdh-form-input"
                  />
                </div>

                {/* Escolha do ponto de partida (Apenas ao criar) */}
                {!editingDesign && (
                  <div className="sdh-form-group">
                    <label className="sdh-form-label">Ponto de Partida</label>
                    <select
                      className="sdh-form-input"
                      value={formStarterTemplate}
                      onChange={(e) => setFormStarterTemplate(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="blank">Canvas em Branco (Criar do Zero)</option>
                      {BUILTIN_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          Template: {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="sdh-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setEditingDesign(null)
                  }}
                  className="sdh-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="sdh-btn-primary">
                  <span>{editingDesign ? 'Salvar Alterações' : 'Criar e Abrir Canvas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPORTAR E COMPARTILHAR (JSON, MARKDOWN, MERMAID) */}
      {exportModalDesign && (
        <div className="sdh-modal-backdrop" onClick={() => setExportModalDesign(null)}>
          <div
            className="sdh-modal-dialog"
            style={{ width: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sdh-modal-header">
              <h2 className="sdh-modal-title">
                <Share2 size={16} style={{ color: exportModalDesign.color || '#6366f1' }} />
                <span>Exportar Arquitetura: {exportModalDesign.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setExportModalDesign(null)}
                className="sdh-card-btn-icon"
              >
                <X size={15} />
              </button>
            </div>

            <div className="sdh-modal-body">
              {/* Seletor de Formato */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${exportFormat === 'json' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background:
                      exportFormat === 'json'
                        ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))'
                        : 'var(--color-background)',
                    color: exportFormat === 'json' ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                    <FileCode size={14} />
                    <span>JSON Estruturado</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Ideal para CLI e envio para IA
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('markdown')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${exportFormat === 'markdown' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background:
                      exportFormat === 'markdown'
                        ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))'
                        : 'var(--color-background)',
                    color: exportFormat === 'markdown' ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                    <FileText size={14} />
                    <span>Markdown + IA</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Com relatório e prompt de análise
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('mermaid')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${exportFormat === 'mermaid' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background:
                      exportFormat === 'mermaid'
                        ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))'
                        : 'var(--color-background)',
                    color: exportFormat === 'mermaid' ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                    <Network size={14} />
                    <span>Mermaid (.mmd)</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Código puro para diagramas
                  </div>
                </button>
              </div>

              {/* Prévia do Código */}
              <div>
                <label className="sdh-form-label" style={{ marginBottom: '6px', display: 'block' }}>
                  Prévia do Arquivo Gerado:
                </label>
                <div className="sdh-code-preview">{exportContent}</div>
              </div>
            </div>

            <div className="sdh-modal-footer">
              <button type="button" onClick={handleDownloadFile} className="sdh-btn-secondary">
                <Download size={13} />
                <span>
                  Baixar .{exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'md' : 'mmd'}
                </span>
              </button>

              <button type="button" onClick={handleCopyCode} className="sdh-btn-primary">
                {copySuccess ? (
                  <>
                    <Check size={14} />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
