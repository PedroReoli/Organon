import { useState } from 'react'
import type { Card, CardPriority, CardStatus, StudyGoal } from '@types'
import { PRIORITY_LABELS, STATUS_LABELS } from '@types'

interface GoalsPanelProps {
  goals:             StudyGoal[]
  goalTitle:         string
  setGoalTitle:      (v: string) => void
  goalChecklistDrafts: Record<string, string>
  setGoalChecklistDrafts: (updater: (prev: Record<string, string>) => Record<string, string>) => void
  expandedGoals:     Record<string, boolean>
  setExpandedGoals:  (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  goalsConfigMode:   boolean
  setGoalsConfigMode: (updater: (prev: boolean) => boolean) => void
  showPlanningPicker:    boolean
  setShowPlanningPicker: (updater: (prev: boolean) => boolean) => void
  availablePlanningCards: Card[]
  planningCards:          Card[]
  linkedPlanningCards:    Map<string, Card>
  updateGoal:           (goalId: string, updater: (g: StudyGoal) => StudyGoal) => void
  handleAddGoal:        () => void
  removeGoal:           (goalId: string) => void
  importPlanningCardAsGoal: (card: Card) => void
  refreshGoalFromPlanning:  (goalId: string) => void
  addGoalChecklistItem:     (goalId: string) => void
  toggleGoalChecklistItem:  (goalId: string, checklistId: string) => void
  removeGoalChecklistItem:  (goalId: string, checklistId: string) => void
}

export const GoalsPanel = ({
  goals, goalTitle, setGoalTitle, goalChecklistDrafts, setGoalChecklistDrafts,
  expandedGoals, setExpandedGoals, goalsConfigMode, setGoalsConfigMode,
  showPlanningPicker, setShowPlanningPicker,
  availablePlanningCards, planningCards, linkedPlanningCards,
  updateGoal, handleAddGoal, removeGoal, importPlanningCardAsGoal, refreshGoalFromPlanning,
  addGoalChecklistItem, toggleGoalChecklistItem, removeGoalChecklistItem,
}: GoalsPanelProps) => {
  const [goalFilter, setGoalFilter] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const filteredGoals = goalFilter.trim()
    ? goals.filter(g => g.title.toLowerCase().includes(goalFilter.toLowerCase()))
    : goals

  const deadlineColor = (deadline: string | null | undefined): string => {
    if (!deadline) return ''
    if (deadline < today) return '#ef4444'   // past
    const diff = (new Date(deadline).getTime() - new Date(today).getTime()) / 86400000
    if (diff <= 3) return '#f97316'           // soon
    return 'rgba(255,255,255,0.5)'
  }

  return (
  <div className="study-panel-section">
    <div className="study-goals-panel-header">
      <h3>Metas de estudo</h3>
      <button
        type="button"
        className={`study-btn study-btn-icon study-btn-ghost ${goalsConfigMode ? 'is-active' : ''}`}
        onClick={() => setGoalsConfigMode(prev => !prev)}
        title={goalsConfigMode ? 'Fechar configuracao' : 'Configurar metas'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>
    </div>

    {!goalsConfigMode && (
      <div className="study-goals-cards">
        {goals.length > 1 && (
          <input
            className="study-goals-search"
            placeholder="Buscar meta..."
            value={goalFilter}
            onChange={e => setGoalFilter(e.target.value)}
          />
        )}
        {filteredGoals.length === 0 && (
          <p className="study-panel-hint">
            {goals.length === 0 ? 'Sem metas ainda. Abra configuracao para criar.' : 'Nenhuma meta encontrada.'}
          </p>
        )}
        {filteredGoals.map(goal => {
          const linkedCard     = goal.linkedPlanningCardId ? linkedPlanningCards.get(goal.linkedPlanningCardId) : null
          const doneChecklist  = goal.checklist.filter(item => item.done).length
          const checklistTotal = goal.checklist.length
          return (
            <article key={goal.id} className="study-goal-card-view">
              <header>
                <strong>{goal.title}</strong>
                <span className={`study-goal-card-status is-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
              </header>
              <footer>
                <small>{goal.priority ? `${goal.priority} - ${PRIORITY_LABELS[goal.priority]}` : 'Sem prioridade'}</small>
                <small>{checklistTotal > 0 ? `${doneChecklist}/${checklistTotal} checklist` : 'Sem checklist'}</small>
                {goal.deadline && (
                  <small style={{ color: deadlineColor(goal.deadline) }}>
                    Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </small>
                )}
              </footer>
              {goal.linkedPlanningCardId && (
                <div className="study-goal-actions">
                  <small>{linkedCard?.title ?? 'Card de origem removido'}</small>
                  <small>Vinculada ao planejamento</small>
                </div>
              )}
            </article>
          )
        })}
      </div>
    )}

    {goalsConfigMode && (
      <>
        <div className="study-input-row">
          <input
            type="text"
            value={goalTitle}
            onChange={e => setGoalTitle(e.target.value)}
            placeholder="Titulo da meta"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddGoal() } }}
          />
          <button type="button" className="study-btn study-btn-icon" onClick={handleAddGoal} title="Adicionar meta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="study-planning-picker">
          <button
            type="button"
            className="study-btn study-btn-ghost study-planning-picker-toggle"
            onClick={() => setShowPlanningPicker(prev => !prev)}
          >
            <span>Planejamento de hoje</span>
            <strong>{availablePlanningCards.length}</strong>
          </button>

          {showPlanningPicker && (
            <>
              {availablePlanningCards.length > 0 ? (
                availablePlanningCards.map(card => (
                  <button
                    key={card.id}
                    type="button"
                    className="study-planning-picker-item"
                    onClick={() => importPlanningCardAsGoal(card)}
                  >
                    <div>
                      <strong>{card.title}</strong>
                      <small>{card.priority ? `${card.priority} - ` : ''}{STATUS_LABELS[card.status]}</small>
                    </div>
                    <span>Virar meta</span>
                  </button>
                ))
              ) : (
                <p className="study-panel-hint">Sem cards disponiveis para importar hoje.</p>
              )}
            </>
          )}
        </div>

        {planningCards.length > 0 && (
          <div className="study-panel-hint">
            Hoje no planejamento: {planningCards.length} card(s)
          </div>
        )}

        <div className="study-goals-list">
          {goals.length > 1 && (
            <input
              className="study-goals-search"
              placeholder="Buscar meta..."
              value={goalFilter}
              onChange={e => setGoalFilter(e.target.value)}
            />
          )}
          {filteredGoals.length === 0 && (
            <p className="study-panel-hint">
              {goals.length === 0 ? 'Sem metas ainda.' : 'Nenhuma meta encontrada.'}
            </p>
          )}

          {filteredGoals.map(goal => {
            const isExpanded = expandedGoals[goal.id] !== false
            const linkedCard = goal.linkedPlanningCardId ? linkedPlanningCards.get(goal.linkedPlanningCardId) : null

            return (
              <article key={goal.id} className="study-goal-item">
                <div className="study-goal-header">
                  <label className="study-mute-toggle study-goal-done-toggle">
                    <input
                      type="checkbox"
                      checked={goal.status === 'done'}
                      onChange={e => updateGoal(goal.id, current => ({
                        ...current, status: e.target.checked ? 'done' : 'todo',
                      }))}
                    />
                    <span className={goal.status === 'done' ? 'is-done' : ''}>Feito</span>
                  </label>
                  <input
                    type="text"
                    className="study-goal-title-input"
                    value={goal.title}
                    onChange={e => updateGoal(goal.id, current => ({ ...current, title: e.target.value }))}
                    placeholder="Titulo da meta"
                  />
                  <button
                    type="button"
                    className="study-btn study-btn-ghost study-btn-icon"
                    onClick={() => setExpandedGoals(prev => ({ ...prev, [goal.id]: !isExpanded }))}
                    title={isExpanded ? 'Ocultar detalhes' : 'Abrir detalhes'}
                  >
                    {isExpanded ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="study-btn study-btn-danger study-btn-icon"
                    onClick={() => removeGoal(goal.id)}
                    title="Remover meta"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="study-goal-main">
                  <div className="study-goal-row">
                    <select
                      value={goal.priority ?? ''}
                      onChange={e => updateGoal(goal.id, current => ({
                        ...current, priority: (e.target.value || null) as CardPriority | null,
                      }))}
                    >
                      <option value="">Sem prioridade</option>
                      {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(priority => (
                        <option key={priority} value={priority}>{priority} - {PRIORITY_LABELS[priority]}</option>
                      ))}
                    </select>
                    <select
                      value={goal.status}
                      onChange={e => updateGoal(goal.id, current => ({
                        ...current, status: e.target.value as CardStatus,
                      }))}
                    >
                      {(['todo', 'in_progress', 'blocked', 'done'] as CardStatus[]).map(status => (
                        <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="study-goal-deadline-input"
                      value={goal.deadline ?? ''}
                      onChange={e => updateGoal(goal.id, current => ({
                        ...current, deadline: e.target.value || null,
                      }))}
                      title="Prazo"
                    />
                    {goal.linkedPlanningCardId && (
                      <button
                        type="button"
                        className="study-goal-linked-badge"
                        onClick={() => refreshGoalFromPlanning(goal.id)}
                        title="Atualizar com dados do planejamento"
                      >
                        Vinculada
                      </button>
                    )}
                  </div>

                  <textarea
                    className="study-goal-description"
                    value={goal.description ?? ''}
                    onChange={e => updateGoal(goal.id, current => ({ ...current, description: e.target.value }))}
                    placeholder="Descricao da meta (opcional)..."
                    rows={2}
                  />

                  {isExpanded && (
                    <div className="study-goal-checklist">
                      <span className="study-card-label">Checklist</span>
                      {goal.checklist.map(item => (
                        <div key={item.id} className="study-goal-check-item">
                          <label className="study-mute-toggle">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => toggleGoalChecklistItem(goal.id, item.id)}
                            />
                            <span>{item.text}</span>
                          </label>
                          <button
                            type="button"
                            className="study-btn study-btn-danger study-btn-icon"
                            onClick={() => removeGoalChecklistItem(goal.id, item.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div className="study-input-row">
                        <input
                          type="text"
                          value={goalChecklistDrafts[goal.id] ?? ''}
                          onChange={e => setGoalChecklistDrafts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          placeholder="Novo item da checklist"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoalChecklistItem(goal.id) } }}
                        />
                        <button type="button" className="study-btn study-btn-icon" onClick={() => addGoalChecklistItem(goal.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {goal.linkedPlanningCardId && (
                    <div className="study-goal-actions">
                      <small>{linkedCard?.title ?? 'Card de origem removido'}</small>
                      <small>Sincroniza automatico com Planejamento</small>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </>
    )}
  </div>
  )
}
