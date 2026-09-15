/**
 * ProductivityAnalytics — painel de analise de produtividade.
 *
 * Composicao completa: KPIs + heatmap hora x dia + trend 30d +
 * breakdown por goal/categoria. Consumido pelo StudyView como painel
 * flutuante. Upgrade 14.
 */

import React from 'react'
import type { StudyGoal, StudySessionLog } from '@types'
import { useStudyAnalytics } from '@hooks/useStudyAnalytics'
import { HourHeatmap } from './HourHeatmap'
import { StudyTrendChart } from './StudyTrendChart'

interface ProductivityAnalyticsProps {
  sessions: StudySessionLog[]
  goals: StudyGoal[]
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function formatHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}m`
}

export const ProductivityAnalytics: React.FC<ProductivityAnalyticsProps> = ({
  sessions,
  goals,
}) => {
  const analytics = useStudyAnalytics({ sessions, goals, trendDays: 30 })

  return (
    <div className="study-analytics-panel">
      <header className="study-analytics-header">
        <h3>Analytics</h3>
      </header>

      {/* KPIs */}
      <section className="study-analytics-kpis">
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {formatHours(analytics.totalFocusSeconds)}
          </span>
          <span className="study-analytics-kpi-label">Total lifetime</span>
        </div>
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {formatHours(analytics.totalFocusSeconds7d)}
          </span>
          <span className="study-analytics-kpi-label">Ultimos 7d</span>
        </div>
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {formatHours(analytics.totalFocusSeconds30d)}
          </span>
          <span className="study-analytics-kpi-label">Ultimos 30d</span>
        </div>
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {analytics.totalSessions}
          </span>
          <span className="study-analytics-kpi-label">Sessoes</span>
        </div>
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {analytics.bestHour >= 0 ? `${analytics.bestHour}h` : '—'}
          </span>
          <span className="study-analytics-kpi-label">Melhor hora</span>
        </div>
        <div className="study-analytics-kpi">
          <span className="study-analytics-kpi-value">
            {analytics.bestWeekday >= 0 ? WEEKDAY_LABELS[analytics.bestWeekday] : '—'}
          </span>
          <span className="study-analytics-kpi-label">Melhor dia</span>
        </div>
      </section>

      {/* Heatmap */}
      <section className="study-analytics-section">
        <h4>Foco por hora e dia</h4>
        <HourHeatmap cells={analytics.heatmap} max={analytics.heatmapMax} />
      </section>

      {/* Trend */}
      <section className="study-analytics-section">
        <h4>Tendencia 30 dias</h4>
        <StudyTrendChart points={analytics.trend} />
      </section>

      {/* Goal breakdown */}
      {analytics.goalBreakdown.length > 0 && (
        <section className="study-analytics-section">
          <h4>Por meta</h4>
          <div className="study-analytics-breakdown">
            {analytics.goalBreakdown.slice(0, 5).map((g) => (
              <div key={g.goalId ?? '__none__'} className="study-analytics-breakdown-row">
                <span className="study-analytics-breakdown-title">{g.title}</span>
                <div className="study-analytics-breakdown-bar">
                  <div
                    className="study-analytics-breakdown-bar-fill"
                    style={{ width: `${g.percent}%` }}
                  />
                </div>
                <span className="study-analytics-breakdown-value">
                  {formatHours(g.focusSeconds)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category breakdown */}
      {analytics.categoryBreakdown.length > 0 && (
        <section className="study-analytics-section">
          <h4>Por categoria</h4>
          <div className="study-analytics-breakdown">
            {analytics.categoryBreakdown.slice(0, 5).map((c) => (
              <div key={c.category} className="study-analytics-breakdown-row">
                <span className="study-analytics-breakdown-title">{c.category}</span>
                <span className="study-analytics-breakdown-value">
                  {formatHours(c.focusSeconds)} ({c.sessionCount})
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
