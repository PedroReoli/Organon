import React, { useMemo, useState } from 'react'
import type { WeekReport, RepoReport, HeatmapEntry } from '@types'
import { SummaryCards } from './SummaryCards'
import { CommitsBarChart } from './CommitsBarChart'
import { CommitHeatmap } from './CommitHeatmap'
import { CommitTypePie } from './CommitTypePie'
import { AlertsSection } from './AlertsSection'
import { VelocityPanel } from './VelocityPanel'
import { StreakPanel } from './StreakPanel'
import { RecentCommitsPanel } from './RecentCommitsPanel'
import { StoppedBubble } from './StoppedBubble'
import { AllWeeksPanel } from './AllWeeksPanel'
import { LayoutGrid, Trophy, RotateCcw } from 'lucide-react'

interface DashboardViewProps {
  report: WeekReport
  reportIndex: number
  totalReports: number
  reports: WeekReport[]
  onPrev: () => void
  onNext: () => void
  onSelectRepo: (repo: RepoReport) => void
  onSelectWeek: (index: number) => void
  onGoHistory: () => void
  onGoOverview: () => void
  onGoPackageJson: () => void
}

const COMMIT_TYPES = ['feat', 'fix', 'refactor', 'chore', 'docs', 'perf', 'other', 'revert']

export const DashboardView: React.FC<DashboardViewProps> = ({
  report, reportIndex, totalReports, reports, onPrev, onNext, onSelectRepo, onSelectWeek, onGoHistory: _onGoHistory, onGoOverview: _onGoOverview, onGoPackageJson,
}) => {
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const groups = useMemo(() => {
    const s = new Set(report.repos.map(r => r.group).filter(Boolean))
    return ['Todos', ...Array.from(s).sort()]
  }, [report.repos])

  const [activeGroup, setActiveGroup] = useState('Todos')
  const [activeType, setActiveType] = useState<string | null>(null)

  const filteredRepos = useMemo(() => {
    let repos = report.repos
    if (activeGroup !== 'Todos') repos = repos.filter(r => r.group === activeGroup)
    if (activeType) repos = repos.filter(r => (r.commitTypes?.[activeType] ?? 0) > 0)
    return repos
  }, [report.repos, activeGroup, activeType])

  const aggregatedHeatmap = useMemo((): HeatmapEntry[] => {
    if (activeType) {
      const map = new Map<string, number>()
      const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (const repo of filteredRepos) {
        for (const c of repo.commits ?? []) {
          if (c.type !== activeType) continue
          const hour = c.hour ?? (c.time ? parseInt(c.time.split(':')[0]) : null)
          if (hour === null) continue
          const day = c.date ? DAYS_EN[new Date(c.date).getDay()] : null
          if (!day) continue
          const key = `${day}|${hour}`
          map.set(key, (map.get(key) ?? 0) + 1)
        }
      }
      return Array.from(map.entries()).map(([k, commits]) => {
        const [day, hourStr] = k.split('|')
        return { day, hour: Number(hourStr), commits }
      })
    }
    const map = new Map<string, number>()
    for (const repo of filteredRepos) {
      for (const e of repo.heatmap ?? []) {
        const key = `${e.day}|${e.hour}`
        map.set(key, (map.get(key) ?? 0) + e.commits)
      }
    }
    return Array.from(map.entries()).map(([k, commits]) => {
      const [day, hourStr] = k.split('|')
      return { day, hour: Number(hourStr), commits }
    })
  }, [filteredRepos, activeType])

  const aggregatedTypes = useMemo((): Record<string, number> => {
    const acc: Record<string, number> = {}
    for (const repo of filteredRepos) {
      for (const [type, count] of Object.entries(repo.commitTypes ?? {})) {
        acc[type] = (acc[type] ?? 0) + (count as number)
      }
    }
    return acc
  }, [filteredRepos])

  const topRepo = useMemo(() =>
    [...report.repos].sort((a, b) => b.commitCount - a.commitCount)[0],
    [report.repos]
  )

  return (
    <div className="projects-content-scroll">
      {/* Header */}
      <div className="projects-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              className="projects-btn"
              onClick={onNext}
              disabled={reportIndex >= totalReports - 1}
              title="Semana anterior"
            >‹ Ant</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '160px' }}>
              <span className="projects-title" style={{ fontSize: '18px' }}>{report.weekLabel}</span>
              <span className="projects-subtitle">
                {report.period ? `${report.period.from} – ${report.period.to}` : report.date}
              </span>
            </div>
            <button
              type="button"
              className="projects-btn"
              onClick={onPrev}
              disabled={reportIndex <= 0}
              title="Semana seguinte"
            >Próx ›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            {topRepo?.commitCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-yellow)' }}>
                <Trophy size={13} />
                <strong>{topRepo.name}</strong> {topRepo.commitCount}c
              </span>
            )}
            {(report.reactivated?.length ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-green)' }}>
                <RotateCcw size={13} />
                {report.reactivated.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="projects-actions">
          <button
            type="button"
            className="projects-btn"
            onClick={() => setShowAllWeeks(true)}
            title="Ver todas as semanas"
          >
            <LayoutGrid size={14} />
            <span>Todas</span>
          </button>
        </div>
      </div>
      
      <SummaryCards summary={report.summary} />

      {showAllWeeks && (
        <AllWeeksPanel
          reports={reports}
          onSelectWeek={onSelectWeek}
          onClose={() => setShowAllWeeks(false)}
        />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Grupo</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {groups.map(g => (
              <button key={g} type="button"
                className={`projects-tab ${activeGroup === g ? 'is-active' : ''}`}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: activeGroup === g ? 'var(--color-primary-light)' : 'transparent' }}
                onClick={() => setActiveGroup(g)}>{g}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tipo</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button type="button"
              className={`projects-tab ${activeType === null ? 'is-active' : ''}`}
              style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: activeType === null ? 'var(--color-primary-light)' : 'transparent' }}
              onClick={() => setActiveType(null)}>Todos
            </button>
            {COMMIT_TYPES.filter(t => (aggregatedTypes[t] ?? 0) > 0).map(t => (
              <button key={t} type="button"
                className={`projects-tab ${activeType === t ? 'is-active' : ''}`}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: activeType === t ? 'var(--color-primary-light)' : 'transparent' }}
                onClick={() => setActiveType(activeType === t ? null : t)}>
                {t} <span style={{ opacity: 0.6, marginLeft: '4px' }}>{aggregatedTypes[t]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Linha 1: 3 graficos */}
      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="projects-dashboard-card" style={{ padding: '16px' }}>
          <CommitsBarChart repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div className="projects-dashboard-card" style={{ padding: '16px' }}>
          <CommitTypePie
            commitTypes={aggregatedTypes}
            activeType={activeType}
            onSelectType={t => setActiveType(activeType === t ? null : t)}
          />
        </div>
        <div className="projects-dashboard-card" style={{ padding: '16px' }}>
          <CommitHeatmap heatmapData={aggregatedHeatmap} />
        </div>
      </div>

      {/* Linha 2: 3 colunas — [Velocity+Streak] | [TODOs] | [Parados+Alertas] */}
      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <VelocityPanel repos={filteredRepos} onSelect={onSelectRepo} />
          <StreakPanel repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <RecentCommitsPanel repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <StoppedBubble repos={report.repos} />
          <AlertsSection report={report} onGoPackageJson={onGoPackageJson} />
        </div>
      </div>

    </div>
  )
}
