import React, { useState } from 'react'
import { ChartPieSlice, WarningCircle, CheckCircle } from '@phosphor-icons/react'

interface PriorityDonutChartProps {
  urgentCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  completedCount: number
}

interface SliceItem {
  key: string
  label: string
  value: number
  color: string
  glowColor: string
}

export const PriorityDonutChart: React.FC<PriorityDonutChartProps> = ({
  urgentCount,
  highCount,
  mediumCount,
  lowCount,
  completedCount
}) => {
  const [activeSliceKey, setActiveSliceKey] = useState<string | null>(null)

  const rawData: SliceItem[] = [
    { key: 'urgent', label: 'Urgente (P1)', value: urgentCount, color: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.45)' },
    { key: 'high', label: 'Alta (P2)', value: highCount, color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.45)' },
    { key: 'medium', label: 'Média (P3)', value: mediumCount, color: 'var(--color-primary)', glowColor: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' },
    { key: 'low', label: 'Baixa (P4)', value: lowCount, color: '#71717a', glowColor: 'rgba(113, 113, 122, 0.4)' },
    { key: 'done', label: 'Concluídas', value: completedCount, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.45)' },
  ]

  const data = rawData.filter(d => d.value > 0)
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1
  const hasData = data.length > 0

  const activeSlice = data.find(d => d.key === activeSliceKey) || null

  // SVG parameters
  const radius = 37
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full relative group/chart select-none transition-all duration-300 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <ChartPieSlice size={18} weight="duotone" />
          </div>
          <div>
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold flex items-center gap-1.5">
              Distribuição
              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full border border-neutral-700/30 text-neutral-400">
                Prioridades
              </span>
            </h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Densidade e status de cards</p>
          </div>
        </div>

        {activeSlice && (
          <span
            style={{
              background: `color-mix(in srgb, ${activeSlice.color} 15%, transparent)`,
              color: activeSlice.color,
              borderColor: `color-mix(in srgb, ${activeSlice.color} 30%, transparent)`,
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border animate-in fade-in zoom-in-95 duration-150"
          >
            {activeSlice.label}: {Math.round((activeSlice.value / total) * 100)}%
          </span>
        )}
      </div>

      {/* Main Chart Body */}
      <div className="flex items-center justify-center gap-3.5 my-2">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 100 100">
            {/* Background base track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
              strokeWidth="9"
              strokeDasharray={hasData ? undefined : '4 6'}
              fill="transparent"
            />

            {data.map(slice => {
              const slicePct = slice.value / total
              const strokeDasharray = `${slicePct * circumference} ${circumference}`
              const strokeDashoffset = -accumulatedOffset
              accumulatedOffset += slicePct * circumference

              const isHighlighted = activeSliceKey === slice.key
              const isOtherDimmed = activeSliceKey !== null && !isHighlighted

              return (
                <circle
                  key={slice.key}
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={isHighlighted ? 13 : 9}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  style={{
                    opacity: isOtherDimmed ? 0.3 : 1,
                    filter: isHighlighted ? `drop-shadow(0 0 6px ${slice.glowColor})` : 'none',
                    transformOrigin: '50% 50%',
                  }}
                  onMouseEnter={() => setActiveSliceKey(slice.key)}
                  onMouseLeave={() => setActiveSliceKey(null)}
                  className="transition-all duration-300 cursor-pointer"
                />
              )
            })}
          </svg>

          {/* Dynamic Center Inspector */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-1">
            {activeSlice ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                <span
                  style={{ color: activeSlice.color }}
                  className="text-lg font-black leading-none tracking-tight"
                >
                  {activeSlice.value}
                </span>
                <span
                  style={{ color: activeSlice.color }}
                  className="text-[9px] font-bold uppercase tracking-wider mt-0.5 truncate max-w-[65px]"
                >
                  {activeSlice.label}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }} className="text-[8px] font-medium">
                  {Math.round((activeSlice.value / total) * 100)}%
                </span>
              </div>
            ) : hasData ? (
              <div className="flex flex-col items-center transition-all">
                <span style={{ color: 'var(--color-text)' }} className="text-lg font-black leading-none tracking-tight">
                  {total}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }} className="text-[9px] font-medium mt-0.5">
                  Cards
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center transition-all">
                <ChartPieSlice size={22} weight="duotone" style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ color: 'var(--color-text-muted)' }} className="text-[8px] font-semibold mt-1 uppercase tracking-wider">
                  Vazio
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend or Polished Empty State */}
        <div className="flex-1 space-y-1 text-xs">
          {!hasData ? (
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                borderColor: 'var(--color-border)',
              }}
              className="p-2.5 rounded-lg border text-center space-y-1"
            >
              <p style={{ color: 'var(--color-text)' }} className="text-[11px] font-semibold">
                Nenhum card priorizado
              </p>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[10px] leading-tight">
                Adicione tarefas com P1, P2, P3 ou P4 no Kanban para mapear o gráfico.
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="P1" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="P2" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="P3" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" title="P4" />
              </div>
            </div>
          ) : (
            data.map(item => {
              const pct = Math.round((item.value / total) * 100)
              const isHovered = activeSliceKey === item.key

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setActiveSliceKey(item.key)}
                  onMouseLeave={() => setActiveSliceKey(null)}
                  style={{
                    background: isHovered
                      ? `color-mix(in srgb, ${item.color} 12%, var(--color-surface))`
                      : 'transparent',
                    borderColor: isHovered
                      ? `color-mix(in srgb, ${item.color} 30%, transparent)`
                      : 'transparent',
                  }}
                  className="flex flex-col p-1.5 rounded-lg border transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        style={{
                          background: item.color,
                          boxShadow: isHovered ? `0 0 6px ${item.glowColor}` : 'none',
                        }}
                        className="w-2 h-2 rounded-full shrink-0 transition-shadow duration-200"
                      />
                      <span
                        style={{
                          color: isHovered ? item.color : 'var(--color-text)',
                        }}
                        className="truncate text-[11px] font-semibold transition-colors"
                      >
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-[11px]">
                      <span style={{ color: 'var(--color-text)' }} className="font-bold">
                        {item.value}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }} className="text-[9px]">
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Proportional Mini Bar */}
                  <div
                    style={{ background: 'color-mix(in srgb, var(--color-border) 40%, transparent)' }}
                    className="w-full h-1 rounded-full mt-1 overflow-hidden"
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        background: item.color,
                        opacity: isHovered ? 1 : 0.6,
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer Info / Status Pills */}
      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="flex items-center justify-between pt-2 border-t text-[11px] mt-1"
      >
        <span
          onMouseEnter={() => setActiveSliceKey('urgent')}
          onMouseLeave={() => setActiveSliceKey(null)}
          className="flex items-center gap-1 cursor-pointer hover:text-rose-400 transition-colors"
        >
          <WarningCircle size={13} weight="bold" className="text-rose-500 shrink-0" />
          <span><strong className="text-rose-500 font-bold">{urgentCount}</strong> urgentes</span>
        </span>
        <span
          onMouseEnter={() => setActiveSliceKey('done')}
          onMouseLeave={() => setActiveSliceKey(null)}
          className="flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors"
        >
          <CheckCircle size={13} weight="bold" className="text-emerald-500 shrink-0" />
          <span><strong className="text-emerald-500 font-bold">{completedCount}</strong> entregues</span>
        </span>
      </div>
    </div>
  )
}
