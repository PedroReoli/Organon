/**
 * PlanningAnalyticsView — Relatório Executivo e Análise Avançada de Desempenho.
 *
 * Inclui:
 * - KPIs de Execução e Eficiência.
 * - Fiscalização Ativa de Tarefas Recorrentemente Adiadas (Gargalos).
 * - Análise de Distribuição por Prioridade (P1-P4) e Turno (Manhã/Tarde/Noite).
 * - Filtro por Janela Temporal (Esta Semana, Este Mês, Todo o Histórico).
 * - Histórico Relacional Detalhado com Ações Rápidas.
 * - Exportação de Relatório Executivo em formato Markdown.
 */

import React, { useMemo, useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import type { Card, SprintCard, CardPriority, Period } from '@types'
import { STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '@types'

export interface PlanningAnalyticsViewProps {
  cards: Card[]
  sprintCards: SprintCard[]
  onOpenCard?: (card: Card) => void
  onUpdateCard?: (cardId: string, updates: Partial<Card>) => void
}

type TimeFrame = 'week' | 'month' | 'all'
type FilterType = 'all' | 'postponed' | 'done' | 'cancelled' | 'in_progress'

export const PlanningAnalyticsView: React.FC<PlanningAnalyticsViewProps> = ({
  cards,
  sprintCards: _sprintCards,
  onOpenCard,
  onUpdateCard,
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week')
  const [filterType, setFilterType] = useState<FilterType>('postponed')
  const [copiedReport, setCopiedReport] = useState(false)

  /* Filtro de Janela Temporal */
  const timeFilteredCards = useMemo(() => {
    const now = new Date()
    const todayISO = now.toISOString().slice(0, 10)

    if (timeFrame === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return cards.filter(c => (c.date && c.date >= oneWeekAgo) || (!c.date && c.createdAt >= oneWeekAgo))
    }
    if (timeFrame === 'month') {
      const currentMonth = todayISO.slice(0, 7)
      return cards.filter(c => (c.date && c.date.startsWith(currentMonth)) || (!c.date && c.createdAt.startsWith(currentMonth)))
    }
    return cards
  }, [cards, timeFrame])

  /* Estatísticas Globais da Janela Selecionada */
  const metrics = useMemo(() => {
    const total = timeFilteredCards.length
    const doneCards = timeFilteredCards.filter((c) => c.status === 'done')
    const inProgressCards = timeFilteredCards.filter((c) => c.status === 'in_progress')
    const cancelledCards = timeFilteredCards.filter((c) => c.status === 'cancelled')
    const postponedCards = timeFilteredCards.filter((c) => (c.postponementCount ?? 0) > 0 || c.status === 'postponed')
    const highlyPostponed = timeFilteredCards.filter((c) => (c.postponementCount ?? 0) >= 2)

    const totalPostponements = timeFilteredCards.reduce((acc, c) => acc + (c.postponementCount ?? 0), 0)
    const completionRate = total > 0 ? Math.round((doneCards.length / total) * 100) : 0
    const cleanExecutions = doneCards.filter((c) => (c.postponementCount ?? 0) === 0).length
    const efficiencyRate = doneCards.length > 0 ? Math.round((cleanExecutions / doneCards.length) * 100) : 100

    /* Distribuição por Prioridade das Reagendadas */
    const postponedByPriority: Record<CardPriority | 'unassigned', number> = {
      P1: 0, P2: 0, P3: 0, P4: 0, unassigned: 0,
    }
    postponedCards.forEach((c) => {
      if (c.priority) postponedByPriority[c.priority] += 1
      else postponedByPriority.unassigned += 1
    })

    /* Distribuição por Turno/Período */
    const postponedByPeriod: Record<Period | 'none', number> = {
      morning: 0, afternoon: 0, night: 0, none: 0,
    }
    postponedCards.forEach((c) => {
      if (c.location.period) postponedByPeriod[c.location.period] += 1
      else postponedByPeriod.none += 1
    })

    return {
      total,
      doneCount: doneCards.length,
      inProgressCount: inProgressCards.length,
      cancelledCount: cancelledCards.length,
      postponedCount: postponedCards.length,
      highlyPostponedCount: highlyPostponed.length,
      totalPostponements,
      completionRate,
      efficiencyRate,
      postponedByPriority,
      postponedByPeriod,
      highlyPostponedList: highlyPostponed.sort((a, b) => (b.postponementCount ?? 0) - (a.postponementCount ?? 0)),
    }
  }, [timeFilteredCards])

  /* Histórico Filtrado */
  const filteredHistoryCards = useMemo(() => {
    return timeFilteredCards.filter((c) => {
      if (filterType === 'postponed') return (c.postponementCount ?? 0) > 0 || c.status === 'postponed'
      if (filterType === 'done') return c.status === 'done'
      if (filterType === 'in_progress') return c.status === 'in_progress'
      if (filterType === 'cancelled') return c.status === 'cancelled'
      return true
    }).sort((a, b) => (b.postponementCount ?? 0) - (a.postponementCount ?? 0))
  }, [timeFilteredCards, filterType])

  /* Exportação de Relatório Markdown */
  const handleExportMarkdown = useCallback(() => {
    const dateStr = new Date().toLocaleDateString('pt-BR')
    const md = [
      `# Relatório de Desempenho e Produtividade — ${dateStr}`,
      `**Janela de Análise**: ${timeFrame === 'week' ? 'Última Semana' : timeFrame === 'month' ? 'Mês Atual' : 'Todo o Histórico'}`,
      ``,
      `## KPIs Executivos`,
      `- **Total de Tarefas**: ${metrics.total}`,
      `- **Concluídas**: ${metrics.doneCount} (${metrics.completionRate}%)`,
      `- **Em Progresso**: ${metrics.inProgressCount}`,
      `- **Reagendadas/Adiadas**: ${metrics.postponedCount} (Total de ${metrics.totalPostponements} movimentações)`,
      `- **Canceladas**: ${metrics.cancelledCount}`,
      `- **Taxa de Execução na 1ª Tentativa**: ${metrics.efficiencyRate}%`,
      ``,
      `## Fiscalização de Gargalos (Tarefas Movidas 2x ou Mais)`,
      metrics.highlyPostponedList.length === 0
        ? `*Nenhum gargalo crítico identificado no período.*`
        : metrics.highlyPostponedList.map(c => `- **[${c.postponementCount}x movido]** ${c.title} (Prioridade: ${c.priority || 'N/A'}, Status: ${c.status})`).join('\n'),
      ``,
      `---`,
      `*Relatório gerado automaticamente pelo Sistema Organon.*`,
    ].join('\n')

    navigator.clipboard.writeText(md)
    setCopiedReport(true)
    setTimeout(() => setCopiedReport(false), 2500)
  }, [timeFrame, metrics])

  return (
    <div className="pa-view" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
      {/* Cabeçalho com Filtros de Período e Exportação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Relatório de Desempenho & Análise Relacional
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Indicadores de fluxo de trabalho, diagnóstico de gargalos e taxa de conversão de tarefas
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Selector de Janela de Tempo */}
          <div style={{ display: 'flex', background: 'var(--color-surface)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: timeFrame === 'week' ? 'var(--color-primary)' : 'transparent', color: timeFrame === 'week' ? '#fff' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setTimeFrame('week')}
            >
              Semana
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: timeFrame === 'month' ? 'var(--color-primary)' : 'transparent', color: timeFrame === 'month' ? '#fff' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setTimeFrame('month')}
            >
              Mês
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: timeFrame === 'all' ? 'var(--color-primary)' : 'transparent', color: timeFrame === 'all' ? '#fff' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setTimeFrame('all')}
            >
              Tudo
            </button>
          </div>

          {/* Botão de Exportar Markdown */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: copiedReport ? '#22c55e' : 'var(--color-surface-hover)',
              color: copiedReport ? '#fff' : 'var(--color-text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
              <path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
              <path d="M6 6h4M6 9h4" />
            </svg>
            {copiedReport ? 'Copiado para Clipboard!' : 'Exportar Relatório MD'}
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2" width="12" height="12">
              <path d="M3 8.5l3.5 3.5 6.5-6.5" />
            </svg>
            Concluídas
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#22c55e' }}>
            {metrics.doneCount} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>({metrics.completionRate}%)</span>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth="2" width="12" height="12">
              <path d="M8 3v5l3 3" />
              <circle cx="8" cy="8" r="6" />
            </svg>
            Reagendadas / Adiadas
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#f59e0b' }}>
            {metrics.postponedCount} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>({metrics.totalPostponements}x movidas)</span>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="2" width="12" height="12">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            Canceladas
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>
            {metrics.cancelledCount}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" width="12" height="12">
              <path d="M2 13t3-5 4 2 5-8" />
            </svg>
            Eficiência 1ª Tentativa
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: 'var(--color-primary)' }}>
            {metrics.efficiencyRate}%
          </div>
        </div>
      </div>

      {/* Painel de Análise de Reagendamentos por Prioridade e Turno */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-text)' }}>
            Reagendamentos por Prioridade
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(p => {
              const count = metrics.postponedByPriority[p]
              const percent = metrics.postponedCount > 0 ? Math.round((count / metrics.postponedCount) * 100) : 0
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ minWidth: '60px', fontWeight: 700, color: PRIORITY_COLORS[p] }}>{PRIORITY_LABELS[p]}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--color-background)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: PRIORITY_COLORS[p], borderRadius: '99px' }} />
                  </div>
                  <span style={{ minWidth: '35px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>{count} ({percent}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-text)' }}>
            Reagendamentos por Turno / Horário
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            {[
              { key: 'morning', label: 'Manhã', color: '#f59e0b' },
              { key: 'afternoon', label: 'Tarde', color: '#6366f1' },
              { key: 'night', label: 'Noite', color: '#a855f7' },
              { key: 'none', label: 'Sem Turno', color: '#64748b' },
            ].map(item => {
              const count = metrics.postponedByPeriod[item.key as Period | 'none']
              const percent = metrics.postponedCount > 0 ? Math.round((count / metrics.postponedCount) * 100) : 0
              return (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ minWidth: '65px', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--color-background)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: item.color, borderRadius: '99px' }} />
                  </div>
                  <span style={{ minWidth: '35px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>{count} ({percent}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Alerta de Fiscalização de Tarefas Problemáticas com Ações Rápidas */}
      {metrics.highlyPostponedCount > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M8 1.5 L15 14 H1 Z" />
              <line x1="8" y1="6" x2="8" y2="9.5" />
              <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
            </svg>
            Fiscalização Ativa de Gargalos ({metrics.highlyPostponedCount} tarefas com 2+ reagendamentos)
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
            As tarefas listadas abaixo foram movidas repetidamente sem serem concluídas. Avalie concluir, fracionar em subtarefas ou cancelar para despoluir o planejamento.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {metrics.highlyPostponedList.map((card) => (
              <div
                key={card.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-surface)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    Movido {card.postponementCount}x
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.title}
                  </span>
                  {card.priority && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: PRIORITY_COLORS[card.priority], border: `1px solid ${PRIORITY_COLORS[card.priority]}`, padding: '1px 4px', borderRadius: '3px' }}>
                      {PRIORITY_LABELS[card.priority]}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: '1px solid #22c55e44',
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: '#22c55e',
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    onClick={() => onUpdateCard?.(card.id, { status: 'done' })}
                  >
                    <Check size={11} /> Concluir
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-hover)',
                      color: 'var(--color-text)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => onOpenCard?.(card)}
                  >
                    Inspecionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico Relacional Compacto */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Histórico Relacional de Tarefas
          </h3>

          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-background)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: filterType === 'postponed' ? 'var(--color-surface-hover)' : 'transparent', color: filterType === 'postponed' ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setFilterType('postponed')}
            >
              Reagendadas ({metrics.postponedCount})
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: filterType === 'done' ? 'var(--color-surface-hover)' : 'transparent', color: filterType === 'done' ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setFilterType('done')}
            >
              Concluídas ({metrics.doneCount})
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: filterType === 'in_progress' ? 'var(--color-surface-hover)' : 'transparent', color: filterType === 'in_progress' ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setFilterType('in_progress')}
            >
              Em Progresso ({metrics.inProgressCount})
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: filterType === 'cancelled' ? 'var(--color-surface-hover)' : 'transparent', color: filterType === 'cancelled' ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setFilterType('cancelled')}
            >
              Canceladas ({metrics.cancelledCount})
            </button>
            <button
              type="button"
              style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: filterType === 'all' ? 'var(--color-surface-hover)' : 'transparent', color: filterType === 'all' ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setFilterType('all')}
            >
              Todas ({metrics.total})
            </button>
          </div>
        </div>

        {filteredHistoryCards.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '20px 0' }}>
            Nenhuma tarefa encontrada neste filtro.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '380px', overflowY: 'auto' }}>
            {filteredHistoryCards.map((card) => (
              <div
                key={card.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                onClick={() => onOpenCard?.(card)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[card.status] || '#6b7280' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: card.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: card.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {(card.postponementCount ?? 0) > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                      {card.postponementCount}x movido
                    </span>
                  )}
                  {card.date && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {card.date}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[card.status] }}>
                    {card.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
