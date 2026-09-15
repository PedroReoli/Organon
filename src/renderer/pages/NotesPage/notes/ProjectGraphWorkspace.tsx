import React from 'react'
import type { ProjectGraphData, ProjectGraphNode, ProjectGraphRecord } from '@types'

interface ProjectGraphWorkspaceProps {
  onClose: () => void
  onOpenNotesGraph: () => void
}

interface PositionedNode extends ProjectGraphNode {
  x: number
  y: number
}

const NODE_COLORS: Record<string, string> = {
  project: '#818cf8',
  directory: '#22d3ee',
  file: '#94a3b8',
}

const formatDate = (value: string | null): string => {
  if (!value) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const buildLayout = (graph: ProjectGraphData | null, query: string, typeFilter: string): PositionedNode[] => {
  if (!graph) return []
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const visible = graph.nodes.filter(node => {
    if (typeFilter !== 'all' && node.type !== typeFilter) return false
    return !normalizedQuery || node.label.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      || node.path.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
  }).slice(0, 450)

  const groups = new Map<string, ProjectGraphNode[]>()
  visible.forEach(node => groups.set(node.type, [...(groups.get(node.type) ?? []), node]))
  const columns = ['project', 'directory', 'file'].filter(type => groups.has(type))
  return columns.flatMap((type, columnIndex) => {
    const items = groups.get(type) ?? []
    const x = 130 + columnIndex * 330
    return items.map((node, index) => ({
      ...node,
      x: x + ((index % 2) * 118),
      y: 90 + Math.floor(index / 2) * 54,
    }))
  })
}

export const ProjectGraphWorkspace = ({ onClose, onOpenNotesGraph }: ProjectGraphWorkspaceProps) => {
  const [projects, setProjects] = React.useState<ProjectGraphRecord[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [graph, setGraph] = React.useState<ProjectGraphData | null>(null)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const selectedProject = React.useMemo(
    () => projects.find(project => project.id === selectedId) ?? null,
    [projects, selectedId],
  )
  const nodes = React.useMemo(() => buildLayout(graph, query, typeFilter), [graph, query, typeFilter])
  const visibleNodeIds = React.useMemo(() => new Set(nodes.map(node => node.id)), [nodes])
  const nodePositions = React.useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
  const selectedNode = React.useMemo(
    () => graph?.nodes.find(node => node.id === selectedNodeId) ?? null,
    [graph, selectedNodeId],
  )
  const connectedEdges = React.useMemo(
    () => selectedNodeId ? graph?.edges.filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId) ?? [] : [],
    [graph, selectedNodeId],
  )

  const refreshProjects = React.useCallback(async (preferredId?: string) => {
    const next = await window.electronAPI.listProjectGraphs()
    setProjects(next)
    setSelectedId(current => preferredId ?? current ?? next[0]?.id ?? null)
  }, [])

  React.useEffect(() => { void refreshProjects() }, [refreshProjects])

  React.useEffect(() => {
    setGraph(null)
    setSelectedNodeId(null)
    if (!selectedId) return
    void window.electronAPI.getProjectGraph(selectedId).then(setGraph)
  }, [selectedId])

  const addProject = async () => {
    const rootPath = await window.electronAPI.selectPath()
    if (!rootPath) return
    setBusy(true)
    setMessage('Catalogando projeto...')
    const added = await window.electronAPI.addProjectGraph(rootPath)
    if (!added.ok || !added.project) {
      setMessage(added.error ?? 'Não foi possível adicionar o projeto.')
      setBusy(false)
      return
    }
    await refreshProjects(added.project.id)
    const indexed = await window.electronAPI.runProjectGraph(added.project.id)
    setGraph(indexed.graph ?? null)
    setMessage(indexed.ok ? 'Projeto indexado com sucesso.' : indexed.error ?? 'A indexação falhou.')
    await refreshProjects(added.project.id)
    setBusy(false)
  }

  const runIndex = async () => {
    if (!selectedProject) return
    setBusy(true)
    setMessage('Lendo arquivos e relações locais...')
    const result = await window.electronAPI.runProjectGraph(selectedProject.id)
    setGraph(result.graph ?? null)
    setMessage(result.ok ? 'Índice atualizado.' : result.error ?? 'A indexação falhou.')
    await refreshProjects(selectedProject.id)
    setBusy(false)
  }

  const copyContext = async () => {
    if (!selectedProject) return
    const context = await window.electronAPI.getProjectGraphPrompt(selectedProject.id)
    if (!context) return
    await window.electronAPI.copyToClipboard(`${context.prompt}\n\nComando local:\n${context.command}`)
    setMessage('Prompt e comando copiados.')
  }

  const removeProject = async () => {
    if (!selectedProject || !window.confirm(`Remover ${selectedProject.name} do catálogo de grafos?`)) return
    await window.electronAPI.removeProjectGraph(selectedProject.id)
    setGraph(null)
    setSelectedId(null)
    await refreshProjects()
  }

  const openSelectedPath = async () => {
    if (!selectedProject) return
    const target = selectedNode?.path && selectedNode.path !== '.'
      ? `${selectedProject.rootPath}\\${selectedNode.path.replace(/\//g, '\\')}`
      : selectedProject.rootPath
    await window.electronAPI.openPath(target)
  }

  return (
    <div className="project-graph-center">
      <header className="project-graph-toolbar">
        <button className="project-graph-back" onClick={onClose}>Voltar para notas</button>
        <div className="project-graph-switcher" aria-label="Tipo de grafo">
          <button onClick={onOpenNotesGraph}>Notas</button>
          <button className="is-active">Projetos</button>
        </div>
        <div className="project-graph-title">
          <strong>Central de Grafos</strong>
          <span>Mapa técnico local e verificável</span>
        </div>
        <div className="project-graph-toolbar-actions">
          <button onClick={copyContext} disabled={!selectedProject}>Copiar contexto</button>
          <button onClick={() => void runIndex()} disabled={!selectedProject || busy}>Reindexar</button>
          <button className="is-primary" onClick={() => void addProject()} disabled={busy}>Adicionar projeto</button>
        </div>
      </header>

      <div className="project-graph-grid">
        <aside className="project-graph-catalog">
          <div className="project-graph-panel-heading">
            <span>Catálogo</span>
            <b>{projects.length}</b>
          </div>
          <div className="project-graph-projects">
            {projects.map(project => (
              <button
                key={project.id}
                className={project.id === selectedId ? 'is-active' : ''}
                onClick={() => setSelectedId(project.id)}
              >
                <i className={`status-${project.status}`} />
                <span><strong>{project.name}</strong><small>{project.summary?.nodes ?? 0} nós · {project.summary?.edges ?? 0} relações</small></span>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="project-graph-empty-small">Adicione um diretório para criar o primeiro mapa técnico.</div>
            )}
          </div>
          {selectedProject && (
            <div className="project-graph-project-meta">
              <span>Último índice</span><strong>{formatDate(selectedProject.lastIndexedAt)}</strong>
              <span>Diretório</span><button onClick={() => void window.electronAPI.openPath(selectedProject.rootPath)}>{selectedProject.rootPath}</button>
              {selectedProject.lastError && <p>{selectedProject.lastError}</p>}
              <button className="is-danger" onClick={() => void removeProject()}>Remover do catálogo</button>
            </div>
          )}
        </aside>

        <main className="project-graph-map">
          <div className="project-graph-filters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar arquivo, pasta ou caminho" />
            {['all', 'project', 'directory', 'file'].map(type => (
              <button key={type} className={typeFilter === type ? 'is-active' : ''} onClick={() => setTypeFilter(type)}>
                {type === 'all' ? 'Todos' : type === 'project' ? 'Projeto' : type === 'directory' ? 'Pastas' : 'Arquivos'}
              </button>
            ))}
            <span>{nodes.length}{graph && graph.nodes.length > nodes.length ? ` de ${graph.nodes.length}` : ''} nós</span>
          </div>
          {message && <div className={`project-graph-message${busy ? ' is-busy' : ''}`}>{message}</div>}
          {graph ? (
            <div className="project-graph-canvas" tabIndex={0}>
              <svg viewBox="0 0 1020 760" role="img" aria-label="Mapa de dependências do projeto">
                <g className="project-graph-edges">
                  {graph.edges.map((edge, index) => {
                    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return null
                    const source = nodePositions.get(edge.source)
                    const target = nodePositions.get(edge.target)
                    if (!source || !target) return null
                    return <line key={`${edge.source}-${edge.target}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={`origin-${edge.origin}`} />
                  })}
                </g>
                <g>
                  {nodes.map(node => (
                    <g key={node.id} className={`project-graph-node${selectedNodeId === node.id ? ' is-selected' : ''}`} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelectedNodeId(node.id)}>
                      <circle r={node.type === 'project' ? 18 : node.type === 'directory' ? 10 : 7} fill={NODE_COLORS[node.type] ?? '#64748b'} />
                      <text x={node.type === 'project' ? 25 : 16} y="4">{node.label.length > 27 ? `${node.label.slice(0, 26)}…` : node.label}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          ) : (
            <div className="project-graph-empty">
              <strong>{selectedProject ? 'Projeto ainda não indexado' : 'Seu portfólio técnico começa aqui'}</strong>
              <span>O índice é criado localmente pelo Python e registra apenas relações verificáveis.</span>
              <button onClick={() => void (selectedProject ? runIndex() : addProject())} disabled={busy}>
                {selectedProject ? 'Criar índice' : 'Selecionar diretório'}
              </button>
            </div>
          )}
        </main>

        <aside className="project-graph-inspector">
          <div className="project-graph-panel-heading"><span>Inspetor</span></div>
          {selectedNode ? (
            <>
              <div className="project-graph-node-kind"><i style={{ background: NODE_COLORS[selectedNode.type] ?? '#64748b' }} />{selectedNode.type}</div>
              <h2>{selectedNode.label}</h2>
              <code>{selectedNode.path}</code>
              <button className="project-graph-open-path" onClick={() => void openSelectedPath()}>Abrir no sistema</button>
              <div className="project-graph-evidence">
                <strong>Relações verificadas</strong>
                {connectedEdges.slice(0, 30).map((edge, index) => (
                  <div key={`${edge.source}-${edge.target}-${index}`}>
                    <span>{edge.relation}</span><b>{edge.origin}</b>
                  </div>
                ))}
                {connectedEdges.length === 0 && <p>Nenhuma relação direta neste recorte.</p>}
              </div>
            </>
          ) : (
            <div className="project-graph-empty-small">Selecione um nó para ver caminho, tipo e origem das relações.</div>
          )}
        </aside>
      </div>
    </div>
  )
}
