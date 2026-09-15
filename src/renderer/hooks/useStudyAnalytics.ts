/**
 * Hook puro de analytics de sessoes de estudo (pomodoro).
 *
 * Calcula heatmap hora x dia_da_semana, tendencia dos ultimos N dias,
 * total de foco, melhor hora, melhor dia da semana, e breakdown por
 * goal/categoria. Tudo em memoria, zero side effects.
 *
 * Definido no upgrade 14.
 */

import { useMemo } from 'react'
import type { StudyGoal, StudySessionLog } from '../types'

export interface StudyHeatmapCell {
  hour: number      // 0-23
  weekday: number   // 0=dom, 6=sab
  focusSeconds: number
  sessionCount: number
}

export interface StudyTrendPoint {
  date: string      // YYYY-MM-DD
  focusSeconds: number
  sessionCount: number
}

export interface StudyGoalBreakdown {
  goalId: string | null
  title: string
  focusSeconds: number
  sessionCount: number
  percent: number
}

export interface UseStudyAnalyticsResult {
  totalFocusSeconds: number
  totalSessions: number
  totalFocusSeconds7d: number
  totalFocusSeconds30d: number
  /** 24*7 = 168 celulas. */
  heatmap: StudyHeatmapCell[]
  /** Max focusSeconds em uma unica cell — usado para escalar cores. */
  heatmapMax: number
  /** Serie diaria dos ultimos N dias (default 30). */
  trend: StudyTrendPoint[]
  /** Hora do dia com mais foco (0-23). -1 se sem dados. */
  bestHour: number
  /** Dia da semana com mais foco (0=dom). -1 se sem dados. */
  bestWeekday: number
  /** Total por goal (top N). */
  goalBreakdown: StudyGoalBreakdown[]
  /** Total por categoria. */
  categoryBreakdown: Array<{ category: string; focusSeconds: number; sessionCount: number }>
}

interface UseStudyAnalyticsOptions {
  sessions: StudySessionLog[]
  goals: StudyGoal[]
  /** Janela de trend em dias. Default: 30. */
  trendDays?: number
  today?: Date
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

export function useStudyAnalytics(
  options: UseStudyAnalyticsOptions,
): UseStudyAnalyticsResult {
  const { sessions, goals, trendDays = 30, today = new Date() } = options

  return useMemo(() => {
    const todayISO = toISODate(today)
    const startOfWeek = addDaysISO(todayISO, -6)
    const startOfMonth = addDaysISO(todayISO, -29)

    // Goal lookup
    const goalMap = new Map<string, StudyGoal>()
    for (const g of goals) goalMap.set(g.id, g)

    // Heatmap 24x7
    const heatmapGrid: StudyHeatmapCell[] = []
    for (let h = 0; h < 24; h++) {
      for (let w = 0; w < 7; w++) {
        heatmapGrid.push({
          hour: h,
          weekday: w,
          focusSeconds: 0,
          sessionCount: 0,
        })
      }
    }

    let totalFocus = 0
    let totalFocus7 = 0
    let totalFocus30 = 0
    const trendMap = new Map<string, { focusSeconds: number; sessionCount: number }>()
    const goalTotals = new Map<string, { focusSeconds: number; sessionCount: number }>()
    const categoryTotals = new Map<string, { focusSeconds: number; sessionCount: number }>()
    const hourTotals = new Array(24).fill(0)
    const weekdayTotals = new Array(7).fill(0)

    for (const session of sessions) {
      const d = new Date(session.completedAt)
      if (Number.isNaN(d.getTime())) continue
      const iso = toISODate(d)
      const hour = d.getHours()
      const weekday = d.getDay()
      const focus = session.focusSeconds

      totalFocus += focus
      if (iso >= startOfWeek) totalFocus7 += focus
      if (iso >= startOfMonth) totalFocus30 += focus

      // Heatmap
      const cellIdx = hour * 7 + weekday
      const cell = heatmapGrid[cellIdx]
      cell.focusSeconds += focus
      cell.sessionCount += 1

      // Trend
      const trendCell = trendMap.get(iso) ?? { focusSeconds: 0, sessionCount: 0 }
      trendCell.focusSeconds += focus
      trendCell.sessionCount += 1
      trendMap.set(iso, trendCell)

      // Goal
      const goalKey = session.goalId ?? '__none__'
      const goalCell = goalTotals.get(goalKey) ?? { focusSeconds: 0, sessionCount: 0 }
      goalCell.focusSeconds += focus
      goalCell.sessionCount += 1
      goalTotals.set(goalKey, goalCell)

      // Category (fallback para goal.category ou session.category)
      const cat = session.category
        ?? (session.goalId ? goalMap.get(session.goalId)?.category : undefined)
        ?? '(sem categoria)'
      const catCell = categoryTotals.get(cat) ?? { focusSeconds: 0, sessionCount: 0 }
      catCell.focusSeconds += focus
      catCell.sessionCount += 1
      categoryTotals.set(cat, catCell)

      hourTotals[hour] += focus
      weekdayTotals[weekday] += focus
    }

    // Trend: preenche buracos com zeros
    const trend: StudyTrendPoint[] = []
    for (let i = trendDays - 1; i >= 0; i--) {
      const iso = addDaysISO(todayISO, -i)
      const cell = trendMap.get(iso) ?? { focusSeconds: 0, sessionCount: 0 }
      trend.push({ date: iso, focusSeconds: cell.focusSeconds, sessionCount: cell.sessionCount })
    }

    // Max da heatmap
    let heatmapMax = 0
    for (const cell of heatmapGrid) {
      if (cell.focusSeconds > heatmapMax) heatmapMax = cell.focusSeconds
    }

    // Melhor hora/dia
    let bestHour = -1
    let bestHourValue = 0
    for (let h = 0; h < 24; h++) {
      if (hourTotals[h] > bestHourValue) {
        bestHourValue = hourTotals[h]
        bestHour = h
      }
    }
    let bestWeekday = -1
    let bestWeekdayValue = 0
    for (let w = 0; w < 7; w++) {
      if (weekdayTotals[w] > bestWeekdayValue) {
        bestWeekdayValue = weekdayTotals[w]
        bestWeekday = w
      }
    }

    // Goal breakdown ordenado
    const goalBreakdown: StudyGoalBreakdown[] = Array.from(goalTotals.entries())
      .map(([key, v]) => {
        const goal = key === '__none__' ? null : goalMap.get(key)
        return {
          goalId: key === '__none__' ? null : key,
          title: goal?.title ?? '(sem goal)',
          focusSeconds: v.focusSeconds,
          sessionCount: v.sessionCount,
          percent: totalFocus === 0 ? 0 : (v.focusSeconds / totalFocus) * 100,
        }
      })
      .sort((a, b) => b.focusSeconds - a.focusSeconds)

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([category, v]) => ({
        category,
        focusSeconds: v.focusSeconds,
        sessionCount: v.sessionCount,
      }))
      .sort((a, b) => b.focusSeconds - a.focusSeconds)

    return {
      totalFocusSeconds: totalFocus,
      totalSessions: sessions.length,
      totalFocusSeconds7d: totalFocus7,
      totalFocusSeconds30d: totalFocus30,
      heatmap: heatmapGrid,
      heatmapMax,
      trend,
      bestHour,
      bestWeekday,
      goalBreakdown,
      categoryBreakdown,
    }
  }, [sessions, goals, trendDays, today])
}
