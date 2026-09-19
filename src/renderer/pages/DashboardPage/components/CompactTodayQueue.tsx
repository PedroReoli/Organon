import React from 'react'
import type { Card } from '@types'
import {
  ListChecks,
  CheckCircle,
  Circle,
  Clock,
  Plus,
  ArrowRight,
  Fire,
  CheckSquareOffset
} from '@phosphor-icons/react'

interface CompactTodayQueueProps {
  todayCards: Card[]
  onToggleCard: (cardId: string) => void
  onGoToPlannerCard: (cardId: string) => void
  onNavigateToPlanner: () => void
}

export const CompactTodayQueue: React.FC<CompactTodayQueueProps> = ({
  todayCards,
  onToggleCard,
  onGoToPlannerCard,
  onNavigateToPlanner
}) => {
  const pending = todayCards.filter(c => c.status !== 'done')
  const completed = todayCards.filter(c => c.status === 'done')

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg"
            >
              <ListChecks size={18} weight="duotone" />
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Fila de Hoje</h3>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">
                {pending.length} pendentes · {completed.length} concluídas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToPlanner}
            style={{ color: 'var(--color-primary)' }}
            className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80 transition-opacity"
          >
            <span>Ver Planejador</span>
            <ArrowRight size={12} weight="bold" />
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {todayCards.length === 0 ? (
            <div className="py-7 text-center">
              <div
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                  borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 border shadow-2xs"
              >
                <CheckSquareOffset size={22} weight="duotone" />
              </div>
              <p style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Tudo limpo para hoje!</p>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px] mt-0.5">Nenhuma tarefa agendada na fila.</p>
            </div>
          ) : (
            todayCards.map(card => {
              const isDone = card.status === 'done'
              const prioBorder =
                card.priority === 'P1'
                  ? '#f43f5e'
                  : card.priority === 'P2'
                    ? '#f59e0b'
                    : 'var(--color-primary)'

              return (
                <div
                  key={card.id}
                  style={{
                    background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                    borderColor: 'var(--color-border)',
                    borderLeftColor: prioBorder,
                    borderLeftWidth: '3px',
                  }}
                  className="flex items-center justify-between p-2 rounded-lg border hover:opacity-95 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleCard(card.id)}
                      style={{ color: isDone ? '#10b981' : 'var(--color-text-muted)' }}
                      className="hover:opacity-80 transition-opacity shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                      ) : (
                        <Circle size={16} weight="bold" className="hover:scale-110 transition-transform" />
                      )}
                    </button>

                    <span
                      onClick={() => onGoToPlannerCard(card.id)}
                      style={{
                        color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                      className="text-xs font-medium truncate cursor-pointer hover:underline"
                    >
                      {card.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {card.time && (
                      <span style={{ color: 'var(--color-text-muted)' }} className="flex items-center gap-0.5 text-[10px] font-medium">
                        <Clock size={11} weight="duotone" />
                        {card.time}
                      </span>
                    )}

                    {card.priority === 'P1' && (
                      <span className="p-0.5 text-rose-500" title="Urgente">
                        <Fire size={13} weight="fill" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        style={{ borderColor: 'var(--color-border)' }}
        className="pt-2 border-t mt-2"
      >
        <button
          type="button"
          onClick={onNavigateToPlanner}
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] text-xs font-medium transition-all"
        >
          <Plus size={14} weight="bold" />
          <span>Adicionar Tarefa no Planejador</span>
        </button>
      </div>
    </div>
  )
}
