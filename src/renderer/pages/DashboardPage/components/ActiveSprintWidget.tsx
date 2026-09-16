import React from 'react'
import { Rocket, Target, Calendar, ArrowRight } from 'lucide-react'

interface ActiveSprintWidgetProps {
  sprintName?: string
  goal?: string
  startDate?: string
  endDate?: string
  completedPoints?: number
  totalPoints?: number
  onNavigateToSprint?: () => void
}

export const ActiveSprintWidget: React.FC<ActiveSprintWidgetProps> = ({
  sprintName = 'Sprint Ativa',
  goal = 'Nenhuma meta definida para esta sprint.',
  startDate,
  endDate,
  completedPoints = 0,
  totalPoints = 0,
  onNavigateToSprint
}) => {
  const rate = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg"
            >
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">{sprintName}</h3>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Sprint & Backlog</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToSprint}
            style={{ color: 'var(--color-primary)' }}
            className="text-xs font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <span>Ver Sprint</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div
          style={{
            background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
            borderColor: 'var(--color-border)',
          }}
          className="p-2.5 rounded-lg border mb-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
            <Target className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            <span style={{ color: 'var(--color-text)' }}>Meta da Sprint:</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)' }} className="text-xs leading-relaxed italic">
            "{goal}"
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Progresso de Story Points</span>
            <span style={{ color: 'var(--color-text)' }} className="font-bold">
              {completedPoints} / {totalPoints} pts ({rate}%)
            </span>
          </div>
          <div
            style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
            className="w-full h-2 rounded-full overflow-hidden"
          >
            <div
              style={{
                width: `${rate}%`,
                background: 'var(--color-primary)',
              }}
              className="h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2.5 border-t mt-3 text-[11px]"
      >
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {startDate && endDate ? `${startDate} até ${endDate}` : 'Ciclo de 2 semanas'}
        </span>
        <span
          style={{ color: 'var(--color-primary)' }}
          className="font-medium cursor-pointer hover:underline"
          onClick={onNavigateToSprint}
        >
          Gerenciar Backlog
        </span>
      </div>
    </div>
  )
}
