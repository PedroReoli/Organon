/**
 * SessionHistory — historico de sessoes pomodoro com filtros + export CSV.
 * Upgrade 14.
 */

import React, { useMemo, useState } from 'react'
import type { StudyGoal, StudySessionLog } from '@types'
import { Button, Input } from '@shared/components/primitives'

interface SessionHistoryProps {
  sessions: StudySessionLog[]
  goals: StudyGoal[]
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  if (minutes === 0) return `${rem}s`
  if (rem === 0) return `${minutes}min`
  return `${minutes}m${rem}s`
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions, goals }) => {
  const [filterGoalId, setFilterGoalId] = useState<string>('')
  const [filterQuery, setFilterQuery] = useState('')

  const goalMap = useMemo(() => {
    const map = new Map<string, StudyGoal>()
    for (const g of goals) map.set(g.id, g)
    return map
  }, [goals])

  const sorted = useMemo(() => {
    const lowerQuery = filterQuery.trim().toLowerCase()
    return [...sessions]
      .filter((s) => {
        if (filterGoalId && s.goalId !== filterGoalId) return false
        if (lowerQuery) {
          const goal = s.goalId ? goalMap.get(s.goalId) : null
          const haystack = [
            goal?.title ?? '',
            s.category ?? '',
            s.presetName ?? '',
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(lowerQuery)) return false
        }
        return true
      })
      .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
  }, [sessions, goalMap, filterGoalId, filterQuery])

  const handleExport = () => {
    const header = ['data', 'duracao_min', 'meta', 'preset', 'categoria']
    const rows = sorted.map((s) => {
      const goal = s.goalId ? goalMap.get(s.goalId) : null
      return [
        s.completedAt,
        String(Math.round(s.focusSeconds / 60)),
        goal?.title ?? '',
        s.presetName ?? '',
        s.category ?? '',
      ].map(escapeCsv)
    })
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    downloadCsv(`pomodoro-sessions-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="study-history-panel">
      <header className="study-history-header">
        <h3>Historico de sessoes</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={sorted.length === 0}
        >
          Exportar CSV
        </Button>
      </header>

      <div className="study-history-filters">
        <Input
          type="text"
          placeholder="Buscar por meta, preset ou categoria..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          fullWidth
        />
        <select
          className="form-input"
          value={filterGoalId}
          onChange={(e) => setFilterGoalId(e.target.value)}
        >
          <option value="">Todas as metas</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      <div className="study-history-list">
        {sorted.length === 0 ? (
          <p className="study-history-empty">Nenhuma sessao registrada.</p>
        ) : (
          sorted.map((s) => {
            const goal = s.goalId ? goalMap.get(s.goalId) : null
            return (
              <div key={s.id} className="study-history-item">
                <div className="study-history-item-main">
                  <strong>{formatDuration(s.focusSeconds)}</strong>
                  <span className="study-history-item-date">
                    {formatDateTime(s.completedAt)}
                  </span>
                </div>
                <div className="study-history-item-meta">
                  {goal && <span>Meta: {goal.title}</span>}
                  {s.presetName && <span>Preset: {s.presetName}</span>}
                  {s.category && <span>{s.category}</span>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="study-history-footer">
        {sorted.length} sessao{sorted.length === 1 ? '' : 'es'}
      </div>
    </div>
  )
}
