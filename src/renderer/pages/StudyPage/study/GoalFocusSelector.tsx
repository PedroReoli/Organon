/**
 * GoalFocusSelector — seletor inline para escolher a meta em foco
 * durante a sessao de pomodoro atual. Ao finalizar sessao, o log
 * recebe o goalId automaticamente. Upgrade 14.
 */

import React from 'react'
import type { StudyGoal } from '@types'

interface GoalFocusSelectorProps {
  goals: StudyGoal[]
  focusedGoalId: string | null
  onSelect: (goalId: string | null) => void
}

export const GoalFocusSelector: React.FC<GoalFocusSelectorProps> = ({
  goals,
  focusedGoalId,
  onSelect,
}) => {
  const activeGoals = goals.filter((g) => g.status !== 'done')

  if (activeGoals.length === 0) {
    return null
  }

  const focused = focusedGoalId ? goals.find((g) => g.id === focusedGoalId) : null

  return (
    <div className="study-goal-focus" data-no-dnd>
      <label className="study-goal-focus-label">Focando em:</label>
      <select
        className="study-goal-focus-select"
        value={focusedGoalId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">(nenhuma meta)</option>
        {activeGoals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
      {focused && focused.category && (
        <span className="study-goal-focus-category">{focused.category}</span>
      )}
    </div>
  )
}
