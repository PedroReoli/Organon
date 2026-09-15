import React from 'react'
import type { RepoReport, TodoEntry } from '@types'

interface TodosPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const TodosPanel: React.FC<TodosPanelProps> = ({ repos, onSelect }) => {
  const items = repos.flatMap(r =>
    (r.todos ?? []).map(t => {
      const text = typeof t === 'string' ? t : t.text
      const implemented = typeof t === 'string' ? false : (t as TodoEntry).implemented ?? false
      return { text, implemented, repo: r }
    })
  ).filter(t => !t.implemented).slice(0, 12)

  return (
    <div className="rp-panel">
      <h3 className="rp-panel-title">TODOs <span className="rp-panel-count">{items.length}</span></h3>
      {items.length === 0 ? (
        <span className="rp-panel-empty">Nenhum TODO pendente</span>
      ) : (
        <div className="rp-todos-list">
          {items.map((t, i) => (
            <button key={i} type="button" className="rp-todo-item" onClick={() => onSelect(t.repo)}>
              <span className="rp-todo-dot" />
              <span className="rp-todo-repo" title={`${t.repo.group}/${t.repo.name}`}>{t.repo.name}</span>
              <span className="rp-todo-text" title={t.text}>{t.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
