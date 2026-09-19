import React, { useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  PauseCircle,
  GitCompare,
  Search,
} from 'lucide-react'
import type { WeekReport } from '@types'

interface CompareViewProps {
  reports: WeekReport[]
  onSelectRepo: (group: string, name: string) => void
}

export const CompareView: React.FC<CompareViewProps> = ({ reports, onSelectRepo }) => {
  const [filterGroup, setFilterGroup] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')

  const comparison = useMemo(() => {
    if (reports.length < 2) return null
    const current = reports[0]
    const previous = reports[1]

    const currentRepos: any[] = current.repos || []
    const previousRepos: any[] = previous.repos || []

    const currentMap = new Map<string, any>(currentRepos.map((r: any) => [`${r.group || ''}/${r.name || ''}`, r]))
    const previousMap = new Map<string, any>(previousRepos.map((r: any) => [`${r.group || ''}/${r.name || ''}`, r]))

    const accelerated: { key: string; group: string; name: string; current: number; previous: number; diff: number }[] = []
    const decelerated: { key: string; group: string; name: string; current: number; previous: number; diff: number }[] = []
    const newRepos: { key: string; group: string; name: string; commits: number }[] = []
    const stoppedRepos: { key: string; group: string; name: string; lastWeek: number }[] = []

    const allGroups = new Set<string>(['Todos'])

    for (const [key, repo] of currentMap) {
      if (repo.group) allGroups.add(repo.group)
      const prev = previousMap.get(key)
      const repoCommits = repo.commitCount || 0
      if (!prev) {
        if (repoCommits > 0) newRepos.push({ key, group: repo.group || '', name: repo.name || '', commits: repoCommits })
        continue
      }
      const prevCommits = prev.commitCount || 0
      const diff = repoCommits - prevCommits
      if (diff > 0) accelerated.push({ key, group: repo.group || '', name: repo.name || '', current: repoCommits, previous: prevCommits, diff })
      else if (diff < 0) decelerated.push({ key, group: repo.group || '', name: repo.name || '', current: repoCommits, previous: prevCommits, diff })
    }

    for (const [key, repo] of previousMap) {
      if (repo.group) allGroups.add(repo.group)
      const prevCommits = repo.commitCount || 0
      const currentRepo = currentMap.get(key)
      if (!currentMap.has(key) || ((currentRepo?.commitCount || 0) === 0 && prevCommits > 0)) {
        stoppedRepos.push({ key, group: repo.group || '', name: repo.name || '', lastWeek: prevCommits })
      }
    }

    accelerated.sort((a, b) => b.diff - a.diff)
    decelerated.sort((a, b) => a.diff - b.diff)

    const currTotal = current.summary?.totalCommits || 0
    const prevTotal = previous.summary?.totalCommits || 0

    return {
      current,
      previous,
      accelerated,
      decelerated,
      newRepos,
      stoppedRepos,
      totalDiff: currTotal - prevTotal,
      groups: Array.from(allGroups),
    }
  }, [reports])

  if (!comparison) {
    return (
      <div className="projects-content-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Necessário pelo menos 2 semanas de dados para comparar</span>
      </div>
    )
  }

  const { current, previous, accelerated, decelerated, newRepos, stoppedRepos, totalDiff, groups } = comparison
  const diffSign = totalDiff > 0 ? '+' : ''

  const filterItem = (item: { group: string; name: string }) => {
    if (filterGroup !== 'Todos' && item.group !== filterGroup) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    }
    return true
  }

  const filteredAccelerated = accelerated.filter(filterItem)
  const filteredDecelerated = decelerated.filter(filterItem)
  const filteredNew = newRepos.filter(filterItem)
  const filteredStopped = stoppedRepos.filter(filterItem)

  const totalActions = accelerated.length + decelerated.length + newRepos.length + stoppedRepos.length || 1
  const pctAcc = Math.round((accelerated.length / totalActions) * 100)
  const pctDec = Math.round((decelerated.length / totalActions) * 100)
  const pctNew = Math.round((newRepos.length / totalActions) * 100)
  const pctStop = 100 - pctAcc - pctDec - pctNew

  const renderRow = (r: any, diffRender: React.ReactNode) => (
    <button
      key={r.key}
      type="button"
      onClick={() => onSelectRepo(r.group, r.name)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px',
        gap: '8px',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '5px',
        padding: '5px 9px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        width: '100%',
      }}
      className="projects-commit-row"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.name}
        </span>
        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{r.group}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '11px', justifyContent: 'center' }}>
        {r.previous !== undefined ? (
          <>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.previous}</span>
            <span style={{ opacity: 0.5 }}>→</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.current}</span>
          </>
        ) : (
          <span />
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: '11.5px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {diffRender}
      </div>
    </button>
  )

  return (
    <div className="projects-content-scroll" style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div className="projects-header" style={{ marginBottom: '8px' }}>
        <div>
          <h1 className="projects-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={20} color="var(--color-primary)" />
            <span>Comparativo Semanal</span>
          </h1>
          <p className="projects-subtitle">
            Semana anterior ({previous.period?.from} – {previous.period?.to}) vs Atual ({current.period?.from} – {current.period?.to})
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="projects-stats-compact-bar" style={{ marginBottom: '10px' }}>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Semana anterior:</span>
          <span className="projects-stat-pill-value">{(previous.summary?.totalCommits || 0).toLocaleString('pt-BR')}</span>
        </div>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Semana atual:</span>
          <span className="projects-stat-pill-value">{(current.summary?.totalCommits || 0).toLocaleString('pt-BR')}</span>
        </div>
        <div className={`projects-stat-pill ${totalDiff > 0 ? 'pill-green' : totalDiff < 0 ? 'pill-red' : ''}`}>
          <span className="projects-stat-pill-label">Variação Total:</span>
          <span className="projects-stat-pill-value">{diffSign}{totalDiff}</span>
        </div>
        <div className="projects-stat-pill pill-green">
          <span className="projects-stat-pill-label">Aceleraram:</span>
          <span className="projects-stat-pill-value">{accelerated.length}</span>
        </div>
        <div className="projects-stat-pill pill-red">
          <span className="projects-stat-pill-label">Desaceleraram:</span>
          <span className="projects-stat-pill-value">{decelerated.length}</span>
        </div>
        {newRepos.length > 0 && (
          <div className="projects-stat-pill pill-blue">
            <span className="projects-stat-pill-label">Novos:</span>
            <span className="projects-stat-pill-value">{newRepos.length}</span>
          </div>
        )}
      </div>

      {/* Barra de Proporção de Ritmo Visual */}
      <div className="projects-dashboard-card" style={{ marginBottom: '12px', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Ritmo do Ecossistema ({totalActions} projetos analisados)
          </span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>● {pctAcc}% acelerando</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>● {pctDec}% desacelerando</span>
            {newRepos.length > 0 && <span style={{ color: '#38bdf8', fontWeight: 600 }}>● {pctNew}% novos</span>}
            {stoppedRepos.length > 0 && <span style={{ color: '#eab308', fontWeight: 600 }}>● {pctStop}% parados</span>}
          </div>
        </div>
        <div style={{ width: '100%', height: '7px', borderRadius: '4px', display: 'flex', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${pctAcc}%`, background: '#22c55e' }} title={`Aceleraram: ${pctAcc}%`} />
          <div style={{ width: `${pctDec}%`, background: '#ef4444' }} title={`Desaceleraram: ${pctDec}%`} />
          <div style={{ width: `${pctNew}%`, background: '#38bdf8' }} title={`Novos: ${pctNew}%`} />
          <div style={{ width: `${pctStop}%`, background: '#eab308' }} title={`Parados: ${pctStop}%`} />
        </div>
      </div>

      {/* Barra de Filtro de Grupo & Busca */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div className="projects-view-toggle">
          {groups.map(g => (
            <button
              key={g}
              type="button"
              className={`projects-view-toggle-btn ${filterGroup === g ? 'is-active' : ''}`}
              onClick={() => setFilterGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtrar projetos..."
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Grid de 4 Colunas Balanceadas */}
      <div
        className="projects-dashboard-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          alignItems: 'stretch',
        }}
      >
        {/* Coluna 1: Aceleraram */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="projects-card-title" style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <TrendingUp size={14} />
              <span>Aceleraram ({filteredAccelerated.length})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '2px' }}>
            {filteredAccelerated.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 'auto' }}>Nenhum projeto</span>
            ) : (
              filteredAccelerated.map(r => renderRow(r, <span style={{ color: '#22c55e' }}>+{r.diff}</span>))
            )}
          </div>
        </div>

        {/* Coluna 2: Desaceleraram */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="projects-card-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <TrendingDown size={14} />
              <span>Desaceleraram ({filteredDecelerated.length})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '2px' }}>
            {filteredDecelerated.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 'auto' }}>Nenhum projeto</span>
            ) : (
              filteredDecelerated.map(r => renderRow(r, <span style={{ color: '#ef4444' }}>{r.diff}</span>))
            )}
          </div>
        </div>

        {/* Coluna 3: Novos Projetos */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="projects-card-title" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Sparkles size={14} />
              <span>Novos na Semana ({filteredNew.length})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '2px' }}>
            {filteredNew.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 'auto' }}>Nenhum projeto novo</span>
            ) : (
              filteredNew.map(r => renderRow(r, <span style={{ color: '#38bdf8' }}>{r.commits} commits</span>))
            )}
          </div>
        </div>

        {/* Coluna 4: Pararam */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="projects-card-title" style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <PauseCircle size={14} />
              <span>Sem Entregas ({filteredStopped.length})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '2px' }}>
            {filteredStopped.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 'auto' }}>Nenhum parado recente</span>
            ) : (
              filteredStopped.map(r => renderRow(r, <span style={{ color: '#eab308' }}>era {r.lastWeek}/sem</span>))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
