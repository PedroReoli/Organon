import { useMemo, useState } from 'react'
import type { StudySessionLog } from '@types'
import { formatHours } from '../utils'

interface StatsPanelProps {
  totalFocusSeconds: number
  todayFocusSeconds: number
  sessions:          StudySessionLog[]
  goalsOpen:         number
}

function getStudyStreak(sessions: StudySessionLog[]): number {
  const studyDays = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  let streak = 0
  const today = new Date()
  while (true) {
    const d = new Date(today)
    d.setDate(today.getDate() - streak)
    const iso = d.toISOString().slice(0, 10)
    if (!studyDays.has(iso)) break
    streak++
  }
  return streak
}

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function buildChartData(sessions: StudySessionLog[], days: number) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const iso = d.toISOString().slice(0, 10)
    const secs = sessions
      .filter(s => s.completedAt.slice(0, 10) === iso)
      .reduce((sum, s) => sum + s.focusSeconds, 0)
    const label = days <= 7 ? DAY_ABBR[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`
    return { iso, mins: Math.round(secs / 60), label }
  })
}

export const StatsPanel = ({ totalFocusSeconds, todayFocusSeconds, sessions }: StatsPanelProps) => {
  const [chartDays, setChartDays] = useState<7 | 30>(7)

  const streak    = useMemo(() => getStudyStreak(sessions), [sessions])
  const chartData = useMemo(() => buildChartData(sessions, chartDays), [sessions, chartDays])
  const maxMins   = Math.max(...chartData.map(d => d.mins), 1)

  const todayIso  = new Date().toISOString().slice(0, 10)

  return (
    <div className="study-panel-section">
      <h3>Estatisticas</h3>

      <div className="study-stats-grid">
        <article className="study-stat-box">
          <span>Tempo total</span>
          <strong>{formatHours(totalFocusSeconds)}</strong>
        </article>
        <article className="study-stat-box">
          <span>Tempo hoje</span>
          <strong>{formatHours(todayFocusSeconds)}</strong>
        </article>
        <article className="study-stat-box">
          <span>Sessoes</span>
          <strong>{sessions.length}</strong>
        </article>
        <article className="study-stat-box">
          <span>Sequencia</span>
          <strong style={{ color: streak > 0 ? 'var(--color-primary)' : undefined }}>
            {streak}d
          </strong>
        </article>
      </div>

      {/* Bar chart */}
      <div className="study-chart-section">
        <div className="study-chart-header">
          <span className="study-card-label">Sessoes por dia</span>
          <div className="study-chart-toggle">
            <button
              className={`study-chart-toggle-btn ${chartDays === 7 ? 'active' : ''}`}
              onClick={() => setChartDays(7)}
            >7d</button>
            <button
              className={`study-chart-toggle-btn ${chartDays === 30 ? 'active' : ''}`}
              onClick={() => setChartDays(30)}
            >30d</button>
          </div>
        </div>
        <div className="study-chart-bars">
          {chartData.map(day => {
            const heightPct = maxMins > 0 ? (day.mins / maxMins) * 100 : 0
            const isToday = day.iso === todayIso
            return (
              <div key={day.iso} className="study-chart-bar-col" title={`${day.label}: ${day.mins} min`}>
                <div className="study-chart-bar-wrap">
                  <div
                    className={`study-chart-bar ${isToday ? 'today' : ''} ${day.mins > 0 ? 'has-data' : ''}`}
                    style={{ height: `${Math.max(heightPct, day.mins > 0 ? 4 : 0)}%` }}
                  />
                </div>
                {chartDays === 7 && (
                  <span className={`study-chart-bar-label ${isToday ? 'today' : ''}`}>{day.label}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
