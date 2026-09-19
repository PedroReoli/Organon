import React from 'react'

export interface CommitInfo {
  repo: string
  group: string
  msg: string
  type: string
  date: string
  time?: string
}

export interface RecentCommitsProps {
  commits: CommitInfo[]
}

import { CommitTypeBadge } from './components/CommitTypeBadge'

function fmtTimeAgo(dateStr: string, timeStr?: string): string {
  try {
    const full = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T12:00:00`
    const diff = Date.now() - new Date(full).getTime()
    if (diff < 0) return 'agora'
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return `${Math.floor(days / 7)}sem`
  } catch {
    return dateStr
  }
}

export const RecentCommits: React.FC<RecentCommitsProps> = ({ commits }) => {
  if (!commits || commits.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Nenhum commit recente encontrado.
      </div>
    )
  }

  return (
    <div className="projects-commits-list">
      {commits.map((c, i) => (
        <div key={`${c.repo}-${i}`} className="projects-commit-row">
          <CommitTypeBadge type={c.type} />
          <div className="projects-commit-repo" title={`${c.group}/${c.repo}`}>
            {c.repo}
          </div>
          <div className="projects-commit-msg" title={c.msg}>
            {c.msg}
          </div>
          <div className="projects-commit-time">
            {fmtTimeAgo(c.date, c.time)}
          </div>
        </div>
      ))}
    </div>
  )
}
