import React from 'react'
import { RepoCard } from './RepoCard'
import type { GeneralRepoEntry } from '@types'

export interface RepoListProps {
  repos: GeneralRepoEntry[]
  onSelectRepo: (group: string, name: string) => void
}

export const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo }) => {
  if (!repos || repos.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Nenhum repositório encontrado.
      </div>
    )
  }

  return (
    <div className="projects-repo-list">
      {repos.map(r => (
        <RepoCard
          key={`${r.group}/${r.name}`}
          repo={r}
          onClick={() => onSelectRepo(r.group, r.name)}
        />
      ))}
    </div>
  )
}