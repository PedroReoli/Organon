export interface CommitEntry {
  hash: string
  msg: string
  date: string
  hour?: number
  time?: string
  type: string
  author?: string
  linesAdded?: number
  linesRemoved?: number
}

export interface HeatmapEntry {
  day: string
  hour: number
  commits: number
}

export interface TopFile {
  file: string
  count: number
}

export interface BadCommit {
  hash: string
  msg: string
  fixCommand: string
  date?: string
  warning?: string
  suggestedMsg?: string
}

export interface TodoEntry {
  text: string
  line?: number
  implemented?: boolean
}

export interface RepoReport {
  group: string
  name: string
  status: 'ativo' | 'parado' | 'reativado' | string
  daysAgo: number
  lastCommitDate: string
  lastCommitMsg: string
  commitCount: number
  filesChanged: number
  branchCount: number
  todoCount: number
  commits: CommitEntry[]
  files: string[]
  branches: string[]
  todos: (TodoEntry | string)[]
  commitTypes: Record<string, number>
  topFiles: TopFile[]
  weeklyAverage: number
  velocity?: number
  streak?: number
  packageJsonChanged: boolean
  packageJsonDiff?: string
  badCommits: BadCommit[]
  heatmap: HeatmapEntry[]
}

export interface WeekSummary {
  totalRepos: number
  activeThisWeek: number
  stoppedRepos: number
  totalCommits: number
  totalTodos: number
  totalBranches: number
  totalBadCommits?: number
}

export interface WeekAlerts {
  badCommits: number
  packageChanges: number
  stoppedProjects: number
}

export interface WeekReport {
  date: string
  weekLabel: string
  period?: { from: string; to: string }
  summary: WeekSummary
  repos: RepoReport[]
  reactivated: string[]
  alerts: WeekAlerts
}

// ── General report (agregado de todas as semanas) ──────────────────────────

export interface GeneralRepoEntry {
  group: string
  name: string
  status: 'ativo' | 'parado' | 'reativado' | string
  daysAgo: number
  streak: number
  velocity: number
  weeklyAverage: number
  lastCommitMsg: string
  lastCommitDate: string
  commitsByWeek: number[]   // últimas 8 semanas, mais recente primeiro
  totalCommits?: number
}

export interface GeneralWeekTotal {
  date: string
  commits: number
  activeRepos: number
}

export interface GeneralReport {
  updatedAt: string
  totalRepos: number
  totalCommitsAllTime: number
  commitTypesTotals: Record<string, number>
  repos: GeneralRepoEntry[]
  weeklyTotals: GeneralWeekTotal[]  // últimas 12 semanas, mais recente primeiro
}
