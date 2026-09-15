import React, { useMemo, useState } from 'react'
import type { GeneralReport, WeekReport } from '@types'
import { StatsBar } from '../StatsBar'
import { CompactLineChart } from '../CompactLineChart'
import { TopProjectsCard } from '../TopProjectsCard'
import { CommitTypesMini } from '../CommitTypesMini'
import { SectionTabs } from '../SectionTabs'
import { RepoList } from '../RepoList'
import { RecentCommits } from '../RecentCommits'

interface GeneralDashboardProps {
  general: GeneralReport
  reports: WeekReport[]
  onSelectRepo: (group: string, name: string) => void
  onRunScript: () => void
  isRunning: boolean
  lastRun: string | null
  watcherActive: boolean
  onToggleWatcher: () => void
}

const TYPE_COLORS: Record<string, string> = {
  feat: '#22c55e', fix: '#ef4444', refactor: 'var(--color-primary)', chore: '#94a3b8',
  docs: 'var(--color-primary)', perf: '#f59e0b', other: '#64748b', revert: '#f97316', test: 'var(--color-primary)',
}

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ 
  general, 
  reports, 
  onSelectRepo, 
  onRunScript, 
  isRunning, 
  lastRun, 
  watcherActive, 
  onToggleWatcher 
}) => {
  const [activeTab, setActiveTab] = useState('ativos')
  const [fixingHash, setFixingHash] = useState<string | null>(null)

  const activeRepos = useMemo(() =>
    general.repos.filter(r => r.status !== 'parado').sort((a, b) => b.weeklyAverage - a.weeklyAverage),
    [general.repos]
  )
  
  const stoppedRepos = useMemo(() =>
    general.repos.filter(r => r.status === 'parado').sort((a, b) => b.daysAgo - a.daysAgo),
    [general.repos]
  )

  const allBadCommits = useMemo(() => {
    const list: { repoName: string; repoPath: string; hash: string; msg: string; date: string; suggestedMsg: string }[] = []
    for (const repo of general.repos) {
      if (repo.badCommits) {
        for (const b of repo.badCommits) {
          list.push({
            repoName: repo.name,
            repoPath: (repo as any).path || '',
            hash: b.hash,
            msg: b.msg,
            date: b.date,
            suggestedMsg: b.suggestedMsg || `feat(${repo.name}): atualizações no repositório`,
          })
        }
      }
    }
    return list
  }, [general.repos])

  const handleFixCommit = async (repoPath: string, suggestedMsg: string) => {
    if (!repoPath) {
      alert('Caminho do repositório não disponível.')
      return
    }
    try {
      setFixingHash(suggestedMsg)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.runCommand) {
        const cmd = `python -m scripts.git_engine.cli fix --path "${repoPath}" --msg "${suggestedMsg}"`
        await (window as any).electronAPI.runCommand(cmd)
        alert(`Commit corrigido para: "${suggestedMsg}"!`)
        onRunScript()
      } else {
        alert(`Execute no terminal: python -m scripts.git_engine.cli fix --path "${repoPath}" --msg "${suggestedMsg}"`)
      }
    } catch (err: any) {
      alert(`Falha ao corrigir: ${err?.message || err}`)
    } finally {
      setFixingHash(null)
    }
  }

  const recentCommits = useMemo(() => {
    if (!reports.length) return []
    const latest = reports[0]
    const all: { repo: string; group: string; msg: string; type: string; date: string; time?: string }[] = []
    for (const repo of latest.repos) {
      for (const c of repo.commits) {
        all.push({ repo: repo.name, group: repo.group, msg: c.msg, type: c.type, date: c.date, time: c.time })
      }
    }
    all.sort((a, b) => {
      const da = `${a.date}${a.time || ''}`, db = `${b.date}${b.time || ''}`
      return db.localeCompare(da)
    })
    return all.slice(0, 50)
  }, [reports])

  // Dados para Gráfico de Linha
  const lineData = useMemo(() => {
    const reversed = [...general.weeklyTotals].reverse()
    return [{
      id: 'commits',
      color: 'var(--color-primary)',
      data: reversed.map(w => ({
        x: w.date.slice(8, 10) + '/' + w.date.slice(5, 7),
        y: w.commits,
        activeRepos: w.activeRepos,
        fullDate: w.date,
      })),
    }]
  }, [general.weeklyTotals])

  const monthMarkers = useMemo(() => {
    const reversed = [...general.weeklyTotals].reverse()
    const markers: { label: string; x: string }[] = []
    let lastMonth = ''
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    for (const w of reversed) {
      const month = w.date.slice(0, 7)
      if (month !== lastMonth) {
        const monthIdx = parseInt(w.date.slice(5, 7)) - 1
        markers.push({
          label: monthNames[monthIdx],
          x: w.date.slice(8, 10) + '/' + w.date.slice(5, 7),
        })
        lastMonth = month
      }
    }
    return markers
  }, [general.weeklyTotals])

  // Dados para Top Projetos
  const topProjectsData = useMemo(() =>
    activeRepos.slice(0, 5).map(r => ({
      repo: r.name,
      commits: r.weeklyAverage,
      color: 'var(--color-primary)',
    })),
    [activeRepos]
  )

  // Dados para Gráfico de Pizza (Tipos)
  const pieData = useMemo(() =>
    Object.entries(general.commitTypesTotals ?? {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, value]) => ({ id, label: id, value, color: TYPE_COLORS[id] ?? '#64748b' })),
    [general.commitTypesTotals]
  )

  const stats = {
    totalRepos: general.totalRepos,
    activeRepos: activeRepos.length,
    stoppedRepos: stoppedRepos.length,
    totalCommits: general.totalCommitsAllTime,
    topStreak: general.repos.length > 0 ? [...general.repos].sort((a, b) => b.streak - a.streak)[0] : null
  }

  const tabOptions = [
    { id: 'ativos', label: `Repos Ativos (${activeRepos.length})` },
    { id: 'parados', label: `Repos Parados (${stoppedRepos.length})` },
    { id: 'badcommits', label: `Bad Commits (${allBadCommits.length})` },
    { id: 'commits', label: `Commits Recentes` },
  ]

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Central do Git & Projetos</h1>
          <p className="projects-subtitle">Atualizado em {general.updatedAt}{lastRun ? ` · Executado ${lastRun}` : ''}</p>
        </div>
        <div className="projects-actions">
          <button
            type="button"
            className="projects-btn"
            onClick={onToggleWatcher}
            title={watcherActive ? 'Watcher ativo' : 'Watcher inativo'}
          >
            <span style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              backgroundColor: watcherActive ? 'var(--accent-green)' : 'var(--text-muted)' 
            }} />
            {watcherActive ? 'Watching' : 'Watch'}
          </button>
          <button
            type="button"
            className="projects-btn projects-btn-primary"
            onClick={onRunScript}
            disabled={isRunning}
          >
            {isRunning ? 'Escaneando Git Engine...' : 'Varredura Git Engine'}
          </button>
        </div>
      </div>

      <StatsBar stats={stats} />

      <div className="projects-dashboard-grid">
        <CompactLineChart data={lineData} monthMarkers={monthMarkers} />
        <TopProjectsCard projects={topProjectsData} />
        <CommitTypesMini data={pieData} />
      </div>

      <SectionTabs 
        tabs={tabOptions} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      <div style={{ paddingBottom: 40 }}>
        {activeTab === 'ativos' && <RepoList repos={activeRepos} onSelectRepo={onSelectRepo} />}
        {activeTab === 'parados' && <RepoList repos={stoppedRepos} onSelectRepo={onSelectRepo} />}
        {activeTab === 'commits' && <RecentCommits commits={recentCommits} />}
        {activeTab === 'badcommits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {allBadCommits.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                ✓ Todos os commits do projeto estão formatados corretamente!
              </div>
            ) : (
              allBadCommits.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--surface-color, rgba(255,255,255,0.03))',
                    border: '1px solid rgba(255,255,255,0.08)',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary, #6366f1)' }}>
                        [{item.repoName}]
                      </span>
                      <code style={{ fontSize: 11, color: '#ef4444' }}>{item.hash}</code>
                      <span style={{ fontSize: 12, color: 'var(--text-color)' }}>"{item.msg}"</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Sugestão de correção: <strong style={{ color: '#10b981' }}>{item.suggestedMsg}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFixCommit(item.repoPath, item.suggestedMsg)}
                    disabled={fixingHash === item.suggestedMsg}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--color-primary, #6366f1)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fixingHash === item.suggestedMsg ? 'Corrigindo...' : 'Corrigir Commit'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
