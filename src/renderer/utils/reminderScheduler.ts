/**
 * reminderScheduler.ts — Serviço de Escalonamento Inteligente & Lembretes
 *
 * Avalia a lista de tarefas (cards), identifica atrasos, contagem de adiamentos,
 * dependências e calcula o nível de criticidade e próxima recomendação.
 */

import type { Card } from '@types'

export interface TaskUrgencyEvaluation {
  cardId: string
  isOverdue: boolean
  isCritical: boolean
  postponementCount: number
  hasUnmetDependencies: boolean
  recommendationReason?: string
}

export function evaluateTaskUrgency(card: Card, allCards: Card[]): TaskUrgencyEvaluation {
  const now = new Date()
  const todayISO = now.toISOString().slice(0, 10)
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  let isOverdue = false
  if (card.date && card.date < todayISO && card.status !== 'done' && card.status !== 'cancelled') {
    isOverdue = true
  } else if (card.date === todayISO && card.time && card.time < currentTimeStr && card.status !== 'done' && card.status !== 'cancelled') {
    isOverdue = true
  }

  // Verifica dependências não concluídas
  let hasUnmetDependencies = false
  if (card.dependencies && card.dependencies.length > 0) {
    const parentCards = allCards.filter(c => card.dependencies?.includes(c.id))
    hasUnmetDependencies = parentCards.some(p => p.status !== 'done')
  }

  const postponementCount = card.postponementCount ?? 0
  const isP1OrP2 = card.priority === 'P1' || card.priority === 'P2'

  // Critério de criticidade: se P1/P2 atrasada, ou adiada 3x+, ou atrasada sem dependências
  const isCritical = (isP1OrP2 && isOverdue) || (postponementCount >= 3 && !hasUnmetDependencies)

  let recommendationReason = ''
  if (hasUnmetDependencies) {
    recommendationReason = 'Aguardando conclusão de tarefas dependentes.'
  } else if (isCritical) {
    recommendationReason = 'Atenção necessária: prioridade alta e/ou múltiplos adiamentos.'
  } else if (isOverdue) {
    recommendationReason = 'Tarefa em atraso.'
  } else {
    recommendationReason = 'Planejada para execução.'
  }

  return {
    cardId: card.id,
    isOverdue,
    isCritical,
    postponementCount,
    hasUnmetDependencies,
    recommendationReason,
  }
}

/**
 * Filtra e recomenda a próxima melhor atividade para o momento atual.
 */
export function getRecommendedNextTask(cards: Card[]): Card | null {
  const activeCards = cards.filter(c => c.status !== 'done' && c.status !== 'cancelled')
  if (activeCards.length === 0) return null

  const evaluated = activeCards.map(c => ({
    card: c,
    urgency: evaluateTaskUrgency(c, cards),
  }))

  // Prioriza tarefas não bloqueadas, em atraso crítico ou com maior prioridade
  const ready = evaluated.filter(e => !e.urgency.hasUnmetDependencies)
  if (ready.length === 0) return activeCards[0]

  ready.sort((a, b) => {
    if (a.urgency.isCritical && !b.urgency.isCritical) return -1
    if (!a.urgency.isCritical && b.urgency.isCritical) return 1
    if (a.urgency.isOverdue && !b.urgency.isOverdue) return -1
    if (!a.urgency.isOverdue && b.urgency.isOverdue) return 1
    return 0
  })

  return ready[0].card
}
