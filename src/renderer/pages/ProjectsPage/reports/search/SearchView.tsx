import React, { useState, useMemo } from 'react'
import type { WeekReport } from '@types'

interface SearchViewProps {
  reports: WeekReport[]
  onSelectRepo: (group: string, name: string) => void
}

export const SearchView: React.FC<SearchViewProps> = ({ reports, onSelectRepo }) => {
  const [query, setQuery] = useState('')
  const [filterGroup, setFilterGroup] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const r of reports) {
      for (const repo of r.repos) set.add(repo.group)
    }
    return Array.from(set).sort()
  }, [reports])

  const commitTypes = useMemo(() => {
    const set = new Set<string>()
    for (const r of reports) {
      for (const repo of r.repos) {
        for (const c of repo.commits) set.add(c.type)
      }
    }
    return Array.from(set).sort()
  }, [reports])

  const results = useMemo(() => {
    if (!query && !filterGroup && !filterStatus && !filterType) return null
    const q = query.toLowerCase()
    const matches: { repo: string; group: string; msg: string; type: string; date: string; hash: string }[] = []

    for (const report of reports) {
      for (const repo of report.repos) {
        if (filterGroup && repo.group !== filterGroup) continue
        if (filterStatus && repo.status !== filterStatus) continue

        for (const c of repo.commits) {
          if (filterType && c.type !== filterType) continue
          if (q && !repo.name.toLowerCase().includes(q) && !c.msg.toLowerCase().includes(q) && !repo.group.toLowerCase().includes(q)) continue
          matches.push({ repo: repo.name, group: repo.group, msg: c.msg, type: c.type, date: c.date, hash: c.hash })
        }
      }
    }

    matches.sort((a, b) => b.date.localeCompare(a.date))
    return matches.slice(0, 100)
  }, [query, filterGroup, filterStatus, filterType, reports])

  const TYPE_COLORS: Record<string, string> = {
    feat: '#22c55e', fix: '#ef4444', refactor: 'var(--color-primary)', chore: '#94a3b8',
    docs: '#60a5fa', perf: '#f59e0b', other: '#6b7280', revert: '#f97316', test: 'var(--color-primary)',
    style: '#e879f9', ci: '#38bdf8', build: '#fb923c', release: '#4ade80',
    hotfix: '#dc2626', wip: '#fbbf24', merge: 'var(--color-primary-hover)',
  }

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Busca & Filtros</h1>
          <p className="projects-subtitle">Pesquise commits e repositórios em todos os relatórios disponíveis</p>
        </div>
      </div>

      <div className="projects-dashboard-card" style={{ marginBottom: '24px' }}>
        <input
          type="text"
          style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '16px', outline: 'none' }}
          placeholder="Buscar por repo, commit, mensagem..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
            <option value="">Todos os grupos</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="parado">Parado</option>
            <option value="reativado">Reativado</option>
          </select>
          <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {commitTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(query || filterGroup || filterStatus || filterType) && (
            <button type="button" className="projects-btn" onClick={() => { setQuery(''); setFilterGroup(''); setFilterStatus(''); setFilterType('') }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {results === null && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <span>Digite algo ou selecione um filtro para buscar</span>
        </div>
      )}

      {results && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <span>Nenhum resultado encontrado</span>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="projects-card-title" style={{ margin: 0 }}>{results.length} resultado{results.length > 1 ? 's' : ''}</h3>
          <div className="projects-commits-list">
            {results.map((r, i) => (
              <button key={i} type="button" className="projects-commit-row" onClick={() => onSelectRepo(r.group, r.repo)} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--bg-primary)' }}>
                <span className="projects-commit-type" style={{ background: TYPE_COLORS[r.type] ?? '#6b7280' }}>{r.type}</span>
                <span className="projects-commit-repo">{r.group}/{r.repo}</span>
                <span className="projects-commit-msg">{r.msg}</span>
                <span className="projects-commit-time">{r.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
