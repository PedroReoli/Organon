import React, { useState } from 'react'
import { RocketLaunch, Target, CalendarBlank, ArrowRight, CheckCircle, Fire, Clock, Sparkle } from '@phosphor-icons/react'

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
  const [isHovered, setIsHovered] = useState(false)
  const [inspectMode, setInspectMode] = useState<'completed' | 'remaining' | null>(null)

  const remainingPoints = Math.max(0, totalPoints - completedPoints)
  const rate = totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setInspectMode(null)
      }}
      style={{
        background: 'var(--color-surface)',
        borderColor: isHovered ? 'var(--color-primary)' : 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full select-none transition-all duration-300 relative group/sprint hover:shadow-md"
    >
      {/* Ambient background glow when hovered */}
      <div
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 70%)',
        }}
        className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-500 opacity-0 group-hover/sprint:opacity-100"
      />

      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover/sprint:scale-105"
            >
              <RocketLaunch size={18} weight="duotone" />
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                {sprintName}
              </h3>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Sprint & Entregas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToSprint}
            style={{ color: 'var(--color-primary)' }}
            className="text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer group-hover/sprint:translate-x-0.5 transition-transform"
          >
            <span>Planejador</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>

        {/* Goal Banner */}
        {goal && (
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
              borderColor: 'var(--color-border)',
            }}
            className="p-2.5 rounded-lg border mb-3 flex items-start gap-2"
          >
            <Target size={14} weight="duotone" className="shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px] leading-snug line-clamp-2">
              {goal}
            </p>
          </div>
        )}

        {/* Progress & Metrics */}
        <div className="space-y-2 my-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px] font-medium flex items-center gap-1.5">
              <Fire size={14} weight="fill" className="text-amber-500 animate-pulse" />
              Ritmo de Entrega
            </span>
            <span style={{ color: 'var(--color-text)' }} className="font-bold text-xs font-mono flex items-center gap-1">
              <span style={{ color: 'var(--color-primary)' }}>{rate}%</span>
              <span style={{ color: 'var(--color-text-muted)' }}>({completedPoints}/{totalPoints} pts)</span>
            </span>
          </div>

          {/* Interactive Progress Bar with Spark Head */}
          <div
            style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
            className="w-full h-2.5 rounded-full overflow-hidden relative cursor-pointer"
          >
            <div
              style={{
                width: `${rate}%`,
                background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 70%, transparent), var(--color-primary))',
                boxShadow: isHovered ? '0 0 10px var(--color-primary)' : 'none',
              }}
              className="h-full rounded-full transition-all duration-500 relative"
            >
              {rate > 5 && (
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Interactive Metric Pills */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div
              onMouseEnter={() => setInspectMode('completed')}
              onMouseLeave={() => setInspectMode(null)}
              style={{
                background: inspectMode === 'completed'
                  ? 'color-mix(in srgb, #10b981 12%, var(--color-surface))'
                  : 'color-mix(in srgb, var(--color-background) 50%, var(--color-surface))',
                borderColor: inspectMode === 'completed' ? '#10b981' : 'var(--color-border)',
              }}
              className="p-2 rounded-lg border transition-all cursor-pointer text-center"
            >
              <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                <CheckCircle size={13} weight="fill" /> Entregues
              </div>
              <div style={{ color: 'var(--color-text)' }} className="text-sm font-extrabold mt-0.5">
                {completedPoints} <span style={{ color: 'var(--color-text-muted)' }} className="text-[10px] font-normal">pts</span>
              </div>
            </div>

            <div
              onMouseEnter={() => setInspectMode('remaining')}
              onMouseLeave={() => setInspectMode(null)}
              style={{
                background: inspectMode === 'remaining'
                  ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                  : 'color-mix(in srgb, var(--color-background) 50%, var(--color-surface))',
                borderColor: inspectMode === 'remaining' ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              className="p-2 rounded-lg border transition-all cursor-pointer text-center"
            >
              <div className="text-[10px] font-medium flex items-center justify-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <Clock size={13} weight="duotone" /> Em Aberto
              </div>
              <div style={{ color: 'var(--color-text)' }} className="text-sm font-extrabold mt-0.5">
                {remainingPoints} <span style={{ color: 'var(--color-text-muted)' }} className="text-[10px] font-normal">pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2.5 border-t mt-2 text-[11px] relative z-10"
      >
        <span className="flex items-center gap-1.5">
          <CalendarBlank size={13} weight="duotone" />
          {startDate && endDate ? `${startDate} a ${endDate}` : 'Ciclo Atual'}
        </span>
        <button
          type="button"
          onClick={onNavigateToSprint}
          style={{ color: 'var(--color-primary)' }}
          className="font-semibold hover:underline cursor-pointer flex items-center gap-1"
        >
          <Sparkle size={13} weight="fill" />
          <span>Ver Backlog</span>
        </button>
      </div>
    </div>
  )
}
