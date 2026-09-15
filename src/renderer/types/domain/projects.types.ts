export type ProjectLinkCategory =
  | 'repo'
  | 'docs'
  | 'staging'
  | 'producao'
  | 'issues'
  | 'design'
  | 'outros'

export const PROJECT_LINK_CATEGORY_LABELS: Record<ProjectLinkCategory, string> = {
  repo: 'Repositorio',
  docs: 'Documentacao',
  staging: 'Staging',
  producao: 'Producao',
  issues: 'Issues',
  design: 'Design',
  outros: 'Outros',
}

export const PROJECT_LINK_CATEGORY_ORDER: ProjectLinkCategory[] = [
  'repo',
  'docs',
  'staging',
  'producao',
  'issues',
  'design',
  'outros',
]

export interface ProjectLink {
  id: string
  label: string
  url: string
  category?: ProjectLinkCategory
}

export interface Project {
  id: string
  name: string
  path: string
  description: string
  color: string
  links: ProjectLink[]
  preferredIdeId: string | null
  createdAt: string
  updatedAt: string
  order: number
  tags?: string[]
  isArchived?: boolean
  archivedAt?: string | null
}

export interface ProjectGraphSummary {
  files: number
  directories: number
  nodes: number
  edges: number
  technologies: string[]
}

export interface ProjectGraphRecord {
  id: string
  name: string
  rootPath: string
  graphPath: string
  status: 'pending' | 'ready' | 'error'
  createdAt: string
  updatedAt: string
  lastIndexedAt: string | null
  lastError: string | null
  summary: ProjectGraphSummary | null
}

export interface ProjectGraphNode {
  id: string
  label: string
  type: 'project' | 'directory' | 'file' | string
  path: string
  metadata?: Record<string, unknown>
}

export interface ProjectGraphEdge {
  source: string
  target: string
  relation: string
  origin: 'filesystem' | 'source' | 'git' | 'ai' | 'manual' | string
  weight: number
}

export interface ProjectGraphData {
  schemaVersion: number
  generatedAt: string
  summary: ProjectGraphSummary
  nodes: ProjectGraphNode[]
  edges: ProjectGraphEdge[]
}

export interface RegisteredIDE {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  args: string
  order: number
}
