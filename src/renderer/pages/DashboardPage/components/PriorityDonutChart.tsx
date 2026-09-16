import React, { useState } from 'react'
import { PieChart, AlertCircle } from 'lucide-react'

interface PriorityDonutChartProps {
  urgentCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  completedCount: number
}

export const PriorityDonutChart: React.FC<PriorityDonutChartProps> = ({
  urgentCount,
  highCount,
  mediumCount,
  lowCount,
  completedCount
}) => {
  const [activeSlice, setActiveSlice] = useState<string | null>(null)

  const data = [
    { key: 'urgent', label: 'Urgente', value: urgentCount, color: '#f43f5e', bg: 'bg-rose-500' },
    { key: 'high', label: 'Alta', value: highCount, color: '#f59e0b', bg: 'bg-amber-500' },
    { key: 'medium', label: 'Média', value: mediumCount, color: 'var(--color-primary)', bg: 'bg-[var(--color-primary)]' },
    { key: 'low', label: 'Baixa', value: lowCount, color: '#71717a', bg: 'bg-zinc-500' },
    { key: 'done', label: 'Concluídas', value: completedCount, color: '#10b981', bg: 'bg-emerald-500' },
  ].filter(d => d.value > 0)

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1

  // Calculate SVG stroke dashes for the donut slices
  const radius = 38
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Distribuição</h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Tarefas por prioridade</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 my-2">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="color-mix(in srgb, var(--color-border) 70%, transparent)"
              strokeWidth="11"
              fill="transparent"
            />
            {data.map(slice => {
              const strokeDasharray = `${(slice.value / total) * circumference} ${circumference}`
              const strokeDashoffset = -accumulatedOffset
              accumulatedOffset += (slice.value / total) * circumference

              const isHighlighted = activeSlice === slice.key

              return (
                <circle
                  key={slice.key}
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={isHighlighted ? 13 : 11}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  onMouseEnter={() => setActiveSlice(slice.key)}
                  onMouseLeave={() => setActiveSlice(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
              )
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span style={{ color: 'var(--color-text)' }} className="text-lg font-extrabold leading-none">
              {total === 1 && data.length === 0 ? 0 : total}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }} className="text-[9px] font-medium mt-0.5">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 text-xs">
          {data.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }} className="text-xs py-4 text-center">Nenhuma tarefa</div>
          ) : (
            data.map(item => {
              const pct = Math.round((item.value / total) * 100)
              const isHovered = activeSlice === item.key

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setActiveSlice(item.key)}
                  onMouseLeave={() => setActiveSlice(null)}
                  style={{
                    background: isHovered ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' : 'transparent',
                  }}
                  className="flex items-center justify-between p-1 rounded-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      style={{ background: item.color }}
                      className="w-2 h-2 rounded-full shrink-0"
                    />
                    <span style={{ color: 'var(--color-text)' }} className="truncate text-[11px] font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                    <span style={{ color: 'var(--color-text)' }} className="font-bold">{item.value}</span>
                    <span style={{ color: 'var(--color-text-muted)' }} className="text-[10px]">({pct}%)</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2 border-t text-[11px]"
      >
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          {urgentCount} urgentes no total
        </span>
        <span className="text-emerald-500 font-medium">{completedCount} entregues</span>
      </div>
    </div>
  )
}
