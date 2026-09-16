import React, { useState } from 'react'
import { BarChart3, Calendar, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react'

export interface DayActivity {
  key: string
  label: string
  date: string
  total: number
  completed: number
  isToday: boolean
}

interface WeeklyActivityChartProps {
  days: DayActivity[]
  onSelectDate?: (dateISO: string) => void
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ days, onSelectDate }) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const maxVal = Math.max(...days.map(d => Math.max(d.total, d.completed, 1)), 6)
  const totalWeekTasks = days.reduce((acc, d) => acc + d.total, 0)
  const totalWeekCompleted = days.reduce((acc, d) => acc + d.completed, 0)
  const weekEfficiency = totalWeekTasks > 0 ? Math.round((totalWeekCompleted / totalWeekTasks) * 100) : 0

  const activeDay = days.find(d => d.key === hoveredKey) ?? days.find(d => d.isToday) ?? days[0]

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full relative overflow-hidden transition-all group/container"
    >
      {/* Subtle background glow effect */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none blur-3xl opacity-20 transition-opacity group-hover/container:opacity-35"
        style={{ background: 'var(--color-primary)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
            }}
            className="p-2 rounded-lg border shadow-xs transition-transform duration-300 group-hover/container:scale-105"
          >
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold tracking-tight">
                Atividade Semanal
              </h3>
              <span
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                }}
                className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm"
              >
                {weekEfficiency}% eficiênc.
              </span>
            </div>
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">
              {totalWeekCompleted} de {totalWeekTasks} concluídas esta semana
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
                borderColor: 'var(--color-primary)',
              }}
              className="w-2.5 h-2.5 rounded-xs border"
            />
            <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Planejado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                background: 'var(--color-primary)',
                boxShadow: '0 0 6px color-mix(in srgb, var(--color-primary) 50%, transparent)',
              }}
              className="w-2.5 h-2.5 rounded-xs"
            />
            <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Feito</span>
          </div>
        </div>
      </div>

      {/* Floating Dynamic Inspector Banner */}
      <div
        style={{
          background: 'color-mix(in srgb, var(--color-background) 80%, var(--color-surface))',
          borderColor: 'var(--color-border)',
        }}
        className="px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs mb-2 transition-all duration-200 z-10"
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              color: activeDay.isToday ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: 700,
            }}
            className="text-xs flex items-center gap-1"
          >
            {activeDay.isToday && <Sparkles className="w-3 h-3 text-amber-400" />}
            {activeDay.label} ({activeDay.date.slice(8, 10)}/{activeDay.date.slice(5, 7)})
          </span>
          <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">
            • {activeDay.completed} de {activeDay.total} entregues
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            style={{
              color: activeDay.total > 0 && activeDay.completed >= activeDay.total ? '#10b981' : 'var(--color-primary)',
              fontWeight: 700,
            }}
            className="text-[11px]"
          >
            {activeDay.total > 0 ? Math.round((activeDay.completed / activeDay.total) * 100) : 0}% taxa
          </span>
          <button
            type="button"
            onClick={() => onSelectDate?.(activeDay.date)}
            style={{ color: 'var(--color-primary)' }}
            className="text-[10px] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Ver dia <ArrowUpRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Interactive Bar Chart Area */}
      <div className="relative h-40 flex items-end justify-between gap-2 px-1 pt-4 pb-1 z-10">
        {/* Background Grid Guide Lines */}
        <div className="absolute inset-x-2 top-4 bottom-7 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="w-full border-b border-dashed border-white/20" />
          <div className="w-full border-b border-dashed border-white/20" />
          <div className="w-full border-b border-dashed border-white/20" />
        </div>

        {days.map(day => {
          const totalHeightPercent = Math.min(100, Math.round((day.total / maxVal) * 100))
          const doneHeightPercent = Math.min(100, Math.round((day.completed / maxVal) * 100))
          const isHovered = hoveredKey === day.key
          const isAnyHovered = hoveredKey !== null

          return (
            <div
              key={day.key}
              onClick={() => onSelectDate?.(day.date)}
              onMouseEnter={() => setHoveredKey(day.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative transition-transform duration-200"
              style={{
                transform: isHovered ? 'translateY(-2px)' : 'none',
              }}
            >
              {/* Highlight Aura Column */}
              <div
                style={{
                  background: isHovered
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : day.isToday
                    ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
                    : 'transparent',
                  borderColor: isHovered
                    ? 'color-mix(in srgb, var(--color-primary) 35%, transparent)'
                    : 'transparent',
                }}
                className="absolute inset-x-0 -inset-y-1 rounded-lg border transition-all duration-200 pointer-events-none"
              />

              {/* Bar Stack Container */}
              <div
                style={{
                  background: 'color-mix(in srgb, var(--color-border) 45%, transparent)',
                  opacity: isAnyHovered && !isHovered ? 0.45 : 1,
                }}
                className="w-full max-w-[32px] h-[calc(100%-24px)] flex items-end justify-center relative rounded-t-lg overflow-hidden transition-all duration-300"
              >
                {/* Total scheduled bar backdrop */}
                <div
                  className="w-full rounded-t-lg transition-all duration-300 relative"
                  style={{
                    height: `${Math.max(totalHeightPercent, 8)}%`,
                    background: day.isToday
                      ? 'color-mix(in srgb, var(--color-primary) 32%, transparent)'
                      : isHovered
                      ? 'color-mix(in srgb, var(--color-primary) 24%, transparent)'
                      : 'color-mix(in srgb, var(--color-border) 80%, transparent)',
                    borderTop: day.isToday ? '2px solid var(--color-primary)' : 'none',
                  }}
                >
                  {/* Completed Fill Bar */}
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 absolute bottom-0 inset-x-0"
                    style={{
                      height: `${Math.max(doneHeightPercent, 0)}%`,
                      background: isHovered
                        ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 130%, #fff 20%), var(--color-primary))'
                        : 'var(--color-primary)',
                      boxShadow: isHovered
                        ? '0 0 12px color-mix(in srgb, var(--color-primary) 60%, transparent)'
                        : 'none',
                    }}
                  />
                </div>
              </div>

              {/* Day Label Pill */}
              <div
                style={{
                  background: isHovered
                    ? 'color-mix(in srgb, var(--color-primary) 18%, transparent)'
                    : day.isToday
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : 'transparent',
                  color: isHovered || day.isToday ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
                className="mt-1.5 px-1 py-0.5 rounded text-center select-none w-full transition-all"
              >
                <span
                  style={{
                    color: isHovered || day.isToday ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: isHovered || day.isToday ? 700 : 600,
                  }}
                  className="text-[11px] block leading-tight"
                >
                  {day.label}
                </span>
                <span className="text-[9px] font-mono leading-none">
                  {day.date.slice(8, 10)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer info */}
      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2 border-t mt-1 text-[11px] z-10"
      >
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
          <span>Filtro dinâmico da semana</span>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span>Média: <strong>{Math.round(totalWeekTasks / (days.length || 1))}</strong> itens/dia</span>
        </span>
      </div>
    </div>
  )
}

