import React, { useState, useMemo } from 'react'
import { Search as SearchIcon, X, Filter } from 'lucide-react'
import type { WeekReport } from '@types'
import { CommitTypeBadge } from '../components/CommitTypeBadge'

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

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Busca & Filtros</h1>
          <p className="projects-subtitle">Pesquise commits e repositórios em todos os relatórios disponíveis</p>
        </div>
      </div>

      <div className="projects-dashboard-card" style={{ marginBottom: '6px', padding: '6px 10px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <SearchIcon size={14} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
          <input
            type="text"
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            placeholder="Buscar por repositório, commit hash, mensagem..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
            <Filter size={11} /> Filtros:
          </span>
          <select style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '11px' }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
            <option value="">Todos os grupos</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '11px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="parado">Parado</option>
            <option value="reativado">Reativado</option>
          </select>
          <select style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '11px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {commitTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(query || filterGroup || filterStatus || filterType) && (
            <button
              type="button"
              className="projects-btn"
              style={{ padding: '1px 6px', fontSize: '10.5px', height: 20 }}
              onClick={() => { setQuery(''); setFilterGroup(''); setFilterStatus(''); setFilterType('') }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {results === null && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
          <span>Digite algo ou selecione um filtro para buscar</span>
        </div>
      )}

      {results && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
          <span>Nenhum resultado encontrado</span>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 10px' }}>
          <h3 className="projects-card-title" style={{ margin: 0 }}>{results.length} resultado{results.length > 1 ? 's' : ''}</h3>
          <div className="projects-commits-list" style={{ gap: '3px' }}>
            {results.map((r, i) => (
              <button key={i} type="button" className="projects-commit-row" onClick={() => onSelectRepo(r.group, r.repo)} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--bg-primary)', padding: '3px 8px' }}>
                <CommitTypeBadge type={r.type} size="xs" />
                <span className="projects-commit-repo" style={{ fontSize: '10.5px' }}>{r.group}/{r.repo}</span>
                <span className="projects-commit-msg" style={{ fontSize: '11px' }}>{r.msg}</span>
                <span className="projects-commit-time" style={{ fontSize: '10px' }}>{r.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
