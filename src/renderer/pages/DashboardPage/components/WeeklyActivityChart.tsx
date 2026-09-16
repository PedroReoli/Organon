import React, { useState } from 'react'
import { BarChart3, Calendar } from 'lucide-react'

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
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null)

  const maxVal = Math.max(...days.map(d => Math.max(d.total, d.completed, 1)), 6)

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Atividade Semanal</h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Tarefas agendadas vs concluídas</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
                borderColor: 'var(--color-primary)',
              }}
              className="w-2.5 h-2.5 rounded-xs border"
            />
            <span style={{ color: 'var(--color-text-muted)' }}>Planejado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                background: 'var(--color-primary)',
              }}
              className="w-2.5 h-2.5 rounded-xs"
            />
            <span style={{ color: 'var(--color-text-muted)' }}>Concluído</span>
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Area */}
      <div className="relative h-44 flex items-end justify-between gap-2 pt-6 px-2">
        {days.map(day => {
          const totalHeightPercent = Math.min(100, Math.round((day.total / maxVal) * 100))
          const doneHeightPercent = Math.min(100, Math.round((day.completed / maxVal) * 100))
          const isHovered = hoveredDay?.key === day.key

          return (
            <div
              key={day.key}
              onClick={() => onSelectDate?.(day.date)}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
            >
              {/* Tooltip on Hover */}
              {isHovered && (
                <div
                  style={{
                    background: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 rounded-md border shadow-lg text-[10px] font-medium pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95"
                >
                  <span className="font-bold">{day.label} ({day.date.slice(8, 10)}/{day.date.slice(5, 7)}): </span>
                  <span>{day.completed} de {day.total} feitas</span>
                </div>
              )}

              {/* Bar Stack */}
              <div
                style={{ background: 'color-mix(in srgb, var(--color-border) 40%, transparent)' }}
                className="w-full max-w-[28px] h-full flex items-end justify-center relative rounded-t-md overflow-hidden"
              >
                {/* Total scheduled bar backdrop */}
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: `${Math.max(totalHeightPercent, 8)}%`,
                    background: day.isToday
                      ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
                      : 'color-mix(in srgb, var(--color-border) 80%, transparent)',
                    borderTop: day.isToday ? '2px solid var(--color-primary)' : 'none',
                  }}
                >
                  {/* Completed Fill Bar */}
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(doneHeightPercent, 0)}%`,
                      background: 'var(--color-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Day Label */}
              <div className="mt-2 text-center select-none">
                <span
                  style={{
                    color: day.isToday ? 'var(--color-primary)' : 'var(--color-text)',
                    fontWeight: day.isToday ? 700 : 600,
                  }}
                  className="text-[11px] block"
                >
                  {day.label}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }} className="text-[9px]">
                  {day.date.slice(8, 10)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2 border-t mt-1 text-[11px]"
      >
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
          Semana Atual
        </span>
        <span>Média diária: {Math.round(days.reduce((acc, d) => acc + d.total, 0) / (days.length || 1))} itens</span>
      </div>
    </div>
  )
}
