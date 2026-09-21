import {
  SavedSystemDesign,
  SystemNode,
  SystemEdge,
  BUILTIN_TEMPLATES,
  ArchitectureTemplate,
  SYSTEM_DESIGN_COLORS,
} from '../types/systemDesign.types'
import { exportToMermaid } from '../utils/mermaidExporter'

const STORAGE_KEY = 'organon_system_designs_v1'

/**
 * Converte templates nativos em designs iniciais para o primeiro acesso
 */
function createInitialDesigns(): SavedSystemDesign[] {
  const colors = SYSTEM_DESIGN_COLORS.map((c) => c.color)
  return BUILTIN_TEMPLATES.map((tpl, index) => ({
    id: `design-${tpl.id}`,
    name: tpl.name,
    description: tpl.description,
    color: colors[index % colors.length] || '#6366f1',
    tags: [tpl.category.toLowerCase().replace(/\s+/g, '-'), 'template', 'referencia'],
    nodes: JSON.parse(JSON.stringify(tpl.nodes)),
    edges: JSON.parse(JSON.stringify(tpl.edges)),
    createdAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
    isTemplate: false,
  }))
}

/**
 * Lista todos os system designs salvos no armazenamento local
 */
export function listSystemDesigns(): SavedSystemDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initials = createInitialDesigns()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initials))
      return initials
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Erro ao listar system designs do localStorage:', err)
    return []
  }
}

/**
 * Obtém um design por ID
 */
export function getSystemDesign(id: string): SavedSystemDesign | null {
  const all = listSystemDesigns()
  return all.find((d) => d.id === id) || null
}

/**
 * Salva ou atualiza um system design
 */
export function saveSystemDesign(
  design: Partial<SavedSystemDesign> & { name: string; nodes: SystemNode[]; edges: SystemEdge[] }
): SavedSystemDesign {
  const all = listSystemDesigns()
  const now = new Date().toISOString()

  let savedItem: SavedSystemDesign

  if (design.id) {
    const index = all.findIndex((d) => d.id === design.id)
    if (index >= 0) {
      savedItem = {
        ...all[index],
        ...design,
        updatedAt: now,
      }
      all[index] = savedItem
    } else {
      savedItem = {
        id: design.id,
        name: design.name.trim(),
        description: design.description?.trim() || '',
        color: design.color || SYSTEM_DESIGN_COLORS[0].color,
        tags: design.tags || [],
        nodes: design.nodes || [],
        edges: design.edges || [],
        createdAt: design.createdAt || now,
        updatedAt: now,
        isTemplate: !!design.isTemplate,
      }
      all.unshift(savedItem)
    }
  } else {
    savedItem = {
      id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: design.name.trim(),
      description: design.description?.trim() || '',
      color: design.color || SYSTEM_DESIGN_COLORS[0].color,
      tags: design.tags || [],
      nodes: design.nodes || [],
      edges: design.edges || [],
      createdAt: now,
      updatedAt: now,
      isTemplate: !!design.isTemplate,
    }
    all.unshift(savedItem)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (err) {
    console.error('Erro ao persistir system design:', err)
  }

  return savedItem
}

/**
 * Remove um system design do armazenamento local
 */
export function deleteSystemDesign(id: string): boolean {
  const all = listSystemDesigns()
  const filtered = all.filter((d) => d.id !== id)
  if (filtered.length === all.length) return false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (err) {
    console.error('Erro ao deletar system design:', err)
    return false
  }
}

/**
 * Duplica um design existente com novo ID e nome
 */
export function duplicateSystemDesign(id: string): SavedSystemDesign | null {
  const existing = getSystemDesign(id)
  if (!existing) return null

  return saveSystemDesign({
    name: `${existing.name} (Cópia)`,
    description: existing.description,
    color: existing.color,
    tags: [...existing.tags],
    nodes: JSON.parse(JSON.stringify(existing.nodes)),
    edges: JSON.parse(JSON.stringify(existing.edges)),
    isTemplate: false,
  })
}

/**
 * Salva o design atual como um Template customizado
 */
export function saveAsTemplate(design: SavedSystemDesign, templateName?: string): SavedSystemDesign {
  return saveSystemDesign({
    name: templateName?.trim() || `Template: ${design.name}`,
    description: design.description || `Modelo customizado baseado em ${design.name}`,
    color: design.color,
    tags: Array.from(new Set([...design.tags, 'template', 'custom'])),
    nodes: JSON.parse(JSON.stringify(design.nodes)),
    edges: JSON.parse(JSON.stringify(design.edges)),
    isTemplate: true,
  })
}

/**
 * Cria um novo design a partir de um template nativo ou customizado
 */
export function createFromTemplate(
  template: ArchitectureTemplate | SavedSystemDesign,
  customName?: string,
  customColor?: string,
  customTags?: string[]
): SavedSystemDesign {
  const defaultName = customName?.trim() || `Novo: ${template.name}`
  return saveSystemDesign({
    name: defaultName,
    description: template.description || '',
    color: customColor || SYSTEM_DESIGN_COLORS[0].color,
    tags: customTags && customTags.length > 0 ? customTags : ['arquitetura', 'projeto'],
    nodes: JSON.parse(JSON.stringify(template.nodes)),
    edges: JSON.parse(JSON.stringify(template.edges)),
    isTemplate: false,
  })
}

/**
 * Exporta o design como JSON estruturado para consumo por CLI e agentes de IA
 */
export function exportSystemDesignToJson(design: SavedSystemDesign): string {
  const categoriesCount: Record<string, number> = {}
  const protocolsCount: Record<string, number> = {}

  for (const n of design.nodes) {
    categoriesCount[n.category] = (categoriesCount[n.category] || 0) + 1
  }
  for (const e of design.edges) {
    const p = e.protocol || 'HTTP/REST'
    protocolsCount[p] = (protocolsCount[p] || 0) + 1
  }

  const exportPayload = {
    $schema: 'https://organon.reoli.com/schemas/system-design.json',
    formatVersion: '1.0',
    metadata: {
      id: design.id,
      name: design.name,
      description: design.description || '',
      color: design.color,
      tags: design.tags,
      isTemplate: !!design.isTemplate,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
      exportedAt: new Date().toISOString(),
    },
    metrics: {
      totalNodes: design.nodes.length,
      totalEdges: design.edges.length,
      categories: categoriesCount,
      protocols: protocolsCount,
    },
    architecture: {
      nodes: design.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        category: n.category,
        techStack: n.techStack || '',
        port: n.port,
        scale: n.scale,
        sla: n.sla,
        notes: n.notes || '',
        description: n.description || '',
        position: { x: n.x, y: n.y },
      })),
      edges: design.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || '',
        protocol: e.protocol || 'HTTP/REST',
        animated: !!e.animated,
      })),
    },
    aiReviewContext: {
      objective: 'Auditoria e Avaliação Arquitetural de Sistema Distribuído',
      suggestedPrompts: [
        'Identifique pontos únicos de falha (SPOF) nesta topologia.',
        'Analise gargalos de vazão e concorrência nos protocolos utilizados.',
        'Proponha melhorias de segurança, autenticação e redundância.',
      ],
    },
  }

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Exporta o design em formato Markdown estruturado com Mermaid embutido e prompt de IA
 */
export function exportSystemDesignToMarkdown(design: SavedSystemDesign): string {
  const mermaidDiagram = exportToMermaid(design.nodes, design.edges)

  const nodesTable = design.nodes
    .map(
      (n) =>
        `| \`${n.id}\` | **${n.label}** | \`${n.category}\` | ${n.techStack || '-'} | ${n.port || '-'} | ${n.scale || '-'} | ${n.notes ? n.notes.replace(/\n/g, ' ') : '-'} |`
    )
    .join('\n')

  const edgesTable = design.edges
    .map((e) => {
      const src = design.nodes.find((n) => n.id === e.source)?.label || e.source
      const dst = design.nodes.find((n) => n.id === e.target)?.label || e.target
      return `| \`${e.id}\` | **${src}** | **${dst}** | \`${e.protocol || 'HTTP/REST'}\` | ${e.label || '-'} |`
    })
    .join('\n')

  return `# Arquitetura de Sistema: ${design.name}

> **Descrição**: ${design.description || 'Nenhuma descrição informada.'}  
> **Tags**: ${design.tags.map((t) => `\`#${t}\``).join(' ') || 'Nenhuma'}  
> **Total de Componentes**: ${design.nodes.length} nós | **Total de Conexões**: ${design.edges.length} arestas  
> **Última Atualização**: ${new Date(design.updatedAt).toLocaleString('pt-BR')}

---

## 1. Diagrama de Topologia (Mermaid)

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

---

## 2. Dicionário de Componentes

| ID | Nome / Rótulo | Categoria | Stack Tecnológico | Porta Padrão | Escala / Réplicas | Notas de Estudo & SLA |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${nodesTable || '| - | Nenhum componente cadastrado | - | - | - | - | - |'}

---

## 3. Matriz de Conexões & Protocolos

| Conexão | Origem | Destino | Protocolo | Descrição do Fluxo |
| :--- | :--- | :--- | :--- | :--- |
${edgesTable || '| - | Nenhuma conexão mapeada | - | - | - |'}

---

## 4. Prompt para Análise Arquitetural com IA

> Utilize o prompt abaixo para enviar a topologia acima a uma IA generativa (Gemini, Claude, GPT) e obter um relatório técnico completo:

\`\`\`markdown
Você é um Arquiteto de Software Principal e Especialista em Sistemas Distribuídos de Alta Escala.
Avalie a arquitetura detalhada acima ("${design.name}") considerando:
1. Resiliência & SPOF (Single Point of Failure): Existem serviços centrais que se caírem derrubam a aplicação inteira?
2. Escalabilidade & Throughput: Os protocolos de comunicação (gRPC, REST, Kafka, WebSockets) estão aplicados de forma ideal?
3. Segurança & Isolamento: Identifique vulnerabilidades no tráfego entre nós e fronteiras de rede (DMZ/Interno).
4. Recomendações Técnicas: Liste 3 ações prioritárias para elevar a maturidade desta arquitetura para produção.
\`\`\`
`
}

/**
 * Importa um arquivo JSON e salva como novo design
 */
export function importSystemDesignFromJson(
  jsonString: string
): { success: boolean; design?: SavedSystemDesign; error?: string } {
  try {
    const data = JSON.parse(jsonString)

    let name = 'Design Importado'
    let description = ''
    let color = SYSTEM_DESIGN_COLORS[0].color
    let tags: string[] = ['importado']
    let nodes: SystemNode[] = []
    let edges: SystemEdge[] = []

    if (data.metadata) {
      name = data.metadata.name || name
      description = data.metadata.description || description
      color = data.metadata.color || color
      if (Array.isArray(data.metadata.tags)) tags = data.metadata.tags
    } else if (data.name) {
      name = data.name
      description = data.description || ''
      color = data.color || color
      if (Array.isArray(data.tags)) tags = data.tags
    }

    if (data.architecture && Array.isArray(data.architecture.nodes)) {
      nodes = data.architecture.nodes
      edges = Array.isArray(data.architecture.edges) ? data.architecture.edges : []
    } else if (Array.isArray(data.nodes)) {
      nodes = data.nodes
      edges = Array.isArray(data.edges) ? data.edges : []
    } else {
      return { success: false, error: 'Formato JSON inválido: nós de arquitetura não encontrados.' }
    }

    const saved = saveSystemDesign({
      name,
      description,
      color,
      tags,
      nodes,
      edges,
      isTemplate: false,
    })

    return { success: true, design: saved }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar arquivo JSON.',
    }
  }
}
