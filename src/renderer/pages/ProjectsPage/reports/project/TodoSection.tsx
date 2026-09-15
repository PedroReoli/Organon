import React, { useState } from 'react'
import type { CommitEntry, TodoEntry } from '@types'

const PAGE_SIZE = 5

interface TodoSectionProps {
  todos: (TodoEntry | string)[]
  commits: CommitEntry[]
}

export const TodoSection: React.FC<TodoSectionProps> = ({ todos, commits }) => {
  const [page, setPage] = useState(0)

  if (todos.length === 0) return null

  const commitMsgs = commits.map(c => c.msg.toLowerCase())

  const items = todos.map((todo, i) => {
    const text = typeof todo === 'string' ? todo : todo.text
    const implemented = typeof todo === 'string'
      ? commitMsgs.some(m => m.includes(text.toLowerCase()))
      : (todo.implemented ?? commitMsgs.some(m => m.includes(text.toLowerCase())))
    return { text, implemented, i }
  })

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="projects-dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="projects-card-title" style={{ margin: 0 }}>TODOs</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pageItems.map(({ text, implemented, i }) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border)', opacity: implemented ? 0.6 : 1 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: implemented ? 'var(--accent-green)' : 'var(--accent-yellow)' }} />
            <span style={{ fontSize: '13px', color: implemented ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: implemented ? 'line-through' : 'none' }}>{text}</span>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="projects-btn" style={{ padding: '4px 8px' }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>←</button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{page + 1} / {totalPages}</span>
          <button type="button" className="projects-btn" style={{ padding: '4px 8px' }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>→</button>
        </div>
      )}
    </div>
  )
}
