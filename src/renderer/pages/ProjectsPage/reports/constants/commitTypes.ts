export interface CommitTypeStyle {
  label: string
  color: string
  bg: string
  border: string
}

export const COMMIT_TYPE_CONFIG: Record<string, CommitTypeStyle> = {
  feat: {
    label: 'feat',
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.3)',
  },
  fix: {
    label: 'fix',
    color: '#4ade80',
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  refactor: {
    label: 'refactor',
    color: '#fb923c',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.3)',
  },
  chore: {
    label: 'chore',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.25)',
  },
  docs: {
    label: 'docs',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.3)',
  },
  perf: {
    label: 'perf',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  revert: {
    label: 'revert',
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  test: {
    label: 'test',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    border: 'rgba(167, 139, 250, 0.3)',
  },
  other: {
    label: 'other',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.2)',
  },
}

export const DEFAULT_COMMIT_TYPE_STYLE: CommitTypeStyle = {
  label: 'other',
  color: '#94a3b8',
  bg: 'rgba(148, 163, 184, 0.1)',
  border: 'rgba(148, 163, 184, 0.2)',
}

export function getCommitTypeStyle(type: string): CommitTypeStyle {
  return COMMIT_TYPE_CONFIG[type?.toLowerCase()] ?? DEFAULT_COMMIT_TYPE_STYLE
}

export function getCommitTypeColor(type: string, fallback?: string): string {
  const found = COMMIT_TYPE_CONFIG[type?.toLowerCase()]
  if (found) return found.color
  return fallback ?? DEFAULT_COMMIT_TYPE_STYLE.color
}

export const COMMIT_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(COMMIT_TYPE_CONFIG).map(([k, v]) => [k, v.color])
)

