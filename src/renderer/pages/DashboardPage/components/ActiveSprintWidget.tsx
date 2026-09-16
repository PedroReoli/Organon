import React from 'react'
import { Rocket, Target, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react'

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
  goal,
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
      className="border p-3.5 rounded-xl shadow-xs flex flex-col justify-between h-full select-none"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1 rounded-md"
            >
              <Rocket className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                {sprintName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToSprint}
            style={{ color: 'var(--color-primary)' }}
            className="text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Planejador</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Goal Banner (If exists) */}
        {goal && (
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
              borderColor: 'var(--color-border)',
            }}
            className="p-2 rounded-lg border mb-2.5 flex items-start gap-1.5"
          >
            <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px] leading-snug line-clamp-2">
              {goal}
            </p>
          </div>
        )}

        {/* Story Points / Progress */}
        <div className="space-y-1.5 my-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Progresso da Sprint
            </span>
            <span style={{ color: 'var(--color-text)' }} className="font-bold text-xs font-mono">
              {completedPoints} / {totalPoints} pts ({rate}%)
            </span>
          </div>

          <div
            style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
            className="w-full h-1.5 rounded-full overflow-hidden"
          >
            <div
              style={{
                width: `${rate}%`,
                background: 'var(--color-primary)',
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2 border-t mt-2 text-[11px]"
      >
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {startDate && endDate ? `${startDate} a ${endDate}` : 'Ciclo Atual'}
        </span>
        <button
          type="button"
          onClick={onNavigateToSprint}
          style={{ color: 'var(--color-primary)' }}
          className="font-medium hover:underline cursor-pointer"
        >
          Ver Backlog
        </button>
      </div>
    </div>
  )
}
