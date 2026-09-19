import React, { useMemo, useState } from 'react'
import type { WeekReport, RepoReport, HeatmapEntry } from '@types'
import { SummaryCards } from './SummaryCards'
import { CommitsBarChart } from './CommitsBarChart'
import { CommitHeatmap } from './CommitHeatmap'
import { CommitTypePie } from './CommitTypePie'
import { VelocityPanel } from './VelocityPanel'
import { StreakPanel } from './StreakPanel'
import { RecentCommitsPanel } from './RecentCommitsPanel'
import { UnifiedAlertsStoppedCard } from './UnifiedAlertsStoppedCard'
import { AllWeeksPanel } from './AllWeeksPanel'
import { LayoutGrid, Trophy, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

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
    const map = new Map<string, number>()
    const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Se houver commits individuais filtráveis pelo tipo selecionado
    if (activeType) {
      for (const repo of filteredRepos) {
        for (const c of repo.commits ?? []) {
          if (c.type !== activeType) continue
          let hour = c.hour ?? (c.time ? parseInt(c.time.split(':')[0], 10) : null)
          if (hour === null && (c as any).timestamp) {
            hour = new Date((c as any).timestamp).getHours()
          }
          if (hour === null) hour = 12
          const dStr = c.date ? (c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : null
          const d = dStr ? new Date(dStr) : null
          const day = d && !isNaN(d.getTime()) ? DAYS_EN[d.getDay()] : 'Mon'
          const key = `${day}|${hour}`
          map.set(key, (map.get(key) ?? 0) + 1)
        }
      }
    }

    // Se não há filtro de tipo ou os commits individuais não estavam carregados
    if (map.size === 0) {
      for (const repo of filteredRepos) {
        for (const e of repo.heatmap ?? []) {
          const key = `${e.day}|${e.hour}`
          map.set(key, (map.get(key) ?? 0) + e.commits)
        }
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
      {/* Header Compacto & Estilizado */}
      <div className="projects-subpage-header">
        <div className="projects-subpage-title-group">
          <div className="projects-pill-stepper">
            <button
              type="button"
              className="projects-stepper-btn"
              onClick={onNext}
              disabled={reportIndex >= totalReports - 1}
              title="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="projects-stepper-info">
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {report.weekLabel}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {report.period ? `${report.period.from} – ${report.period.to}` : report.date}
              </span>
            </div>
            <button
              type="button"
              className="projects-stepper-btn"
              onClick={onPrev}
              disabled={reportIndex <= 0}
              title="Semana seguinte"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {topRepo?.commitCount > 0 && (
              <span className="projects-stat-pill pill-amber" title={`Top projeto: ${topRepo.name} (${topRepo.commitCount} commits)`}>
                <Trophy size={13} style={{ color: '#f59e0b' }} />
                <span className="projects-stat-pill-value">{topRepo.name}</span>
                <span className="projects-stat-pill-label" style={{ fontWeight: 700 }}>{topRepo.commitCount}c</span>
              </span>
            )}
            {(report.reactivated?.length ?? 0) > 0 && (
              <span className="projects-stat-pill pill-green" title="Projetos reativados">
                <RotateCcw size={13} style={{ color: '#22c55e' }} />
                <span className="projects-stat-pill-value">{report.reactivated.join(', ')}</span>
              </span>
            )}
          </div>
        </div>

        <div className="projects-actions">
          <button
            type="button"
            className="projects-btn"
            onClick={() => setShowAllWeeks(true)}
            title="Ver grade de todas as semanas"
          >
            <LayoutGrid size={13} />
            <span>Ver Todas as Semanas</span>
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

      {/* Filtros Operacionais */}
      <div className="projects-filter-bar">
        <div className="projects-filter-group">
          <span className="projects-filter-label">Grupo</span>
          <div className="projects-view-toggle">
            {groups.map(g => (
              <button
                key={g}
                type="button"
                className={`projects-view-toggle-btn ${activeGroup === g ? 'is-active' : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="projects-filter-group">
          <span className="projects-filter-label">Tipo</span>
          <div className="projects-view-toggle">
            <button
              type="button"
              className={`projects-view-toggle-btn ${activeType === null ? 'is-active' : ''}`}
              onClick={() => setActiveType(null)}
            >
              Todos
            </button>
            {COMMIT_TYPES.filter(t => (aggregatedTypes[t] ?? 0) > 0).map(t => (
              <button
                key={t}
                type="button"
                className={`projects-view-toggle-btn ${activeType === t ? 'is-active' : ''}`}
                onClick={() => setActiveType(activeType === t ? null : t)}
              >
                {t} <span className="projects-filter-count">({aggregatedTypes[t]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Linha 1: 3 Gráficos de Análise */}
      <div className="projects-dashboard-grid projects-dashboard-grid-row1">
        <div className="projects-dashboard-card">
          <CommitsBarChart repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div className="projects-dashboard-card">
          <CommitTypePie
            commitTypes={aggregatedTypes}
            activeType={activeType}
            onSelectType={t => setActiveType(activeType === t ? null : t)}
          />
        </div>
        <div className="projects-dashboard-card">
          <CommitHeatmap heatmapData={aggregatedHeatmap} />
        </div>
      </div>

      {/* Linha 2: 3 Colunas Operacionais */}
      <div className="projects-dashboard-grid projects-dashboard-grid-row2">
        <div className="projects-dashboard-col">
          <VelocityPanel repos={filteredRepos} onSelect={onSelectRepo} />
          <StreakPanel repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div className="projects-dashboard-col">
          <RecentCommitsPanel repos={filteredRepos} onSelect={onSelectRepo} />
        </div>
        <div className="projects-dashboard-col">
          <UnifiedAlertsStoppedCard report={report} onGoPackageJson={onGoPackageJson} />
        </div>
      </div>

    </div>
  )
}
