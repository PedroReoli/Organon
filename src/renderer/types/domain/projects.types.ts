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

export interface RepoReport {
  name: string
  group: string
  key?: string
  commitCount: number
  velocity?: number
  lastWeek?: number
  packageJsonChanged?: boolean
  packageJsonDiff?: string
  badCommits?: Array<{ hash: string; msg: string; suggestedMsg?: string; fixCommand: string }>
  [key: string]: any
}

export interface WeekReport {
  weekId?: string
  label?: string
  startDate?: string
  endDate?: string
  metrics?: Record<string, number>
  blockers?: Array<{ id?: string; text: string; resolved?: boolean } | string>
  repos: RepoReport[]
  [key: string]: any
}

export interface CommitEntry {
  hash: string
  msg: string
  author?: string
  date?: string
  [key: string]: any
}

export interface TodoEntry {
  file: string
  line: number
  text: string
  [key: string]: any
}

export interface TopFile {
  path: string
  changes?: number
  commits?: number
  [key: string]: any
}

export interface GeneralRepoEntry {
  name: string
  group: string
  velocity?: number
  commitCount?: number
  streak?: number
  [key: string]: any
}

export interface WeekSummary {
  totalRepos: number
  activeThisWeek: number
  stoppedRepos: number
  totalCommits: number
  totalTodos: number
  totalBadCommits: number
  [key: string]: any
}

export interface HeatmapEntry {
  day: string
  hour: number
  commits: number
  [key: string]: any
}

export interface GeneralReport {
  repos?: GeneralRepoEntry[]
  weeklyTotals?: Record<string, number> | any
  commitTypesTotals?: Record<string, number> | any
  totalRepos?: number
  totalCommitsAllTime?: number
  updatedAt?: string
  [key: string]: any
}
